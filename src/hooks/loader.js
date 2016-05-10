import { loadPackageJSON, mergeDeep } from './../helpers';
import { parallel } from 'async';
const hookPrefix = 'redibox-hook';

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
 * @param hook
 * @param core
 * @returns {function()}
 */
function loadHook(hook, core) {
  return (ready) => {
    core.log.verbose(`Attempting to load hook '${hook}'`);
    const UserHook = tryRequire(hook);

    if (!UserHook) {
      core.log.warn(`Unable to require Hook '${hook}' -  skipping...`);
      return ready();
    }

    const protoName = Object.getPrototypeOf(UserHook).name;

    if (protoName !== 'Hook') {
      core.log.warn(`Hook '${hook}' does not extend 'Hook' and has been skipped.`);
      return ready();
    }

    const userHook = new UserHook();
    const hookName = userHook.name;
    const defaults = userHook.defaults() || {};

    // setup core ref
    userHook._setCore(core);

    // attach hook to core.hooks
    userHook._mount(core);

    // set options merged with the provided defaults
    userHook.options = mergeDeep(defaults, core.options[hookName] || {});

    // init hook
    return userHook.initialize().then(() => {
      core.emit(userHook.toEventName('ready'));
      core.log.verbose(`Hook '${hookName}' has been initialized.`);
      ready();
    }).catch((error) => {
      core.log.error(`Hook '${hookName}' has errored during initialize, aborting.`);
      core.log.error(error);
      // exit just to be on the safe side
      process.exit(0);
    });
  };
}

/**
 *
 * @param core
 * @returns {*}
 */
export default function (core) {
  const packageJson = loadPackageJSON();

  if (!packageJson) {
    core.log.verbose('Hook loader could not find a valid package.json file.');
    core.log.verbose('Hook loading skipped!');
    return Promise.resolve();
  }

  if (!packageJson.dependencies) {
    core.log.verbose('Hook loader found a valid package.json file but it had no dependencies.');
    core.log.verbose('Hook loading skipped!');
    return Promise.resolve();
  }

  const dependencies = Object.keys(packageJson.dependencies);

  if (!dependencies.length) {
    core.log.verbose('Hook loader found a valid package.json file but it had no dependencies.');
    core.log.verbose('Hook loading skipped!');
    return Promise.resolve();
  }

  const hooks = [];
  const length = dependencies.length;
  for (let i = 0; i < length; i++) {
    const name = dependencies[i];
    if (name.indexOf(hookPrefix) !== -1) {
      // todo check not disabled in config
      hooks.push(loadHook(dependencies[i], core));
    }
  }

  if (!hooks.length) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    parallel(hooks, error => error ? reject(error) : resolve());
  });
}
