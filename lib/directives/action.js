'use strict';

/**
 * Describes a directive wherein you can supply an action (AngularJS
 * expression) to be executed from the message list view, for a particular
 * control.  In practice, you use this to activate a control to correct
 * an error when the message list displays a problem w/ yr control.
 * @example
 * <input name="title"
 *        type="text"
 *        ng-model=segment.title"
 *        message-action="edit(segment)"/>
 */
function action($envoy) {

  return {
    restrict: 'A',
    require: ['ngModel', '^form'],
    link: function (scope, element, attrs, ctrls) {
      var ngModel = ctrls[0],
        form = ctrls[1],
        action;

      if ((action = attrs.messageAction) && ngModel.$name && form.$name) {
        $envoy.setAction(form.$name, ngModel.$name, function () {
          scope.$eval(action);
        });
      }
    }
  };
};
action.$inject = ['$envoy'];

module.exports = action;
