const RediBox = require('./../..').default;

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

describe('core hooks - cluster', () => {
  it('Should return an empty arrays of node addresses when not a cluster', function testB(done) {
    const redibox = new RediBox(() => {
      expect(redibox.options.redis.cluster).toBe(false);
      expect(redibox.cluster.getMasters()).toEqual([]);
      expect(redibox.cluster.getSlaves()).toEqual([]);
      expect(redibox.cluster.getNodes()).toEqual([]);
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an array of redis slave node addresses', (done) => {
    const redibox = new RediBox(clusterConfig, () => {
      expect(redibox.options.redis.cluster).toBe(true);
      expect(typeof redibox.clients.default.connectionPool.nodes.slave).toBe('object');
      const slavesExpected = ['127.0.0.1:30004', '127.0.0.1:30005', '127.0.0.1:30006'];
      const slaves = redibox.cluster.getSlaves();
      expect(Array.isArray(slaves)).toBe(true);
      expect(slaves).toHaveLength(3);
      expect(slavesExpected).toContain(slaves[0]);
      expect(slavesExpected).toContain(slaves[1]);
      expect(slavesExpected).toContain(slaves[2]);
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an array of redis master node addresses', (done) => {
    const redibox = new RediBox(clusterConfig, () => {
      expect(redibox.options.redis.cluster).toBe(true);
      expect(typeof redibox.clients.default.connectionPool.nodes.master).toBe('object');
      const mastersExpected = ['127.0.0.1:30001', '127.0.0.1:30002', '127.0.0.1:30003'];
      const masters = redibox.cluster.getMasters();
      expect(Array.isArray(masters)).toBe(true);
      expect(masters).toHaveLength(3);
      expect(mastersExpected).toContain(masters[0]);
      expect(mastersExpected).toContain(masters[1]);
      expect(mastersExpected).toContain(masters[2]);
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should return an array of all redis node addresses', function testB(done) {
    const redibox = new RediBox(clusterConfig, () => {
      expect(redibox.options.redis.cluster).toBe(true);
      expect(typeof redibox.clients.default.connectionPool.nodes.all).toBe('object');
      const allExpected = [
        '127.0.0.1:30001', '127.0.0.1:30002', '127.0.0.1:30003',
        '127.0.0.1:30006', '127.0.0.1:30004', '127.0.0.1:30005',
      ];
      const all = redibox.cluster.getNodes();
      expect(Array.isArray(all)).toBe(true);
      expect(all).toHaveLength(6);
      expect(allExpected).toContain(all[0]);
      expect(allExpected).toContain(all[1]);
      expect(allExpected).toContain(all[2]);
      expect(allExpected).toContain(all[3]);
      expect(allExpected).toContain(all[4]);
      expect(allExpected).toContain(all[5]);
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  // TODO - accessing an individual redis node breaks ioredis - wut o.O
  it('Should return an individual cluster node connection', (done) => {
    const redibox = new RediBox(clusterConfig, () => {
      const node1 = redibox.cluster.getNodeClient('127.0.0.1:30001');
      // NEVER GETS HERE, just hangs or disconnects
      expect(node1.options.port).toBe(30001);
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should proxy redis commands to all redis node masters', (done) => {
    const redibox = new RediBox(clusterConfig, () => {
      expect(redibox.cluster.isCluster()).toBe(true);
      redibox.cluster.flushall().then((result) => {
        expect(result).toHaveLength(3);
        expect(result[0]).toBe('OK');
        expect(result[1]).toBe('OK');
        expect(result[2]).toBe('OK');
        redibox.disconnect();
        done();
      });
    });
  });
});
