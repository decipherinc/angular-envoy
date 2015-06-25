'use strict';

var opts = require('../envoy/opts');

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyList
 * Defines a directive which will display a list of all messages
 * for a form.
 *
 * The template for the list is the property `templateUrl` of
 * $envoyProvider.
 *
 * Must have an `envoyMessages` ancestor.
 * @example
 * ```html
 * <div envoy-list="configForm"></div>
 * <!-- or -->
 * <envoy-list for="configForm"></envoy-list>
 * ```
 */
function list($envoy) {
  return {
    restrict: 'EA',
    scope: true,
    require: '^envoyMessages',
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, envoyMessages) {
      var parent = $envoy.findParentCtrl(attrs.envoyList ||
        attrs.for, envoyMessages);

      parent.bindView(scope);

      scope.$on('$destroy', function () {
        parent.unbindView();
      });
    }
  };
}
list.$inject = ['$envoy'];

module.exports = list;
