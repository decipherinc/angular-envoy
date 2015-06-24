'use strict';

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyMessages
 * @requires fv.envoy.service:$envoy
 * @restrict AE
 * @param {string} [parent] If this directive is in a subform of some other
 * form which is *also* using the `messages` directive, and you wish to
 * display messages within its view, specify its form here.
 * @description
 * Enables display of messages for a form.
 */

/**
 *
 *
 */
function messages() {
  return {
    restrict: 'AE',
    require: 'envoyMessages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, ctrl) {
      scope.$on('$formStateChanged', function (evt, data) {
        ctrl.update(data);
      });

      scope.$on('$destroy', function () {
        ctrl.$parent.removeChild(ctrl);
      });
    }
  };
}

messages.$inject = ['$envoy'];

module.exports = messages;
