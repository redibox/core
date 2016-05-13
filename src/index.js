/* eslint global-require:0 */
/* eslint import/no-unresolved:0 */
switch (process.version.substr(0, 2)) {
  case 'v4':
    module.exports = require('./4/core');
    module.exports.BaseHook = require('./4/hooks/BaseHook');
    break;
  case 'v5':
    module.exports = require('./5/core');
    module.exports.BaseHook = require('./5/hooks/BaseHook');
    break;
  case 'v6':
    module.exports = require('./6/core');
    module.exports.BaseHook = require('./6/hooks/BaseHook');
    break;
  default:
    module.exports = require('./X/core');
    module.exports.BaseHook = require('./X/hooks/BaseHook');
}
