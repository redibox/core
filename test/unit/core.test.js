import { assert } from 'chai';
import RediBox from './../../src';
import { after } from './../../src/helpers';

describe('core', () => {
  it('Should fail to connect to a dead redis server', function testA(done) {
    this.timeout(5000);
    const redibox = new RediBox({
      redis: { port: 9999, connectionTimeout: 750 },
    });
    // error listener otherwise it gets thrown
    redibox.on('error', (error) => {
      assert.isNotNull(error);
      redibox.quit();
      done();
    });
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

  it('Should subscribeOnce and publish events from multiple channels', function testB(done) {
    this.timeout(9000);
    const redibox = new RediBox();
    const done3 = after(3, () => {
      redibox.quit();
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
    this.timeout(9000);
    const redibox = new RediBox({ logRedisErrors: true });
    const done10 = after(10, () => {
      redibox.quit();
      done();
    });
    redibox.once('ready', () => {
      redibox.subscribe([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], message => { // on message received listener
        assert.isUndefined(message.timeout);
        done10();
      }, error => { // on subscribed callback
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
