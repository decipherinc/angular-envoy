'use strict';

var opts = require('./opts');
var _ = require('lodash');

var debug = require('debug')('envoy:$envoy:provider');

function envoyProvider() {

  /**
   * Set options during config phase
   * @param {Object} [newOpts] New options to assign onto defaults
   * @returns {Object}
   */
  this.options = function options(newOpts) {
    _.extend(opts, newOpts);
    debug('New options set:', opts);
    return opts;
  };

  this.$get = require('./factory');

}

module.exports = envoyProvider;
