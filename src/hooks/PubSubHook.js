const EventEmitter = require('eventemitter3');
const BaseHook = require('./BaseHook');

const {
  once,
  isObject,
  tryJSONParse,
  tryJSONStringify,
  getTimeStamp,
} = require('./../utils');

/**
 * Provides additional pubsub utilities
 */
// TODO pattern subs
// TODO subscribeXof
module.exports = class extends BaseHook {
  constructor() {
    super('pubsub');
    this._mountToCore = true;

    // all pubsub messages from redis are routed through this emitter
    // so we can send them to the correct handlers
    this._router = new EventEmitter();
  }

  /**
   * Create pub & sub clients if necessary
   * @returns {Promise.<T>}
   */
  initialize() {
    if (!this.options.publisher && !this.options.subscriber) {
      this.clients.publisher = this.client;
      return Promise.resolve();
    }

    const promises = [];

    // subscriber client
    if (this.options.subscriber) {
      promises.push(
        this
          .createClient('subscriber', this)
          .then(() => {
            this.clients.subscriber.on('message', this._onMessage);
            // this.clients.subscriber.on('pmessage', this._onPatternMessage);
            return Promise.resolve();
          })
      );
    }

    // publisher client
    if (this.options.publisher) {
      promises.push(this.createClient('publisher', this));
    } else {
      this.clients.publisher = this.client;
    }

    return Promise.all(promises);
  }

  /**
   * Return the default config - core will automatically merge this with the
   * user provided options for this hook.
   * @returns {{someDefaultThing: string}}
   */
  defaults() {
    return {
      // enable a separate client just for publisher
      // defaults to false, will use the this.client by default
      publisher: false,

      // enable the subscriber client - defaults to false
      // set this to true if you want to use redis subscribe
      // a separate client is needed as subscribing blocks the client
      subscriber: false,

      // prefix all PUBSUB events with this string
      prefix: 'rdb',
    };
  }

  /**
   * Internal pub/sub channel message listener
   * @param channel
   * @param message
   * @private
   */
  _onMessage = (channel, message) => {
    if (this._router.listeners(channel, true)) {
      this._router.emit(channel, {
        data: tryJSONParse(message),
        channel: this.removeEventPrefix(channel),
        timestamp: getTimeStamp(),
      });
    }
  };

  /**
   * Internal pub/sub pattern message listener
   * @param pattern
   * @param channel
   * @param message
   * @private
   */
  // _onPatternMessage = (pattern, channel, message) => {
  //   if (this._router.listeners(channel, true)) {
  //     this._router.emit(channel, {
  //       data: tryJSONParse(message),
  //       channel: this.removeEventPrefix(channel),
  //       pattern,
  //       timestamp: getTimeStamp(),
  //     });
  //   }
  //   if (pattern !== channel && this._router.listeners(channel, true) > 0) {
  //     this._router.emit(pattern, {
  //       data: tryJSONParse(message),
  //       channel: this.removeEventPrefix(channel),
  //       pattern,
  //       timestamp: getTimeStamp(),
  //     });
  //   }
  // };

  /**
   * Unsubscribe after a subOnce has completed.
   * @param channel
   * @private
   */
  _unsubscribeAfterOnce(channel) {
    return this.unsubscribe(channel, null);
    // const channelWithPrefix = this.prefixChannel(channel);
    // this.log.debug(`Checking to see if we should unsub from channel '${channelWithPrefix}'.`);
    // return this
    //   .client
    //   .pubsub('numsub', channelWithPrefix)
    //   .then((countSubs) => {
    // TODO this logic doesn't seem to be working
    // TODO sub count always seems to be above 2
    // this.log.debug(`Channel '${channelWithPrefix}' subscriber count is ${countSubs[1]}.`);
    // if (countSubs[1] <= 1) {
    //   this.log.debug(`Unsubscribing from channel '${channelWithPrefix}'.`);
    //   // need the original non-prefix name here as unsub already adds it.
    // }
    // });
  }

  /**
   * Subscribe to single or multiple channels / events and on receiving the first event
   * unsubscribe. Includes an optional timeout.
   * @name subscribeOnce
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   * @param timeout {Number} time in ms until the subscription is aborted
   */
  subscribeOnce(channels, listener, timeout) {
    if (!this.options.subscriber) {
      return Promise.reject(
        new Error('RediBox.pubsub \'subscriber\' config is set to disabled.')
      );
    }
    const promises = [];
    const channelArray = [].concat(channels); // no mapping here - need the original name

    for (let i = 0, len = channelArray.length; i < len; i++) {
      const channel = channelArray[i];
      promises.push(new Promise((resolve, reject) => {
        let timedOut = false;
        let timeOutTimer;
        const channelWithPrefix = this.prefixChannel(channel);

        if (timeout) {
          timedOut = false;
          timeOutTimer = setTimeout(() => {
            timedOut = true;
            this._router.removeListener(channelWithPrefix, listener);
            this._unsubscribeAfterOnce(channel).then(() => {
              listener({
                channel,
                timeout: true,
                timeoutPeriod: timeout,
                timestamp: getTimeStamp(),
              });
            });
          }, timeout);
        }

        this.clients.subscriber.subscribe(channelWithPrefix).then(() => {
          if (!timeout || !timedOut) {
            this.log.debug(`Subscribed once to ${channelWithPrefix}`);
            this._router.once(channelWithPrefix, (obj) => {
              if (!timeout || !timedOut) {
                clearTimeout(timeOutTimer);
                this._unsubscribeAfterOnce(channel).then(() => {
                  listener(obj);
                });
              }
            });
          }
          return resolve();
        }).catch(reject);
      }));
    }

    if (promises.length === 1) return promises[0];
    return Promise.all(promises);
  }

  /**
   * Subscribe to all of the channels provided and as soon as the first
   * message is received from any channel then unsubscribe from all.
   * @name subscribeOnceOf
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   * @param timeout {Number} time in ms until the subscription is aborted
   */
  subscribeOnceOf(channels, listener, timeout) {
    if (!this.options.subscriber) {
      return Promise.reject(
        new Error('RediBox.pubsub \'subscriber\' config is set to disabled.')
      );
    }

    let timeOutTimer = null;
    // create an internal listener to wrap around the provided listener
    // this will unsubscribe on the first event
    const listenerWrapper = once((message) => {
      if (timeOutTimer) clearTimeout(timeOutTimer);
      this.unsubscribe(channels, listenerWrapper).then(() => listener(message));
    });

    if (timeout) {
      timeOutTimer = setTimeout(() => {
        listenerWrapper({
          timeout: true,
          timeoutPeriod: timeout,
          message: null,
          timestamp: getTimeStamp(),
        });
      }, timeout);
    }

    return this.subscribe(channels, listenerWrapper);
  }

  /**
   * Subscribe to a redis channel(s)
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   */
  subscribe(channels, listener) {
    if (!this.options.subscriber) {
      return Promise.reject(
        new Error('RediBox.pubsub \'subscriber\' config is set to disabled.')
      );
    }

    const channelsArray = [].concat(channels).map(this.prefixChannel);
    return this.clients.subscriber.subscribe(...channelsArray).then(() => {
      for (let i = 0, len = channelsArray.length; i < len; i++) {
        this._router.on(channelsArray[i], listener);
      }
      return Promise.resolve();
    });
  }

  /**
   * Publish a message to all channels specified
   * @param channels {string|Array}
   * @param message
   */
  publish(channels, message) {
    if (!this.options.publisher) {
      throw new Error('RediBox.pubsub \'publisher\' config is set to disabled.');
    }

    let messageStringified;

    if (isObject(message) || Array.isArray(message)) {
      messageStringified = tryJSONStringify(message);
    } else {
      messageStringified = message;
    }

    if (typeof channels === 'string') {
      this.clients.publisher.publish(this.prefixChannel(channels), messageStringified);
    } else if (Array.isArray(channels)) {
      for (let i = 0, len = channels.length; i < len; i++) {
        this.clients.publisher.publish(this.prefixChannel(channels[i]), messageStringified);
      }
    }

    return Promise.resolve();
  }

  /**
   * Unsubscribe
   * @param channels {string|Array}
   * @param listener
   */
  unsubscribe(channels, listener) {
    const channelsArray = [].concat(channels).map(this.prefixChannel);

    if (listener) {
      for (let i = 0, len = channelsArray.length; i < len; i++) {
        this._router.removeListener(channelsArray[i], listener);
      }
    }

    return this.clients.subscriber.unsubscribe(...channelsArray);
  }

  /**
   * Add the prefix to a redis pubsub event name
   * @param eventName
   * @returns {string}
   */
  prefixChannel = eventName => `${this.options.eventPrefix}:${eventName}`;

  /**
   * Removes the internal event name spacing prefix
   * @param eventName
   * @returns {string}
   */
  removeEventPrefix = eventName =>
    eventName.slice(this.options.eventPrefix.length + 1, eventName.length);
};
