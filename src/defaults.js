/*
 Default Configuration
 */
export default function () {
  return {
    logRedisErrors: false,
    redis: {
      // [START RediBox Config]
      // enable the publisher client
      publisher: true,

      // enable the subscriber client
      subscriber: true,

      // prefix all PUBSUB events with this string
      eventPrefix: 'rdb:',

      // scale key reads to read only redis cluster nodes - only applies to cluster connections
      clusterScaleReads: true,
       // [END RediBox Config]

      // [START IORedis Config]
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
      level: 'warn',
      label: 'RediBox',
      colorize: true,
      prettyPrint: true,
      humanReadableUnhandledException: true,
    },
  };
}
