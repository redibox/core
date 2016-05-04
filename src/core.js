/**
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Salakar
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import { hostname } from 'os';
import cuid from 'cuid';
import Redis from 'ioredis';
import each from 'async/each';
import Promise from 'bluebird';
import EventEmitter from 'eventemitter3';
import defaults from './defaults';
import {
  after,
  mergeDeep,
  once,
  noop,
  isObject,
  isFunction,
  createLogger,
} from './helpers';

const HOST_NAME = hostname();

export * from './helpers';
export { defaults };
export default class RediBox extends EventEmitter {

  /**
   * @class RediBox
   * RediBox Core Service
   * @param {Object} options Redis connection options
   * @param readyCallback
   * @returns {RediBox} Returns new instance of RediBox
   */
  constructor(options, readyCallback = noop) {
    super();
    this.options = options;

    let readyCallbackLocal = readyCallback;
    if (isFunction(this.options)) {
      readyCallbackLocal = this.options;
      this.options = {};
    }

    // unique name of this instance, useful for targeted pubsub / ipc for modules
    // to communicate to other instances - i.e. pause a queue on all instances.
    this.id = cuid();

    // keep a timestamp of when we started
    this.bootedAtTimestamp = Date.now();

    this.clients = {};

    // merge default options
    this.options = mergeDeep(defaults(), this.options);

    // detect if we're a cluster
    this.options.redis.cluster = !!this.options.redis.hosts && this.options.redis.hosts.length;

    // setup new logger
    this.log = createLogger(this.options.log);

    // because once is more than enough ;p
    this._callBackOnce = once(readyCallbackLocal);

    // setup connection timeout
    this._connectFailedTimeout = setTimeout(() => {
      const error = new Error('Failed to connect to redis, please check your config / servers.');
      this.emit('error', error);
      this._callBackOnce(error);
    }, this.options.redis.connectionTimeout);

    // all clients callback here to notify ready state
    const reportReady = after(this._clientCount(), this._allClientsReady);

    // https://github.com/luin/ioredis#error-handling
    Redis.Promise.onPossiblyUnhandledRejection(this._redisError);

    // normal read/write client
    this.createClient('readWrite', reportReady);

    // create a second connection to use for scaled reads across
    // all cluster instances, masters & slaves.
    // UNLIMITED POWAAAHHHHH >=] https://media.giphy.com/media/hokMyu1PAKfJK/giphy.gif
    if (this.options.redis.cluster && this.options.redis.clusterScaleReads) {
      this.createClient('readOnly', true, reportReady);
    }

    // subscriber client
    if (this.options.redis.subscriber) {
      this.createClient('subscriber', () => {
        this._subscriberMessageEvents = new EventEmitter();
        this.clients.subscriber.on('message', this._onMessage);
        this.clients.subscriber.on('pmessage', this._onPatternMessage);
        reportReady();
      });
    }

    // publisher client
    if (this.options.redis.publisher) {
      this.createClient('publisher', reportReady);
    }

    process.once('SIGTERM', this.quit);
    process.once('SIGINT', this.quit);

    return this;
    // TODO experimental poop
    // return new Proxy(this, {
    //   get: (target, prop) => {
    //     if (this[prop]) return this[prop];
    //     if (this.commands[prop]) return this.commands[prop];
    //     if (this.clients[prop]) return this.clients[prop];
    //     return undefined;
    //   },
    // });
  }

  /**
   * Returns the number of redis clients we're expecting to create.
   * @returns {*}
   * @private
   */
  _clientCount = () => 1 + (this.options.redis.cluster && this.options.redis.clusterScaleReads) +
  this.options.redis.publisher + this.options.redis.subscriber;

  /**
   * Internal all clients reported a 'ready' status
   * @returns {Number}
   * @private
   */
  _allClientsReady = () => {
    this.log.verbose('All Redis clients have reported \'ready\'.');
    clearTimeout(this._connectFailedTimeout);

    const clients = {
      client: this.clients.readWrite.status,
      client_read: (this.options.redis.cluster && this.options.redis.clusterScaleReads) ?
        this.clients.readOnly.status :
        null,
    };

    this.log.verbose('-----------------------');
    this.log.verbose(' RediBox is now ready! ');
    this.log.verbose('-----------------------\n');
    this.emit('ready', clients);

    // set immediate to allow ioredis to init cluster.
    // without this cluster nodes are sometimes undefined ??
    this._callBackOnce(null, clients);
  };

  /**
   * Internal error Handler - just emits all redis errors.
   * Also optionally logs them to console.
   * @private
   * @param {Error} error
   * @returns {null}
   */
  _redisError = (error) => {
    /* istanbul ignore if */
    if (error) {
      if (this.options.logRedisErrors) return this.log.error(error);
      return this.emit('error', error);
    }

    return void 0;
  };

  /**
   * Creates a new redis client, connects and then onto the core class
   * @param clientName client name, this is also the property name on
   * @param readOnly
   * @param readyCallback
   */
  createClient(clientName, readOnly, readyCallback = noop) {
    /* eslint no-param-reassign:0 */
    if (isFunction(readOnly)) {
      readyCallback = readOnly;
      readOnly = false;
    }

    // cluster connection
    if (this.options.redis.cluster) {
      this.log.verbose(
        `Creating a ${readOnly ? 'read only' : 'read/write'} redis CLUSTER client. (${clientName})`
      );

      this.clients[clientName] = new Redis.Cluster(
        this.options.redis.hosts,
        Object.assign({ scaleReads: readOnly ? 'all' : 'master' }, this.options.redis)
      );

      this.clients[clientName].readOnly = readOnly;
    }

    // non cluster connection
    if (!this.options.redis.cluster) {
      this.log.verbose(`Creating a read/write redis client. (${clientName})`);
      this.clients[clientName] = new Redis(this.options.redis);
    }

    this.clients[clientName].once('ready', () => {
      this.log.verbose(
        `${readOnly ? 'Read only' : 'Read/write'} redis client '${clientName}' is ready!`
      );
      return readyCallback();
    });

    return this.clients[clientName];
  }

  /**
   * Returns details about this host, it's process and timestamps. Used for pubsub.
   * @returns {hostInfo}
   */
  hostInfo() {
    return {
      id: this.id,

      process: {
        pid: process.pid,
        title: process.title,
        up_time: process.uptime(),
        started_at: this.bootedAtTimestamp,
        host_name: HOST_NAME,
        version: process.version,
      },

      timestamp: new Date().getTime(),
      timestamp_human: new Date(),
    };
  }

  /**
   * Attempts to serialize a json string into an object, else return
   * the original value.
   * @param message
   * @returns {string}
   * @private
   */
  _tryJSONParse(message) {
    try {
      return JSON.parse(message);
    } catch (jsonError) {
      return message;
    }
  }

  /**
   * Internal pub/sub channel message listener
   * @param channel
   * @param message
   * @private
   */
  _onMessage = (channel, message) => {
    if (this._subscriberMessageEvents.listeners(channel, true)) {
      this._subscriberMessageEvents.emit(channel, {
        data: this._tryJSONParse(message),
        channel: this.removeEventPrefix(channel),
        timestamp: Math.floor(Date.now() / 1000),
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
    if (this._subscriberMessageEvents.listeners(channel, true)) {
      this._subscriberMessageEvents.emit(
        channel,
        {
          data: this._tryJSONParse(message),
          channel: this.removeEventPrefix(channel),
          pattern,
          timestamp: Math.floor(Date.now() / 1000),
        }
      );
    }
    if (pattern !== channel && this._subscriberMessageEvents.listeners(channel, true) > 0) {
      this._subscriberMessageEvents.emit(pattern, {
        data: this._tryJSONParse(message),
        channel: this.removeEventPrefix(channel),
        pattern,
        timestamp: Math.floor(Date.now() / 1000),
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
    const channelWithPrefix = this.toEventName(channel);
    this.log.verbose(`Checking to see if we should unsub from channel '${channelWithPrefix}'.`);
    this.getClient().pubsub('numsub', channelWithPrefix)
        .then((countSubs) => {
          this.log.verbose(`Channel '${channelWithPrefix}' subscriber count is ${countSubs[1]}.`);
          if (countSubs[1] <= 1) {
            this.log.verbose(`Unsubscribing from channel '${channelWithPrefix}'.`);
            // need the original non-prefix name here as unsub already adds it.
            return this.unsubscribe(channel, null, error => {
              if (error) this._redisError(error);
              return completed();
            });
          }
          return completed();
        }).catch(error => this._redisError(error) && completed());
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
      const channelWithPrefix = this.toEventName(channel);

      if (timeout) {
        timedOut = false;
        timeOutTimer = setTimeout(() => {
          timedOut = true;
          this._subscriberMessageEvents.removeListener(channelWithPrefix, listener);
          this._unsubscribeAfterOnce(channel, () => {
            listener({
              channel,
              timeout: true,
              timeoutPeriod: timeout,
              data: null,
              timestamp: Math.floor(Date.now() / 1000),
            });
          });
        }, timeout);
      }

      this.clients.subscriber.subscribe(channelWithPrefix, (subscribeError, count) => {
        if (subscribeError) return subscribeOnceDone(subscribeError, count);
        if (!timeout || !timedOut) {
          this.log.verbose(`Subscribed once to ${channelWithPrefix}`);
          this._subscriberMessageEvents.once(channelWithPrefix, (obj) => {
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
          timestamp: Math.floor(Date.now() / 1000),
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
    const channelsArray = [].concat(channels).map(this.toEventName);
    this.clients.subscriber.subscribe(...channelsArray, (subscribeError, count) => {
      if (subscribeError) return subscribed(subscribeError, count);
      return each(channelsArray, (channel, subscribeDone) => {
        this._subscriberMessageEvents.on(channel, listener);
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
    const channelsArray = [].concat(channels).map(this.toEventName);

    const messageStringified = (isObject(message) || Array.isArray(message)) ?
      JSON.stringify(message) :
      message;

    each(channelsArray, (channel, publishedToChannel) => {
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
    const channelsArray = [].concat(channels).map(this.toEventName);

    if (listener) {
      each(channelsArray, (channel, unsubscribed) => {
        this._subscriberMessageEvents.removeListener(channel, listener);
        return unsubscribed();
      }, noop);
    }

    this.clients.subscriber.unsubscribe(...channelsArray, (err, count) => {
      if (err) return completed(err, count);
      this.log.verbose(`Unsubscribed from ${channelsArray.toString()}`);
      return completed();
    });
  }

  /**
   * Disconnects the redis clients but first waits for pending replies.
   * @returns null
   */
  quit = () => {
    if (this.clients.readWrite) {
      this.clients.readWrite.quit();
    }
    if (this.clients.readOnly) {
      this.clients.readWrite.quit();
    }
    if (this.clients.subscriber) {
      this.clients.subscriber.quit();
    }
    if (this.clients.publisher) {
      this.clients.publisher.quit();
    }

    process.removeListener('SIGTERM', this.quit);
    process.removeListener('SIGINT', this.quit);
  };

  /**
   * Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).
   */
  disconnect() {
    if (this.clients.readWrite) {
      this.clients.readWrite.disconnect();
    }
    if (this.clients.readOnly) {
      this.clients.readWrite.disconnect();
    }
    if (this.clients.subscriber) {
      this.clients.subscriber.disconnect();
    }
    if (this.clients.publisher) {
      this.clients.publisher.disconnect();
    }

    process.removeListener('SIGTERM', this.quit);
    process.removeListener('SIGINT', this.quit);
  }

  /**
   * Send a command to all cluster master nodes - i.e. FLUSHALL
   * @param command
   * @param args
   * @returns {Promise}
   * @example
   *   RediBox.clusterExec('flushall').then(function (result) {
          console.dir(result);
        }, function (error) {
          console.dir(error);
        });
   */
  clusterExec(command, ...args) {
    if (!this.options.redis.cluster) {
      return Promise.reject(new Error('Cannot clusterExec: Not a cluster connection!'));
    }

    const nodes = this.clients.readWrite.nodes('master');

    if (!nodes.length) {
      return Promise.reject(new Error('Cannot clusterExec: No master nodes found!'));
    }

    return Promise.all(nodes.map(node => node[command.toLowerCase()].apply(node, args)));
  }

  /**
   * Returns an array of all master and slave node addresses that
   * we have a redis connection to
   * @returns {Array}
   */
  clusterGetNodes() {
    if (!this.options.redis.cluster) {
      return [];
    }
    return Object.keys(this.clients.readWrite.connectionPool.nodes.all);
  }

  /**
   * Returns an array of all the slave node addresses.
   * @returns {Array}
   */
  clusterGetSlaves() {
    if (!this.options.redis.cluster) {
      return [];
    }
    return Object.keys(this.clients.readWrite.connectionPool.nodes.slave);
  }

  /**
   * Returns an array of all the master node addresses.
   * @returns {Array}
   */
  clusterGetMasters() {
    if (!this.options.redis.cluster) {
      return [];
    }
    return Object.keys(this.clients.readWrite.connectionPool.nodes.master);
  }

  /**
   * Returns the individual cluster node connection instance.
   *  - Returns 'false' if not found.
   * @param address
   * @returns {*}
   */
  clusterGetNodeClient(address) {
    if (!this.options.redis.cluster) {
      return false;
    }
    if (this.clients.readWrite.connectionPool.nodes.all.hasOwnProperty(address)) {
      return this.clients.readWrite.connectionPool.all[address];
    }
    return false;
  }

  /**
   * Makes sure we can actually use the cluster read client, otherwise use the master.
   *   - makes sure the read client is connected ok, if it's not then reverts to the
   *     standard non read only client.
   * @returns {boolean}
   */
  clusterCanScaleReads() {
    return this.options.redis.cluster &&
      this.options.redis.clusterScaleReads &&
      this.isClientConnected(this.clients.readOnly);
  }

  /**
   * Returns a client for read only purposes.
   * @returns {*}
   */
  getReadOnlyClient() {
    if (this.clusterCanScaleReads()) {
      return this.clients.readOnly;
    }
    return this.clients.readWrite;
  }

  /**
   * Returns a client for read and write purposes.
   * Just a fluff function, can directly get `this.clients.readWrite`.
   * @returns {*}
   */
  getClient() {
    return this.clients.readWrite;
  }

  /**
   * Checks if a redis client connection is ready.
   * @returns {Boolean} Client status
   */
  isClientConnected(client) {
    return client && client.status === 'ready';
  }

  /**
   * Returns if cluster or not.
   * @returns {boolean}
   */
  isCluster() {
    return this.options.redis.cluster;
  }

  /**
   * Defines a lua script as a command on both read and write clients if necessary
   * @param name
   * @param lua
   * @param numberOfKeys
   * @param readOnly
   */
  defineLuaCommand(name, lua, numberOfKeys = 1, readOnly = false) {
    let clientsWithCommand = 0;
    const command = name.toLowerCase();

    // read/write instance
    if (!this.clients.readWrite.hasOwnProperty(command)) {
      this.clients.readWrite.defineCommand(command, { numberOfKeys, lua });
      if (!this.hasOwnProperty(command)) {
        this[command] = this._customCommandWrapper(command, readOnly);
      }
      clientsWithCommand = clientsWithCommand + 1;
    }

    // read only instance, if available and if the script is set as a ready only script
    if (this.clients.readOnly && !this.clients.readOnly.hasOwnProperty(command) && readOnly) {
      this.clients.readOnly.defineCommand(command, { numberOfKeys, lua });
      clientsWithCommand = clientsWithCommand + 1;
    }

    // return true/false if all possible clients got the command defined.
    return clientsWithCommand === (1 + (readOnly && this.options.redis.clusterScaleReads));
  }

  /**
   * Defines a lua command or commands on both clients;
   * @param customScripts
   * @param module*
   * @returns {*}
   */
  defineLuaCommands(customScripts, module = 'core') {
    Object.keys(customScripts).forEach((key) => {
      const script = customScripts[key];
      const keyLower = key.toLowerCase();
      // quick validations
      if (!script.hasOwnProperty('keys')) {
        return this.log.verbose(
          `Script '${keyLower}' from '${module} is missing required property 'key'! ...SKIPPED!`
        );
      }

      if (!script.hasOwnProperty('lua')) {
        return this.log.verbose(
          `Script '${keyLower}' from '${module} is missing required property 'lua'! ...SKIPPED!`
        );
      }

      // read/write instance
      if (!this.clients.readWrite.hasOwnProperty(keyLower)) {
        this.log.verbose(`Defining command for lua script '${keyLower}' from module '${module}'.`);
        this.clients.readWrite.defineCommand(keyLower, {
          numberOfKeys: script.keys,
          lua: script.lua,
        });
      }

      // read only instance, if available and if the script is set as a ready only script
      if (this.clients.readOnly && !this.clients.readOnly.hasOwnProperty(keyLower) &&
        script.hasOwnProperty('readOnly') &&
        script.readOnly === true) {
        this.log.verbose(
          `Defining ready only command for lua script '${keyLower}' from module '${module}'.`
        );
        this.clients.readOnly.defineCommand(keyLower, {
          numberOfKeys: script.keys,
          lua: script.lua,
        });
      }

      return void 0;
    });
  }

  /**
   *
   * @param command
   * @param readOnly
   * @private
   */
  _customCommandWrapper = (command, readOnly) => (...args) => {
    const client = !readOnly ? this.getClient() : this.getReadOnlyClient();

    if (!this.isClientConnected(client)) {
      return Promise.reject('Redis not connected or ready.');
    }

    if (!client[command]) {
      return Promise.reject('Cannot find the specified command on any connected clients.');
    }

    return client[command].apply(null, args);
  };

  /**
   * For now just returns the same key.
   * @param key
   * @returns {string}
   */
  toKey = key => key;

  /**
   * Add the eventPrefix to an event name
   * @param eventName
   * @returns {string}
   */
  toEventName = eventName => `${this.options.redis.eventPrefix}${eventName}`;

  /**
   * Removes the internal event name spacing prefix
   * @param eventName
   * @returns {string}
   */
  removeEventPrefix = eventName =>
    eventName.slice(this.options.redis.eventPrefix.length + 1, eventName.length);

}
