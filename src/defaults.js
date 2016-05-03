/*
 Default Configuration
 */
export default function () {
  return {
    logRedisErrors: false,
    redis: {
      prefix: 'rdb',
      publisher: true,
      subscriber: true,
      cluster: false,
      clusterScaleReads: true,
      connectionTimeout: 6000,
      host: '127.0.0.1',
      port: 6379,
      db: 0,
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
