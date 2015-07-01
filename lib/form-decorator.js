'use strict';

var _ = require('lodash');

var debug = require('debug')('envoy:formDecorator');

/**
 * @ngdoc directive
 * @name fv.envoy.directives:form
 * @restrict E
 * @scope
 * @param {string=} name Name of this form.  If omitted, the form is *ignored*
 * by Envoy.
 * @description
 *
 * # Alias: `ngForm`
 *
 * This directive replaces AngularJS'
 *     [`form`](https://docs.angularjs.org/api/ng/directive/form) directive.
 *
 * Two differences:
 *
 * - The controller is replaced with a {@link fv.envoy.controllers:MessagesFormController MessagesFormController}.
 * - The directive creates a new Scope.  See the {@link fv.envoy.controllers:MessagesFormController#$alias $alias property} for
 *     further information.
 */

/**
 * This decorator monkeypatches the `form` directive.
 * For some reason when you decorate a directive, $delegate is an Array
 * and the first element is the directive.
 * @param {Array} $delegate Directive(s) associated with tag "form", I guess
 * @returns {Array} Decorated array of directives?
 */
function formDecorator($delegate) {

  /**
   * The real form directive.
   * @type {form}
   */
  var form = _.first($delegate);

  /**
   * Original FormController.
   * @type {form.FormController}
   */
  var formController = form.controller;

  /**
   * @ngdoc controller
   * @name fv.envoy.controllers:MessagesFormController
   * @description
   * `MessagesFormController` replaces
   *     [`FormController`](https://docs.angularjs.org/api/ng/type/form.FormController#!)
   *     with itself; any time you use the
   *     [`form`](https://docs.angularjs.org/api/ng/directive/form) directive,
   *     your controller will be this instead, **except** if your `form` has no
   *     `name` attribute, at which point it is *ignored* by Envoy.
   *
   * @constructor
   */
  function MessagesFormController($element,
    $attrs,
    $scope,
    $animate,
    $interpolate,
    $injector,
    $envoy) {

    // my kingdom for "let"
    var $setValidity;

    $injector.invoke(formController, this, {
      $element: $element,
      $scope: $scope,
      $animate: $animate,
      $interpolate: $interpolate,
      $attrs: $attrs
    });

    if (this.$name) {

      /**
       * @ngdoc property
       * @name fv.envoy.controllers:MessagesFormController#$isForm
       * @propertyOf fv.envoy.controllers:MessagesFormController
       * @description
       * This will always be `true` for any form touched by Envoy.  The reason
       *     for its existence is simply that it can be practically difficult
       *     to tell the difference between a `FormController` and an
       *     [`NgModelController`](https://docs.angularjs.org/api/ng/type/ngModel.NgModelController).
       * @type {boolean}
       */
      this.$isForm = true;

      /**
       * This FormController's original $setValidity() method
       * @type {form.FormController#$setValidity}
       */
      $setValidity = this.$setValidity;

      debug('Instantiating patched controller for form %s', this.$name);

      _.extend(this, {

        /**
         * @ngdoc property
         * @name fv.envoy.controllers:MessagesFormController#$alias
         * @propertyOf fv.envoy.controllers:MessagesFormController
         * @type {string}
         * @description
         * If the parent {@link fv.envoy.directives:form form directive}
         * contains an "alias" attribute, we'll use it
         * to look up messages.  This is useful if your form name is
         * "dynamic" (interpolated).  *Note:* interpolated form names were
         * not implemented before AngularJS 1.3.0.
         *
         * Defaults to whatever the name of the form is.
         *
         * If the alias is not present in this form's Scope, then it is placed
         * there--much like `FormController` places its `name` attribute on its
         * Scope, if present.  Because collisions could exist in the case of
         * "dynamic" forms, the {@link fv.envoy.directives:form form directive}
         * must create a new Scope.
         */
        $alias: $attrs.alias || this.$name,

        /**
         * Used to track this form's error state.  We'll need to
         * do stuff if the state changes.
         * @type {number}
         * @private
         */
        $$lastErrorSize: 0,

        /**
         * @ngdoc method
         * @name fv.envoy.controllers:MessagesFormController#$setValidity
         * @methodOf fv.envoy.controllers:MessagesFormController
         * @description
         * If the number of errors in this form has increased or decreased
         * and the control being set valid or invalid is a member of this
         * form proper, then tell {@link fv.envoy.envoy:$envoy $envoy} handle
         *     the change.
         *
         * *Note*: we only tell `$envoy` to update if the control is a direct
         * descendant of this form.
         * @param {string} token Validation token
         * @param {(boolean|*)} value If truthy, then the validation token is
         * in an error state.
         * @param {(ngModel.NgModelController|form.FormController|fv.envoy.controllers.MessagesFormController)} control
         * Some control on the form; may be a subform or a field.
         * @this FormController
         */
        $setValidity: function $envoySetValidity(token,
          value,
          control) {

          /**
           * If we set $isForm above, this is a subform of the parent
           * and we don't care.
           * @todo maybe we do care?
           * @type {boolean}
           */
          var isNotForm = !control.$isForm;

          /**
           * We only care about controls that were explicitly added
           * to this form.
           * @type {boolean}
           */
          var formHasControl = isNotForm && _.has(this, control.$name);

          $setValidity.apply(this, arguments);

          if (formHasControl &&
            _.size(this.$error) !== this.$$lastErrorSize) {
            $envoy.refresh(this, control);
            this.$$lastErrorSize = _.size(this.$error);
          }
        }
      });

      // see the note below at formDirective.$scope
      if (!_.has($scope, this.$alias)) {
        $scope[this.$alias] = this;
      }
    }
  }

  MessagesFormController.$inject = [
    '$element',
    '$attrs',
    '$scope',
    '$animate',
    '$interpolate',
    '$injector',
    '$envoy'
  ];

  form.controller = MessagesFormController;

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
  form.$scope = true;

  return $delegate;
}
formDecorator.$inject = ['$delegate'];

module.exports = formDecorator;
