'use strict';

/**
 * Default level and descriptions
 * @type {Array.<Object.<string, string>>}
 */
var DEFAULT_LEVELS = [
  {
    name: 'ok',
    description: 'Fixed!'
  },
  {
    name: 'warning',
    description: 'Warning'
  },
  {
    name: 'error',
    description: 'Error'
  }
];

/**
 * Default web server path to JSON message definition file
 * @type {string}
 */
var DEFAULT_DATA_FILE = 'messages.json';

/**
 * The default level
 * @type {string}
 */
var DEFAULT_LEVEL = 'ok';

module.exports = {
  levels: DEFAULT_LEVELS,
  defaultLevel: DEFAULT_LEVEL,
  dataFileUrl: DEFAULT_DATA_FILE,
  templateUrl: 'partials/messages.html'
};

