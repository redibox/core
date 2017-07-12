const BaseHook = require('./BaseHook');

/**
 * Provides cluster utilities if in cluster mode
 */
module.exports = class extends BaseHook {
  constructor() {
    super('cluster');
    this._mountToCore = true;

    // proxy commands to this.exec
    return new Proxy(this, {
      get(target, name) {
        if (name in target) {
          return target[name];
        }

        // Fixes issue in chrome debugger & jam3/devtool
        if (name === 'inspect') return undefined;

        return (...args) => target.exec.apply(target, [name, ...args]);
      },
    });
  }

  /**
   * Send a command to all cluster master nodes - i.e. FLUSHALL
   * @param command
   * @param args
   * @returns {Promise}
   * @example
   *   RediBox.exec('flushall').then(function (result) {
          console.dir(result);
        }, function (error) {
          console.dir(error);
        });
   */
  exec(command, ...args) {
    if (!this.isCluster()) {
      return Promise.reject(new Error('Cannot exec: Not a cluster connection!'));
    }

    const nodes = this.client.nodes('master');

    if (!nodes.length) {
      return Promise.reject(new Error('Cannot exec: No master nodes found!'));
    }

    return Promise.all(nodes.map(node => node[command.toLowerCase()](...args)));
  }

  /**
   * Returns an array of all master and slave node addresses that
   * we have a redis connection to
   * @returns {Array}
   */
  getNodes() {
    if (!this.isCluster()) {
      return [];
    }
    return Object.keys(this.client.connectionPool.nodes.all);
  }

  /**
   * Returns an array of all the slave node addresses.
   * @returns {Array}
   */
  getSlaves() {
    if (!this.isCluster()) {
      return [];
    }
    return Object.keys(this.client.connectionPool.nodes.slave);
  }

  /**
   * Returns an array of all the master node addresses.
   * @returns {Array}
   */
  getMasters() {
    if (!this.isCluster()) {
      return [];
    }
    return Object.keys(this.client.connectionPool.nodes.master);
  }

  /**
   * Returns the individual cluster node connection instance.
   *  - Returns 'false' if not found.
   * @param address
   * @returns {*}
   */
  getNodeClient(address) {
    if (!this.isCluster()) {
      return undefined;
    }
    return this.client.connectionPool.nodes.all[address];
  }

  /**
   * Returns the mode the connections use for read requests
   * based on ioredis scaleReads option, returns either
   * all, slave, custom
   * @link https://github.com/luin/ioredis#read-write-splitting
   * @returns {boolean}
   */
  readMode() {
    if (!this.isCluster()) {
      return 'all';
    }

    return this.client.readMode;
  }

  /**
   * Returns if cluster or not.
   * @returns {boolean}
   */
  isCluster() {
    return this.core.options.redis.cluster;
  }
};
