'use strict';

var opts = require('./opts');
var _ = require('lodash');

var debug = require('debug')('envoy:$envoy:provider');
/**
 * @ngdoc service
 * @name fv.envoy.$envoyProvider
 * @description
 * Allows configuration of options for Envoy; see the
 * {@link fv.envoy.$envoyProvider#options `options()` method}.
 *
 * # Default Options
 *
 * - `levels`: Three (3) default levels.  `ok`, `warning`, and `error`, in
 *     increasing severity, having descriptions "Fixed!", "Warning", and
 *     "Error", respectively.
 * - `defaultLevel: `ok`
 * - `dataFileUrl`: `messages.json`
 * - `templateUrl`: `partials/messages.html`
 */
function envoyProvider() {

  /**
   * @ngdoc function
   * @name fv.envoy.$envoyProvider#options
   * @methodOf fv.envoy.$envoyProvider
   * @description
   * Using this method, set options during `config()` phase.
   * @param {Object=} newOpts New options to assign onto defaults
   * @param {Array.<Object.<string,string>>=} newOpts.levels User-defined
   *     levels.  Each Object in the Array should have a `name` and
   *     `description` property.
   * @param {string=} newOpts.dataFileUrl The URL path to the `.json` file
   *     containing the messages
   * @param {string=} newOpts.templateUrl The URL path to the partial
   *     representing the message list
   * @param {string=} newOpts.defaultLevel The default level; corresponds to
   *     the `name` property of each object in the `levels` array
   * @returns {Object} The resulting options
   //* @param {(string|angular.element)=} newOpts.template The raw template to use
   //*     for the message list.  Takes precedence over `templateUrl`.
   //* @param {Object=} newOpts.messageConfig Instead of the URL to a `.json`
   //*     file, this can be an `Object`.  Takes precedence over
   //*     `messageConfigUrl`.
   */
  this.options = function options(newOpts) {
    _.extend(opts, newOpts);
    debug('New options set:', opts);
    return opts;
  };

  this.$get = require('./factory');

}

module.exports = envoyProvider;
