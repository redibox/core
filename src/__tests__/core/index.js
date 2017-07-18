const RediBox = require('../../').default;

describe('core', () => {
  it('Should error when connecting to a offline redis server', (done) => {
    setTimeout(done, 200);
    expect.assertions(1);
    const redibox = new RediBox({
      redis: { port: 9999, connectionTimeout: 150 },
    });
    // error listener otherwise it gets thrown
    redibox.once('error', (error) => {
      expect(error).not.toBeNull();
      redibox.disconnect();
      done();
    });
  });

  it('Should callback when ready if a callback was provided', (done) => {
    const redibox = new RediBox((error, status) => {
      expect(error).toBeUndefined();
      expect(status).not.toBeNull();
      redibox.quit();
      done();
    });
  });

  it('Should extend `eventemitter3`', (done) => {
    const redibox = new RediBox();
    expect(redibox.emit).toBeDefined();
    expect(redibox.on).toBeDefined();
    expect(redibox.once).toBeDefined();

    // these don't exist on EE3 compared to nodes EE
    expect(redibox.listenerCount).toBeUndefined();
    redibox.quit();
    done();
  });

  it('Should internally emit redis errors', (done) => {
    const redibox = new RediBox();
    redibox.on('error', (error) => {
      expect(error).not.toBeNull();
      expect(error).toEqual('failFish');
      redibox.quit();
      done();
    });

    expect(redibox.handleError).toBeDefined();
    expect(redibox.emit).toBeDefined();
    expect(redibox.handleError()).toBeUndefined();
    redibox.handleError('failFish');
    // these don't exist on EE3 compared to nodes EE
    expect(redibox.listenerCount).toBeUndefined();
  });

  it('Should connect to redis using default config', (done) => {
    setTimeout(done, 9000);
    expect.assertions(2);
    const redibox = new RediBox();
    redibox.once('ready', (status) => {
      expect(status).not.toBeNull();
      redibox.client.get('test', (err) => {
        expect(err).toBeNull();
        redibox.quit();
        done();
      });
    });
  });

  it('Should provide host details of the current instance', (done) => {
    const redibox = new RediBox();
    const hostInfo = redibox.hostInfo();
    expect(hostInfo).not.toBeNull();
    expect(hostInfo.id).toBeDefined();
    expect(hostInfo.process).toBeDefined();
    expect(hostInfo.process.host_name).toBeDefined();
    expect(hostInfo.process.started_at).toBeDefined();
    expect(hostInfo.process.up_time).toBeDefined();
    expect(hostInfo.process.version).toBeDefined();
    expect(hostInfo.process.pid).toBeDefined();
    expect(hostInfo.timestamp).toBeDefined();
    redibox.quit();
    done();
  });

  it('Should have a unique identifier for the created instance', (done) => {
    const redibox = new RediBox();
    expect(redibox.id).toBeDefined();
    expect(typeof redibox.id).toBe('string');
    redibox.quit();
    done();
  });


  it('Should be able to create custom clients using original config', (done) => {
    setTimeout(done, 2000);
    expect.assertions(2);
    const redibox = new RediBox();
    redibox.createClient('fooBob', redibox).then(() => {
      expect(redibox.clients.fooBob).toBeDefined();
      expect(redibox.isClientConnected(redibox.clients.fooBob)).toBe(true);
      redibox.quit();
      done();
    });
  });

  it('TODO: Should be able to create custom clients using custom config', (done) => {
    setTimeout(done, 2000);
    expect.assertions(2);
    const redibox = new RediBox();
    redibox.createClient('fooBobCustom', redibox).then(() => {
      expect(redibox.clients.fooBobCustom).toBeDefined();
      expect(redibox.isClientConnected(redibox.clients.fooBobCustom)).toBe(true);
      redibox.quit();
      done();
    });
  });

  it('Should provide some default lua commands', (done) => {
    const redibox = new RediBox((error, status) => {
      expect(redibox.client.lcap).toBeDefined();
      expect(redibox.client.setnxex).toBeDefined();
      expect(redibox.client.psetnxex).toBeDefined();
      expect(status).not.toBeNull();
      redibox.quit();
      done();
    });
  });
});
