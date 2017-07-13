const EventEmitter = require('eventemitter3');

module.exports = class extends EventEmitter {

  static className = 'BaseHook';

  constructor(name) {
    super();
    this.core = {};
    this.client = {};
    this.clients = {};
    this.options = {};
    this._clientCount = 0;
    this._mounted = false;
    this.hookTimeout = 10000; // 10s
    this._mountToCore = false;
    this.name = name.toLowerCase();
  }

  /**
   * Just a stub, meant to be overridden in custom hook
   * @returns {Promise.<T>}
   */
  initialize() {
    return Promise.resolve();
  }

  /**
   * Stub function to return config defaults for the hook
   * @returns {{}}
   */
  defaults() {
    return {};
  }

  /**
   * Stub function to return scripts for the hook
   * @returns {{}}
   */
  scripts() {
    return {};
  }

  /**
   * Returns the number of connections this hook has made
   * @returns {Number}
   */
  getClientCount() {
    return this._clientCount;
  }

  /**
   * Setup references to core, logger and the default client
   * @param core
   * @private
   */
  _setCore(core) {
    // setup redibox core ref
    this.core = core;
    // setup logger ref
    this.log = this.core.log;
    // setup the default client ref
    this.client = this.core.clients.default;
  }

  /**
   * Wrapper to create a client, clients created are located at Hook.clients.clientName
   * @param clientName
   * @returns {*}
   */
  createClient(clientName) {
    return this.core.createClient(clientName, this);
  }

  /**
   * Attach hook to the core.hooks namespace if not already mounted.
   * @private
   */
  _mount() {
    if (!this._mounted) {
      // TODO reconnect client connections if from a previous unmount
      if (this._mountToCore) {
        // internal flag to make the mount point be on core.name
        // rather than core.hooks.name
        this.core[this.name] = this;
      } else {
        // attach to hooks
        this.core.hooks[this.name] = this;
      }

      // update mount state
      this._mounted = true;
      this._emitInternalEvent('mount');
    }
  }

  /**
   * Drops all custom redis clients and removes key from redibox.hooks
   * @private
   */
  _unmount() {
    if (this._mounted) {
      // TODO quit client connections gracefully first
      if (this._mountToCore) {
        // internal flag to make the mount point be on core.name
        // rather than core.hooks.name
        delete this.core[this.name];
      } else {
        // attach to hooks
        delete this.core.hooks[this.name];
      }
      this._mounted = false;
      this._emitInternalEvent('unmount');
    }
  }

  /**
   *
   * @param event
   * @param data
   * @private
   */
  _emitInternalEvent(event, data) {
    this.emit(event, data);
    if (this.core) this.core.emit(this.toEventName(event, data));
  }

  /**
   * Add the eventPrefix to an event name
   * @param eventName
   * @returns {string}
   */
  toEventName = eventName => `hook:${this.name}:${eventName}`;
};
