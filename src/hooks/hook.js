import EventEmitter from 'eventemitter3';
import {} from './../helpers';

class Hook extends EventEmitter {

  constructor(name) {
    super();
    this.name = name.toLowerCase();
    this.core = null;
    this.defaultClient = null;
    this.clients = {};
    this.options = {};
    this._mounted = false;
  }

  /**
   * Just a stub, meant to be overridden in custom hook
   * @returns {Promise.<T>}
   */
  initialize() {
    return Promise.resolve();
  }

  /**
   *
   * @returns {{}}
   */
  defaults() {
    return {};
  }

  /**
   *
   * @param core
   * @private
   */
  _setCore(core) {
    this.core = core;
    // setup the default client
    this.defaultClient = this.core.clients.readWrite;
  }

  /**
   * Wrapper to create a client, clients created are located at Hook.clients.clientName
   * @param clientName
   * @param readOnly
   * @param readyCallback
   * @returns {*}
   */
  createClient(clientName, readOnly, readyCallback) {
    return this.core.createClient(clientName, readOnly, readyCallback, this.clients);
  }

  /**
   *
   */
  _mount() {
    if (!this._mounted) {
      // attach to hooks
      this.core.hooks[this.name] = this;

      // update mount state
      this._mounted = true;
      this._emitInternalEvent('mount');
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
   * Drops all custom redis clients and removes key from redibox.hooks
   * @private
   */
  _unmount() {
    if (this._mounted) {
      this.core.hooks[this.name] = undefined;
      this._mounted = false;
      this._emitInternalEvent('unmount');
    }
  }

  /**
   * Add the eventPrefix to an event name
   * @param eventName
   * @returns {string}
   */
  toEventName = eventName => `hook:${this.name}:${eventName}`;
}
