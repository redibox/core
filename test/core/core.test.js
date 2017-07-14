const { assert } = require('chai');
const RediBox = require('./../../src').default;

describe('core', () => {
  it('Should error when connecting to a offline redis server', function testA(done) {
    this.timeout(200);
    const redibox = new RediBox({
      redis: { port: 9999, connectionTimeout: 150 },
    });
    // error listener otherwise it gets thrown
    redibox.once('error', (error) => {
      assert.isNotNull(error);
      redibox.disconnect();
      done();
    });
  });

  it('Should callback when ready if a callback was provided', done => {
    const redibox = new RediBox((error, status) => {
      assert.isUndefined(error);
      assert.isNotNull(status);
      redibox.quit();
      done();
    });
  });

  it('Should extend `eventemitter3`', done => {
    const redibox = new RediBox();
    assert.isDefined(redibox.emit);
    assert.isDefined(redibox.on);
    assert.isDefined(redibox.once);

    // these don't exist on EE3 compared to nodes EE
    assert.isUndefined(redibox.listenerCount);
    redibox.quit();
    done();
  });

  it('Should internally emit redis errors', done => {
    const redibox = new RediBox();
    redibox.on('error', (error) => {
      assert.isNotNull(error);
      assert.equal(error, 'failFish');
      redibox.quit();
      done();
    });

    assert.isDefined(redibox.handleError);
    assert.isDefined(redibox.emit);
    assert.isUndefined(redibox.handleError());
    redibox.handleError('failFish');

    // these don't exist on EE3 compared to nodes EE
    assert.isUndefined(redibox.listenerCount);
  });

  it('Should connect to redis using default config', function testB(done) {
    this.timeout(9000);
    const redibox = new RediBox();
    redibox.once('ready', (status) => {
      assert.isNotNull(status);
      redibox.client.get('test', (err) => {
        assert.isNull(err);
        redibox.quit();
        done();
      });
    });
  });

  it('Should provide host details of the current instance', done => {
    const redibox = new RediBox();
    const hostInfo = redibox.hostInfo();
    assert.isNotNull(hostInfo);
    assert.isDefined(hostInfo.id);
    assert.isDefined(hostInfo.process);
    assert.isDefined(hostInfo.process.host_name);
    assert.isDefined(hostInfo.process.started_at);
    assert.isDefined(hostInfo.process.up_time);
    assert.isDefined(hostInfo.process.version);
    assert.isDefined(hostInfo.process.pid);
    assert.isDefined(hostInfo.timestamp);
    redibox.quit();
    done();
  });

  it('Should have a unique identifier for the created instance', done => {
    const redibox = new RediBox();
    assert.isDefined(redibox.id);
    assert.isString(redibox.id);
    redibox.quit();
    done();
  });


  it('Should be able to create custom clients using original config', done => {
    const redibox = new RediBox();
    redibox.createClient('fooBob', redibox).then(() => {
      assert.isDefined(redibox.clients.fooBob);
      assert.isTrue(redibox.isClientConnected(redibox.clients.fooBob));
      redibox.quit();
      done();
    });
  });

  it('TODO: Should be able to create custom clients using custom config', done => {
    const redibox = new RediBox();
    redibox.createClient('fooBobCustom', redibox).then(() => {
      assert.isDefined(redibox.clients.fooBobCustom);
      assert.isTrue(redibox.isClientConnected(redibox.clients.fooBobCustom));
      redibox.quit();
      done();
    });
  });

  it('Should provide some default lua commands', done => {
    const redibox = new RediBox((error, status) => {
      assert.isDefined(redibox.client.lcap);
      assert.isDefined(redibox.client.setnxex);
      assert.isDefined(redibox.client.psetnxex);
      assert.isNotNull(status);
      redibox.quit();
      done();
    });
  });
});
