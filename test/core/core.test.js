/* eslint no-underscore-dangle: 0 */
import { assert } from 'chai';
import RediBox, { after } from './../../src/core';

describe('core', () => {
  it('Should timeout to connecting to a offline redis server', function testA(done) {
    this.timeout(200);
    const redibox = new RediBox({
      redis: { port: 9999, connectionTimeout: 150 },
    });
    // error listener otherwise it gets thrown
    redibox.on('error', (error) => {
      assert.isNotNull(error);
      redibox.quit();
      done();
    });
  });

  it('Should callback when ready if a callback was provided', done => {
    const redibox = new RediBox((error, status) => {
      assert.isNull(error);
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

    assert.isDefined(redibox._redisError);
    assert.isFalse(redibox.options.logRedisErrors);
    assert.isDefined(redibox.emit);
    assert.isUndefined(redibox._redisError());
    redibox._redisError('failFish');

    // these don't exist on EE3 compared to nodes EE
    assert.isUndefined(redibox.listenerCount);
  });

  it('Should return original message if _tryJSONParse fails', done => {
    const redibox = new RediBox();
    const failJson = '{ boopBeep: failJsonString';
    assert.isDefined(redibox._tryJSONParse);
    assert.equal(failJson, redibox._tryJSONParse(failJson));
    redibox.quit();
    done();
  });

  it('Should connect to redis using default config', function testB(done) {
    this.timeout(9000);
    const redibox = new RediBox();
    redibox.once('ready', (status) => {
      assert.isNotNull(status);
      redibox.getClient().get('test', (err) => {
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

  it('Should create a subscriber client if option set', done => {
    const redibox = new RediBox({ redis: { subscriber: true } });
    assert.isDefined(redibox.clients.subscriber);
    redibox.quit();
    done();
  });

  it('Should create a publisher client if option set', done => {
    const redibox = new RediBox({ redis: { publisher: true } });
    assert.isDefined(redibox.clients.publisher);
    redibox.quit();
    done();
  });

  it('Should be able to create custom clients using original config', done => {
    const redibox = new RediBox();
    assert.equal(redibox.createClient('fooBob', () => {
      assert.isDefined(redibox.clients.fooBob);
      assert.isTrue(redibox.isClientConnected(redibox.clients.fooBob));
      redibox.quit();
      done();
    }).constructor.name, 'Redis');
  });

  it('TODO: Should be able to create custom clients using custom config', done => {
    const redibox = new RediBox();
    assert.equal(redibox.createClient('fooBobCustom', () => {
      assert.isDefined(redibox.clients.fooBobCustom);
      assert.isTrue(redibox.isClientConnected(redibox.clients.fooBobCustom));
      redibox.quit();
      done();
    }).constructor.name, 'Redis');
  });

  it('Should subscribeOnce and publish events from multiple channels', function testB(done) {
    this.timeout(1000);
    const redibox = new RediBox();

    redibox.on('error', (error) => {
      console.dir(error);
    });

    const done3 = after(3, () => {
      redibox.disconnect();
      done();
    });

    redibox.once('ready', () => {
      redibox.subscribeOnce([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], message => { // on message received listener
        assert.isUndefined(message.timeout);
        done3();
      }, error => { // on subscribed callback
        assert.isNull(error);

        redibox.publish([
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1', // twice to confirm once works
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart3',
        ], {
          someArray: [1, 2, 3, 4, 5],
          somethingElse: 'foobar',
        });
      }, 3000);
    });
  });

  it('Should subscribe and publish events from multiple channels many times', function testB(done) {
    /* eslint no-var:0 */
    var listener;
    this.timeout(9000);
    const redibox = new RediBox({ logRedisErrors: true });

    const done10 = after(10, () => {
      redibox.unsubscribe([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], listener, () => {
        redibox.disconnect();
        done();
      });
    });

    listener = message => { // on message received listener
      assert.isUndefined(message.timeout);
      done10();
    };

    redibox.once('ready', () => {
      redibox.subscribe([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], listener, error => { // on subscribed callback
        assert.isNull(error);

        redibox.publish([
          // x3
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1',
          // x3
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart2',
          // x3
          'requestID-123456:request:dataPart3',
          'requestID-123456:request:dataPart3',
          'requestID-123456:request:dataPart3',
        ], {
          someArray: [1, 2, 3, 4, 5],
          somethingElse: 'foobar',
        }, done10);
      }, 3000);
    });
  });
});
