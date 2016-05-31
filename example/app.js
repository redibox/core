import Redibox from './../src/core';
import CoolHook from './hooks/CoolHook';

const RediBox = new Redibox({
  log: { level: 'debug' },

  // hook loader reads config from key with the same name
  cool: { explodingKittens: 'Hello, im a pizza!' },

  pubsub: {
    subscriber: true,
    publisher: true,
  },

  // pass in an object of hooks
  // this is only needed if these hooks are not npm packages.
  // Any npm dependencies in your package.json file that start with
  // 'redibox-hook' are automatically required and initialized.
  hooks: {
    // can be a constructor
    cool: CoolHook,

    // or can be a boolean - false to stop loading from package.json
    schedule: false,

    //  only needed if package name doesn't begin with
    // 'redibox-hook' or your package json cannot be found
    nice: 'some-package-name',
  },
});

RediBox.on('error', console.error);
RediBox.on('ready', () => {
  RediBox.log.info('I am ready.');
  // we have a 'cool' hook.
  RediBox.hooks.cool.isThisCoolOrWhat(true);
  RediBox.hooks.cool.isThisCoolOrWhat(false);
  console.log(RediBox.hooks.cool.getClientCount());
});

