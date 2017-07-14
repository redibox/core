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

const cuid = require('cuid');
const Redis = require('ioredis');
const EventEmitter = require('eventemitter3');

const { hostname } = require('os');
const Promise = require('bluebird');
const scripts = require('./scripts');
const defaults = require('./defaults');
const hookLoader = require('./utils/loader').default;

const {
  noop,
  mergeDeep,
  isFunction,
  createLogger,
  getTimeStamp,
} = require('./utils');

const HOST_NAME = hostname();

module.exports = class RediBox extends EventEmitter {
  /**
   * @class RediBox
   * RediBox Core Service
   * @param {Object} options Redis connection options
   * @param callback
   * @returns {RediBox} Returns new instance of RediBox
   */
  constructor(options, callback = noop) {
    super();
    if (isFunction(options)) {
      callback = options;
      options = {};
    }

    // unique name of this instance, useful for targeted pubsub / ipc for modules
    // to communicate to other instances - i.e. pause a queue on all instances.
    this.id = cuid();
    this.hooks = {};
    this.clients = {};
    this.scripts = scripts;
    this._hooksCount = 0;
    this._clientCount = 0;
    this._allClientCount = 0;
    this.bootedAtTimestamp = Date.now();
    this.options = mergeDeep(defaults(), options);
    this.log = createLogger(this.options.log);
    this.options.redis.cluster = !!this.options.redis.hosts && this.options.redis.hosts.length > 0;

    // setup connection timeout
    const connectionFailedTimer = setTimeout(() => {
      const error = new Error('Failed to connect to redis, please check your config / servers.');
      this.handleError(error);
      callback(error);
    }, this.options.redis.connectionTimeout);

    // https://github.com/luin/ioredis#error-handling
    Redis.Promise.onPossiblyUnhandledRejection(this.handleError);

    this.once(this.toEventName('client:default:ready'), () => {
      clearTimeout(connectionFailedTimer);
      // create a ref to default client for niceness
      this.client = this.clients.default;
      hookLoader(this)
        .then(() => {
          this.trumpWall();
          this.emit('ready');
          this.notifyHooks();
          callback();
        }, this.handleError).catch(this.handleError);
    });

    this.createClient('default');
    process.once('SIGTERM', this.quit);
    process.once('SIGINT', this.quit);
  }

  /**
   * Builds a great wall, of text.
   * TODO: occasionally leaks illegal immigrants
   */
  trumpWall() {
    this.log.silly('-----------------------');
    this.log.silly(' RediBox now ready \\o/ ');
    this.log.silly(`  - ${this._hooksCount} hooks.`);
    this.log.silly(`  - ${this._allClientCount} clients.`);
    this.log.silly('-----------------------\n');
  }

  /**
   * Send an event to all hooks
   * @param event
   * @param data
   */
  notifyHooks(event = 'core:ready', data = {}) {
    process.nextTick(() => {
      const hooks = Object.keys(this.hooks);
      for (let i = 0; i < hooks.length; i++) {
        const hookKey = hooks[i];
        if (this.hooks[hookKey].emit) {
          this.hooks[hookKey].emit(event, data);
        }
      }
    });
  }

  /**
   * Internal error Handler - just emits all errors.
   * Also optionally logs them to console.
   * @param {Error} error
   * @returns {null}
   */
  handleError = (error) => {
    /* istanbul ignore if */
    if (error) {
      if (!this.listeners('error', true)) {
        return this.log.error(error);
      }
      return this.emit('error', error);
    }
    return undefined;
  };

  /**
   * Creates a new redis client, connects and then onto the core class
   * @param name client name, this is also the property name on
   * @param target
   */
  /* eslint no-param-reassign:0 */
  createClient(name, target) {
    if (!target) target = this;

    let client;
    const readyEvent = target.toEventName(`client:${name}:ready`);

    // cluster connection
    if (this.options.redis.cluster) {
      this.log.debug(`Creating redis CLUSTER client. (${name})`);
      client = new Redis.Cluster(this.options.redis.hosts, this.options.redis);
      if (typeof this.options.redis.scaleReads === 'function') {
        client.readMode = 'custom';
      } else {
        client.readMode = this.options.redis.scaleReads;
      }
    } else {
      this.log.debug(`Creating redis client. (${name})`);
      client = new Redis(this.options.redis);
    }

    client.once('ready', () => {
      this.log.debug(`Redis client '${name}' is ready!`);
      // add scripts
      this.defineLuaCommands(this.scripts, client);
      // ready
      target.emit(readyEvent);
    });

    client.on('error', this.handleError);

    // attach to target
    if (!target.clients) target.clients = {};
    if (!target._clientCount) target._clientCount = 0;
    target.clients[name] = client;
    target._clientCount++;
    this._allClientCount++;

    return new Promise(resolve => target.once(readyEvent, resolve));
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
      timestamp: getTimeStamp(),
    };
  }

  /**
   * Disconnects the redis clients but first waits for pending replies.
   * @returns null
   */
  quit = () => {
    if (this.clients.default) {
      this.clients.default.quit();
    }

    // todo loop over custom clients

    process.removeListener('SIGTERM', this.quit);
    process.removeListener('SIGINT', this.quit);
  };

  /**
   * Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).
   */
  disconnect() {
    if (this.clients.default) {
      this.clients.default.disconnect();
    }

    // todo loop over custom clients

    process.removeListener('SIGTERM', this.quit);
    process.removeListener('SIGINT', this.quit);
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Checks if a redis client connection is ready.
   * @returns {Boolean} Client status
   */
  isClientConnected(client) {
    return client && client.status === 'ready';
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
    if (!this.clients.default[command]) {
      this.clients.default.defineCommand(command, { numberOfKeys, lua });
      if (!this[command]) {
        this[command] = this._customCommandWrapper(command, readOnly);
      }
      clientsWithCommand += 1;
    }

    // read only instance, if available and if the script is set as a ready only script
    if (this.clients.readOnly && !this.clients.readOnly[command] && readOnly) {
      this.clients.readOnly.defineCommand(command, { numberOfKeys, lua });
      clientsWithCommand += 1;
    }

    // return true/false if all possible clients got the command defined.
    return clientsWithCommand === (1 + (readOnly && this.options.redis.clusterScaleReads));
  }

  /**
   * Defines a lua command or commands on both clients;
   * @param customScripts
   * @param client
   * @returns {*}
   */
  defineLuaCommands(customScripts, client) {
    Object.keys(customScripts).forEach((key) => {
      const script = customScripts[key];
      const keyLower = key.toLowerCase();
      // quick validations
      if (!Object.hasOwnProperty.call(script, 'keys')) {
        return this.log.warn(
          `Script '${keyLower}' is missing required property 'key'! ...SKIPPED!`,
        );
      }

      if (!Object.hasOwnProperty.call(script, 'lua')) {
        return this.log.warn(
          `Script '${keyLower}' from is missing required property 'lua'! ...SKIPPED!`,
        );
      }

      // default instance
      if (!Object.hasOwnProperty.call(client, keyLower)) {
        this.log.debug(`Defining command for lua script '${keyLower}'.`);
        client.defineCommand(keyLower, {
          numberOfKeys: script.keys,
          lua: script.lua,
        });
      }

      return undefined;
    });
  }

  /**
   * Update a hooks config options
   * @param key
   * @param config
   * @private
   */
  setHookConfig(key, config) {
    this.options[key] = config;
  }

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
  toEventName = eventName => `core:${eventName}`;
};
