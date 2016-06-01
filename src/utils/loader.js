import { loadPackageJSON, mergeDeep } from './../utils';
const hookPrefix = 'redibox-hook';
const hookRegexReplace = new RegExp(`@?[a-zA-Z-_0-9.]*?\/?${hookPrefix}-`);

/**
 *
 * @param module
 * @returns {*}
 */
function tryRequire(module) {
  try {
    /* eslint global-require: 0 */
    return require(module);
  } catch (e) {
    return undefined;
  }
}

/**
 *
 * @param UserHook
 * @param keyName
 * @param core
 * @returns {function()}
 */
function loadHook(UserHook, keyName, core) {
  return new Promise((resolve, reject) => {
    if (!UserHook) {
      core.log.warn(`Hook '${keyName}': npm module is not installed, skipping!`);
      return resolve();
    }

    // add support for es6 default
    if (UserHook.default) {
      UserHook = UserHook.default;
    }

    if (typeof UserHook !== 'function') {
      core.log.warn(`Hook '${keyName}': is not a constructor, skipping!`);
      return resolve();
    }

    // confirm the user hook actually extends the Hook class
    const protoName = Object.getPrototypeOf(UserHook).name;
    if (protoName !== 'BaseHook') {
      core.log.warn(`Hook '${keyName}': does not extend 'BaseHook', skipping!`);
      return resolve();
    }

    // start mounting the hook
    const userHook = new UserHook();
    const hookName = userHook.name;
    const defaults = userHook.defaults() || {};
    const scripts = userHook.scripts() || {};
    const hookUserConfig = core.options[keyName];
    core.scripts = Object.assign({}, core.scripts, scripts);

    // setup core ref
    userHook._setCore(core);

    // attach hook to core.hooks
    userHook._mount(core);

    // setup scripts
    core.defineLuaCommands(core.scripts, core.client);

    // set options merged with the provided defaults
    if (!Array.isArray(hookUserConfig) && typeof hookUserConfig === 'object') {
      userHook.options = mergeDeep(defaults, hookUserConfig);
    } else {
      userHook.options = defaults;
    }

    // setup connection timeout
    const hookTimer = setTimeout(() => {
      reject(new Error(
        `Hook '${keyName}' timed out while initializing (${userHook.hookTimeout}ms)
       Check to see if you're not missing a callback or a promise resolve/reject.`
      ));
    }, userHook.hookTimeout);

    const initReturn = () => {
      clearTimeout(hookTimer);
      core._hooksCount++;
      core.emit(userHook.toEventName('ready'));
      core.log.debug(`Hook '${hookName}': initialized.`);
      resolve();
    };

    core.log.debug(`Hook '${keyName}': initialising`);
    const hookInitPromise = userHook.initialize(initReturn);

    if (!hookInitPromise) return void 0;

    // init hook
    return hookInitPromise
      .then(initReturn)
      .catch((error) => {
        core.handleError(`Hook '${hookName}': error during initialize, aborting.`);
        core.handleError(error);
        return process.exit(0); // exit just to be on the safe side
      });
  });
}

/**
 *
 * @param core
 * @returns {*}
 */
export function importPackageHooks(core) {
  const packageJson = loadPackageJSON();
  
  if (!packageJson) {
    core.log.debug('Hook loader could not find a valid package.json file.');
    core.log.debug('Hook loading skipped!');
    return Promise.resolve();
  }

  if (!packageJson.dependencies) {
    core.log.debug('Hook loader found a valid package.json file but it had no dependencies.');
    core.log.debug('Hook loading skipped!');
    return Promise.resolve();
  }

  const dependencies = Object.keys(packageJson.dependencies);

  if (!dependencies.length) {
    core.log.debug('Hook loader found a valid package.json file but it had no dependencies.');
    core.log.debug('Hook loading skipped!');
    return Promise.resolve();
  }

  const length = dependencies.length;
  const promises = [];

  for (let i = 0; i < length; i++) {
    const packageName = dependencies[i];
    if (packageName.indexOf(hookPrefix) !== -1) {
      const name = packageName.replace(hookRegexReplace, '');
      // todo check not disabled in config
      if (core.options.hooks[name] && core.options.hooks[name] !== false) {
        promises.push(loadHook(tryRequire(packageName), name, core));
      } else {
        core.log.debug(`Hook '${name}': in package.json but disabled in core config, skipping.`);
      }
    }
  }

  if (!promises.length) {
    return Promise.resolve();
  }

  return Promise.all(promises);
}

/**
 * Loads hooks provided in core hooks config
 * @param core
 */
export function importConfigHooks(core) {
  const packageHooks = Object.keys(core.options.hooks);
  const numHooks = packageHooks.length;

  if (!numHooks) {
    return Promise.resolve();
  }

  const promises = [];
  for (let i = 0; i < numHooks; i++) {
    const name = packageHooks[i];
    const value = core.options.hooks[name];
    // constructor
    if (typeof value === 'function') {
      promises.push(loadHook(value, name, core));
    }
    // package name - try load
    if (typeof value === 'string') {
      promises.push(loadHook(tryRequire(value), name, core));
    }
  }

  if (!promises.length) {
    return Promise.resolve();
  }

  return Promise.all(promises);
}

/**
 * Load hooks from all sources
 * @param core
 * @returns {*}
 */
export default core => Promise.all([
  importConfigHooks(core),
  importPackageHooks(core),
]);

