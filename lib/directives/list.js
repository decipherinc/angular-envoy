'use strict';

var opts = require('../envoy/opts');

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyList
 * @description
 * Defines a directive which will display a list of all messages
 * for a form.
 *
 * The template for the list is the property `templateUrl` of
 * $envoyProvider.
 *
 * The target form can be specified, by name (with interpolation available),
 * in the `envoyList` attribute or the `for` attribute.  This attribute may
 * be omitted if the `envoyList` directive has an `envoyMessages` ancestor.
 * @example
 * ```html
 * <div envoy-list="configForm"></div>
 * <!-- or -->
 * <envoy-list for="configForm"></envoy-list>
 * ```
 */
function list($envoy, $interpolate) {
  var directive = {
    restrict: 'EA',
    scope: true,
    require: '?^form',
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, form) {
      var parentName = attrs.envoyList || attrs.for;
      var parent;

      if (parentName) {
        parent = $envoy.findController($interpolate(parentName)(scope));
      } else if (form) {
        parent = form;
      }

      if (!(parent && parent.$$envoyForm)) {
        throw new Error('envoyList requires an ancestor envoyForm ' +
          'directive or a form name');
      }

      parent.$bindView(scope);

      scope.$on('$destroy', function () {
        parent.$unbindView();
      });
    }
  };

  if (opts.template) {
    directive.template = opts.template;
    delete directive.templateUrl;
  }

  return directive;
}
list.$inject = ['$envoy', '$interpolate'];

module.exports = list;
