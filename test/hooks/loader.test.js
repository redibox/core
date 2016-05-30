/* eslint no-underscore-dangle: 0 */
import { assert } from 'chai';
import RediBox, { BaseHook } from './../../src';

class CoolHook extends BaseHook {
  constructor() {
    // super with the hook name
    // also used for the hooks key name
    // e.g this will mount at RediBox.hooks.cool
    super('cool');
  }

  /**
   * This is called when redibox is ready to init this hook.
   * Do all your bootstrapping here.
   * @returns {Promise.<T>}
   */
  initialize() {
    // this.core - the redibox core instance
    // this.log - the redibox core logger, auto prefixes with hook name
    // this.options - the user provided options pre-merged with defaults from this.defaults()
    // this.defaultClient -  the default redis client that redibox core uses
    // this.clients - where all this hooks custom redis clients live
    // options will have `kittenSays` and `explodingKittens`
    this.log.info(this.options);
    // create new redis client connections if needed
    return this.createClient('coolio', this); // returns a promise
    // you now have a client at 'this.clients.coolio'
  }

  /**
   * Return the default config - core will automatically merge this with the
   * user provided options for this hook.
   * @returns {{someDefaultThing: string}}
   */
  defaults() {
    return {
      kittenSays: 'meow',
    };
  }

  /**
   * Add whatever you want
   * @param bool
   */
  isThisCoolOrWhat(bool) {
    this.log.info(bool ? 'yes this is cool' : 'erm nah');
  }

}

describe('core hooks - loader', () => {
  it('Should mount hooks to the core.hooks namespace', function testB(done) {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      assert.isTrue(redibox.hooks.hasOwnProperty('cool'));
      assert.equal(redibox.hooks.cool.getClientCount(), 1);
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should merge default opts with user config to hook.options', function testB(done) {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      assert.isTrue(redibox.hooks.cool.options.hasOwnProperty('kittenSays'));
      assert.equal(redibox.hooks.cool.options.kittenSays, 'meow');
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });

  it('Should unmount hook if requested', function testB(done) {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      assert.isTrue(redibox.hooks.hasOwnProperty('cool'));
      redibox.hooks.cool._unmount();
      assert.isFalse(redibox.hooks.hasOwnProperty('cool'));
      assert.isTrue(redibox.hasOwnProperty('cluster'));
      redibox.cluster._unmount();
      assert.isFalse(redibox.hasOwnProperty('cluster'));
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      console.error(e);
    });
  });
});
