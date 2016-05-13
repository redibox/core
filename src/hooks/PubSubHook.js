import BaseHook from './BaseHook';
import each from 'async/each';
import EventEmitter from 'eventemitter3';

import {
  once,
  noop,
  isObject,
  tryJSONParse,
  tryJSONStringify,
  getTimeStamp,
} from './../utils';

/**
 * Provides pubsub utilities if in cluster mode
 */
// TODO pattern subs
// TODO subscribeXof
// TODO drop async
// TODO switch to promises
export default class PubSubHook extends BaseHook {
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
      promises.push(new Promise((resolve, reject) => {
        this
          .createClient('subscriber', this)
          .then(() => {
            this.clients.subscriber.on('message', this._onMessage);
            this.clients.subscriber.on('pmessage', this._onPatternMessage);
            resolve();
          }).catch(reject);
      }));
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
  _onPatternMessage = (pattern, channel, message) => {
    if (this._router.listeners(channel, true)) {
      this._router.emit(channel, {
        data: tryJSONParse(message),
        channel: this.removeEventPrefix(channel),
        pattern,
        timestamp: getTimeStamp(),
      });
    }
    if (pattern !== channel && this._router.listeners(channel, true) > 0) {
      this._router.emit(pattern, {
        data: tryJSONParse(message),
        channel: this.removeEventPrefix(channel),
        pattern,
        timestamp: getTimeStamp(),
      });
    }
  };

  /**
   * Unsubscribe after a subOnce has completed.
   * @param channel
   * @param completed
   * @private
   */
  _unsubscribeAfterOnce(channel, completed = noop) {
    const channelWithPrefix = this.prefixChannel(channel);
    this.log.debug(`Checking to see if we should unsub from channel '${channelWithPrefix}'.`);
    this.client.pubsub('numsub', channelWithPrefix)
        .then((countSubs) => {
          this.log.debug(`Channel '${channelWithPrefix}' subscriber count is ${countSubs[1]}.`);
          if (countSubs[1] <= 1) {
            this.log.debug(`Unsubscribing from channel '${channelWithPrefix}'.`);
            // need the original non-prefix name here as unsub already adds it.
            return this.unsubscribe(channel, null, error => {
              if (error) this.core.handleError(error);
              return completed();
            });
          }
          return completed();
        }).catch(error => this.core.handleError(error) && completed());
  }

  /**
   * Subscribe to single or multiple channels / events and on receiving the first event
   * unsubscribe. Includes an optional timeout.
   * @name subscribeOnce
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   * @param subscribed {Function} callback with subscription status
   * @param timeout {Number} time in ms until the subscription is aborted
   * @example
   *
   * RediBox.subscribeOnce([
   *    'requestID-123456:request:dataPart1',
   *    'requestID-123456:request:dataPart2',
   *    'requestID-123456:request:dataPart3',
   * ], message => { // on message received listener
   *     assert.isUndefined(message.timeout);
   *     // do something with your messages here
   * }, error => { // on subscribed callback
   *     assert.isNull(error);
   *
   *     // send some test messages
   *     RediBox.publish([
   *         'requestID-123456:request:dataPart1', // will only get one of these
   *         'requestID-123456:request:dataPart1', // will only get one of these
   *         'requestID-123456:request:dataPart2',
   *         'requestID-123456:request:dataPart3',
   *     ], {
   *         someArray: [1, 2, 3, 4, 5],
   *        somethingElse: 'foobar',
   *     });
   *   }, 3000); // optional timeout
   *
   */
  subscribeOnce(channels, listener, subscribed, timeout) {
    const channelArray = [].concat(channels); // no mapping here - need the original name
    each(channelArray, (channel, subscribeOnceDone) => {
      let timedOut = false;
      let timeOutTimer;
      const channelWithPrefix = this.prefixChannel(channel);

      if (timeout) {
        timedOut = false;
        timeOutTimer = setTimeout(() => {
          timedOut = true;
          this._router.removeListener(channelWithPrefix, listener);
          this._unsubscribeAfterOnce(channel, () => {
            listener({
              channel,
              timeout: true,
              timeoutPeriod: timeout,
              data: null,
              timestamp: getTimeStamp(),
            });
          });
        }, timeout);
      }

      this.clients.subscriber.subscribe(channelWithPrefix, (subscribeError, count) => {
        if (subscribeError) return subscribeOnceDone(subscribeError, count);
        if (!timeout || !timedOut) {
          this.log.debug(`Subscribed once to ${channelWithPrefix}`);
          this._router.once(channelWithPrefix, (obj) => {
            if (!timeout || !timedOut) {
              clearTimeout(timeOutTimer);
              this._unsubscribeAfterOnce(channel, () => {
                listener(obj);
              });
            }
          });
        }
        return subscribeOnceDone();
      });
    }, subscribed);
  }

  /**
   * Subscribe to all of the channels provided and as soon as the first
   * message is received from any channel then unsubscribe from all.
   * @name subscribeOnceOf
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   * @param subscribed {Function} callback with subscription status
   * @param timeout {Number} time in ms until the subscription is aborted
   */
  subscribeOnceOf(channels, listener, subscribed, timeout) {
    let timeOutTimer = null;
    // create an internal listener to wrap around the provided listener
    // this will unsubscribe on the first event
    const listenerWrapper = once((message) => {
      if (timeOutTimer) clearTimeout(timeOutTimer);
      this.unsubscribe(channels, listenerWrapper, () => listener(message));
    });

    this.subscribe(channels, listenerWrapper, subscribed);

    if (timeout) {
      timeOutTimer = setTimeout(() => {
        listenerWrapper({
          timeout: true,
          timeoutPeriod: timeout,
          message: null,
          timestamp: getTimeStamp(),
        });
      }, timeout + 50);
    }
  }

  /**
   * Subscribe to a redis channel(s)
   * @param channels {string|Array} an array of string of channels you want to subscribe to
   * @param listener {Function} your listener where the channel events will be sent to
   * @param subscribed {Function} callback with subscription status
   */
  subscribe(channels, listener, subscribed = noop) {
    const channelsArray = [].concat(channels).map(this.prefixChannel);
    this.clients.subscriber.subscribe(...channelsArray, (subscribeError, count) => {
      if (subscribeError) return subscribed(subscribeError, count);
      return each(channelsArray, (channel, subscribeDone) => {
        this._router.on(channel, listener);
        return subscribeDone();
      }, subscribed);
    });
  }

  /**
   * Publish a message to all channels specified
   * @param channels {string|Array}
   * @param message
   * @param published
   */
  publish(channels, message, published = noop) {
    let messageStringified;
    const channelsArray = [].concat(channels).map(this.prefixChannel);

    if (isObject(message) || Array.isArray(message)) {
      messageStringified = tryJSONStringify(message);
      if (messageStringified === undefined) {
        this.core.handleError('Cannot JSON stringify message.');
        return published('Cannot JSON stringify message.');
      }
    } else {
      messageStringified = message;
    }

    return each(channelsArray, (channel, publishedToChannel) => {
      this.clients.publisher.publish(channel, messageStringified, publishedToChannel);
    }, published);
  }

  /**
   * Unsubscribe
   * @param channels {string|Array}
   * @param listener
   * @param completed
   */
  unsubscribe(channels, listener, completed = noop) {
    const channelsArray = [].concat(channels).map(this.prefixChannel);

    if (listener) {
      each(channelsArray, (channel, unsubscribed) => {
        this._router.removeListener(channel, listener);
        return unsubscribed();
      }, noop);
    }

    this.clients.subscriber.unsubscribe(...channelsArray, (err, count) => {
      if (err) return completed(err, count);
      this.log.debug(`Unsubscribed from ${channelsArray.toString()}`);
      return completed();
    });
  }

  /**
   * Add the prefix to a redis pubsub event name
   * @param eventName
   * @returns {string}
   */
  prefixChannel = eventName => `${this.options.prefix}:${eventName}`;

  /**
   * Removes the internal event name spacing prefix
   * @param eventName
   * @returns {string}
   */
  removeEventPrefix = eventName =>
    eventName.slice(this.options.prefix.length + 1, eventName.length);

}
