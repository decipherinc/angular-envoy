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
var DEFAULT_MESSAGES_CONFIG_URL = 'example-data/messages.json';

/**
 * The default level
 * @type {string}
 */
var DEFAULT_LEVEL = 'ok';

/**
 * Whether or not to display messages if the errorlevel is the default one.
 * Practically speaking, this could give the user momentary feedback that
 * they've fixed a field.
 * @type {boolean}
 */
var DEFAULT_SHOW_DEFAULT_LEVEL = false;

/**
 * The URL of the template to use for the
 * {@link fv.envoy.directive:envoyList envoyList} directive.
 * @type {string}
 */
var DEFAULT_TEMPLATE_URL = 'partials/messages.html';

/**
 * The raw template to use.  Takes precedence over `templateUrl`.
 * @type {(string|null|angular.element)}
 */
var DEFAULT_TEMPLATE = null;

/**
 * The raw data object to use.  Takes precedence over `messagesConfigUrl`.
 * @type {(Object|null)}
 */
var DEFAULT_MESSAGE_CONFIG = null;

module.exports = {
  levels: DEFAULT_LEVELS,
  defaultLevel: DEFAULT_LEVEL,
  messagesConfigUrl: DEFAULT_MESSAGES_CONFIG_URL,
  showDefaultLevel: DEFAULT_SHOW_DEFAULT_LEVEL,
  templateUrl: DEFAULT_TEMPLATE_URL,
  messagesConfig: DEFAULT_MESSAGE_CONFIG,
  template: DEFAULT_TEMPLATE
};

