import { assert } from 'chai';
import RediBox from './../../src/core';

/**
 * These tests require a cluster running locally:
 * Just type the following commands using the redis create-cluster script
 * which can be found in the redis download package under utils/create-cluster.
 *    1) create-cluster start
 *    2) create-cluster create
 */

describe('core cluster', () => {
  it('Should connect to a cluster and create an additional READONLY client', function testA(done) {
    this.timeout(9000);
    const redibox = new RediBox({
      redis: {
        cluster: true,
        clusterScaleReads: true,
        connectionTimeout: 9000,
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
    }, (err, rdbStatus) => {
      assert.equal(rdbStatus.client, 'ready');
      assert.equal(rdbStatus.client_read, 'ready');
      assert.isNull(err, 'Cluster Connected!');
      assert.isDefined(redibox.clients.readWrite);
      assert.isDefined(redibox.clients.readOnly);
      redibox.quit();
      done();
    });
    redibox.on('error', (e) => {
    });
  });

  it('Should connect to a cluster and create a single client only.', function testB(done) {
    this.timeout(6000);
    const redibox = new RediBox({
      redis: {
        cluster: true,
        clusterScaleReads: false, // single client only
        connectionTimeout: 3500,
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
    }, (err, rdbStatus) => {
      assert.equal(rdbStatus.client, 'ready');
      assert.equal(rdbStatus.client_read, null);
      assert.isDefined(redibox.clients.readWrite);
      assert.isUndefined(redibox.clients.readOnly);
      assert.isNull(err, 'Cluster Connected!');
      redibox.quit();
      done();
    });
    redibox.on('error', (e) => {
    });
  });
});
