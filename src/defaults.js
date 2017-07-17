const ClusterHook = require('./hooks/ClusterHook');
const PubSubHook = require('./hooks/PubSubHook');

/*
 Default Configuration
 */
module.exports = () => ({
  redis: {
    // key read mode redis cluster nodes - only applies to cluster connections
    // only applies to cluster connections
    // see: https://github.com/luin/ioredis#read-write-splitting
    scaleReads: 'all',

    // disable this if you need to save buffers on redis, keeping this on improves performance
    dropBufferSupport: true, // https://github.com/luin/ioredis/wiki/Improve-Performance#dropbuffersupport-option

    // prefixes all keys created by the redis clients with this
    keyPrefix: 'rdb:',

    // how long before a connection request times out - in milliseconds
    connectionTimeout: 6000,

    // your host name, defaults to a local instance
    host: '127.0.0.1',

    // server port
    port: 6379,

    // default db - only applies to non-cluster connections,
    db: 0,

    // to connect to a cluster provide an array of objects with host and port properties
    // hosts: [],

    // to connect to a sentinel setup provide an array of objects with host and port properties
    // sentinels: [],
  },

  // config for the core pubsub hook
  pubsub: {
    // enable if you're going to be subscribing to events
    // this creates a separate redis connection internally for sub events.
    subscriber: false,

    // enable if you're going to be publishing events
    // this creates a separate redis connection internally for publishing events.
    publisher: false,

    // by default all pubsub key/event names are prefixed with this option
    eventPrefix: 'rdb',
  },

  // built in logging options
  // this uses winston so for a more detailed view of options see the winston repo:
  // https://github.com/winstonjs/winston#using-the-default-logger
  log: {
    level: 'error',
    label: 'RediBox',
    colorize: true,
    prettyPrint: true,
    humanReadableUnhandledException: true,
  },

  // default core hooks
  hooks: {
    // built-in core hooks - these can be removed by setting key props to falsey values
    cluster: ClusterHook,
    pubsub: PubSubHook,
  },
});
