'use strict';

var debug = require('debug')('envoy:directives:messages');

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
function messages($envoy) {
  return {
    restrict: 'AE',
    require: 'envoyMessages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, messages) {
      scope.$on('$formStateChanged', function (evt, data) {
        var viewData = messages.$viewData,
          errorLevel;
        if (!viewData) {
          return;
        }

        errorLevel = data.errorLevel;
        viewData.messages = data.messages;
        viewData.error = !!errorLevel;
        viewData.className = data.errorLevelName;
        viewData.title = $envoy.levelDescription(errorLevel);

        debug('envoyMessages directive for form "%s" received ' +
          '$formStateChanged event; view data:',
          messages.$name,
          viewData);
      });
    }
  };
}

messages.$inject = ['$envoy'];

module.exports = messages;
