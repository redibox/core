/* eslint no-underscore-dangle: 0 */
import { assert } from 'chai';
import RediBox, { after } from './../../src';

describe('core hooks - pubsub', () => {
  it('Should create a subscriber client if option set', done => {
    const redibox = new RediBox({ pubsub: { subscriber: true } });
    redibox.on('ready', () => {
      assert.isDefined(redibox.pubsub.clients.subscriber);
      redibox.disconnect();
      done();
    });
  });

  it('Should create a publisher client if option set', done => {
    const redibox = new RediBox({ pubsub: { publisher: true } });
    redibox.on('ready', () => {
      assert.isDefined(redibox.pubsub.clients.publisher);
      redibox.disconnect();
      done();
    });
  });

  it('Should subscribeOnce and publish events from multiple channels', function testB(done) {
    this.timeout(3000);
    const redibox = new RediBox({ pubsub: { subscriber: true, publisher: true } });

    redibox.on('error', (error) => {
      console.dir(error);
    });

    const done3 = after(3, () => {
      redibox.disconnect();
      done();
    });

    redibox.once('ready', () => {
      redibox.pubsub.subscribeOnce([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], message => { // on message received listener
        assert.isUndefined(message.timeout);
        done3();
      }, 3000).then(() => {
        redibox.pubsub.publish([
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1', // twice to confirm once works
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart3',
        ], {
          someArray: [1, 2, 3, 4, 5],
          somethingElse: 'foobar',
        });
      }).catch(error => assert.isNull(error));
    });
  });


  it('Should subscribeOnce and timeout if option set', function testB(done) {
    this.timeout(500);
    const redibox = new RediBox({ pubsub: { subscriber: true, publisher: true } });

    redibox.on('error', (error) => {
      console.dir(error);
    });

    const done1 = after(1, () => {
      redibox.disconnect();
      done();
    });

    redibox.once('ready', () => {
      redibox.pubsub.subscribeOnce([
        'requestID-123456:request:dataPart1',
      ], message => { // on message received listener
        assert.isDefined(message.timeout);
        done1();
      }, 25).then(() => {
      }).catch(error => assert.isNull(error));
    });
  });

  it('Should subscribeOnceOf and timeout if option set', function testB(done) {
    this.timeout(500);
    const redibox = new RediBox({ pubsub: { subscriber: true, publisher: true } });

    redibox.on('error', (error) => {
      console.dir(error);
    });

    const done1 = after(1, () => {
      redibox.disconnect();
      done();
    });

    redibox.once('ready', () => {
      redibox.pubsub.subscribeOnceOf([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
      ], message => { // on message received listener
        assert.isDefined(message.timeout);
        done1();
      }, 25).then(() => {
      }).catch(error => assert.isNull(error));
    });
  });

  it('Should subscribe and publish events from multiple channels many times', function testB(done) {
    /* eslint no-var:0 */
    var listener;
    this.timeout(9000);
    const redibox = new RediBox({ logRedisErrors: true, pubsub: { subscriber: true, publisher: true} });

    const done10 = after(9, () => {
      redibox.pubsub.unsubscribe([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], listener).then(() => {
        redibox.disconnect();
        done();
      });
    });

    listener = message => { // on message received listener
      assert.isUndefined(message.timeout);
      done10();
    };

    redibox.once('ready', () => {
      redibox.pubsub.subscribe([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], listener).then(() => { // on subscribed callback
        redibox.pubsub.publish([
          // x3
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1',
          // x3
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart2',
          // x3
          'requestID-123456:request:dataPart3',
          'requestID-123456:request:dataPart3',
        ], {
          someArray: [1, 2, 3, 4, 5],
          somethingElse: 'foobar',
        });
        redibox.pubsub.publish('requestID-123456:request:dataPart3', []);
        redibox.pubsub.publish('requestID-123456:request:dataPart2', 'hello');
      });
    });
  });

  it('Should subscribeOnce of multiple channels and unsub from all chans on the first event', function testB(done) {
    this.timeout(3000);
    const redibox = new RediBox({ pubsub: { subscriber: true, publisher: true } });

    redibox.on('error', (error) => {
      console.dir(error);
    });

    const done3 = after(1, () => {
      redibox.disconnect();
      done();
    });

    redibox.once('ready', () => {
      redibox.pubsub.subscribeOnceOf([
        'requestID-123456:request:dataPart1',
        'requestID-123456:request:dataPart2',
        'requestID-123456:request:dataPart3',
      ], message => { // on message received listener
        assert.isUndefined(message.timeout);
        done3();
      }, 3000).then(() => {
        redibox.pubsub.publish([
          'requestID-123456:request:dataPart1',
          'requestID-123456:request:dataPart1', // twice to confirm once works
          'requestID-123456:request:dataPart2',
          'requestID-123456:request:dataPart3',
        ], {
          someArray: [1, 2, 3, 4, 5],
          somethingElse: 'foobar',
        });
      }).catch(error => assert.isNull(error));
    });
  });
});
