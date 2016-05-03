const Rbox = require('./../lib');
var cuid = require('cuid');
//const mergeDeep = require('./../lib/helpers').mergeDeep;
//const Benchmark = require('benchmark');

/**
 * To benchmark with a local cluster,
 * Just type the following commands using the redis create-cluster script
 * which can be found in the redis download archive under utils/create-cluster.
 *    1) create-cluster start
 *    2) create-cluster create
 *
 */

// create new instance of RediBox
const RediBox = new Rbox({
  // redis: {
  //   cluster: true,
  //   prefix: 'test',
  //   clusterScaleReads: false,
  //   subscriber: true, // enables pubsub subscriber client
  //   publisher: true,  // enables pubsub publisher client
  //   hosts: [
  //     {
  //       host: '127.0.0.1',
  //       port: 30001,
  //     },
  //     {
  //       host: '127.0.0.1',
  //       port: 30002
  //     },
  //     {
  //       host: '127.0.0.1',
  //       port: 30003,
  //     },
  //     {
  //       host: '127.0.0.1',
  //       port: 30004,
  //     },
  //     {
  //       host: '127.0.0.1',
  //       port: 30005,
  //     },
  //     {
  //       host: '127.0.0.1',
  //       port: 30006,
  //     },
  //   ],
  // },
  log: {
    level: 'verbose',
  },
});

RediBox.on('error', function (error) {
  RediBox.log.error(error);
});

RediBox.on('ready', function (status) {
  RediBox.log.info(`Client status is: ${status.client}`);

  RediBox.readWrite.hset(RediBox.toKey(`scheduler:schedules`), 'testScheduleId', JSON.stringify({
    _id: 'meow',
    _shasum: 'hedherthjdh',
    _repeat: 45,
    _function: ''
  })).then(function (result) {
    console.log(result);
  }).catch(function (err) {
    console.error(err);
  })

  RediBox.getClient().hset(RediBox.toKey(`scheduler:schedules`), 'testScheduleId2', JSON.stringify({
    _id: 'badabingbadaboom',
    _shasum: 'UHOHHHHH',
    _repeat: 60
  })).then(function (result) {
    console.log(result);
  }).catch(function (err) {
    console.error(err);
  })

});
