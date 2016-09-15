## Creating Custom Hooks

RediBox has a built in hook loader which allows you to easily extend it's functionality with minimal code. To create a hook provide a class that extends `BaseHook` as laid out below in the example.

All hooks by default have a 10 second timeout on `initialize`, if your promise fails to resolve or does not resolve within 10 seconds then an error is thrown. You can change this by setting the value of `hookTimeout` in your constructor - in milliseconds.

### BaseHook Class Properties

On init your hook has all the following methods and properties attached to it:

- `this.core` - the redibox core instance
- `this.log` - the redibox core logger, auto prefixes with hook name
- `this.options` - the user provided options auto-merged with defaults from this.defaults()
- `this.client` - the default redis client that redibox core uses
- `this.clients` - where all this hooks custom redis clients are located
- `this.createClient(<String> name)` - returns a promise which resolves when client is ready.

### Creating additional Redis connections

By default you're provided with `this.client` as a client - this is the core's redis connection instance, you shouldn't need any additional connections unless you're running blocking commands.

To create new redis connections for this hook then simply call the built-in hook method `createClient(<String> name)` this returns a promise which on resolving will attached your new redis connection onto the `clients` object of your hook. It's normally best to do this in the init of your hook - as shown in the example hook.

### Adding new LUA scripts

Before initializing your hook the hook loader first calls the `.scripts()` method of your hook, any scripts returned from this are automatically loaded and cached, **ALL** redis connections get these scripts added, including clients created with `.createClient()`.


Object keys of the returned object in this function are used a script names, each script must contain the properties below:

- `keys` - the number of keys used as args by this script - the remainder of the args provided become accessible via lua (`ARGV`).
- `lua` - the lua script as a string. Best to use template strings to cover multiple lines.

See example hook below for a script example.

### Providing default options

Default options for your hook can be provided by return a configuration object in a `.defaults()` method on your class. These get automatically merged with the user provided config. The final merged options become accessible at `this.options`. See example hook for a example use of `.defaults()`.

### Example Custom Hook

```javascript
import { BaseHook } from 'redibox';

// just need to extend BaseHook
export default class CoolHook extends BaseHook {
  constructor() {
    // call super with the hook name
    // also used for the hooks key name if auto imported via node_modules
    super('cool');

    // optionally increase the default timeout for this hook
    // this.hookTimeout = 20000; // 20s

    // internally there is an option to mount the hook directly onto redibox rather than the `.hooks` object
    // if you you need to do this then set the below option to true
    // the hook would then be available at `RediBox.cool` instead of `RediBox.hooks.cool`
    // this._mountToCore = true;
  }

  /**
   * This is called when redibox is ready to init this hook.
   * Do all your bootstrapping here.
   * Must return a promise.
   * @returns {Promise.<T>}
   */
  initialize() {
    // Available Props on this class:
    // this.core - the redibox core instance
    // this.log - the redibox core logger, auto prefixes with hook name
    // this.options - the user provided options auto-merged with defaults from this.defaults()
    // this.client - the default redis client that redibox core uses
    // this.clients - where all this hooks custom redis clients live
    // this.createClient(<String> name) - returns a promise which resolves when client is ready.

    this.log.info(this.options);

    // create an additional redis client connection if needed
    // this creates a client at 'this.clients.coolClient'
    return this.createClient('coolClient');
  }

  /**
   * OPTIONAL method
   * Redis LUA scripts to automatically bootstrap with this hook
   */
  scripts() {
    return {
      /**
       * Capped list - useful for capped logs etc.
       * Script becomes availabe on all clients as `client.loggymclogface(key, ele, limit).then().catch()`
       */
      loggyMcLogFace: {
        keys: 1,
        lua: `
            local k = KEYS[1]
            local element = ARGV[1]
            local limit = tonumber(ARGV[2])

            --- set list
            redis.call("LPUSH",k,element)
            redis.call("LTRIM", k, 0, limit -1)
        `,
      },
    };
  }

  /**
   * OPTIONAL method
   * Return the default config - core will automatically merge this with the
   * user provided options for this hook.
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
```

### Publishing your hook

To enable auto-loading npm installed hooks on users projects you'll need to name your package correctly, this is just `redibox-hook-yourhookname`, so it must be prefixed with `redibox-hook-`.
