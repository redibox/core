/* eslint global-require:0 */
/* eslint import/no-unresolved:0 */
switch (process.version.substr(0, 2)) {
  case 'v4':
    module.exports = require('./4/core');
    break;
  case 'v5':
    module.exports = require('./5/core');
    break;
  case 'v6':
    module.exports = require('./6/core');
    break;
  default:
    module.exports = require('./core');
}
