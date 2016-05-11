import { loadPackageJSON, mergeDeep } from './../helpers';
import { parallel } from 'async';
const hookPrefix = 'redibox-hook';
const hookRegexMatch = new RegExp(`@?[a-zA-Z-_0-9]*?\/?${hookPrefix}-([A-Za-z0-9-_]*)`);
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
  return new Promise((resolve) => {
    if (!UserHook) {
      core.log.warn(`Hook '${keyName}': npm module is not installed, skipping!`);
      return resolve();
    }

    if (typeof UserHook !== 'function') {
      core.log.warn(`Hook '${keyName}': is not a constructor, skipping!`);
      return resolve();
    }

    // confirm the user hook actually extends the Hook class
    const protoName = Object.getPrototypeOf(UserHook).name;
    if (protoName !== 'Hook') {
      core.log.warn(`Hook '${keyName}': does not extend 'Hook', skipping!`);
      return resolve();
    }

    // start mounting the hook
    const userHook = new UserHook();
    const hookName = userHook.name;
    const defaults = userHook.defaults() || {};
    const hookUserConfig = core.options.hooks[keyName];

    // setup core ref
    userHook._setCore(core);

    // attach hook to core.hooks
    userHook._mount(core);

    // set options merged with the provided defaults
    if (!Array.isArray(hookUserConfig) && typeof hookUserConfig === 'object') {
      userHook.options = mergeDeep(defaults, hookUserConfig);
    } else {
      userHook.options = defaults;
    }

    // init hook
    return userHook.initialize().then(() => {
      core.emit(userHook.toEventName('ready'));
      core.log.debug(`Hook '${hookName}': initialized.`);
      return resolve();
    }).catch((error) => {
      core.log.error(`Hook '${hookName}': error during initialize, aborting.`);
      core.log.error(error);
      return process.exit(0); // exit just to be on the safe side
    });
  });
}

/**
 *
 * @param core
 * @returns {*}
 */
export function importFromPackageJson(core) {
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
export function importFromConfig(core) {
  const packageHooks = Object.keys(core.options.hooks);
  const numHooks = packageHooks.length;

  if (!numHooks) {
    return Promise.resolve();
  }

  const promises = [];
  for (let i = 0; i < numHooks; i++) {
    const name = packageHooks[i];
    const value = core.options.hooks[name];
    if (Array.isArray(value) && value.length) {
      if (value.length === 1) {
        core.setHookConfig(name, {});
        promises.push(loadHook(value[0], name, core));
      }
      if (value.length === 2) {
        core.setHookConfig(name, value[1]);
        promises.push(loadHook(value[0], name, core));
      }
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
  importFromPackageJson(core),
  importFromConfig(core),
]);

