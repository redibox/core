import Redibox from './../src/core';
import CoolHook from './hooks/CoolHook';

const RediBox = new Redibox({
  log: { level: 'debug' },

  // pass in an array of hooks
  // this is only needed if these hooks are not npm packages
  // any npm dependencies in your package.json file that start with
  // 'redibox-hook' are automatically required and initialized.
  hooks: [
    CoolHook, // can be a constructor
    'redibox-hook-schedule', // or can be a npm module name
  ],

  // the hook is called 'cool' so lets create a key with the same name
  // this key is then sent to the hook as it's config options.
  cool: {
    someUserSetting: 1337,
  },
});

RediBox.on('ready', () => {
  RediBox.log.info('I am ready.');

  // we have a 'cool' hook.
  RediBox.hooks.cool.isThisCoolOrWhat(true);
});
