import Redibox from './../src/core';

const RediBox = new Redibox({ log: { level: 'debug' } });

RediBox.on('ready', () => {
  RediBox.log.info('I am ready.');
});
