const core = require('./core');
const defaults = require('./defaults');
const BaseHook = require('./hooks/BaseHook');
const utils = require('./utils');
module.exports = require('./utils');

module.exports = {
  default: core,
  defaults,
  BaseHook,
  utils,
}
