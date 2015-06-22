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
var messages = function messages($envoy) {
  return {
    restrict: 'AE',
    require: 'messages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, messages) {
      scope.$on('$formStateChanged', function (evt, data) {
        var viewData = messages.$viewData;
        if (!viewData) {
          return;
        }
        viewData.messages = data.messages;
        viewData.error = !!data.errorLevel;
        viewData.className = data.errorLevelName;
        viewData.title = $envoy.LEVELS[data.errorLevel].description;
      });
    }
  };
};

messages.$inject = ['$envoy'];

module.exports = messages;
