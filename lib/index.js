'use strict';

/**
 * @ngdoc overview
 * @name fv.envoy
 * @description
 * # fv.envoy
 *
 * The main module for Envoy.  You will need to include this module.
 *
 * Envoy has dependencies of [lodash](http://lodash.org) and of course
 * [AngularJS](http://angularjs.org).
 *
 * @example
 * <pre>
 * <html ng-app="myApp">
 * <head>
 *   <script src="path/to/angular.js"></script>
 *   <script src="path/to/lodash.js"></script>
 *   <script src="path/to/envoy.js"></script>
 *   <script>
 *     var myApp = angular.module('myApp', ['fv.envoy']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */

var angular = require('angular');
var _ = require('lodash');
var directives = require('./directives');
var pkg = require('../package.json');
var formDecorator = require('./form-decorator');
var $envoy = require('./envoy');

var MODULE_NAME = 'fv.envoy';
var debug = require('debug')('envoy');
var envoy;
var ngAnimatePresent = false;

function config($provide) {
  $provide.decorator('ngFormDirective', formDecorator);

  if (!ngAnimatePresent) {
    $provide.value('$animate', null);
  }
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

try {
  envoy = angular.module(MODULE_NAME, ['ngAnimate']);
  ngAnimatePresent = true;
} catch (ignored) {
  envoy = angular.module(MODULE_NAME, []);
}

envoy
  .config(config)
  .provider('$envoy', $envoy);

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;

