'use strict';

var _ = require('lodash');
var viewData = require('./viewdata');

var debug = require('debug')('envoy:directives:envoyForm:controller');

/**
 * @ngdoc method
 * @name fv.envoy.controllers:EnvoyFormController#$setValidity
 * @methodOf fv.envoy.controllers:EnvoyFormController
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
 * @param {(ngModel.NgModelController|FormController.FormController|fv.envoy.controllers.EnvoyFormController)} control
 * Some control on the form; may be a subform or a field.
 * @this FormController
 */
function $envoySetValidity(token, value, control) {

  /**
   * If we set $isForm above, this is a subform of the parent
   * and we don't care.
   * @todo maybe we do care?
   * @type {boolean}
   */
  var isNotForm = !control.$$envoyForm;

  /**
   * We only care about controls that were explicitly added
   * to this form.
   * @type {boolean}
   */
  var formHasControl = isNotForm && _.has(this, control.$name);

  this._$setValidity.apply(this, arguments);

  if (formHasControl &&
    _.size(this.$error) !== this.$$lastErrorSize) {
    this.$envoy.refresh(this, control);
    this.$$lastErrorSize = _.size(this.$error);
  }
}


/**
 * @ngdoc controller
 * @name fv.envoy.controllers:EnvoyFormController
 * @description
 * `EnvoyFormController` is a superset of
 *     [`FormController`](https://docs.angularjs.org/api/ng/type/form.FormController#!).
 *   It *requires* a `name` attribute.
 * @constructor
 */
function EnvoyFormController($scope,
  $element,
  $attrs,
  $injector,
  $animate,
  $interpolate,
  $envoy,
  formDirective) {

  var unbindForm;
  var locals = {
    $scope: $scope,
    $element: $element,
    $attrs: $attrs
  };
  var FormController = _.first(formDirective).controller;

  $injector.invoke(FormController, this, locals);

  /**
   * This FormController's original $setValidity() method
   * @type {FormController.FormController#$setValidity}
   */

  this._$setValidity = this.$setValidity;
  if (!this.$name) {
    throw new Error('envoyForm requires a name!');
  }

  _.extend(this, locals, {
    $animate: $animate,
    $interpolate: $interpolate,
    $envoy: $envoy
  });

  this.$$envoyForm = true;
  this.$children = [];

  /**
   * @ngdoc property
   * @name fv.envoy.controllers:EnvoyFormController#$alias
   * @propertyOf fv.envoy.controllers:EnvoyFormController
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
  this.$alias = $attrs.$alias || this.$name;

  /**
   * Used to track this form's error state.  We'll need to
   * do stuff if the state changes.
   * @type {number}
   * @private
   */
  this.$$lastErrorSize = 0;
  this.$parent = null;
  this.$errorLevel = $envoy.DEFAULT_ERRORLEVEL;
  this.$view = this.$parent ?
    (this.$view = this.$parent.$view) :
    (this.$view = {});

  this.$setValidity = $envoySetValidity;

  this.$_setParent();

  unbindForm = this._bind();
  $scope.$on('$destroy', function () {
    if (this.$parent) {
      this.$parent.removeChild(this);
    }
    unbindForm();
  }.bind(this));

  $scope[this.$alias || this.$name] = this;

  debug('EnvoyFormController "%s" instantiated', this.$name, this);
}

EnvoyFormController.$inject = [
  '$scope',
  '$element',
  '$attrs',
  '$injector',
  '$animate',
  '$interpolate',
  '$envoy',
  'formDirective'
];

EnvoyFormController.prototype = {

  _bind: function _bind() {
    return this.$envoy.bindForm(this, this.$name, 'EnvoyFormController');
  },

  $_setParent: function $setParent() {
    var parentName;
    var parent = this.$attrs.parent;
    if (parent && (parentName = this.$interpolate(parent)(this.$scope))) {
      this.$envoy.findController(parentName).$addChild(this);

      if (this.$parent === this) {
        this.$parent.removeChild(this);
        debug('Attempted to initialize %s with its own parent', this);
      }
    }
  },

  /**
   * Bind a view Scope to this directive for display.  Used by
   * `messagesList` directive.
   * @param {ng.$rootScope.Scope} scope
   * @returns {createEnvoyFormController} This controller
   */
  $bindView: function $bindView(scope) {
    if (this.$view.scope) {
      throw new Error('view already bound!');
    }
    this.$view.scope = scope;
    scope.data = viewData(this.$envoy.DEFAULT_LEVEL);
    debug('View bound');
    return this;
  },

  $update: function $update(data) {
    var viewData = this.$viewData;
    var errorLevel;

    if (viewData) {

      debug('"%s" updating with new data:', this.$name, data);

      this.$errorLevel =
        errorLevel =
          _.isNumber(data.errorLevel) ? data.errorLevel : this.$errorLevel;

      // this beast is kind of a custom merge
      _.each(data.messages, function (formMessages, formName) {
        if (viewData.messages[formName]) {
          _.each(formMessages, function (controlMessages, controlName) {
            if (_.isObject(controlMessages)) {
              if (viewData.messages[formName][controlName]) {
                _.extend(viewData.messages[formName][controlName],
                  controlMessages);
              } else {
                viewData.messages[formName][controlName] = controlMessages;
              }
            } else {
              delete viewData.messages[formName][controlName];
            }
          });
        } else {
          viewData.messages[formName] = formMessages;
        }
      });
      viewData.error = !!errorLevel;
      viewData.className = this.$envoy.level(errorLevel);
      viewData.title = this.$title(errorLevel);

      debug('"%s" updated; view data:', this.$name, viewData);

      return viewData;
    }
  },

  /**
   * Unbind the bound Scope of this controller.
   * @returns {createEnvoyFormController} This controller
   */
  $unbindView: function $unbindView() {
    delete this.$view.scope;
    this.$view = null;
    debug('View unbound');
    return this;
  },

  $addChild: function $addChild(child) {
    debug('Adding child "%s" to "%s"', child.$name, this.$name);
    this.$children.push(child);
    child.$parent = this;
    return this;
  },

  $removeChild: function $removeChild(child) {
    debug('Removing child "%s" from "%s"', child.$name, this.$name);
    this.$children.splice(this.$children.indexOf(child), 1);
    delete child.$parent;
    return this;
  },

  $title: function $title(errorLevel) {
    return this.$envoy.levelDescription(errorLevel);
  },

  toString: function toString() {
    return this.$name;
  }

};


Object.defineProperties(EnvoyFormController.prototype, {
  $viewData: {
    get: function getViewData() {
      var data;
      if ((data = _.get(this.$view, 'scope.data'))) {
        return data;
      }
      if (this.$view.scope) {
        return (this.$view.scope.data = viewData(this.$envoy.DEFAULT_LEVEL));
      }
    },
    set: function setViewData(data) {
      this.$view.scope.data = data;
    }
  }
});

module.exports = EnvoyFormController;
