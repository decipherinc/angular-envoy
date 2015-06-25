'use strict';

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyAction
 * @restrict A
 * @description
 * Describes a directive wherein you can supply an action (AngularJS
 * expression) to be executed from the message list for a particular
 * control.
 *
 * In short, you want to use this to activate a form field when the user
 * clicks on the error message.
 *
 * @example
 * ```html
 * <input name="title"
 *        type="text"
 *        ng-model="myModel.title"
 *        envoy-action="doSomething()"/>
 * ```
 */
function action($envoy) {

  return {
    restrict: 'A',
    require: ['ngModel', '^form'],
    link: function (scope, element, attrs, ctrls) {
      var ngModel = ctrls[0];
      var form = ctrls[1];
      var action;

      if ((action = attrs.envoyAction) && ngModel.$name && form.$name) {
        $envoy.setAction(form.$name, ngModel.$name, function () {
          scope.$eval(action);
        });
      }
    }
  };
}
action.$inject = ['$envoy'];

module.exports = action;
