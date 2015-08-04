'use strict';

var _ = require('lodash');

var ID_PREFIX = 'envoy-viewdata-';
var debug = require('debug')('envoy:directives:envoyForm:viewdata');

/**
 * @description
 * Creates a view data object.
 * @param {string} defaultLevel The level at which object should start at.
 * @returns {{reset: Function, id: *}}
 */
function viewData(defaultLevel) {
  var data = {
    /**
     * Resets this object.
     */
    reset: function reset() {
      /**
       * Whether or not this should display
       * @type {boolean}
       */
      this.error = false;

      /**
       * Form Messages
       * @type {{}}
       */
      this.messages = {};

      /**
       * Description
       * @type {?string}
       */
      this.title = null;

      /**
       * Class name (CSS) to apply
       * @type {?string}
       */
      this.className = null;

      /**
       * An errorlevel
       * @type {string}
       */
      this.errorLevel = defaultLevel;
    },
    id: _.uniqueId(ID_PREFIX)
  };
  data.reset();
  debug('Created viewdata object with id "%s"', data.id);
  return data;
}

module.exports = viewData;

