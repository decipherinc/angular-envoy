'use strict';

var _ = require('lodash');

/**
 * @ngdoc directive
 * @description
 * Defines a directive which, when used with ngModel, will set the validity
 * of the associated NgModelController, based on the validity of the target
 * form.
 */
function proxy() {

  /**
   * Anything that needs validating needs a token, so, here's one.
   * @type {string}
   */
  var TOKEN = 'proxy';

  /**
   * The class to be applied if the directive's value is present
   * @type {string}
   */
  var CLASSNAME = 'errorlevel';

  return {
    restrict: 'A',
    require: 'ngModel',
    controller: [
      '$scope',
      '$element',
      '$attrs',
      '$envoy',
      '$interpolate',
      function ProxyCtrl($scope, $element, $attrs, $envoy, $interpolate) {

        var debug = require('debug')('envoy:directives:proxy:controller');
        var target = $interpolate($attrs.envoyProxy || '')($scope);
        var ngModel = $element.controller('ngModel');

        this.update = function update(data) {
          var isValid = !data.errorLevel;
          debug('Proxy with target "%s" received a "$formStateChanged" event ' +
            'w/ data:', target, data);
          _.each($envoy.ERRORLEVELS, function (errorlevel, errorLevelName) {
            $element.removeClass(errorLevelName);
          });
          ngModel.$setValidity(TOKEN, isValid);
          if (!isValid) {
            $element.addClass(data.errorLevelName);
          }
        };

        this.toString = function toString() {
          return this.$name + '-proxy';
        };

        this.broadcast = $scope.$broadcast.bind($scope);
        this.emit = $scope.$parent.$emit.bind($scope.$parent);
        this.$name = target;

        if (target) {
          $element.addClass(CLASSNAME);
          $scope.$on('$destroy', $envoy.bindForm(this, target));
          $scope.$on('$formStateChanged', function (evt, data) {
            this.update(data);
          }.bind(this));
        } else {
          throw new Error('envoyProxy directive needs a value!');
        }
      }
    ]
  };
}
module.exports = proxy;
