'use strict';

var opts = require('./opts');

/**
 * @ngdoc object
 * @name fv.envoy.service:messages#ViewData
 * @description
 * Represents the data in a list view.
 * @constructor
 */
function ViewData() {
  this.reset();
}

/**
 * Resets this thing
 * @this ViewData
 */
ViewData.prototype.reset = function reset() {
  this.error = false;
  this.messages = {};
  this.title = null;
  this.className = null;
  this.errorLevel = opts.DEFAULT_LEVEL;
};

module.exports = ViewData;

