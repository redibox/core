const RediBox = require('../../src/index').default;

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
  it('Should connect to a cluster and be able to read from slaves and masters', (done) => {
    setTimeout(done, 4000);
    const config = clusterConfig;
    config.redis.scaleReads = 'all';
    const redibox = new RediBox(config, (err) => {
      expect(err).toBeUndefined();
      expect(redibox.options.redis.cluster).toBeTruthy();
      expect(redibox.clients.default).toBeDefined();
      expect(redibox.client).toBeDefined();
      expect(redibox.cluster.readMode(), 'all').toBeDefined();
      redibox.quit();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });
});
