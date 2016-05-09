import Redibox from './../src/core';
import CoolHook from './hooks/CoolHook';

const RediBox = new Redibox({
  log: { level: 'debug' },

  // pass in an array of hooks
  // this is only needed if these hooks are not npm packages
  // any npm dependencies in your package.json file that start with
  // 'redibox-hook' are automatically required and initialized.
  hooks: [CoolHook],
});

RediBox.on('ready', () => {
  RediBox.log.info('I am ready.');

  // we have a 'cool' hook.
  RediBox.hooks.cool.isThisCoolOrWhat(true);
});
