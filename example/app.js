import Redibox from './../src/core';
import CoolHook from './hooks/CoolHook';

const RediBox = new Redibox({
  log: { level: 'debug' },

  // pass in an array of hooks
  // this is only needed if these hooks are not npm packages
  // any npm dependencies in your package.json file that start with
  // 'redibox-hook' are automatically required and initialized.
  hooks: {
    // can be a array with constructor and optional config
    cool: [CoolHook, { explodingKittens: 'Hello, im a pizza!' }],
    // or can be a boolean - false to stop loading from package.json
    schedule: false,
    // or config for a hook
    moo: {},
  },
});

RediBox.on('ready', () => {
  RediBox.log.info('I am ready.');

  // we have a 'cool' hook.
  RediBox.hooks.cool.isThisCoolOrWhat(true);
  RediBox.hooks.cool.isThisCoolOrWhat(false);
});

