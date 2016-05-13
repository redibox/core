import { assert } from 'chai';
import RediBox from './../../src/core';

const clusterConfig = {
  log: { level: 'debug' },
  redis: {
    connectionTimeout: 2000,
    hosts: [
      {
        host: '127.0.0.1',
        port: 30001,
      },
      {
        host: '127.0.0.1',
        port: 30002,
      },
      {
        host: '127.0.0.1',
        port: 30003,
      },
      {
        host: '127.0.0.1',
        port: 30004,
      },
      {
        host: '127.0.0.1',
        port: 30005,
      },
      {
        host: '127.0.0.1',
        port: 30006,
      },
    ],
  },
};

/**
 * These tests require a cluster running locally:
 * Just type the following commands using the redis create-cluster script
 * which can be found in the redis download package under utils/create-cluster.
 *    1) create-cluster start
 *    2) create-cluster create
 */

describe('cluster', () => {
  it('Should connect to a cluster and be able to read from slaves and masters', function testA(done) {
    this.timeout(4000);
    const config = clusterConfig;
    config.redis.scaleReads = 'all';
    const redibox = new RediBox(config, (err) => {
      assert.isUndefined(err);
      assert.isTrue(redibox.options.redis.cluster);
      assert.isDefined(redibox.clients.default);
      assert.isDefined(redibox.client);
      assert.isDefined(redibox.cluster.readMode(), 'all');
      redibox.quit();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an empty arrays of node addresses when not a cluster', function testB(done) {
    const redibox = new RediBox(() => {
      assert.isFalse(redibox.options.redis.cluster);
      assert.deepEqual(redibox.cluster.getMasters(), []);
      assert.deepEqual(redibox.cluster.getSlaves(), []);
      assert.deepEqual(redibox.cluster.getNodes(), []);
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an array of redis slave node addresses', function testB(done) {
    const redibox = new RediBox(clusterConfig, () => {
      assert.isTrue(redibox.options.redis.cluster);
      assert.isObject(redibox.clients.default.connectionPool.nodes.slave);
      const slavesExpected = ['127.0.0.1:30004', '127.0.0.1:30005', '127.0.0.1:30006'];
      const slaves = redibox.cluster.getSlaves();
      assert.isArray(slaves);
      assert.equal(slaves.length, 3);
      assert.oneOf(slaves[0], slavesExpected);
      assert.oneOf(slaves[1], slavesExpected);
      assert.oneOf(slaves[2], slavesExpected);
      redibox.quit();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an array of redis master node addresses', function testB(done) {
    const redibox = new RediBox(clusterConfig, () => {
      assert.isTrue(redibox.options.redis.cluster);
      assert.isObject(redibox.clients.default.connectionPool.nodes.master);
      const mastersExpected = ['127.0.0.1:30001', '127.0.0.1:30002', '127.0.0.1:30003'];
      const masters = redibox.cluster.getMasters();
      assert.isArray(masters);
      assert.equal(masters.length, 3);
      assert.oneOf(masters[0], mastersExpected);
      assert.oneOf(masters[1], mastersExpected);
      assert.oneOf(masters[2], mastersExpected);
      redibox.quit();
      done();
    });
  });

  it('Should return an array of all redis node addresses', function testB(done) {
    const redibox = new RediBox(clusterConfig, () => {
      assert.isTrue(redibox.cluster.isCluster());
      assert.isObject(redibox.clients.default.connectionPool.nodes.all);
      const allExpected = [
        '127.0.0.1:30001', '127.0.0.1:30002', '127.0.0.1:30003',
        '127.0.0.1:30006', '127.0.0.1:30004', '127.0.0.1:30005',
      ];
      const all = redibox.cluster.getNodes();
      assert.isArray(all);
      assert.equal(all.length, 6);
      assert.oneOf(all[0], allExpected);
      assert.oneOf(all[1], allExpected);
      assert.oneOf(all[2], allExpected);
      assert.oneOf(all[3], allExpected);
      assert.oneOf(all[4], allExpected);
      assert.oneOf(all[5], allExpected);
      redibox.quit();
      done();
    });
  });
});
