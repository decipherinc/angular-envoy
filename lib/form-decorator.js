'use strict';

var _ = require('lodash');

var debug = require('debug')('envoy:formDecorator');

/**
 * This decorator monkeypatches the controller property of the ngForm
 * directive.
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
  var form = _.first($delegate),

    /**
     * Original FormController.
     * @type {form.FormController}
     */
    formController = form.controller;

  /**
   * We're monkeypatching FormController with this, if and only if
   * the form has a name.
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

    /**
     * This is a form.  This comes in handy, because NgModelController
     * and FormController are very similar.
     * @type {boolean}
     */
    this.$isForm = true;

    if (this.$name) {

      /**
       * This FormController's original $setValidity() method
       * @type {form.FormController#$setValidity}
       */
      $setValidity = this.$setValidity;

      debug('Instantiating patched controller for form %s',
        this.$name);

      _.extend(this, {

        /**
         * If this form contains an "alias" attribute, we'll use it
         * to look up messages.  This is useful if your form name is
         * dynamic (interpolated).  Note interpolated form names were
         * not implemented before AngularJS 1.3.0.
         * Defaults to whatever the name of the form is.
         * @type {string}
         */
        $alias: $attrs.alias || this.$name,

        /**
         * This form's Scope.  This will allow us to easily broadcast
         * events within it.
         * @type {ng.$rootScope.Scope}
         */
        $formScope: $scope,

        /**
         * Used to track this form's error state.  We'll need to
         * do stuff if the state changes.
         * @type {number}
         */
        $$lastErrorSize: 0,

        /**
         * If the number of errors in this form has increased or decreased
         * and the control being set valid or invalid is a member of this
         * form proper, then tell $envoy to broadcast an event that
         * the form's validity changed (somewhat).
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
          var isNotForm = !control.$isForm,

            /**
             * We only care about controls that were explicitly added
             * to this form.
             * @type {boolean}
             */
            formHasControl = isNotForm && _.has(this, control.$name);

          $setValidity.apply(this, arguments);

          if (formHasControl &&
            _.size(this.$error) !== this.$$lastErrorSize) {
            $envoy.$broadcast(this, control);
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
