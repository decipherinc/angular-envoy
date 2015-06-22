'use strict';

var opts = require('./opts'),
  _ = require('lodash');

/**
 *
 */
var envoyProvider = function envoyProvider() {

  /**
   * Set options during config phase
   * @param {Object} [newOpts] New options to assign onto defaults
   * @returns {Object}
   */
  this.options = function options(newOpts) {
    return _.extend(opts, newOpts);
  };

  this.$get = require('./factory');

};

module.exports = envoyProvider;
