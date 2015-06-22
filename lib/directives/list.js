'use strict';

var opts = require('../envoy/opts');

/**
 * Defines a directive which will display a list of all messages
 * for a form.
 * The form does not have to be the direct parent of this directive.
 * @example
 * <div messages-list="configForm"></div>
 * <!-- or -->
 * <messages-list for="configForm"></messages-list>
 */
function list($envoy) {
  return {
    restrict: 'EA',
    scope: true,
    require: ['^envoy'],
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, envoy) {
      var parent = $envoy.findParentCtrl(attrs.envoyList ||
        attrs.for, envoy);

      parent.bindView(scope);

      scope.$on('$destroy', function () {
        parent.unbindView();
      });
    }
  };
};
list.$inject = ['$envoy'];

module.exports = list;
