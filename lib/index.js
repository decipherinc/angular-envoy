'use strict';

var angular = require('angular');
var _ = require('lodash');
var directives = require('./directives');
var pkg = require('../package.json');

var MODULE_NAME = 'fv.envoy';
var debug = require('debug')('envoy');
var envoy;

function config($provide) {
  $provide.decorator('ngFormDirective', require('./form-decorator'));
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

envoy = angular.module(MODULE_NAME, [])
  .config(config)
  .provider('$envoy', require('./envoy'));

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;

