'use strict';

/**
 * @ngdoc overview
 * @name fv.envoy
 * @description
 *
 *
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

function config($provide) {
  $provide.decorator('ngFormDirective', formDecorator);
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

envoy = angular.module(MODULE_NAME, [])
  .config(config)
  .provider('$envoy', $envoy);

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;

