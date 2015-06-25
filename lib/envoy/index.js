'use strict';

var opts = require('./opts');
var _ = require('lodash');

var debug = require('debug')('envoy:$envoy:provider');
/**
 * @ngdoc object
 * @name fv.envoy.envoy:$envoyProvider
 * @description
 * Allows configuration of options for **envoy**.
 */
function envoyProvider() {

  /**
   * @ngdoc function
   * @name fv.envoy.envoy:$envoyProvider#options
   * @methodOf fv.envoy.envoy:$envoyProvider
   * @description
   * Set options during config phase
   * @param {Object} [newOpts] New options to assign onto defaults
   * @returns {Object} The resulting options
   */
  this.options = function options(newOpts) {
    _.extend(opts, newOpts);
    debug('New options set:', opts);
    return opts;
  };

  this.$get = require('./factory');

}

module.exports = envoyProvider;
