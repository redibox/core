import ClusterHook from './hooks/ClusterHook';
import PubSubHook from './hooks/PubSubHook';

/*
 Default Configuration
 */
export default function () {
  return {
    redis: {
      // [START IORedis Config]

      // key read mode redis cluster nodes - only applies to cluster connections
      scaleReads: 'all', // https://github.com/luin/ioredis#read-write-splitting
      dropBufferSupport: false, // https://github.com/luin/ioredis/wiki/Improve-Performance#dropbuffersupport-option
      keyPrefix: 'rdb:',  // prefixes all keys created with this
      connectionTimeout: 6000,
      host: '127.0.0.1',
      port: 6379,
      db: 0,
      // hosts: [],
      // sentinels,
      // [END IORedis Config]
    },

    log: {
      level: 'error',
      label: 'RediBox',
      colorize: true,
      prettyPrint: true,
      logRedisErrors: false,
      humanReadableUnhandledException: true,
    },

    hooks: {
      // add core hooks, these can be overridden by user config if needed
      cluster: ClusterHook,
      pubsub: PubSubHook,
    },
  };
}
