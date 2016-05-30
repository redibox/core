import { assert } from 'chai';
import RediBox from './../../src';

const clusterConfig = {
  log: { level: 'error' },
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
});
