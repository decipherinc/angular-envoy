'use strict';

var angular = require('angular'),
  _ = require('lodash'),
  directives = require('./directives');

var MODULE_NAME = 'fv.envoy',
  debug = require('debug')('envoy'),
  envoy;

function config($provide) {
  $provide.decorator('ngFormDirective', require('./form-decorator'));
  debug('Configured envoy');
}
config.$inject = ['$provide'];

envoy = angular.module(MODULE_NAME, [])
  .config(config)
  .provider('$envoy', require('./envoy'));

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;

