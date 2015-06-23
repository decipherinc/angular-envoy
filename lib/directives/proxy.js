'use strict';

var _ = require('lodash');

/**
 * @ngdoc directive
 * @description
 * Defines a directive which, when used with ngModel, will set the validity
 * of the associated NgModelController, based on the validity of the target
 * form.
 */
function proxy($envoy) {

  /**
   * Anything that needs validating needs a token, so, here's one.
   * @type {string}
   */
  var TOKEN = 'proxy';

  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      var target;
      if ((target = attrs.envoyProxy)) {
        element.addClass('errorlevel');

        scope.$on('$formStateChanged', function (evt, data) {
          var isInvalid;
          //if (_.find(data.forms, { $name: target })) {
            _.each($envoy.ERRORLEVELS,
              function (errorlevel, errorLevelName) {
                element.removeClass(errorLevelName);
              });
            isInvalid = data.errorLevel;
            ngModel.$setValidity(TOKEN, isInvalid);
            if (isInvalid) {
              element.addClass(data.errorLevelName);
            }
          //}
        });
      }
    }
  };
}
proxy.$inject = ['$envoy'];

module.exports = proxy;
