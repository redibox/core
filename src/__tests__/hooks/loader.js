const RediBox = require('../../').default;
const { BaseHook } = require('../../');

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
  it('Should mount hooks to the core.hooks namespace', (done) => {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      // eslint-disable-next-line no-prototype-builtins
      expect(redibox.hooks.hasOwnProperty('cool')).toBe(true);
      expect(redibox.hooks.cool.getClientCount()).toBe(1);
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  });

  it('Should merge default opts with user config to hook.options', (done) => {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      // eslint-disable-next-line no-prototype-builtins
      expect(redibox.hooks.cool.options.hasOwnProperty('kittenSays')).toBe(true);
      expect(redibox.hooks.cool.options.kittenSays).toBe('meow');
      redibox.disconnect();
      done();
    });
    redibox.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  });

  it('Should unmount hook if requested', (done) => {
    const redibox = new RediBox({
      hooks: {
        cool: CoolHook,
      },
    }, () => {
      /* eslint-disable no-prototype-builtins */
      expect(redibox.hooks.hasOwnProperty('cool')).toBe(true);
      redibox.hooks.cool._unmount();
      expect(redibox.hooks.hasOwnProperty('cool')).toBe(false);
      expect(redibox.hasOwnProperty('cluster')).toBe(true);
      redibox.cluster._unmount();
      expect(redibox.hasOwnProperty('cluster')).toBe(false);
      redibox.disconnect();
      done();
      /* eslint-enable */
    });
    redibox.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  });
});
