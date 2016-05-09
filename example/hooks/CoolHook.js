import Hook from './../../src/hooks/hook';

export default class CoolHook extends Hook {
  constructor() {
    // super with the hook name
    // also used for the hooks key name
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
    return new Promise((resolve) => {
      this.log.info(this.options);
      // create new redis client connections if needed
      this.createClient('coolClient', false, () => {
        // you now have a client at 'this.clients.coolClient'
        resolve();
      });
    });
  }

	/**
   * Return the default config - core will automatically merge this with the
   * user provided options for this hook.
   * @returns {{someDefaultThing: string}}
   */
  defaults() {
    return {
      someDefaultThing: 'moo',
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