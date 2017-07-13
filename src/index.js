const core = require('./core');
const defaults = require('./defaults');
const BaseHook = require('./hooks/BaseHook');
const utils = require('./utils');

module.exports = Object.assign({}, {
  default: core,
  defaults,
  BaseHook,
}, utils);
