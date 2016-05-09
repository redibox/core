/* eslint global-require:0 */
/* eslint import/no-unresolved:0 */
switch (process.version.substr(0, 2)) {
  case 'v4':
    module.exports = require('./4/core');
    module.exports.Hook = require('./4/hooks/hook');
    break;
  case 'v5':
    module.exports = require('./5/core');
    module.exports.Hook = require('./5/hooks/hook');
    break;
  case 'v6':
    module.exports = require('./6/core');
    module.exports.Hook = require('./6/hooks/hook');
    break;
  default:
    module.exports = require('./X/core');
    module.exports.Hook = require('./X/hooks/hook');
}
