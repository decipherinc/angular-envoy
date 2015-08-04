'use strict';

var _ = require('lodash');

/**
 * @ngdoc directive
 * @name fv.envoy.directives:envoyForm
 * @restrict EAC
 * @scope
 * @param {string=} name Name of this form.  If omitted, the form is *ignored*
 * by Envoy.
 * @description
 *
 * Use this instead of AngularJS'
 *     [`form`](https://docs.angularjs.org/api/ng/directive/form) (or `ngForm`)
 *     directives.
 *
 * Main differences:
 *
 * - It enables tracking of messages on the form.
 * - The controller is replaced with a {@link
  *     fv.envoy.controllers:EnvoyFormController EnvoyFormController}.
 * - The directive creates a new Scope.  See the {@link
  *     fv.envoy.controllers:MessagesFormController#$alias $alias property} for
 *     further information.
 */
function envoyFormDirective(formDirective) {
  return {
    restrict: 'EA',
    /**
     * So this is a little hack.  I'm pretty sure this is not dangerous, but
     * it could be.  The reason for this is that you may have a dynamic form
     * name; something interpolated.  Say, "myForm-2789618".  A FormController
     * will always place itself on the scope if it's given a name.  But it's
     * also handy to be able to reference "myForm".  If form "myForm-87329"
     * shared the same scope with "myForm-2789618", only one "myForm" could
     * exist; thus, we just make a new scope.
     * @type {boolean}
     */
    scope: true,
    name: 'form', // masquerade as a real form directive
    compile: _.first(formDirective).compile,
    controller: require('./formcontroller')
  };
}
envoyFormDirective.$inject = ['formDirective'];

module.exports = envoyFormDirective;
