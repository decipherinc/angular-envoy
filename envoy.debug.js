/*! angular-envoy - v0.0.1
 * 
 * Copyright (c) 2015 Focusvision Worldwide; Licensed MIT
 */

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/action.js":[function(require,module,exports){
'use strict';

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyAction
 * @restrict A
 * @description
 * Describes a directive wherein you can supply an action (AngularJS
 * expression) to be executed from the message list for a particular
 * control.
 *
 * In short, you want to use this to activate a form field when the user
 * clicks on the error message.
 *
 * @example
 * ```html
 * <input name="title"
 *        type="text"
 *        ng-model="myModel.title"
 *        envoy-action="doSomething()"/>
 * ```
 */
function action($envoy) {

  return {
    restrict: 'A',
    require: ['ngModel', '^form'],
    link: function (scope, element, attrs, ctrls) {
      var ngModel = ctrls[0];
      var form = ctrls[1];
      var action;

      if ((action = attrs.envoyAction) && ngModel.$name && form.$name) {
        $envoy.setAction(form.$name, ngModel.$name, function () {
          scope.$eval(action);
        });
      }
    }
  };
}
action.$inject = ['$envoy'];

module.exports = action;

},{}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/formcontroller.js":[function(require,module,exports){
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

},{"./viewdata":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/viewdata.js","debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/index.js":[function(require,module,exports){
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

},{"./formcontroller":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/formcontroller.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/viewdata.js":[function(require,module,exports){
'use strict';

var _ = require('lodash');

var ID_PREFIX = 'envoy-viewdata-';
var debug = require('debug')('envoy:directives:envoyForm:viewdata');

/**
 * @description
 * Creates a view data object.
 * @param {string} defaultLevel The level at which object should start at.
 * @returns {{reset: Function, id: *}}
 */
function viewData(defaultLevel) {
  var data = {
    /**
     * Resets this object.
     */
    reset: function reset() {
      /**
       * Whether or not this should display
       * @type {boolean}
       */
      this.error = false;

      /**
       * Form Messages
       * @type {{}}
       */
      this.messages = {};

      /**
       * Description
       * @type {?string}
       */
      this.title = null;

      /**
       * Class name (CSS) to apply
       * @type {?string}
       */
      this.className = null;

      /**
       * An errorlevel
       * @type {string}
       */
      this.errorLevel = defaultLevel;
    },
    id: _.uniqueId(ID_PREFIX)
  };
  data.reset();
  debug('Created viewdata object with id "%s"', data.id);
  return data;
}

module.exports = viewData;


},{"debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/index.js":[function(require,module,exports){
'use strict';

module.exports = {
  'envoyAction': require('./action'),
  'envoyForm': require('./form'),
  'envoyList': require('./list'),
  'envoyProxy': require('./proxy')
};

},{"./action":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/action.js","./form":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/form/index.js","./list":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/list.js","./proxy":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/proxy.js"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/list.js":[function(require,module,exports){
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

},{"../envoy/opts":"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/opts.js"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/proxy.js":[function(require,module,exports){
'use strict';

var _ = require('lodash');

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyProxy
 * @restrict A
 * @description
 * Defines a directive which, when used with ngModel, will set the validity
 * of the associated NgModelController, based on the validity of the target
 * form.
 */
function proxy() {

  /**
   * Anything that needs validating needs a token, so, here's one.
   * @type {string}
   */
  var TOKEN = 'proxy';

  /**
   * The class to be applied if the directive's value is present
   * @type {string}
   */
  var CLASSNAME = 'errorlevel';

  return {
    restrict: 'A',
    require: 'ngModel',
    controller: [
      '$scope',
      '$element',
      '$attrs',
      '$envoy',
      '$interpolate',
      '$animate',
      function ProxyController($scope,
        $element,
        $attrs,
        $envoy,
        $interpolate,
        $animate) {

        var debug = require('debug')('envoy:directives:proxy:controller');
        var target = $interpolate($attrs.envoyProxy || '')($scope);
        var ngModel = $element.controller('ngModel');

        $animate = $animate || $element;

        this.$update = function $update(data) {
          var isValid = !data.errorLevel;
          var errorLevelName = $envoy.level(data.errorLevel);
          debug('Proxy "%s" updated w/ errorLevel %s', target, errorLevelName);
          _.each($envoy.ERRORLEVELS, function (errorlevel, errorLevelName) {
            $animate.removeClass($element, errorLevelName);
          });
          ngModel.$setValidity(TOKEN, isValid);
          if (!isValid) {
            $animate.addClass($element, errorLevelName);
          }
        };

        this.toString = function toString() {
          return this.$name + '-proxy';
        };

        this.$name = target;

        if (target) {
          $element.addClass(CLASSNAME);
          $scope.$on('$destroy', $envoy.bindForm(this, target, 'ProxyController'));
        } else {
          throw new Error('envoyProxy directive needs a value!');
        }
      }
    ]
  };
}
module.exports = proxy;

},{"debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/factory.js":[function(require,module,exports){
'use strict';

var _ = require('lodash');
var opts = require('./opts');

var debug = require('debug')('envoy:$envoy:factory');

var DEBOUNCE_MS = 250;

function envoyFactory($http, $q) {

  /**
   * Error levels as configured in opts in order, by name
   * @type {Array.<string>}
   */
  var LEVEL_ARRAY = _.pluck(opts.levels, 'name');

  /**
   * Mapping of error level names to indices in {@link LEVEL_ARRAY}
   * @type {Object.<string,number>}
   */
  var LEVELS = _(LEVEL_ARRAY)
    .invert()
    .mapValues(_.parseInt)
    .value();

  /**
   * Lookup of forms and controls to any actions bound via the
   * messageAction directive.  An action is simply an AngularJS
   * expression which will be evaluated.
   * @type {Object.<string,Object.<string,string>>}
   */
  var actions = {};

  /**
   * Map of form name to EnvoyMessagesController bindings
   * @type {Object.<string,EnvoyMessagesController>}
   */
  var bindings = {};

  var prototype;

  /**
   * @ngdoc service
   * @name fv.envoy.$envoy
   * @description
   * Retrieves a collection of messages for a form and/or control
   * within that form.  If no parameters, returns the entirety of the
   * data file.
   * @param {FormController} form Form controller
   * @returns {Object} Messages indexed by form name, then control name,
   * and finally validation token.  May be empty if nothing is wrong
   * with the form.
   */
  function $envoy(form) {
    var result;
    if (!form) {
      return $q.reject(new Error('Must pass "form" parameter'));
    }
    if ((result = $envoy._cache[form.$name])) {
      return $q.when(result);
    }

    return (function (opts) {
      if (opts.messagesConfig) {
        return $q.when(opts.messagesConfig);
      }
      return $http.get(opts.messagesConfigUrl, {
        cache: true
      })
        .then(function (res) {
          return res.data;
        });
    }(opts))
      .then(function (messages) {

        // If the form has an alias (use the "alias" directive),
        // this name takes precedence.
        messages = _(messages[form.$alias || form.$name])
          // here we pick only the controls that are invalid.
          .mapValues(function (controlMsgOptions, controlMsgName) {
            var formControl = form[controlMsgName];
            var $error;
            // if this is truthy, then we have errors in the given
            // control
            if (formControl && _.size($error = formControl.$error)) {
              // get the problem tokens and grab any actions
              // if present.  actions are assigned at the token
              // level, but we don't have granular control over
              // which validation token triggers which action.
              // so, if there were two problems with one control,
              // both tokens would receive the action prop.
              // TODO: determine if we want/need to have actions per
              // validation token.
              return _(controlMsgOptions)
                .pick(_.keys($error))
                .each(function (tokenInfo) {
                  tokenInfo.action =
                    $envoy.getAction(form.$name, controlMsgName);
                })
                .value();

            }
          })
          .value();

        $envoy._cache[form.$name] = messages;

        return messages;
      });
  }

  /**
   * Mixins for this factory
   * @type {Object.<string,(Function|*)>}
   */
  prototype = {

    /**
     * Cache of messages, keyed on form name
     * @type {Object.<string,Object>}
     */
    _cache: {},

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#level
     * @methodOf fv.envoy.$envoy
     * @description
     * Utility function to convert an error level into a number or
     * string or vice versa
     * @param {(number|string)=} errorLevel Error level.  If omitted, will
     * return the default error level as a string.
     * @returns {(number|string)} Corresponding string/number
     */
    level: function level(errorLevel) {
      return _.isString(errorLevel) ?
      LEVELS[errorLevel] || LEVELS[opts.defaultLevel] :
      LEVEL_ARRAY[errorLevel] || opts.defaultLevel;
    },

    /**
     * Given a form and messages for it, as returned by $envoy(),
     * calculate the max error level.
     * @param form
     * @param formMessages
     * @returns {number}
     * @private
     */
    _formErrorLevel: function _formErrorLevel(form, formMessages) {
      /**
       * Index of the default error level
       * @type {number}
       */
      var defaultLevelNum = $envoy.DEFAULT_ERRORLEVEL;

      /**
       * Maximum error level of all validation tokens within all
       * controls of this form
       * @type {number}
       */
      var maxLevel = _.reduce(formMessages,
        function (result, controlMsgOpts) {

          /**
           * Maximum error level of any validation token within
           * the control which is in "invalid" state.
           * @type {number}
           */
          var maxControlLevel = _(controlMsgOpts)
            .pick(function (tokenOpts, tokenName) {
              return form.$error[tokenName];
            })
            .pluck('level')
            .map($envoy.level)
            .max();

          return Math.max(result, maxControlLevel);
        },
        defaultLevelNum);

      var errorLevelName = $envoy.level(maxLevel);
      debug('Computed errorLevel "%s" for form "%s"',
        errorLevelName,
        form.$name);
      return maxLevel;
    },

    /**
     * placeholder for promise while we're running refresh()
     */
    _refreshing: null,

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#bindForm
     * @methodOf fv.envoy.$envoy
     * @description
     * Bind a controller to a form.  Could be any object as long as it has an
     * `update()` method.  When the form's validity changes, the update()
     * method will be called, if the form has messages configured.
     * @param {*} ctrl Presumed to be a `envoyForm` controller instance, but
     * could be `envoyProxy` controller instance as well.
     * @param {string} formName Name of form
     * @param {string} group Group or type of controller
     * @returns {Function} A function that will break the binding
     */
    bindForm: function bindForm(ctrl, formName, type) {

      var formBindings = bindings[formName] = bindings[formName] || {};

      if (formBindings[type]) {
        throw new Error('controller already bound to form "%s" with type "%s"',
          formName,
          type);
      }
      formBindings[type] = ctrl;

      return function unbindForm() {
        delete formBindings[type];
      };
    },

    /**
     * For a EnvoyMessagesController, find parents (recursively).
     * @param {EnvoyMessagesController} ctrl envoyMessage Controller
     * @param {Array.<EnvoyMessagesController>} [list=[]] Array of parents
     * @returns {Array.<EnvoyMessagesController>} Array of parents
     */
    _findParents: function findParents(ctrl, list) {
      list = list || [];
      if (ctrl.$parent) {
        list.push(ctrl.$parent);
        return findParents(ctrl.$parent, list);
      }
      return list;
    },

    /**
     * For a EnvoyMessagesController, find all children (recursively).
     * @param {EnvoyMessagesController} ctrl envoyMessage Controller
     * @param {Array.<EnvoyMessagesController>} [list=[]] Array of children
     * @returns {Array.<EnvoyMessagesController>} Array of children
     */
    _findChildren: function findChildren(ctrl, list) {
      var children = ctrl.$children;
      list = list || [];
      if (children && children.length) {
        list.push.apply(list, children);
        return _(children)
          .map(function (child) {
            return findChildren(child, list);
          })
          .flatten()
          .unique()
          .value();
      }
      return list;
    },

    _refresh: _.debounce(function _refresh(form, control) {

      /**
       * All controllers that care about this form, be it envoyMessage
       * controllers, or envoyProxy controllers.
       * @type {Array.<(EnvoyMessagesController|ProxyController)>}
       */
      var boundControllers = _.toArray(bindings[form.$name]);

      /**
       * Those of the bound controls which are envoyMessage controllers.
       * These have actual form objects within them, so we'll use them
       * to determine the appropriate errorlevel(s).
       * @type {Array.<EnvoyMessagesController>}
       */
      var EnvoyMessagesControllers;

      /**
       * All parent controllers of the EnvoyMessagesControllers.
       * @type {Array.<EnvoyMessagesController>}
       */
      var parentControllers;

      if (!boundControllers.length) {
        // nobody cares.
        return;
      }

      EnvoyMessagesControllers = _.filter(boundControllers, function (ctrl) {
        return ctrl.$form;
      });

      parentControllers = _(EnvoyMessagesControllers)
        .map(function (child) {
          return $envoy._findParents(child);
        })
        .flatten()
        .unique()
        .value();

      $envoy._refreshing = $envoy(form)
        .then(function (formMessages) {
          var lastErrorLevel = $envoy._formErrorLevel(form,
            formMessages);
          var messages = _.object([form.$name], [formMessages]);
          var increasing;

          function update(ctrl) {
            ctrl.$update({
              messages: messages,
              errorLevel: lastErrorLevel
            });
          }

          if (form.$errorLevel < lastErrorLevel) {
            increasing = true;
          } else if (form.$errorLevel > lastErrorLevel) {
            increasing = false;
          } else {
            return;
          }

          _.each(formMessages[control.$name], function (tokenInfo) {
            tokenInfo.action = $envoy.getAction(form.$name, control.$name);
          });

          if (increasing === false) {
            lastErrorLevel = Math.max(lastErrorLevel,
              _(EnvoyMessagesControllers)
                .map(function (ctrl) {
                  return $envoy._findChildren(ctrl);
                })
                .flatten()
                .map(function (childController) {
                  return _.isNumber(childController.$errorLevel) ?
                    childController.$errorLevel :
                    $envoy.DEFAULT_ERRORLEVEL;
                })
                .max());
          }

          _.each(boundControllers, update);

          _.each(parentControllers, function (ctrl) {
            if (increasing) {
              if (ctrl.$errorLevel < lastErrorLevel) {
                update(ctrl);
              } else if (ctrl.$errorLevel > lastErrorLevel) {
                lastErrorLevel = ctrl.$errorLevel;
                update(ctrl);
              }
            } else {
              if (ctrl.$errorLevel > lastErrorLevel) {
                update(ctrl);
              } else if (ctrl.$errorLevel < lastErrorLevel) {
                lastErrorLevel = ctrl.$errorLevel;
                update(ctrl);
              }
            }
          });
        })
        .catch(function (err) {
          debug(err);
        });
    }, DEBOUNCE_MS),

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#refresh
     * @methodOf fv.envoy.$envoy
     * @description
     * Called automatically by forms, but could conceivably be called manually
     * if you wish to extend Envoy's functionality.  Pass a form and a control;
     * if the control is invalid, messages will be pulled out of the data file,
     * and the controllers bound via {@link fv.envoy.$envoy#bindForm bindForm}
     * will be updated.  In turn, this will update the view, but you could
     * have a custom controller do just about anything in its `update()`
     *   method.
     *
     * This is asynchronous, and the underlying method is debounced--you may
     * lose a call if you're too quick--but if you call it twice synchronously,
     * if the first call takes less than 250ms, the second call will not
     * execute.
     *
     * TODO: make the debounce timer configurable.
     * @param {createEnvoyFormController} form The form whose control changed
     * @param {(ngModel.NgModelController|createEnvoyFormController)} control The
     *   control which changed.
     * @returns {Promise} Returns nothing
     */
    refresh: function refresh(form, control) {

      delete $envoy._cache[form.$name];

      debug('Control "%s" in form "%s" changed validity',
        control.$name,
        form.$name);

      if ($envoy._refreshing) {
        return $envoy._refreshing.then($envoy._refresh.bind(null,
          form,
          control));
      }

      return $q.when($envoy._refresh(form, control));
    },

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#setAction
     * @methodOf fv.envoy.$envoy
     * @description
     * Set an action to be executed at some point.  Used by the
     * envoyList directive's view, so that you can click on an
     * error and be taken to where the error is.
     * @todo make controlName optional?
     * @param {string} formName Name of form
     * @param {string} controlName Name of control
     * @param {string} action AngularJS expression to evaluate
     */
    setAction: function setAction(formName, controlName, action) {
      var formActions = actions[formName] = actions[formName] || {};
      formActions[controlName] = action;
    },

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#getAction
     * @methodOf fv.envoy.$envoy
     * @description
     * Gets a stored action.
     * @param {string} formName Name of form for action
     * @param {string} controlName Name of control for action
     * @returns {(string|undefined)} The action (AngularJS
     *     expression), if it exists.
     */
    getAction: function getAction(formName, controlName) {
      return _.get(actions, formName + '.' + controlName);
    },

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#findController
     * @methodOf fv.envoy.$envoy
     * @description
     * Utility function to get an envoyForm directive.
     * @param {string} formName Find the EnvoyFormController
     *     attached to form with this name
     * @throws If no envoyForm with that name found
     * @returns {EnvoyFormController} EnvoyFormController controller
     */
    findController: function findController(formName) {
      var form;
      if (bindings[formName] &&
        (form = bindings[formName].EnvoyFormController)) {
        return form;
      }

      throw new Error('cannot find envoyForm with name ' + formName);
    },

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#levelDescription
     * @methodOf fv.envoy.$envoy
     * @description
     * Returns the description/$title for an errorlevel.
     * @param {(string|number)} errorLevel errorlevel
     * @returns {string} The description/$title of given errorlevel
     */
    levelDescription: function levelDescription(errorLevel) {
      if (_.isString(errorLevel)) {
        errorLevel = $envoy.level(errorLevel);
      }
      return opts.levels[errorLevel].description;
    },

    /**
     * @ngdoc property
     * @name fv.envoy.$envoy#DEFAULT_LEVEL
     * @propertyOf fv.envoy.$envoy
     * @description
     * The default level (as a string)
     * @type {string}
     */
    DEFAULT_LEVEL: opts.defaultLevel,

    /**
     * @ngdoc property
     * @name fv.envoy.$envoy#DEFAULT_ERRORLEVEL
     * @propertyOf fv.envoy.$envoy
     * @description
     * The default errorlevel (as a number)
     * @type {number}
     */
    DEFAULT_ERRORLEVEL: LEVELS[opts.defaultLevel],

    /**
     * @ngdoc property
     * @name fv.envoy.$envoy#ERRORLEVELS
     * @propertyOf fv.envoy.$envoy
     * @description
     * The levels as an Object, keyed on level name
     * @type {Object.<string,number>}
     */
    ERRORLEVELS: LEVELS,

    /**
     * @ngdoc property
     * @name fv.envoy.$envoy#LEVELS
     * @propertyOf fv.envoy.$envoy
     * @description
     * The levels as an array, with each object representing a level
     * @type {Array.<Object.<string,number>>}
     */
    LEVELS: opts.levels,


    /**
     * @ngdoc property
     * @name fv.envoy.$envoy#options
     * @propertyOf fv.envoy.$envoy
     * @description
     * Options, as defined by defaults and any calls to `options()` in the
     * provider.
     * @type {Object.<string,*>}
     */
    options: opts

  };

  _.extend($envoy, prototype);

  return $envoy;
}
envoyFactory.$inject = ['$http', '$q'];

module.exports = envoyFactory;

},{"./opts":"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/opts.js","debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/index.js":[function(require,module,exports){
'use strict';

var opts = require('./opts');
var _ = require('lodash');

var debug = require('debug')('envoy:$envoy:provider');
/**
 * @ngdoc service
 * @name fv.envoy.$envoyProvider
 * @description
 * Allows configuration of options for Envoy; see the
 * {@link fv.envoy.$envoyProvider#options `options()` method}.
 *
 * # Default Options
 *
 * - `levels`: Three (3) default levels.  `ok`, `warning`, and `error`, in
 *     increasing severity, having descriptions "Fixed!", "Warning", and
 *     "Error", respectively.
 * - `defaultLevel: `ok`
 * - `dataFileUrl`: `messages.json`
 * - `templateUrl`: `partials/messages.html`
 */
function envoyProvider() {

  /**
   * @ngdoc function
   * @name fv.envoy.$envoyProvider#options
   * @methodOf fv.envoy.$envoyProvider
   * @description
   * Using this method, set options during `config()` phase.
   * @param {Object=} newOpts New options to assign onto defaults
   * @param {Array.<Object.<string,string>>=} newOpts.levels User-defined
   *     levels.  Each Object in the Array should have a `name` and
   *     `description` property.
   * @param {string=} newOpts.dataFileUrl The URL path to the `.json` file
   *     containing the messages
   * @param {string=} newOpts.templateUrl The URL path to the partial
   *     representing the message list
   * @param {string=} newOpts.defaultLevel The default level; corresponds to
   *     the `name` property of each object in the `levels` array
   * @returns {Object} The resulting options
   //* @param {(string|angular.element)=} newOpts.template The raw template to use
   //*     for the message list.  Takes precedence over `templateUrl`.
   //* @param {Object=} newOpts.messageConfig Instead of the URL to a `.json`
   //*     file, this can be an `Object`.  Takes precedence over
   //*     `messageConfigUrl`.
   */
  this.options = function options(newOpts) {
    _.extend(opts, newOpts);
    debug('New options set:', opts);
    return opts;
  };

  this.$get = require('./factory');

}

module.exports = envoyProvider;

},{"./factory":"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/factory.js","./opts":"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/opts.js","debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/opts.js":[function(require,module,exports){
'use strict';

/**
 * Default level and descriptions
 * @type {Array.<Object.<string, string>>}
 */
var DEFAULT_LEVELS = [
  {
    name: 'ok',
    description: 'Fixed!'
  },
  {
    name: 'warning',
    description: 'Warning'
  },
  {
    name: 'error',
    description: 'Error'
  }
];

/**
 * Default web server path to JSON message definition file
 * @type {string}
 */
var DEFAULT_MESSAGES_CONFIG_URL = 'example-data/messages.json';

/**
 * The default level
 * @type {string}
 */
var DEFAULT_LEVEL = 'ok';

/**
 * Whether or not to display messages if the errorlevel is the default one.
 * Practically speaking, this could give the user momentary feedback that
 * they've fixed a field.
 * @type {boolean}
 */
var DEFAULT_SHOW_DEFAULT_LEVEL = false;

/**
 * The URL of the template to use for the
 * {@link fv.envoy.directive:envoyList envoyList} directive.
 * @type {string}
 */
var DEFAULT_TEMPLATE_URL = 'partials/messages.html';

/**
 * The raw template to use.  Takes precedence over `templateUrl`.
 * @type {(string|null|angular.element)}
 */
var DEFAULT_TEMPLATE = null;

/**
 * The raw data object to use.  Takes precedence over `messagesConfigUrl`.
 * @type {(Object|null)}
 */
var DEFAULT_MESSAGE_CONFIG = null;

module.exports = {
  levels: DEFAULT_LEVELS,
  defaultLevel: DEFAULT_LEVEL,
  messagesConfigUrl: DEFAULT_MESSAGES_CONFIG_URL,
  showDefaultLevel: DEFAULT_SHOW_DEFAULT_LEVEL,
  templateUrl: DEFAULT_TEMPLATE_URL,
  messagesConfig: DEFAULT_MESSAGE_CONFIG,
  template: DEFAULT_TEMPLATE
};


},{}],"/Volumes/alien/projects/decipher/angular-envoy/lib/index.js":[function(require,module,exports){
(function (global){
'use strict';

/**
 * @ngdoc overview
 * @name fv.envoy
 * @description
 * # fv.envoy
 *
 * The main module for Envoy.  You will need to include this module.
 *
 * Envoy has dependencies of [lodash](http://lodash.org) and of course
 * [AngularJS](http://angularjs.org).
 *
 * @example
 * <pre>
 * <html ng-app="myApp">
 * <head>
 *   <script src="path/to/angular.js"></script>
 *   <script src="path/to/lodash.js"></script>
 *   <script src="path/to/envoy.js"></script>
 *   <script>
 *     var myApp = angular.module('myApp', ['fv.envoy']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */

var angular = (typeof window !== "undefined" ? window.angular : typeof global !== "undefined" ? global.angular : null);
var _ = require('lodash');
var directives = require('./directives');
var pkg = require('../package.json');
var $envoy = require('./envoy');

var MODULE_NAME = 'fv.envoy';
var debug = require('debug')('envoy');
var envoy;
var ngAnimatePresent = false;

function config($provide) {
  if (!ngAnimatePresent) {
    $provide.value('$animate', null);
  }
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

try {
  envoy = angular.module(MODULE_NAME, ['ngAnimate']);
  ngAnimatePresent = true;
} catch (ignored) {
  envoy = angular.module(MODULE_NAME, []);
}

envoy
  .config(config)
  .provider('$envoy', $envoy);

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../package.json":"/Volumes/alien/projects/decipher/angular-envoy/package.json","./directives":"/Volumes/alien/projects/decipher/angular-envoy/lib/directives/index.js","./envoy":"/Volumes/alien/projects/decipher/angular-envoy/lib/envoy/index.js","debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js","lodash":"lodash"}],"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/browser.js":[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/debug.js"}],"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/debug.js":[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/node_modules/ms/index.js"}],"/Volumes/alien/projects/decipher/angular-envoy/node_modules/debug/node_modules/ms/index.js":[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],"/Volumes/alien/projects/decipher/angular-envoy/package.json":[function(require,module,exports){
module.exports={
  "name": "angular-envoy",
  "version": "0.0.1",
  "description": "Highly flexible form validation messaging for AngularJS",
  "main": "lib/index.js",
  "author": "Christopher Hiller <chiller@focusvision.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/decipherinc/angular-envoy.git"
  },
  "devDependencies": {
    "angular": "^1.4.3",
    "chai": "^3.2.0",
    "exposify": "^0.4.3",
    "grunt": "^0.4.5",
    "grunt-bower-install-simple": "^1.1.4",
    "grunt-browserify": "^4.0.0",
    "grunt-bump": "^0.3.1",
    "grunt-cli": "^0.1.13",
    "grunt-contrib-clean": "^0.6.0",
    "grunt-contrib-copy": "^0.8.0",
    "grunt-dev-update": "^1.3.0",
    "grunt-eslint": "^17.0.0",
    "grunt-gh-pages": "^0.10.0",
    "grunt-lodash": "^0.4.0",
    "grunt-lodash-autobuild": "^0.3.0",
    "grunt-mocha-istanbul": "^2.4.0",
    "grunt-ngdocs": "^0.2.7",
    "istanbul": "^0.3.17",
    "jit-grunt": "^0.9.1",
    "jsonminifyify": "^0.1.1",
    "load-grunt-config": "^0.17.2",
    "lodash-cli": "^3.10.0",
    "mocha": "^2.2.5",
    "time-grunt": "^1.2.1",
    "uglifyify": "^3.0.1"
  },
  "scripts": {
    "test": "grunt test"
  },
  "peerDependencies": {
    "angular": "^1.4.1"
  },
  "dependencies": {
    "angular-animate": "^1.3.17",
    "debug": "^2.2.0",
    "lodash": "^3.9.3"
  }
}

},{}],"lodash":[function(require,module,exports){
(function (global){
/**
 * @license
 * lodash 3.10.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern exports="node" category="chain" include="assign,create,debounce,filter,first,flatten,forEach,get,has,invert,isNumber,isObject,isString,mapValues,max,pick,pluck,reduce,size,toArray,unique,uniqueId,zipObject" --output ./support/lodash.custom.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '3.10.0';

  /** Used to compose bitmasks for wrapper metadata. */
  var BIND_FLAG = 1,
      BIND_KEY_FLAG = 2,
      CURRY_BOUND_FLAG = 4,
      CURRY_FLAG = 8,
      CURRY_RIGHT_FLAG = 16,
      PARTIAL_FLAG = 32,
      PARTIAL_RIGHT_FLAG = 64,
      ARY_FLAG = 128;

  /** Used to detect when a function becomes hot. */
  var HOT_COUNT = 150,
      HOT_SPAN = 16;

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /** Used to indicate the type of lazy iteratees. */
  var LAZY_FILTER_FLAG = 1,
      LAZY_MAP_FLAG = 2;

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used as the internal argument placeholder. */
  var PLACEHOLDER = '__lodash_placeholder__';

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      weakMapTag = '[object WeakMap]';

  var arrayBufferTag = '[object ArrayBuffer]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /** Used to detect host constructors (Safari > 5). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^\d+$/;

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
  typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
  typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
  typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
  typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
  typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
  typedArrayTags[dateTag] = typedArrayTags[errorTag] =
  typedArrayTags[funcTag] = typedArrayTags[mapTag] =
  typedArrayTags[numberTag] = typedArrayTags[objectTag] =
  typedArrayTags[regexpTag] = typedArrayTags[setTag] =
  typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

  /** Used to identify `toStringTag` values supported by `_.clone`. */
  var cloneableTags = {};
  cloneableTags[argsTag] = cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
  cloneableTags[dateTag] = cloneableTags[float32Tag] =
  cloneableTags[float64Tag] = cloneableTags[int8Tag] =
  cloneableTags[int16Tag] = cloneableTags[int32Tag] =
  cloneableTags[numberTag] = cloneableTags[objectTag] =
  cloneableTags[regexpTag] = cloneableTags[stringTag] =
  cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
  cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag] = cloneableTags[funcTag] =
  cloneableTags[mapTag] = cloneableTags[setTag] =
  cloneableTags[weakMapTag] = false;

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;

  /** Detect free variable `self`. */
  var freeSelf = objectTypes[typeof self] && self && self.Object && self;

  /** Detect free variable `window`. */
  var freeWindow = objectTypes[typeof window] && window && window.Object && window;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

  /**
   * Used as a reference to the global object.
   *
   * The `this` value is used if it's the global object to avoid Greasemonkey's
   * restricted `window` object, otherwise the `window` object is used.
   */
  var root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

  /*--------------------------------------------------------------------------*/

  /**
   * The base implementation of `_.indexOf` without support for binary searches.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    if (value !== value) {
      return indexOfNaN(array, fromIndex);
    }
    var index = fromIndex - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Converts `value` to a string if it's not one. An empty string is returned
   * for `null` or `undefined` values.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    return value == null ? '' : (value + '');
  }

  /**
   * Gets the index at which the first occurrence of `NaN` is found in `array`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched `NaN`, else `-1`.
   */
  function indexOfNaN(array, fromIndex, fromRight) {
    var length = array.length,
        index = fromIndex + (fromRight ? 0 : -1);

    while ((fromRight ? index-- : ++index < length)) {
      var other = array[index];
      if (other !== other) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Checks if `value` is object-like.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Replaces all `placeholder` elements in `array` with an internal placeholder
   * and returns an array of their indexes.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {*} placeholder The placeholder to replace.
   * @returns {Array} Returns the new array of placeholder indexes.
   */
  function replaceHolders(array, placeholder) {
    var index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      if (array[index] === placeholder) {
        array[index] = PLACEHOLDER;
        result[++resIndex] = index;
      }
    }
    return result;
  }

  /**
   * An implementation of `_.uniq` optimized for sorted arrays without support
   * for callback shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} [iteratee] The function invoked per iteration.
   * @returns {Array} Returns the new duplicate-value-free array.
   */
  function sortedUniq(array, iteratee) {
    var seen,
        index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      var value = array[index],
          computed = iteratee ? iteratee(value, index, array) : value;

      if (!index || seen !== computed) {
        seen = computed;
        result[++resIndex] = value;
      }
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /** Used for native method references. */
  var arrayProto = Array.prototype,
      objectProto = Object.prototype,
      stringProto = String.prototype;

  /** Used to resolve the decompiled source of functions. */
  var fnToString = Function.prototype.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to generate unique IDs. */
  var idCounter = 0;

  /**
   * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objToString = objectProto.toString;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /** Native method references. */
  var ArrayBuffer = root.ArrayBuffer,
      propertyIsEnumerable = objectProto.propertyIsEnumerable,
      Set = getNative(root, 'Set'),
      Uint8Array = root.Uint8Array,
      WeakMap = getNative(root, 'WeakMap');

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeCreate = getNative(Object, 'create'),
      nativeFloor = Math.floor,
      nativeIsArray = getNative(Array, 'isArray'),
      nativeKeys = getNative(Object, 'keys'),
      nativeMax = Math.max,
      nativeMin = Math.min,
      nativeNow = getNative(Date, 'now');

  /** Used as references for `-Infinity` and `Infinity`. */
  var NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
      POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

  /** Used as references for the maximum length and index of an array. */
  var MAX_ARRAY_LENGTH = 4294967295,
      MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
      HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;

  /**
   * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
   * of an array-like value.
   */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /** Used to store function metadata. */
  var metaMap = WeakMap && new WeakMap;

  /** Used to lookup unminified function names. */
  var realNames = {};

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object which wraps `value` to enable implicit chaining.
   * Methods that operate on and return arrays, collections, and functions can
   * be chained together. Methods that retrieve a single value or may return a
   * primitive value will automatically end the chain returning the unwrapped
   * value. Explicit chaining may be enabled using `_.chain`. The execution of
   * chained methods is lazy, that is, execution is deferred until `_#value`
   * is implicitly or explicitly called.
   *
   * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
   * fusion is an optimization strategy which merge iteratee calls; this can help
   * to avoid the creation of intermediate data structures and greatly reduce the
   * number of iteratee executions.
   *
   * Chaining is supported in custom builds as long as the `_#value` method is
   * directly or indirectly included in the build.
   *
   * In addition to lodash methods, wrappers have `Array` and `String` methods.
   *
   * The wrapper `Array` methods are:
   * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`,
   * `splice`, and `unshift`
   *
   * The wrapper `String` methods are:
   * `replace` and `split`
   *
   * The wrapper methods that support shortcut fusion are:
   * `compact`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`,
   * `first`, `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`,
   * `slice`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `toArray`,
   * and `where`
   *
   * The chainable wrapper methods are:
   * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
   * `callback`, `chain`, `chunk`, `commit`, `compact`, `concat`, `constant`,
   * `countBy`, `create`, `curry`, `debounce`, `defaults`, `defaultsDeep`,
   * `defer`, `delay`, `difference`, `drop`, `dropRight`, `dropRightWhile`,
   * `dropWhile`, `fill`, `filter`, `flatten`, `flattenDeep`, `flow`, `flowRight`,
   * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
   * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
   * `invoke`, `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`,
   * `matchesProperty`, `memoize`, `merge`, `method`, `methodOf`, `mixin`,
   * `modArgs`, `negate`, `omit`, `once`, `pairs`, `partial`, `partialRight`,
   * `partition`, `pick`, `plant`, `pluck`, `property`, `propertyOf`, `pull`,
   * `pullAt`, `push`, `range`, `rearg`, `reject`, `remove`, `rest`, `restParam`,
   * `reverse`, `set`, `shuffle`, `slice`, `sort`, `sortBy`, `sortByAll`,
   * `sortByOrder`, `splice`, `spread`, `take`, `takeRight`, `takeRightWhile`,
   * `takeWhile`, `tap`, `throttle`, `thru`, `times`, `toArray`, `toPlainObject`,
   * `transform`, `union`, `uniq`, `unshift`, `unzip`, `unzipWith`, `values`,
   * `valuesIn`, `where`, `without`, `wrap`, `xor`, `zip`, `zipObject`, `zipWith`
   *
   * The wrapper methods that are **not** chainable by default are:
   * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clone`, `cloneDeep`,
   * `deburr`, `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`,
   * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`,
   * `floor`, `get`, `gt`, `gte`, `has`, `identity`, `includes`, `indexOf`,
   * `inRange`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
   * `isEmpty`, `isEqual`, `isError`, `isFinite` `isFunction`, `isMatch`,
   * `isNative`, `isNaN`, `isNull`, `isNumber`, `isObject`, `isPlainObject`,
   * `isRegExp`, `isString`, `isUndefined`, `isTypedArray`, `join`, `kebabCase`,
   * `last`, `lastIndexOf`, `lt`, `lte`, `max`, `min`, `noConflict`, `noop`,
   * `now`, `pad`, `padLeft`, `padRight`, `parseInt`, `pop`, `random`, `reduce`,
   * `reduceRight`, `repeat`, `result`, `round`, `runInContext`, `shift`, `size`,
   * `snakeCase`, `some`, `sortedIndex`, `sortedLastIndex`, `startCase`,
   * `startsWith`, `sum`, `template`, `trim`, `trimLeft`, `trimRight`, `trunc`,
   * `unescape`, `uniqueId`, `value`, and `words`
   *
   * The wrapper method `sample` will return a wrapped value when `n` is provided,
   * otherwise an unwrapped value is returned.
   *
   * @name _
   * @constructor
   * @category Chain
   * @param {*} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var wrapped = _([1, 2, 3]);
   *
   * // returns an unwrapped value
   * wrapped.reduce(function(total, n) {
   *   return total + n;
   * });
   * // => 6
   *
   * // returns a wrapped value
   * var squares = wrapped.map(function(n) {
   *   return n * n;
   * });
   *
   * _.isArray(squares);
   * // => false
   *
   * _.isArray(squares.value());
   * // => true
   */
  function lodash(value) {
    if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
      if (value instanceof LodashWrapper) {
        return value;
      }
      if (hasOwnProperty.call(value, '__chain__') && hasOwnProperty.call(value, '__wrapped__')) {
        return wrapperClone(value);
      }
    }
    return new LodashWrapper(value);
  }

  /**
   * The function whose prototype all chaining wrappers inherit from.
   *
   * @private
   */
  function baseLodash() {
    // No operation performed.
  }

  /**
   * The base constructor for creating `lodash` wrapper objects.
   *
   * @private
   * @param {*} value The value to wrap.
   * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
   * @param {Array} [actions=[]] Actions to peform to resolve the unwrapped value.
   */
  function LodashWrapper(value, chainAll, actions) {
    this.__wrapped__ = value;
    this.__actions__ = actions || [];
    this.__chain__ = !!chainAll;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
   *
   * @private
   * @param {*} value The value to wrap.
   */
  function LazyWrapper(value) {
    this.__wrapped__ = value;
    this.__actions__ = [];
    this.__dir__ = 1;
    this.__filtered__ = false;
    this.__iteratees__ = [];
    this.__takeCount__ = POSITIVE_INFINITY;
    this.__views__ = [];
  }

  /**
   * Creates a clone of the lazy wrapper object.
   *
   * @private
   * @name clone
   * @memberOf LazyWrapper
   * @returns {Object} Returns the cloned `LazyWrapper` object.
   */
  function lazyClone() {
    var result = new LazyWrapper(this.__wrapped__);
    result.__actions__ = arrayCopy(this.__actions__);
    result.__dir__ = this.__dir__;
    result.__filtered__ = this.__filtered__;
    result.__iteratees__ = arrayCopy(this.__iteratees__);
    result.__takeCount__ = this.__takeCount__;
    result.__views__ = arrayCopy(this.__views__);
    return result;
  }

  /**
   * Reverses the direction of lazy iteration.
   *
   * @private
   * @name reverse
   * @memberOf LazyWrapper
   * @returns {Object} Returns the new reversed `LazyWrapper` object.
   */
  function lazyReverse() {
    if (this.__filtered__) {
      var result = new LazyWrapper(this);
      result.__dir__ = -1;
      result.__filtered__ = true;
    } else {
      result = this.clone();
      result.__dir__ *= -1;
    }
    return result;
  }

  /**
   * Extracts the unwrapped value from its lazy wrapper.
   *
   * @private
   * @name value
   * @memberOf LazyWrapper
   * @returns {*} Returns the unwrapped value.
   */
  function lazyValue() {
    var array = this.__wrapped__.value(),
        dir = this.__dir__,
        isArr = isArray(array),
        isRight = dir < 0,
        arrLength = isArr ? array.length : 0,
        view = getView(0, arrLength, this.__views__),
        start = view.start,
        end = view.end,
        length = end - start,
        index = isRight ? end : (start - 1),
        iteratees = this.__iteratees__,
        iterLength = iteratees.length,
        resIndex = 0,
        takeCount = nativeMin(length, this.__takeCount__);

    if (!isArr || arrLength < LARGE_ARRAY_SIZE || (arrLength == length && takeCount == length)) {
      return baseWrapperValue((isRight && isArr) ? array.reverse() : array, this.__actions__);
    }
    var result = [];

    outer:
    while (length-- && resIndex < takeCount) {
      index += dir;

      var iterIndex = -1,
          value = array[index];

      while (++iterIndex < iterLength) {
        var data = iteratees[iterIndex],
            iteratee = data.iteratee,
            type = data.type,
            computed = iteratee(value);

        if (type == LAZY_MAP_FLAG) {
          value = computed;
        } else if (!computed) {
          if (type == LAZY_FILTER_FLAG) {
            continue outer;
          } else {
            break outer;
          }
        }
      }
      result[resIndex++] = value;
    }
    return result;
  }

  /*------------------------------------------------------------------------*/

  /**
   *
   * Creates a cache object to store unique values.
   *
   * @private
   * @param {Array} [values] The values to cache.
   */
  function SetCache(values) {
    var length = values ? values.length : 0;

    this.data = { 'hash': nativeCreate(null), 'set': new Set };
    while (length--) {
      this.push(values[length]);
    }
  }

  /**
   * Checks if `value` is in `cache` mimicking the return signature of
   * `_.indexOf` by returning `0` if the value is found, else `-1`.
   *
   * @private
   * @param {Object} cache The cache to search.
   * @param {*} value The value to search for.
   * @returns {number} Returns `0` if `value` is found, else `-1`.
   */
  function cacheIndexOf(cache, value) {
    var data = cache.data,
        result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

    return result ? 0 : -1;
  }

  /**
   * Adds `value` to the cache.
   *
   * @private
   * @name push
   * @memberOf SetCache
   * @param {*} value The value to cache.
   */
  function cachePush(value) {
    var data = this.data;
    if (typeof value == 'string' || isObject(value)) {
      data.set.add(value);
    } else {
      data.hash[value] = true;
    }
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a new array joining `array` with `other`.
   *
   * @private
   * @param {Array} array The array to join.
   * @param {Array} other The other array to join.
   * @returns {Array} Returns the new concatenated array.
   */
  function arrayConcat(array, other) {
    var index = -1,
        length = array.length,
        othIndex = -1,
        othLength = other.length,
        result = Array(length + othLength);

    while (++index < length) {
      result[index] = array[index];
    }
    while (++othIndex < othLength) {
      result[index++] = other[othIndex];
    }
    return result;
  }

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function arrayCopy(source, array) {
    var index = -1,
        length = source.length;

    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }

  /**
   * A specialized version of `_.forEach` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * A specialized version of `baseExtremum` for arrays which invokes `iteratee`
   * with one argument: (value).
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} comparator The function used to compare values.
   * @param {*} exValue The initial extremum value.
   * @returns {*} Returns the extremum value.
   */
  function arrayExtremum(array, iteratee, comparator, exValue) {
    var index = -1,
        length = array.length,
        computed = exValue,
        result = computed;

    while (++index < length) {
      var value = array[index],
          current = +iteratee(value);

      if (comparator(current, computed)) {
        computed = current;
        result = value;
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.filter` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
        length = array.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[++resIndex] = value;
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.map` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush(array, values) {
    var index = -1,
        length = values.length,
        offset = array.length;

    while (++index < length) {
      array[offset + index] = values[index];
    }
    return array;
  }

  /**
   * A specialized version of `_.reduce` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initFromArray] Specify using the first element of `array`
   *  as the initial value.
   * @returns {*} Returns the accumulated value.
   */
  function arrayReduce(array, iteratee, accumulator, initFromArray) {
    var index = -1,
        length = array.length;

    if (initFromArray && length) {
      accumulator = array[++index];
    }
    while (++index < length) {
      accumulator = iteratee(accumulator, array[index], index, array);
    }
    return accumulator;
  }

  /**
   * A specialized version of `_.some` for arrays without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }

  /**
   * A specialized version of `_.assign` for customizing assigned values without
   * support for argument juggling, multiple sources, and `this` binding `customizer`
   * functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @param {Function} customizer The function to customize assigned values.
   * @returns {Object} Returns `object`.
   */
  function assignWith(object, source, customizer) {
    var index = -1,
        props = keys(source),
        length = props.length;

    while (++index < length) {
      var key = props[index],
          value = object[key],
          result = customizer(value, source[key], key, object, source);

      if ((result === result ? (result !== value) : (value === value)) ||
          (value === undefined && !(key in object))) {
        object[key] = result;
      }
    }
    return object;
  }

  /**
   * The base implementation of `_.assign` without support for argument juggling,
   * multiple sources, and `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssign(object, source) {
    return source == null
      ? object
      : baseCopy(source, keys(source), object);
  }

  /**
   * Copies properties of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property names to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @returns {Object} Returns `object`.
   */
  function baseCopy(source, props, object) {
    object || (object = {});

    var index = -1,
        length = props.length;

    while (++index < length) {
      var key = props[index];
      object[key] = source[key];
    }
    return object;
  }

  /**
   * The base implementation of `_.callback` which supports specifying the
   * number of arguments to provide to `func`.
   *
   * @private
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param {number} [argCount] The number of arguments to provide to `func`.
   * @returns {Function} Returns the callback.
   */
  function baseCallback(func, thisArg, argCount) {
    var type = typeof func;
    if (type == 'function') {
      return thisArg === undefined
        ? func
        : bindCallback(func, thisArg, argCount);
    }
    if (func == null) {
      return identity;
    }
    if (type == 'object') {
      return baseMatches(func);
    }
    return thisArg === undefined
      ? property(func)
      : baseMatchesProperty(func, thisArg);
  }

  /**
   * The base implementation of `_.clone` without support for argument juggling
   * and `this` binding `customizer` functions.
   *
   * @private
   * @param {*} value The value to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @param {Function} [customizer] The function to customize cloning values.
   * @param {string} [key] The key of `value`.
   * @param {Object} [object] The object `value` belongs to.
   * @param {Array} [stackA=[]] Tracks traversed source objects.
   * @param {Array} [stackB=[]] Associates clones with source counterparts.
   * @returns {*} Returns the cloned value.
   */
  function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
    var result;
    if (customizer) {
      result = object ? customizer(value, key, object) : customizer(value);
    }
    if (result !== undefined) {
      return result;
    }
    if (!isObject(value)) {
      return value;
    }
    var isArr = isArray(value);
    if (isArr) {
      result = initCloneArray(value);
      if (!isDeep) {
        return arrayCopy(value, result);
      }
    } else {
      var tag = objToString.call(value),
          isFunc = tag == funcTag;

      if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
        result = initCloneObject(isFunc ? {} : value);
        if (!isDeep) {
          return baseAssign(result, value);
        }
      } else {
        return cloneableTags[tag]
          ? initCloneByTag(value, tag, isDeep)
          : (object ? value : {});
      }
    }
    // Check for circular references and return its corresponding clone.
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == value) {
        return stackB[length];
      }
    }
    // Add the source value to the stack of traversed objects and associate it with its clone.
    stackA.push(value);
    stackB.push(result);

    // Recursively populate clone (susceptible to call stack limits).
    (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
      result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
    });
    return result;
  }

  /**
   * The base implementation of `_.create` without support for assigning
   * properties to the created object.
   *
   * @private
   * @param {Object} prototype The object to inherit from.
   * @returns {Object} Returns the new object.
   */
  var baseCreate = (function() {
    function object() {}
    return function(prototype) {
      if (isObject(prototype)) {
        object.prototype = prototype;
        var result = new object;
        object.prototype = undefined;
      }
      return result || {};
    };
  }());

  /**
   * The base implementation of `_.forEach` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object|string} Returns `collection`.
   */
  var baseEach = createBaseEach(baseForOwn);

  /**
   * Gets the extremum value of `collection` invoking `iteratee` for each value
   * in `collection` to generate the criterion by which the value is ranked.
   * The `iteratee` is invoked with three arguments: (value, index|key, collection).
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} comparator The function used to compare values.
   * @param {*} exValue The initial extremum value.
   * @returns {*} Returns the extremum value.
   */
  function baseExtremum(collection, iteratee, comparator, exValue) {
    var computed = exValue,
        result = computed;

    baseEach(collection, function(value, index, collection) {
      var current = +iteratee(value, index, collection);
      if (comparator(current, computed) || (current === exValue && current === result)) {
        computed = current;
        result = value;
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.filter` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function baseFilter(collection, predicate) {
    var result = [];
    baseEach(collection, function(value, index, collection) {
      if (predicate(value, index, collection)) {
        result.push(value);
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.flatten` with added support for restricting
   * flattening and specifying the start index.
   *
   * @private
   * @param {Array} array The array to flatten.
   * @param {boolean} [isDeep] Specify a deep flatten.
   * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
   * @param {Array} [result=[]] The initial result value.
   * @returns {Array} Returns the new flattened array.
   */
  function baseFlatten(array, isDeep, isStrict, result) {
    result || (result = []);

    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index];
      if (isObjectLike(value) && isArrayLike(value) &&
          (isStrict || isArray(value) || isArguments(value))) {
        if (isDeep) {
          // Recursively flatten arrays (susceptible to call stack limits).
          baseFlatten(value, isDeep, isStrict, result);
        } else {
          arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of `baseForIn` and `baseForOwn` which iterates
   * over `object` properties returned by `keysFunc` invoking `iteratee` for
   * each property. Iteratee functions may exit iteration early by explicitly
   * returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();

  /**
   * The base implementation of `_.forIn` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForIn(object, iteratee) {
    return baseFor(object, iteratee, keysIn);
  }

  /**
   * The base implementation of `_.forOwn` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return baseFor(object, iteratee, keys);
  }

  /**
   * The base implementation of `_.functions` which creates an array of
   * `object` function property names filtered from those provided.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Array} props The property names to filter.
   * @returns {Array} Returns the new array of filtered property names.
   */
  function baseFunctions(object, props) {
    var index = -1,
        length = props.length,
        resIndex = -1,
        result = [];

    while (++index < length) {
      var key = props[index];
      if (isFunction(object[key])) {
        result[++resIndex] = key;
      }
    }
    return result;
  }

  /**
   * The base implementation of `get` without support for string paths
   * and default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} path The path of the property to get.
   * @param {string} [pathKey] The key representation of path.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path, pathKey) {
    if (object == null) {
      return;
    }
    if (pathKey !== undefined && pathKey in toObject(object)) {
      path = [pathKey];
    }
    var index = 0,
        length = path.length;

    while (object != null && index < length) {
      object = object[path[index++]];
    }
    return (index && index == length) ? object : undefined;
  }

  /**
   * The base implementation of `_.isEqual` without support for `this` binding
   * `customizer` functions.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {Function} [customizer] The function to customize comparing values.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
  }

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing objects.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA=[]] Tracks traversed `value` objects.
   * @param {Array} [stackB=[]] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var objIsArr = isArray(object),
        othIsArr = isArray(other),
        objTag = arrayTag,
        othTag = arrayTag;

    if (!objIsArr) {
      objTag = objToString.call(object);
      if (objTag == argsTag) {
        objTag = objectTag;
      } else if (objTag != objectTag) {
        objIsArr = isTypedArray(object);
      }
    }
    if (!othIsArr) {
      othTag = objToString.call(other);
      if (othTag == argsTag) {
        othTag = objectTag;
      } else if (othTag != objectTag) {
        othIsArr = isTypedArray(other);
      }
    }
    var objIsObj = objTag == objectTag,
        othIsObj = othTag == objectTag,
        isSameTag = objTag == othTag;

    if (isSameTag && !(objIsArr || objIsObj)) {
      return equalByTag(object, other, objTag);
    }
    if (!isLoose) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

      if (objIsWrapped || othIsWrapped) {
        return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
      }
    }
    if (!isSameTag) {
      return false;
    }
    // Assume cyclic values are equal.
    // For more information on detecting circular references see https://es5.github.io/#JO.
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == object) {
        return stackB[length] == other;
      }
    }
    // Add `object` and `other` to the stack of traversed objects.
    stackA.push(object);
    stackB.push(other);

    var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

    stackA.pop();
    stackB.pop();

    return result;
  }

  /**
   * The base implementation of `_.isMatch` without support for callback
   * shorthands and `this` binding.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Array} matchData The propery names, values, and compare flags to match.
   * @param {Function} [customizer] The function to customize comparing objects.
   * @returns {boolean} Returns `true` if `object` is a match, else `false`.
   */
  function baseIsMatch(object, matchData, customizer) {
    var index = matchData.length,
        length = index,
        noCustomizer = !customizer;

    if (object == null) {
      return !length;
    }
    object = toObject(object);
    while (index--) {
      var data = matchData[index];
      if ((noCustomizer && data[2])
            ? data[1] !== object[data[0]]
            : !(data[0] in object)
          ) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
          objValue = object[key],
          srcValue = data[1];

      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var result = customizer ? customizer(objValue, srcValue, key) : undefined;
        if (!(result === undefined ? baseIsEqual(srcValue, objValue, customizer, true) : result)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * The base implementation of `_.map` without support for callback shorthands
   * and `this` binding.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
        result = isArrayLike(collection) ? Array(collection.length) : [];

    baseEach(collection, function(value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }

  /**
   * The base implementation of `_.matches` which does not clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   */
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      var key = matchData[0][0],
          value = matchData[0][1];

      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === value && (value !== undefined || (key in toObject(object)));
      };
    }
    return function(object) {
      return baseIsMatch(object, matchData);
    };
  }

  /**
   * The base implementation of `_.matchesProperty` which does not clone `srcValue`.
   *
   * @private
   * @param {string} path The path of the property to get.
   * @param {*} srcValue The value to compare.
   * @returns {Function} Returns the new function.
   */
  function baseMatchesProperty(path, srcValue) {
    var isArr = isArray(path),
        isCommon = isKey(path) && isStrictComparable(srcValue),
        pathKey = (path + '');

    path = toPath(path);
    return function(object) {
      if (object == null) {
        return false;
      }
      var key = pathKey;
      object = toObject(object);
      if ((isArr || !isCommon) && !(key in object)) {
        object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
        if (object == null) {
          return false;
        }
        key = last(path);
        object = toObject(object);
      }
      return object[key] === srcValue
        ? (srcValue !== undefined || (key in object))
        : baseIsEqual(srcValue, object[key], undefined, true);
    };
  }

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }

  /**
   * A specialized version of `baseProperty` which supports deep paths.
   *
   * @private
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new function.
   */
  function basePropertyDeep(path) {
    var pathKey = (path + '');
    path = toPath(path);
    return function(object) {
      return baseGet(object, path, pathKey);
    };
  }

  /**
   * The base implementation of `_.reduce` and `_.reduceRight` without support
   * for callback shorthands and `this` binding, which iterates over `collection`
   * using the provided `eachFunc`.
   *
   * @private
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} accumulator The initial value.
   * @param {boolean} initFromCollection Specify using the first or last element
   *  of `collection` as the initial value.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the accumulated value.
   */
  function baseReduce(collection, iteratee, accumulator, initFromCollection, eachFunc) {
    eachFunc(collection, function(value, index, collection) {
      accumulator = initFromCollection
        ? (initFromCollection = false, value)
        : iteratee(accumulator, value, index, collection);
    });
    return accumulator;
  }

  /**
   * The base implementation of `setData` without support for hot loop detection.
   *
   * @private
   * @param {Function} func The function to associate metadata with.
   * @param {*} data The metadata.
   * @returns {Function} Returns `func`.
   */
  var baseSetData = !metaMap ? identity : function(func, data) {
    metaMap.set(func, data);
    return func;
  };

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    start = start == null ? 0 : (+start || 0);
    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = (end === undefined || end > length) ? length : (+end || 0);
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  /**
   * The base implementation of `_.uniq` without support for callback shorthands
   * and `this` binding.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} [iteratee] The function invoked per iteration.
   * @returns {Array} Returns the new duplicate-value-free array.
   */
  function baseUniq(array, iteratee) {
    var index = -1,
        indexOf = getIndexOf(),
        length = array.length,
        isCommon = indexOf == baseIndexOf,
        isLarge = isCommon && length >= LARGE_ARRAY_SIZE,
        seen = isLarge ? createCache() : null,
        result = [];

    if (seen) {
      indexOf = cacheIndexOf;
      isCommon = false;
    } else {
      isLarge = false;
      seen = iteratee ? [] : result;
    }
    outer:
    while (++index < length) {
      var value = array[index],
          computed = iteratee ? iteratee(value, index, array) : value;

      if (isCommon && value === value) {
        var seenIndex = seen.length;
        while (seenIndex--) {
          if (seen[seenIndex] === computed) {
            continue outer;
          }
        }
        if (iteratee) {
          seen.push(computed);
        }
        result.push(value);
      }
      else if (indexOf(seen, computed, 0) < 0) {
        if (iteratee || isLarge) {
          seen.push(computed);
        }
        result.push(value);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */
  function baseValues(object, props) {
    var index = -1,
        length = props.length,
        result = Array(length);

    while (++index < length) {
      result[index] = object[props[index]];
    }
    return result;
  }

  /**
   * The base implementation of `wrapperValue` which returns the result of
   * performing a sequence of actions on the unwrapped `value`, where each
   * successive action is supplied the return value of the previous.
   *
   * @private
   * @param {*} value The unwrapped value.
   * @param {Array} actions Actions to peform to resolve the unwrapped value.
   * @returns {*} Returns the resolved value.
   */
  function baseWrapperValue(value, actions) {
    var result = value;
    if (result instanceof LazyWrapper) {
      result = result.value();
    }
    var index = -1,
        length = actions.length;

    while (++index < length) {
      var action = actions[index];
      result = action.func.apply(action.thisArg, arrayPush([result], action.args));
    }
    return result;
  }

  /**
   * Performs a binary search of `array` to determine the index at which `value`
   * should be inserted into `array` in order to maintain its sort order.
   *
   * @private
   * @param {Array} array The sorted array to inspect.
   * @param {*} value The value to evaluate.
   * @param {boolean} [retHighest] Specify returning the highest qualified index.
   * @returns {number} Returns the index at which `value` should be inserted
   *  into `array`.
   */
  function binaryIndex(array, value, retHighest) {
    var low = 0,
        high = array ? array.length : low;

    if (typeof value == 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
      while (low < high) {
        var mid = (low + high) >>> 1,
            computed = array[mid];

        if ((retHighest ? (computed <= value) : (computed < value)) && computed !== null) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return high;
    }
    return binaryIndexBy(array, value, identity, retHighest);
  }

  /**
   * This function is like `binaryIndex` except that it invokes `iteratee` for
   * `value` and each element of `array` to compute their sort ranking. The
   * iteratee is invoked with one argument; (value).
   *
   * @private
   * @param {Array} array The sorted array to inspect.
   * @param {*} value The value to evaluate.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {boolean} [retHighest] Specify returning the highest qualified index.
   * @returns {number} Returns the index at which `value` should be inserted
   *  into `array`.
   */
  function binaryIndexBy(array, value, iteratee, retHighest) {
    value = iteratee(value);

    var low = 0,
        high = array ? array.length : 0,
        valIsNaN = value !== value,
        valIsNull = value === null,
        valIsUndef = value === undefined;

    while (low < high) {
      var mid = nativeFloor((low + high) / 2),
          computed = iteratee(array[mid]),
          isDef = computed !== undefined,
          isReflexive = computed === computed;

      if (valIsNaN) {
        var setLow = isReflexive || retHighest;
      } else if (valIsNull) {
        setLow = isReflexive && isDef && (retHighest || computed != null);
      } else if (valIsUndef) {
        setLow = isReflexive && (retHighest || isDef);
      } else if (computed == null) {
        setLow = false;
      } else {
        setLow = retHighest ? (computed <= value) : (computed < value);
      }
      if (setLow) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return nativeMin(high, MAX_ARRAY_INDEX);
  }

  /**
   * A specialized version of `baseCallback` which only supports `this` binding
   * and specifying the number of arguments to provide to `func`.
   *
   * @private
   * @param {Function} func The function to bind.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {number} [argCount] The number of arguments to provide to `func`.
   * @returns {Function} Returns the callback.
   */
  function bindCallback(func, thisArg, argCount) {
    if (typeof func != 'function') {
      return identity;
    }
    if (thisArg === undefined) {
      return func;
    }
    switch (argCount) {
      case 1: return function(value) {
        return func.call(thisArg, value);
      };
      case 3: return function(value, index, collection) {
        return func.call(thisArg, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(thisArg, accumulator, value, index, collection);
      };
      case 5: return function(value, other, key, object, source) {
        return func.call(thisArg, value, other, key, object, source);
      };
    }
    return function() {
      return func.apply(thisArg, arguments);
    };
  }

  /**
   * Creates a clone of the given array buffer.
   *
   * @private
   * @param {ArrayBuffer} buffer The array buffer to clone.
   * @returns {ArrayBuffer} Returns the cloned array buffer.
   */
  function bufferClone(buffer) {
    var result = new ArrayBuffer(buffer.byteLength),
        view = new Uint8Array(result);

    view.set(new Uint8Array(buffer));
    return result;
  }

  /**
   * Creates an array that is the composition of partially applied arguments,
   * placeholders, and provided arguments into a single array of arguments.
   *
   * @private
   * @param {Array|Object} args The provided arguments.
   * @param {Array} partials The arguments to prepend to those provided.
   * @param {Array} holders The `partials` placeholder indexes.
   * @returns {Array} Returns the new array of composed arguments.
   */
  function composeArgs(args, partials, holders) {
    var holdersLength = holders.length,
        argsIndex = -1,
        argsLength = nativeMax(args.length - holdersLength, 0),
        leftIndex = -1,
        leftLength = partials.length,
        result = Array(leftLength + argsLength);

    while (++leftIndex < leftLength) {
      result[leftIndex] = partials[leftIndex];
    }
    while (++argsIndex < holdersLength) {
      result[holders[argsIndex]] = args[argsIndex];
    }
    while (argsLength--) {
      result[leftIndex++] = args[argsIndex++];
    }
    return result;
  }

  /**
   * This function is like `composeArgs` except that the arguments composition
   * is tailored for `_.partialRight`.
   *
   * @private
   * @param {Array|Object} args The provided arguments.
   * @param {Array} partials The arguments to append to those provided.
   * @param {Array} holders The `partials` placeholder indexes.
   * @returns {Array} Returns the new array of composed arguments.
   */
  function composeArgsRight(args, partials, holders) {
    var holdersIndex = -1,
        holdersLength = holders.length,
        argsIndex = -1,
        argsLength = nativeMax(args.length - holdersLength, 0),
        rightIndex = -1,
        rightLength = partials.length,
        result = Array(argsLength + rightLength);

    while (++argsIndex < argsLength) {
      result[argsIndex] = args[argsIndex];
    }
    var offset = argsIndex;
    while (++rightIndex < rightLength) {
      result[offset + rightIndex] = partials[rightIndex];
    }
    while (++holdersIndex < holdersLength) {
      result[offset + holders[holdersIndex]] = args[argsIndex++];
    }
    return result;
  }

  /**
   * Creates a `_.assign`, `_.defaults`, or `_.merge` function.
   *
   * @private
   * @param {Function} assigner The function to assign values.
   * @returns {Function} Returns the new assigner function.
   */
  function createAssigner(assigner) {
    return restParam(function(object, sources) {
      var index = -1,
          length = object == null ? 0 : sources.length,
          customizer = length > 2 ? sources[length - 2] : undefined,
          guard = length > 2 ? sources[2] : undefined,
          thisArg = length > 1 ? sources[length - 1] : undefined;

      if (typeof customizer == 'function') {
        customizer = bindCallback(customizer, thisArg, 5);
        length -= 2;
      } else {
        customizer = typeof thisArg == 'function' ? thisArg : undefined;
        length -= (customizer ? 1 : 0);
      }
      if (guard && isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? undefined : customizer;
        length = 1;
      }
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, customizer);
        }
      }
      return object;
    });
  }

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      var length = collection ? getLength(collection) : 0;
      if (!isLength(length)) {
        return eachFunc(collection, iteratee);
      }
      var index = fromRight ? length : -1,
          iterable = toObject(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  /**
   * Creates a base function for `_.forIn` or `_.forInRight`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var iterable = toObject(object),
          props = keysFunc(object),
          length = props.length,
          index = fromRight ? length : -1;

      while ((fromRight ? index-- : ++index < length)) {
        var key = props[index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  /**
   * Creates a `Set` cache object to optimize linear searches of large arrays.
   *
   * @private
   * @param {Array} [values] The values to cache.
   * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
   */
  function createCache(values) {
    return (nativeCreate && Set) ? new SetCache(values) : null;
  }

  /**
   * Creates a function that produces an instance of `Ctor` regardless of
   * whether it was invoked as part of a `new` expression or by `call` or `apply`.
   *
   * @private
   * @param {Function} Ctor The constructor to wrap.
   * @returns {Function} Returns the new wrapped function.
   */
  function createCtorWrapper(Ctor) {
    return function() {
      // Use a `switch` statement to work with class constructors.
      // See http://ecma-international.org/ecma-262/6.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
      // for more details.
      var args = arguments;
      switch (args.length) {
        case 0: return new Ctor;
        case 1: return new Ctor(args[0]);
        case 2: return new Ctor(args[0], args[1]);
        case 3: return new Ctor(args[0], args[1], args[2]);
        case 4: return new Ctor(args[0], args[1], args[2], args[3]);
        case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
        case 6: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
        case 7: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }
      var thisBinding = baseCreate(Ctor.prototype),
          result = Ctor.apply(thisBinding, args);

      // Mimic the constructor's `return` behavior.
      // See https://es5.github.io/#x13.2.2 for more details.
      return isObject(result) ? result : thisBinding;
    };
  }

  /**
   * Creates a `_.max` or `_.min` function.
   *
   * @private
   * @param {Function} comparator The function used to compare values.
   * @param {*} exValue The initial extremum value.
   * @returns {Function} Returns the new extremum function.
   */
  function createExtremum(comparator, exValue) {
    return function(collection, iteratee, thisArg) {
      if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
        iteratee = undefined;
      }
      iteratee = getCallback(iteratee, thisArg, 3);
      if (iteratee.length == 1) {
        collection = isArray(collection) ? collection : toIterable(collection);
        var result = arrayExtremum(collection, iteratee, comparator, exValue);
        if (!(collection.length && result === exValue)) {
          return result;
        }
      }
      return baseExtremum(collection, iteratee, comparator, exValue);
    };
  }

  /**
   * Creates a function for `_.forEach` or `_.forEachRight`.
   *
   * @private
   * @param {Function} arrayFunc The function to iterate over an array.
   * @param {Function} eachFunc The function to iterate over a collection.
   * @returns {Function} Returns the new each function.
   */
  function createForEach(arrayFunc, eachFunc) {
    return function(collection, iteratee, thisArg) {
      return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
        ? arrayFunc(collection, iteratee)
        : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
    };
  }

  /**
   * Creates a function for `_.mapKeys` or `_.mapValues`.
   *
   * @private
   * @param {boolean} [isMapKeys] Specify mapping keys instead of values.
   * @returns {Function} Returns the new map function.
   */
  function createObjectMapper(isMapKeys) {
    return function(object, iteratee, thisArg) {
      var result = {};
      iteratee = getCallback(iteratee, thisArg, 3);

      baseForOwn(object, function(value, key, object) {
        var mapped = iteratee(value, key, object);
        key = isMapKeys ? mapped : key;
        value = isMapKeys ? value : mapped;
        result[key] = value;
      });
      return result;
    };
  }

  /**
   * Creates a function for `_.reduce` or `_.reduceRight`.
   *
   * @private
   * @param {Function} arrayFunc The function to iterate over an array.
   * @param {Function} eachFunc The function to iterate over a collection.
   * @returns {Function} Returns the new each function.
   */
  function createReduce(arrayFunc, eachFunc) {
    return function(collection, iteratee, accumulator, thisArg) {
      var initFromArray = arguments.length < 3;
      return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
        ? arrayFunc(collection, iteratee, accumulator, initFromArray)
        : baseReduce(collection, getCallback(iteratee, thisArg, 4), accumulator, initFromArray, eachFunc);
    };
  }

  /**
   * Creates a function that wraps `func` and invokes it with optional `this`
   * binding of, partial application, and currying.
   *
   * @private
   * @param {Function|string} func The function or method name to reference.
   * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param {Array} [partials] The arguments to prepend to those provided to the new function.
   * @param {Array} [holders] The `partials` placeholder indexes.
   * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
   * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
   * @param {Array} [argPos] The argument positions of the new function.
   * @param {number} [ary] The arity cap of `func`.
   * @param {number} [arity] The arity of `func`.
   * @returns {Function} Returns the new wrapped function.
   */
  function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
    var isAry = bitmask & ARY_FLAG,
        isBind = bitmask & BIND_FLAG,
        isBindKey = bitmask & BIND_KEY_FLAG,
        isCurry = bitmask & CURRY_FLAG,
        isCurryBound = bitmask & CURRY_BOUND_FLAG,
        isCurryRight = bitmask & CURRY_RIGHT_FLAG,
        Ctor = isBindKey ? undefined : createCtorWrapper(func);

    function wrapper() {
      // Avoid `arguments` object use disqualifying optimizations by
      // converting it to an array before providing it to other functions.
      var length = arguments.length,
          index = length,
          args = Array(length);

      while (index--) {
        args[index] = arguments[index];
      }
      if (partials) {
        args = composeArgs(args, partials, holders);
      }
      if (partialsRight) {
        args = composeArgsRight(args, partialsRight, holdersRight);
      }
      if (isCurry || isCurryRight) {
        var placeholder = wrapper.placeholder,
            argsHolders = replaceHolders(args, placeholder);

        length -= argsHolders.length;
        if (length < arity) {
          var newArgPos = argPos ? arrayCopy(argPos) : undefined,
              newArity = nativeMax(arity - length, 0),
              newsHolders = isCurry ? argsHolders : undefined,
              newHoldersRight = isCurry ? undefined : argsHolders,
              newPartials = isCurry ? args : undefined,
              newPartialsRight = isCurry ? undefined : args;

          bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
          bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

          if (!isCurryBound) {
            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
          }
          var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity],
              result = createHybridWrapper.apply(undefined, newData);

          if (isLaziable(func)) {
            setData(result, newData);
          }
          result.placeholder = placeholder;
          return result;
        }
      }
      var thisBinding = isBind ? thisArg : this,
          fn = isBindKey ? thisBinding[func] : func;

      if (argPos) {
        args = reorder(args, argPos);
      }
      if (isAry && ary < args.length) {
        args.length = ary;
      }
      if (this && this !== root && this instanceof wrapper) {
        fn = Ctor || createCtorWrapper(func);
      }
      return fn.apply(thisBinding, args);
    }
    return wrapper;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing arrays.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var index = -1,
        arrLength = array.length,
        othLength = other.length;

    if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
      return false;
    }
    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index],
          result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : undefined;

      if (result !== undefined) {
        if (result) {
          continue;
        }
        return false;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (isLoose) {
        if (!arraySome(other, function(othValue) {
              return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
            })) {
          return false;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))) {
        return false;
      }
    }
    return true;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag) {
    switch (tag) {
      case boolTag:
      case dateTag:
        // Coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
        return +object == +other;

      case errorTag:
        return object.name == other.name && object.message == other.message;

      case numberTag:
        // Treat `NaN` vs. `NaN` as equal.
        return (object != +object)
          ? other != +other
          : object == +other;

      case regexpTag:
      case stringTag:
        // Coerce regexes to strings and treat strings primitives and string
        // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
        return object == (other + '');
    }
    return false;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparing values.
   * @param {boolean} [isLoose] Specify performing partial comparisons.
   * @param {Array} [stackA] Tracks traversed `value` objects.
   * @param {Array} [stackB] Tracks traversed `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
    var objProps = keys(object),
        objLength = objProps.length,
        othProps = keys(other),
        othLength = othProps.length;

    if (objLength != othLength && !isLoose) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isLoose ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    var skipCtor = isLoose;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key],
          result = customizer ? customizer(isLoose ? othValue : objValue, isLoose? objValue : othValue, key) : undefined;

      // Recursively compare objects (susceptible to call stack limits).
      if (!(result === undefined ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result)) {
        return false;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (!skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor &&
          ('constructor' in object && 'constructor' in other) &&
          !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
            typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the appropriate "callback" function. If the `_.callback` method is
   * customized this function returns the custom method, otherwise it returns
   * the `baseCallback` function. If arguments are provided the chosen function
   * is invoked with them and its result is returned.
   *
   * @private
   * @returns {Function} Returns the chosen function or its result.
   */
  function getCallback(func, thisArg, argCount) {
    var result = lodash.callback || callback;
    result = result === callback ? baseCallback : result;
    return argCount ? result(func, thisArg, argCount) : result;
  }

  /**
   * Gets metadata for `func`.
   *
   * @private
   * @param {Function} func The function to query.
   * @returns {*} Returns the metadata for `func`.
   */
  var getData = !metaMap ? noop : function(func) {
    return metaMap.get(func);
  };

  /**
   * Gets the name of `func`.
   *
   * @private
   * @param {Function} func The function to query.
   * @returns {string} Returns the function name.
   */
  function getFuncName(func) {
    var result = func.name,
        array = realNames[result],
        length = array ? array.length : 0;

    while (length--) {
      var data = array[length],
          otherFunc = data.func;
      if (otherFunc == null || otherFunc == func) {
        return data.name;
      }
    }
    return result;
  }

  /**
   * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
   * customized this function returns the custom method, otherwise it returns
   * the `baseIndexOf` function. If arguments are provided the chosen function
   * is invoked with them and its result is returned.
   *
   * @private
   * @returns {Function|number} Returns the chosen function or its result.
   */
  function getIndexOf(collection, target, fromIndex) {
    var result = lodash.indexOf || indexOf;
    result = result === indexOf ? baseIndexOf : result;
    return collection ? result(collection, target, fromIndex) : result;
  }

  /**
   * Gets the "length" property value of `object`.
   *
   * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
   * that affects Safari on at least iOS 8.1-8.3 ARM64.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {*} Returns the "length" value.
   */
  var getLength = baseProperty('length');

  /**
   * Gets the propery names, values, and compare flags of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the match data of `object`.
   */
  function getMatchData(object) {
    var result = pairs(object),
        length = result.length;

    while (length--) {
      result[length][2] = isStrictComparable(result[length][1]);
    }
    return result;
  }

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = object == null ? undefined : object[key];
    return isNative(value) ? value : undefined;
  }

  /**
   * Gets the view, applying any `transforms` to the `start` and `end` positions.
   *
   * @private
   * @param {number} start The start of the view.
   * @param {number} end The end of the view.
   * @param {Array} transforms The transformations to apply to the view.
   * @returns {Object} Returns an object containing the `start` and `end`
   *  positions of the view.
   */
  function getView(start, end, transforms) {
    var index = -1,
        length = transforms.length;

    while (++index < length) {
      var data = transforms[index],
          size = data.size;

      switch (data.type) {
        case 'drop':      start += size; break;
        case 'dropRight': end -= size; break;
        case 'take':      end = nativeMin(end, start + size); break;
        case 'takeRight': start = nativeMax(start, end - size); break;
      }
    }
    return { 'start': start, 'end': end };
  }

  /**
   * Initializes an array clone.
   *
   * @private
   * @param {Array} array The array to clone.
   * @returns {Array} Returns the initialized clone.
   */
  function initCloneArray(array) {
    var length = array.length,
        result = new array.constructor(length);

    // Add array properties assigned by `RegExp#exec`.
    if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }

  /**
   * Initializes an object clone.
   *
   * @private
   * @param {Object} object The object to clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneObject(object) {
    var Ctor = object.constructor;
    if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
      Ctor = Object;
    }
    return new Ctor;
  }

  /**
   * Initializes an object clone based on its `toStringTag`.
   *
   * **Note:** This function only supports cloning values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to clone.
   * @param {string} tag The `toStringTag` of the object to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneByTag(object, tag, isDeep) {
    var Ctor = object.constructor;
    switch (tag) {
      case arrayBufferTag:
        return bufferClone(object);

      case boolTag:
      case dateTag:
        return new Ctor(+object);

      case float32Tag: case float64Tag:
      case int8Tag: case int16Tag: case int32Tag:
      case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
        var buffer = object.buffer;
        return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

      case numberTag:
      case stringTag:
        return new Ctor(object);

      case regexpTag:
        var result = new Ctor(object.source, reFlags.exec(object));
        result.lastIndex = object.lastIndex;
    }
    return result;
  }

  /**
   * Checks if `value` is array-like.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   */
  function isArrayLike(value) {
    return value != null && isLength(getLength(value));
  }

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }

  /**
   * Checks if the provided arguments are from an iteratee call.
   *
   * @private
   * @param {*} value The potential iteratee value argument.
   * @param {*} index The potential iteratee index or key argument.
   * @param {*} object The potential iteratee object argument.
   * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
   */
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)) {
      var other = object[index];
      return value === value ? (value === other) : (other !== other);
    }
    return false;
  }

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    var type = typeof value;
    if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
      return true;
    }
    if (isArray(value)) {
      return false;
    }
    var result = !reIsDeepProp.test(value);
    return result || (object != null && value in toObject(object));
  }

  /**
   * Checks if `func` has a lazy counterpart.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` has a lazy counterpart, else `false`.
   */
  function isLaziable(func) {
    var funcName = getFuncName(func);
    if (!(funcName in LazyWrapper.prototype)) {
      return false;
    }
    var other = lodash[funcName];
    if (func === other) {
      return true;
    }
    var data = getData(other);
    return !!data && func === data[0];
  }

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   */
  function isLength(value) {
    return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }

  /**
   * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` if suitable for strict
   *  equality comparisons, else `false`.
   */
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }

  /**
   * A specialized version of `_.pick` which picks `object` properties specified
   * by `props`.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} props The property names to pick.
   * @returns {Object} Returns the new object.
   */
  function pickByArray(object, props) {
    object = toObject(object);

    var index = -1,
        length = props.length,
        result = {};

    while (++index < length) {
      var key = props[index];
      if (key in object) {
        result[key] = object[key];
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.pick` which picks `object` properties `predicate`
   * returns truthy for.
   *
   * @private
   * @param {Object} object The source object.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Object} Returns the new object.
   */
  function pickByCallback(object, predicate) {
    var result = {};
    baseForIn(object, function(value, key, object) {
      if (predicate(value, key, object)) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Reorder `array` according to the specified indexes where the element at
   * the first index is assigned as the first element, the element at
   * the second index is assigned as the second element, and so on.
   *
   * @private
   * @param {Array} array The array to reorder.
   * @param {Array} indexes The arranged array indexes.
   * @returns {Array} Returns `array`.
   */
  function reorder(array, indexes) {
    var arrLength = array.length,
        length = nativeMin(indexes.length, arrLength),
        oldArray = arrayCopy(array);

    while (length--) {
      var index = indexes[length];
      array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
    }
    return array;
  }

  /**
   * Sets metadata for `func`.
   *
   * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
   * period of time, it will trip its breaker and transition to an identity function
   * to avoid garbage collection pauses in V8. See [V8 issue 2070](https://code.google.com/p/v8/issues/detail?id=2070)
   * for more details.
   *
   * @private
   * @param {Function} func The function to associate metadata with.
   * @param {*} data The metadata.
   * @returns {Function} Returns `func`.
   */
  var setData = (function() {
    var count = 0,
        lastCalled = 0;

    return function(key, value) {
      var stamp = now(),
          remaining = HOT_SPAN - (stamp - lastCalled);

      lastCalled = stamp;
      if (remaining > 0) {
        if (++count >= HOT_COUNT) {
          return key;
        }
      } else {
        count = 0;
      }
      return baseSetData(key, value);
    };
  }());

  /**
   * A fallback implementation of `Object.keys` which creates an array of the
   * own enumerable property names of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function shimKeys(object) {
    var props = keysIn(object),
        propsLength = props.length,
        length = propsLength && object.length;

    var allowIndexes = !!length && isLength(length) &&
      (isArray(object) || isArguments(object));

    var index = -1,
        result = [];

    while (++index < propsLength) {
      var key = props[index];
      if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Converts `value` to an array-like object if it's not one.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {Array|Object} Returns the array-like object.
   */
  function toIterable(value) {
    if (value == null) {
      return [];
    }
    if (!isArrayLike(value)) {
      return values(value);
    }
    return isObject(value) ? value : Object(value);
  }

  /**
   * Converts `value` to an object if it's not one.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {Object} Returns the object.
   */
  function toObject(value) {
    return isObject(value) ? value : Object(value);
  }

  /**
   * Converts `value` to property path array if it's not one.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {Array} Returns the property path array.
   */
  function toPath(value) {
    if (isArray(value)) {
      return value;
    }
    var result = [];
    baseToString(value).replace(rePropName, function(match, number, quote, string) {
      result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  }

  /**
   * Creates a clone of `wrapper`.
   *
   * @private
   * @param {Object} wrapper The wrapper to clone.
   * @returns {Object} Returns the cloned wrapper.
   */
  function wrapperClone(wrapper) {
    return wrapper instanceof LazyWrapper
      ? wrapper.clone()
      : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
  }

  /*------------------------------------------------------------------------*/

  /**
   * Gets the first element of `array`.
   *
   * @static
   * @memberOf _
   * @alias head
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the first element of `array`.
   * @example
   *
   * _.first([1, 2, 3]);
   * // => 1
   *
   * _.first([]);
   * // => undefined
   */
  function first(array) {
    return array ? array[0] : undefined;
  }

  /**
   * Flattens a nested array. If `isDeep` is `true` the array is recursively
   * flattened, otherwise it is only flattened a single level.
   *
   * @static
   * @memberOf _
   * @category Array
   * @param {Array} array The array to flatten.
   * @param {boolean} [isDeep] Specify a deep flatten.
   * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
   * @returns {Array} Returns the new flattened array.
   * @example
   *
   * _.flatten([1, [2, 3, [4]]]);
   * // => [1, 2, 3, [4]]
   *
   * // using `isDeep`
   * _.flatten([1, [2, 3, [4]]], true);
   * // => [1, 2, 3, 4]
   */
  function flatten(array, isDeep, guard) {
    var length = array ? array.length : 0;
    if (guard && isIterateeCall(array, isDeep, guard)) {
      isDeep = false;
    }
    return length ? baseFlatten(array, isDeep) : [];
  }

  /**
   * Gets the index at which the first occurrence of `value` is found in `array`
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
   * for equality comparisons. If `fromIndex` is negative, it is used as the offset
   * from the end of `array`. If `array` is sorted providing `true` for `fromIndex`
   * performs a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Array
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {boolean|number} [fromIndex=0] The index to search from or `true`
   *  to perform a binary search on a sorted array.
   * @returns {number} Returns the index of the matched value, else `-1`.
   * @example
   *
   * _.indexOf([1, 2, 1, 2], 2);
   * // => 1
   *
   * // using `fromIndex`
   * _.indexOf([1, 2, 1, 2], 2, 2);
   * // => 3
   *
   * // performing a binary search
   * _.indexOf([1, 1, 2, 2], 2, true);
   * // => 2
   */
  function indexOf(array, value, fromIndex) {
    var length = array ? array.length : 0;
    if (!length) {
      return -1;
    }
    if (typeof fromIndex == 'number') {
      fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex;
    } else if (fromIndex) {
      var index = binaryIndex(array, value);
      if (index < length &&
          (value === value ? (value === array[index]) : (array[index] !== array[index]))) {
        return index;
      }
      return -1;
    }
    return baseIndexOf(array, value, fromIndex || 0);
  }

  /**
   * Gets the last element of `array`.
   *
   * @static
   * @memberOf _
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the last element of `array`.
   * @example
   *
   * _.last([1, 2, 3]);
   * // => 3
   */
  function last(array) {
    var length = array ? array.length : 0;
    return length ? array[length - 1] : undefined;
  }

  /**
   * Creates a duplicate-free version of an array, using
   * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
   * for equality comparisons, in which only the first occurence of each element
   * is kept. Providing `true` for `isSorted` performs a faster search algorithm
   * for sorted arrays. If an iteratee function is provided it is invoked for
   * each element in the array to generate the criterion by which uniqueness
   * is computed. The `iteratee` is bound to `thisArg` and invoked with three
   * arguments: (value, index, array).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @alias unique
   * @category Array
   * @param {Array} array The array to inspect.
   * @param {boolean} [isSorted] Specify the array is sorted.
   * @param {Function|Object|string} [iteratee] The function invoked per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Array} Returns the new duplicate-value-free array.
   * @example
   *
   * _.uniq([2, 1, 2]);
   * // => [2, 1]
   *
   * // using `isSorted`
   * _.uniq([1, 1, 2], true);
   * // => [1, 2]
   *
   * // using an iteratee function
   * _.uniq([1, 2.5, 1.5, 2], function(n) {
   *   return this.floor(n);
   * }, Math);
   * // => [1, 2.5]
   *
   * // using the `_.property` callback shorthand
   * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
   * // => [{ 'x': 1 }, { 'x': 2 }]
   */
  function uniq(array, isSorted, iteratee, thisArg) {
    var length = array ? array.length : 0;
    if (!length) {
      return [];
    }
    if (isSorted != null && typeof isSorted != 'boolean') {
      thisArg = iteratee;
      iteratee = isIterateeCall(array, isSorted, thisArg) ? undefined : isSorted;
      isSorted = false;
    }
    var callback = getCallback();
    if (!(iteratee == null && callback === baseCallback)) {
      iteratee = callback(iteratee, thisArg, 3);
    }
    return (isSorted && getIndexOf() == baseIndexOf)
      ? sortedUniq(array, iteratee)
      : baseUniq(array, iteratee);
  }

  /**
   * The inverse of `_.pairs`; this method returns an object composed from arrays
   * of property names and values. Provide either a single two dimensional array,
   * e.g. `[[key1, value1], [key2, value2]]` or two arrays, one of property names
   * and one of corresponding values.
   *
   * @static
   * @memberOf _
   * @alias object
   * @category Array
   * @param {Array} props The property names.
   * @param {Array} [values=[]] The property values.
   * @returns {Object} Returns the new object.
   * @example
   *
   * _.zipObject([['fred', 30], ['barney', 40]]);
   * // => { 'fred': 30, 'barney': 40 }
   *
   * _.zipObject(['fred', 'barney'], [30, 40]);
   * // => { 'fred': 30, 'barney': 40 }
   */
  function zipObject(props, values) {
    var index = -1,
        length = props ? props.length : 0,
        result = {};

    if (length && !values && !isArray(props[0])) {
      values = [];
    }
    while (++index < length) {
      var key = props[index];
      if (values) {
        result[key] = values[index];
      } else if (key) {
        result[key[0]] = key[1];
      }
    }
    return result;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object that wraps `value` with explicit method
   * chaining enabled.
   *
   * @static
   * @memberOf _
   * @category Chain
   * @param {*} value The value to wrap.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36 },
   *   { 'user': 'fred',    'age': 40 },
   *   { 'user': 'pebbles', 'age': 1 }
   * ];
   *
   * var youngest = _.chain(users)
   *   .sortBy('age')
   *   .map(function(chr) {
   *     return chr.user + ' is ' + chr.age;
   *   })
   *   .first()
   *   .value();
   * // => 'pebbles is 1'
   */
  function chain(value) {
    var result = lodash(value);
    result.__chain__ = true;
    return result;
  }

  /**
   * This method invokes `interceptor` and returns `value`. The interceptor is
   * bound to `thisArg` and invoked with one argument; (value). The purpose of
   * this method is to "tap into" a method chain in order to perform operations
   * on intermediate results within the chain.
   *
   * @static
   * @memberOf _
   * @category Chain
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @param {*} [thisArg] The `this` binding of `interceptor`.
   * @returns {*} Returns `value`.
   * @example
   *
   * _([1, 2, 3])
   *  .tap(function(array) {
   *    array.pop();
   *  })
   *  .reverse()
   *  .value();
   * // => [2, 1]
   */
  function tap(value, interceptor, thisArg) {
    interceptor.call(thisArg, value);
    return value;
  }

  /**
   * This method is like `_.tap` except that it returns the result of `interceptor`.
   *
   * @static
   * @memberOf _
   * @category Chain
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @param {*} [thisArg] The `this` binding of `interceptor`.
   * @returns {*} Returns the result of `interceptor`.
   * @example
   *
   * _('  abc  ')
   *  .chain()
   *  .trim()
   *  .thru(function(value) {
   *    return [value];
   *  })
   *  .value();
   * // => ['abc']
   */
  function thru(value, interceptor, thisArg) {
    return interceptor.call(thisArg, value);
  }

  /**
   * Enables explicit method chaining on the wrapper object.
   *
   * @name chain
   * @memberOf _
   * @category Chain
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * // without explicit chaining
   * _(users).first();
   * // => { 'user': 'barney', 'age': 36 }
   *
   * // with explicit chaining
   * _(users).chain()
   *   .first()
   *   .pick('user')
   *   .value();
   * // => { 'user': 'barney' }
   */
  function wrapperChain() {
    return chain(this);
  }

  /**
   * Executes the chained sequence and returns the wrapped result.
   *
   * @name commit
   * @memberOf _
   * @category Chain
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var array = [1, 2];
   * var wrapped = _(array).push(3);
   *
   * console.log(array);
   * // => [1, 2]
   *
   * wrapped = wrapped.commit();
   * console.log(array);
   * // => [1, 2, 3]
   *
   * wrapped.last();
   * // => 3
   *
   * console.log(array);
   * // => [1, 2, 3]
   */
  function wrapperCommit() {
    return new LodashWrapper(this.value(), this.__chain__);
  }

  /**
   * Creates a new array joining a wrapped array with any additional arrays
   * and/or values.
   *
   * @name concat
   * @memberOf _
   * @category Chain
   * @param {...*} [values] The values to concatenate.
   * @returns {Array} Returns the new concatenated array.
   * @example
   *
   * var array = [1];
   * var wrapped = _(array).concat(2, [3], [[4]]);
   *
   * console.log(wrapped.value());
   * // => [1, 2, 3, [4]]
   *
   * console.log(array);
   * // => [1]
   */
  var wrapperConcat = restParam(function(values) {
    values = baseFlatten(values);
    return this.thru(function(array) {
      return arrayConcat(isArray(array) ? array : [toObject(array)], values);
    });
  });

  /**
   * Creates a clone of the chained sequence planting `value` as the wrapped value.
   *
   * @name plant
   * @memberOf _
   * @category Chain
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var array = [1, 2];
   * var wrapped = _(array).map(function(value) {
   *   return Math.pow(value, 2);
   * });
   *
   * var other = [3, 4];
   * var otherWrapped = wrapped.plant(other);
   *
   * otherWrapped.value();
   * // => [9, 16]
   *
   * wrapped.value();
   * // => [1, 4]
   */
  function wrapperPlant(value) {
    var result,
        parent = this;

    while (parent instanceof baseLodash) {
      var clone = wrapperClone(parent);
      if (result) {
        previous.__wrapped__ = clone;
      } else {
        result = clone;
      }
      var previous = clone;
      parent = parent.__wrapped__;
    }
    previous.__wrapped__ = value;
    return result;
  }

  /**
   * Reverses the wrapped array so the first element becomes the last, the
   * second element becomes the second to last, and so on.
   *
   * **Note:** This method mutates the wrapped array.
   *
   * @name reverse
   * @memberOf _
   * @category Chain
   * @returns {Object} Returns the new reversed `lodash` wrapper instance.
   * @example
   *
   * var array = [1, 2, 3];
   *
   * _(array).reverse().value()
   * // => [3, 2, 1]
   *
   * console.log(array);
   * // => [3, 2, 1]
   */
  function wrapperReverse() {
    var value = this.__wrapped__;

    var interceptor = function(value) {
      return (wrapped && wrapped.__dir__ < 0) ? value : value.reverse();
    };
    if (value instanceof LazyWrapper) {
      var wrapped = value;
      if (this.__actions__.length) {
        wrapped = new LazyWrapper(this);
      }
      wrapped = wrapped.reverse();
      wrapped.__actions__.push({ 'func': thru, 'args': [interceptor], 'thisArg': undefined });
      return new LodashWrapper(wrapped, this.__chain__);
    }
    return this.thru(interceptor);
  }

  /**
   * Produces the result of coercing the unwrapped value to a string.
   *
   * @name toString
   * @memberOf _
   * @category Chain
   * @returns {string} Returns the coerced string value.
   * @example
   *
   * _([1, 2, 3]).toString();
   * // => '1,2,3'
   */
  function wrapperToString() {
    return (this.value() + '');
  }

  /**
   * Executes the chained sequence to extract the unwrapped value.
   *
   * @name value
   * @memberOf _
   * @alias run, toJSON, valueOf
   * @category Chain
   * @returns {*} Returns the resolved unwrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return baseWrapperValue(this.__wrapped__, this.__actions__);
  }

  /*------------------------------------------------------------------------*/

  /**
   * Iterates over elements of `collection`, returning an array of all elements
   * `predicate` returns truthy for. The predicate is bound to `thisArg` and
   * invoked with three arguments: (value, index|key, collection).
   *
   * If a property name is provided for `predicate` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `predicate` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function|Object|string} [predicate=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `predicate`.
   * @returns {Array} Returns the new filtered array.
   * @example
   *
   * _.filter([4, 5, 6], function(n) {
   *   return n % 2 == 0;
   * });
   * // => [4, 6]
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // using the `_.matches` callback shorthand
   * _.pluck(_.filter(users, { 'age': 36, 'active': true }), 'user');
   * // => ['barney']
   *
   * // using the `_.matchesProperty` callback shorthand
   * _.pluck(_.filter(users, 'active', false), 'user');
   * // => ['fred']
   *
   * // using the `_.property` callback shorthand
   * _.pluck(_.filter(users, 'active'), 'user');
   * // => ['barney']
   */
  function filter(collection, predicate, thisArg) {
    var func = isArray(collection) ? arrayFilter : baseFilter;
    predicate = getCallback(predicate, thisArg, 3);
    return func(collection, predicate);
  }

  /**
   * Iterates over elements of `collection` invoking `iteratee` for each element.
   * The `iteratee` is bound to `thisArg` and invoked with three arguments:
   * (value, index|key, collection). Iteratee functions may exit iteration early
   * by explicitly returning `false`.
   *
   * **Note:** As with other "Collections" methods, objects with a "length" property
   * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
   * may be used for object iteration.
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Array|Object|string} Returns `collection`.
   * @example
   *
   * _([1, 2]).forEach(function(n) {
   *   console.log(n);
   * }).value();
   * // => logs each value from left to right and returns the array
   *
   * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
   *   console.log(n, key);
   * });
   * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
   */
  var forEach = createForEach(arrayEach, baseEach);

  /**
   * Creates an array of values by running each element in `collection` through
   * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
   * arguments: (value, index|key, collection).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
   *
   * The guarded methods are:
   * `ary`, `callback`, `chunk`, `clone`, `create`, `curry`, `curryRight`,
   * `drop`, `dropRight`, `every`, `fill`, `flatten`, `invert`, `max`, `min`,
   * `parseInt`, `slice`, `sortBy`, `take`, `takeRight`, `template`, `trim`,
   * `trimLeft`, `trimRight`, `trunc`, `random`, `range`, `sample`, `some`,
   * `sum`, `uniq`, and `words`
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function|Object|string} [iteratee=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Array} Returns the new mapped array.
   * @example
   *
   * function timesThree(n) {
   *   return n * 3;
   * }
   *
   * _.map([1, 2], timesThree);
   * // => [3, 6]
   *
   * _.map({ 'a': 1, 'b': 2 }, timesThree);
   * // => [3, 6] (iteration order is not guaranteed)
   *
   * var users = [
   *   { 'user': 'barney' },
   *   { 'user': 'fred' }
   * ];
   *
   * // using the `_.property` callback shorthand
   * _.map(users, 'user');
   * // => ['barney', 'fred']
   */
  function map(collection, iteratee, thisArg) {
    var func = isArray(collection) ? arrayMap : baseMap;
    iteratee = getCallback(iteratee, thisArg, 3);
    return func(collection, iteratee);
  }

  /**
   * Gets the property value of `path` from all elements in `collection`.
   *
   * @static
   * @memberOf _
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Array|string} path The path of the property to pluck.
   * @returns {Array} Returns the property values.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * _.pluck(users, 'user');
   * // => ['barney', 'fred']
   *
   * var userIndex = _.indexBy(users, 'user');
   * _.pluck(userIndex, 'age');
   * // => [36, 40] (iteration order is not guaranteed)
   */
  function pluck(collection, path) {
    return map(collection, property(path));
  }

  /**
   * Reduces `collection` to a value which is the accumulated result of running
   * each element in `collection` through `iteratee`, where each successive
   * invocation is supplied the return value of the previous. If `accumulator`
   * is not provided the first element of `collection` is used as the initial
   * value. The `iteratee` is bound to `thisArg` and invoked with four arguments:
   * (accumulator, value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.reduce`, `_.reduceRight`, and `_.transform`.
   *
   * The guarded methods are:
   * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `sortByAll`,
   * and `sortByOrder`
   *
   * @static
   * @memberOf _
   * @alias foldl, inject
   * @category Collection
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {*} Returns the accumulated value.
   * @example
   *
   * _.reduce([1, 2], function(total, n) {
   *   return total + n;
   * });
   * // => 3
   *
   * _.reduce({ 'a': 1, 'b': 2 }, function(result, n, key) {
   *   result[key] = n * 3;
   *   return result;
   * }, {});
   * // => { 'a': 3, 'b': 6 } (iteration order is not guaranteed)
   */
  var reduce = createReduce(arrayReduce, baseEach);

  /**
   * Gets the size of `collection` by returning its length for array-like
   * values or the number of own enumerable properties for objects.
   *
   * @static
   * @memberOf _
   * @category Collection
   * @param {Array|Object|string} collection The collection to inspect.
   * @returns {number} Returns the size of `collection`.
   * @example
   *
   * _.size([1, 2, 3]);
   * // => 3
   *
   * _.size({ 'a': 1, 'b': 2 });
   * // => 2
   *
   * _.size('pebbles');
   * // => 7
   */
  function size(collection) {
    var length = collection ? getLength(collection) : 0;
    return isLength(length) ? length : keys(collection).length;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Gets the number of milliseconds that have elapsed since the Unix epoch
   * (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @category Date
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => logs the number of milliseconds it took for the deferred function to be invoked
   */
  var now = nativeNow || function() {
    return new Date().getTime();
  };

  /*------------------------------------------------------------------------*/

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed invocations. Provide an options object to indicate that `func`
   * should be invoked on the leading and/or trailing edge of the `wait` timeout.
   * Subsequent calls to the debounced function return the result of the last
   * `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
   * on the trailing edge of the timeout only if the the debounced function is
   * invoked more than once during the `wait` timeout.
   *
   * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.leading=false] Specify invoking on the leading
   *  edge of the timeout.
   * @param {number} [options.maxWait] The maximum time `func` is allowed to be
   *  delayed before it is invoked.
   * @param {boolean} [options.trailing=true] Specify invoking on the trailing
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // avoid costly calculations while the window size is in flux
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
   * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // ensure `batchLog` is invoked once after 1 second of debounced calls
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', _.debounce(batchLog, 250, {
   *   'maxWait': 1000
   * }));
   *
   * // cancel a debounced call
   * var todoChanges = _.debounce(batchLog, 1000);
   * Object.observe(models.todo, todoChanges);
   *
   * Object.observe(models, function(changes) {
   *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
   *     todoChanges.cancel();
   *   }
   * }, ['delete']);
   *
   * // ...at some point `models.todo` is changed
   * models.todo.completed = true;
   *
   * // ...before 1 second has passed `models.todo` is deleted
   * // which cancels the debounced `todoChanges` call
   * delete models.todo;
   */
  function debounce(func, wait, options) {
    var args,
        maxTimeoutId,
        result,
        stamp,
        thisArg,
        timeoutId,
        trailingCall,
        lastCalled = 0,
        maxWait = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = wait < 0 ? 0 : (+wait || 0);
    if (options === true) {
      var leading = true;
      trailing = false;
    } else if (isObject(options)) {
      leading = !!options.leading;
      maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      lastCalled = 0;
      maxTimeoutId = timeoutId = trailingCall = undefined;
    }

    function complete(isCalled, id) {
      if (id) {
        clearTimeout(id);
      }
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
      }
    }

    function delayed() {
      var remaining = wait - (now() - stamp);
      if (remaining <= 0 || remaining > wait) {
        complete(trailingCall, maxTimeoutId);
      } else {
        timeoutId = setTimeout(delayed, remaining);
      }
    }

    function maxDelayed() {
      complete(trailing, timeoutId);
    }

    function debounced() {
      args = arguments;
      stamp = now();
      thisArg = this;
      trailingCall = trailing && (timeoutId || !leading);

      if (maxWait === false) {
        var leadingCall = leading && !timeoutId;
      } else {
        if (!maxTimeoutId && !leading) {
          lastCalled = stamp;
        }
        var remaining = maxWait - (stamp - lastCalled),
            isCalled = remaining <= 0 || remaining > maxWait;

        if (isCalled) {
          if (maxTimeoutId) {
            maxTimeoutId = clearTimeout(maxTimeoutId);
          }
          lastCalled = stamp;
          result = func.apply(thisArg, args);
        }
        else if (!maxTimeoutId) {
          maxTimeoutId = setTimeout(maxDelayed, remaining);
        }
      }
      if (isCalled && timeoutId) {
        timeoutId = clearTimeout(timeoutId);
      }
      else if (!timeoutId && wait !== maxWait) {
        timeoutId = setTimeout(delayed, wait);
      }
      if (leadingCall) {
        isCalled = true;
        result = func.apply(thisArg, args);
      }
      if (isCalled && !timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
      return result;
    }
    debounced.cancel = cancel;
    return debounced;
  }

  /**
   * Creates a function that invokes `func` with the `this` binding of the
   * created function and arguments from `start` and beyond provided as an array.
   *
   * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var say = _.restParam(function(what, names) {
   *   return what + ' ' + _.initial(names).join(', ') +
   *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
   * });
   *
   * say('hello', 'fred', 'barney', 'pebbles');
   * // => 'hello fred, barney, & pebbles'
   */
  function restParam(func, start) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax(args.length - start, 0),
          rest = Array(length);

      while (++index < length) {
        rest[index] = args[start + index];
      }
      switch (start) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, args[0], rest);
        case 2: return func.call(this, args[0], args[1], rest);
      }
      var otherArgs = Array(start + 1);
      index = -1;
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = rest;
      return func.apply(this, otherArgs);
    };
  }

  /*------------------------------------------------------------------------*/

  /**
   * Checks if `value` is greater than `other`.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if `value` is greater than `other`, else `false`.
   * @example
   *
   * _.gt(3, 1);
   * // => true
   *
   * _.gt(3, 3);
   * // => false
   *
   * _.gt(1, 3);
   * // => false
   */
  function gt(value, other) {
    return value > other;
  }

  /**
   * Checks if `value` is classified as an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    return isObjectLike(value) && isArrayLike(value) &&
      hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
  }

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(function() { return arguments; }());
   * // => false
   */
  var isArray = nativeIsArray || function(value) {
    return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
  };

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in older versions of Chrome and Safari which return 'function' for regexes
    // and Safari 8 equivalents which return 'object' for typed array constructors.
    return isObject(value) && objToString.call(value) == funcTag;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is a native function.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
   * @example
   *
   * _.isNative(Array.prototype.push);
   * // => true
   *
   * _.isNative(_);
   * // => false
   */
  function isNative(value) {
    if (value == null) {
      return false;
    }
    if (isFunction(value)) {
      return reIsNative.test(fnToString.call(value));
    }
    return isObjectLike(value) && reIsHostCtor.test(value);
  }

  /**
   * Checks if `value` is classified as a `Number` primitive or object.
   *
   * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
   * as numbers, use the `_.isFinite` method.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isNumber(8.4);
   * // => true
   *
   * _.isNumber(NaN);
   * // => true
   *
   * _.isNumber('8.4');
   * // => false
   */
  function isNumber(value) {
    return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag);
  }

  /**
   * Checks if `value` is classified as a `String` primitive or object.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isString('abc');
   * // => true
   *
   * _.isString(1);
   * // => false
   */
  function isString(value) {
    return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
  }

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  function isTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
  }

  /**
   * Converts `value` to an array.
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {Array} Returns the converted array.
   * @example
   *
   * (function() {
   *   return _.toArray(arguments).slice(1);
   * }(1, 2, 3));
   * // => [2, 3]
   */
  function toArray(value) {
    var length = value ? getLength(value) : 0;
    if (!isLength(length)) {
      return values(value);
    }
    if (!length) {
      return [];
    }
    return arrayCopy(value);
  }

  /*------------------------------------------------------------------------*/

  /**
   * Assigns own enumerable properties of source object(s) to the destination
   * object. Subsequent sources overwrite property assignments of previous sources.
   * If `customizer` is provided it is invoked to produce the assigned values.
   * The `customizer` is bound to `thisArg` and invoked with five arguments:
   * (objectValue, sourceValue, key, object, source).
   *
   * **Note:** This method mutates `object` and is based on
   * [`Object.assign`](http://ecma-international.org/ecma-262/6.0/#sec-object.assign).
   *
   * @static
   * @memberOf _
   * @alias extend
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @param {Function} [customizer] The function to customize assigned values.
   * @param {*} [thisArg] The `this` binding of `customizer`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
   * // => { 'user': 'fred', 'age': 40 }
   *
   * // using a customizer callback
   * var defaults = _.partialRight(_.assign, function(value, other) {
   *   return _.isUndefined(value) ? other : value;
   * });
   *
   * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
   * // => { 'user': 'barney', 'age': 36 }
   */
  var assign = createAssigner(function(object, source, customizer) {
    return customizer
      ? assignWith(object, source, customizer)
      : baseAssign(object, source);
  });

  /**
   * Creates an object that inherits from the given `prototype` object. If a
   * `properties` object is provided its own enumerable properties are assigned
   * to the created object.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} prototype The object to inherit from.
   * @param {Object} [properties] The properties to assign to the object.
   * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
   * @returns {Object} Returns the new object.
   * @example
   *
   * function Shape() {
   *   this.x = 0;
   *   this.y = 0;
   * }
   *
   * function Circle() {
   *   Shape.call(this);
   * }
   *
   * Circle.prototype = _.create(Shape.prototype, {
   *   'constructor': Circle
   * });
   *
   * var circle = new Circle;
   * circle instanceof Circle;
   * // => true
   *
   * circle instanceof Shape;
   * // => true
   */
  function create(prototype, properties, guard) {
    var result = baseCreate(prototype);
    if (guard && isIterateeCall(prototype, properties, guard)) {
      properties = undefined;
    }
    return properties ? baseAssign(result, properties) : result;
  }

  /**
   * Gets the property value at `path` of `object`. If the resolved value is
   * `undefined` the `defaultValue` is used in its place.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.get(object, 'a[0].b.c');
   * // => 3
   *
   * _.get(object, ['a', '0', 'b', 'c']);
   * // => 3
   *
   * _.get(object, 'a.b.c', 'default');
   * // => 'default'
   */
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, toPath(path), path + '');
    return result === undefined ? defaultValue : result;
  }

  /**
   * Checks if `path` is a direct property.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` is a direct property, else `false`.
   * @example
   *
   * var object = { 'a': { 'b': { 'c': 3 } } };
   *
   * _.has(object, 'a');
   * // => true
   *
   * _.has(object, 'a.b.c');
   * // => true
   *
   * _.has(object, ['a', 'b', 'c']);
   * // => true
   */
  function has(object, path) {
    if (object == null) {
      return false;
    }
    var result = hasOwnProperty.call(object, path);
    if (!result && !isKey(path)) {
      path = toPath(path);
      object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
      if (object == null) {
        return false;
      }
      path = last(path);
      result = hasOwnProperty.call(object, path);
    }
    return result || (isLength(object.length) && isIndex(path, object.length) &&
      (isArray(object) || isArguments(object)));
  }

  /**
   * Creates an object composed of the inverted keys and values of `object`.
   * If `object` contains duplicate values, subsequent values overwrite property
   * assignments of previous values unless `multiValue` is `true`.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to invert.
   * @param {boolean} [multiValue] Allow multiple values per key.
   * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
   * @returns {Object} Returns the new inverted object.
   * @example
   *
   * var object = { 'a': 1, 'b': 2, 'c': 1 };
   *
   * _.invert(object);
   * // => { '1': 'c', '2': 'b' }
   *
   * // with `multiValue`
   * _.invert(object, true);
   * // => { '1': ['a', 'c'], '2': ['b'] }
   */
  function invert(object, multiValue, guard) {
    if (guard && isIterateeCall(object, multiValue, guard)) {
      multiValue = undefined;
    }
    var index = -1,
        props = keys(object),
        length = props.length,
        result = {};

    while (++index < length) {
      var key = props[index],
          value = object[key];

      if (multiValue) {
        if (hasOwnProperty.call(result, value)) {
          result[value].push(key);
        } else {
          result[value] = [key];
        }
      }
      else {
        result[value] = key;
      }
    }
    return result;
  }

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    var Ctor = object == null ? undefined : object.constructor;
    if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
        (typeof object != 'function' && isArrayLike(object))) {
      return shimKeys(object);
    }
    return isObject(object) ? nativeKeys(object) : [];
  };

  /**
   * Creates an array of the own and inherited enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keysIn(new Foo);
   * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
   */
  function keysIn(object) {
    if (object == null) {
      return [];
    }
    if (!isObject(object)) {
      object = Object(object);
    }
    var length = object.length;
    length = (length && isLength(length) &&
      (isArray(object) || isArguments(object)) && length) || 0;

    var Ctor = object.constructor,
        index = -1,
        isProto = typeof Ctor == 'function' && Ctor.prototype === object,
        result = Array(length),
        skipIndexes = length > 0;

    while (++index < length) {
      result[index] = (index + '');
    }
    for (var key in object) {
      if (!(skipIndexes && isIndex(key, length)) &&
          !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Creates an object with the same keys as `object` and values generated by
   * running each own enumerable property of `object` through `iteratee`. The
   * iteratee function is bound to `thisArg` and invoked with three arguments:
   * (value, key, object).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to iterate over.
   * @param {Function|Object|string} [iteratee=_.identity] The function invoked
   *  per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {Object} Returns the new mapped object.
   * @example
   *
   * _.mapValues({ 'a': 1, 'b': 2 }, function(n) {
   *   return n * 3;
   * });
   * // => { 'a': 3, 'b': 6 }
   *
   * var users = {
   *   'fred':    { 'user': 'fred',    'age': 40 },
   *   'pebbles': { 'user': 'pebbles', 'age': 1 }
   * };
   *
   * // using the `_.property` callback shorthand
   * _.mapValues(users, 'age');
   * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
   */
  var mapValues = createObjectMapper();

  /**
   * Creates a two dimensional array of the key-value pairs for `object`,
   * e.g. `[[key1, value1], [key2, value2]]`.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the new array of key-value pairs.
   * @example
   *
   * _.pairs({ 'barney': 36, 'fred': 40 });
   * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
   */
  function pairs(object) {
    object = toObject(object);

    var index = -1,
        props = keys(object),
        length = props.length,
        result = Array(length);

    while (++index < length) {
      var key = props[index];
      result[index] = [key, object[key]];
    }
    return result;
  }

  /**
   * Creates an object composed of the picked `object` properties. Property
   * names may be specified as individual arguments or as arrays of property
   * names. If `predicate` is provided it is invoked for each property of `object`
   * picking the properties `predicate` returns truthy for. The predicate is
   * bound to `thisArg` and invoked with three arguments: (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The source object.
   * @param {Function|...(string|string[])} [predicate] The function invoked per
   *  iteration or property names to pick, specified as individual property
   *  names or arrays of property names.
   * @param {*} [thisArg] The `this` binding of `predicate`.
   * @returns {Object} Returns the new object.
   * @example
   *
   * var object = { 'user': 'fred', 'age': 40 };
   *
   * _.pick(object, 'user');
   * // => { 'user': 'fred' }
   *
   * _.pick(object, _.isString);
   * // => { 'user': 'fred' }
   */
  var pick = restParam(function(object, props) {
    if (object == null) {
      return {};
    }
    return typeof props[0] == 'function'
      ? pickByCallback(object, bindCallback(props[0], props[1], 3))
      : pickByArray(object, baseFlatten(props));
  });

  /**
   * Creates an array of the own enumerable property values of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property values.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.values(new Foo);
   * // => [1, 2] (iteration order is not guaranteed)
   *
   * _.values('hi');
   * // => ['h', 'i']
   */
  function values(object) {
    return baseValues(object, keys(object));
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a function that invokes `func` with the `this` binding of `thisArg`
   * and arguments of the created function. If `func` is a property name the
   * created callback returns the property value for a given element. If `func`
   * is an object the created callback returns `true` for elements that contain
   * the equivalent object properties, otherwise it returns `false`.
   *
   * @static
   * @memberOf _
   * @alias iteratee
   * @category Utility
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
   * @returns {Function} Returns the callback.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * // wrap to create custom callback shorthands
   * _.callback = _.wrap(_.callback, function(callback, func, thisArg) {
   *   var match = /^(.+?)__([gl]t)(.+)$/.exec(func);
   *   if (!match) {
   *     return callback(func, thisArg);
   *   }
   *   return function(object) {
   *     return match[2] == 'gt'
   *       ? object[match[1]] > match[3]
   *       : object[match[1]] < match[3];
   *   };
   * });
   *
   * _.filter(users, 'age__gt36');
   * // => [{ 'user': 'fred', 'age': 40 }]
   */
  function callback(func, thisArg, guard) {
    if (guard && isIterateeCall(func, thisArg, guard)) {
      thisArg = undefined;
    }
    return isObjectLike(func)
      ? matches(func)
      : baseCallback(func, thisArg);
  }

  /**
   * This method returns the first argument provided to it.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * _.identity(object) === object;
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Creates a function that performs a deep comparison between a given object
   * and `source`, returning `true` if the given object has equivalent property
   * values, else `false`.
   *
   * **Note:** This method supports comparing arrays, booleans, `Date` objects,
   * numbers, `Object` objects, regexes, and strings. Objects are compared by
   * their own, not inherited, enumerable properties. For comparing a single
   * own or inherited property value see `_.matchesProperty`.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * _.filter(users, _.matches({ 'age': 40, 'active': false }));
   * // => [{ 'user': 'fred', 'age': 40, 'active': false }]
   */
  function matches(source) {
    return baseMatches(baseClone(source, true));
  }

  /**
   * Adds all own enumerable function properties of a source object to the
   * destination object. If `object` is a function then methods are added to
   * its prototype as well.
   *
   * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
   * avoid conflicts caused by modifying the original.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {Function|Object} [object=lodash] The destination object.
   * @param {Object} source The object of functions to add.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.chain=true] Specify whether the functions added
   *  are chainable.
   * @returns {Function|Object} Returns `object`.
   * @example
   *
   * function vowels(string) {
   *   return _.filter(string, function(v) {
   *     return /[aeiou]/i.test(v);
   *   });
   * }
   *
   * _.mixin({ 'vowels': vowels });
   * _.vowels('fred');
   * // => ['e']
   *
   * _('fred').vowels().value();
   * // => ['e']
   *
   * _.mixin({ 'vowels': vowels }, { 'chain': false });
   * _('fred').vowels();
   * // => ['e']
   */
  function mixin(object, source, options) {
    if (options == null) {
      var isObj = isObject(source),
          props = isObj ? keys(source) : undefined,
          methodNames = (props && props.length) ? baseFunctions(source, props) : undefined;

      if (!(methodNames ? methodNames.length : isObj)) {
        methodNames = false;
        options = source;
        source = object;
        object = this;
      }
    }
    if (!methodNames) {
      methodNames = baseFunctions(source, keys(source));
    }
    var chain = true,
        index = -1,
        isFunc = isFunction(object),
        length = methodNames.length;

    if (options === false) {
      chain = false;
    } else if (isObject(options) && 'chain' in options) {
      chain = options.chain;
    }
    while (++index < length) {
      var methodName = methodNames[index],
          func = source[methodName];

      object[methodName] = func;
      if (isFunc) {
        object.prototype[methodName] = (function(func) {
          return function() {
            var chainAll = this.__chain__;
            if (chain || chainAll) {
              var result = object(this.__wrapped__),
                  actions = result.__actions__ = arrayCopy(this.__actions__);

              actions.push({ 'func': func, 'args': arguments, 'thisArg': object });
              result.__chain__ = chainAll;
              return result;
            }
            return func.apply(object, arrayPush([this.value()], arguments));
          };
        }(func));
      }
    }
    return object;
  }

  /**
   * A no-operation function that returns `undefined` regardless of the
   * arguments it receives.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * _.noop(object) === undefined;
   * // => true
   */
  function noop() {
    // No operation performed.
  }

  /**
   * Creates a function that returns the property value at `path` on a
   * given object.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var objects = [
   *   { 'a': { 'b': { 'c': 2 } } },
   *   { 'a': { 'b': { 'c': 1 } } }
   * ];
   *
   * _.map(objects, _.property('a.b.c'));
   * // => [2, 1]
   *
   * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
   * // => [1, 2]
   */
  function property(path) {
    return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
  }

  /**
   * Generates a unique ID. If `prefix` is provided the ID is appended to it.
   *
   * @static
   * @memberOf _
   * @category Utility
   * @param {string} [prefix] The value to prefix the ID with.
   * @returns {string} Returns the unique ID.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   *
   * _.uniqueId();
   * // => '105'
   */
  function uniqueId(prefix) {
    var id = ++idCounter;
    return baseToString(prefix) + id;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Gets the maximum value of `collection`. If `collection` is empty or falsey
   * `-Infinity` is returned. If an iteratee function is provided it is invoked
   * for each value in `collection` to generate the criterion by which the value
   * is ranked. The `iteratee` is bound to `thisArg` and invoked with three
   * arguments: (value, index, collection).
   *
   * If a property name is provided for `iteratee` the created `_.property`
   * style callback returns the property value of the given element.
   *
   * If a value is also provided for `thisArg` the created `_.matchesProperty`
   * style callback returns `true` for elements that have a matching property
   * value, else `false`.
   *
   * If an object is provided for `iteratee` the created `_.matches` style
   * callback returns `true` for elements that have the properties of the given
   * object, else `false`.
   *
   * @static
   * @memberOf _
   * @category Math
   * @param {Array|Object|string} collection The collection to iterate over.
   * @param {Function|Object|string} [iteratee] The function invoked per iteration.
   * @param {*} [thisArg] The `this` binding of `iteratee`.
   * @returns {*} Returns the maximum value.
   * @example
   *
   * _.max([4, 2, 8, 6]);
   * // => 8
   *
   * _.max([]);
   * // => -Infinity
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * _.max(users, function(chr) {
   *   return chr.age;
   * });
   * // => { 'user': 'fred', 'age': 40 }
   *
   * // using the `_.property` callback shorthand
   * _.max(users, 'age');
   * // => { 'user': 'fred', 'age': 40 }
   */
  var max = createExtremum(gt, NEGATIVE_INFINITY);

  /*------------------------------------------------------------------------*/

  // Ensure wrappers are instances of `baseLodash`.
  lodash.prototype = baseLodash.prototype;

  LodashWrapper.prototype = baseCreate(baseLodash.prototype);
  LodashWrapper.prototype.constructor = LodashWrapper;

  LazyWrapper.prototype = baseCreate(baseLodash.prototype);
  LazyWrapper.prototype.constructor = LazyWrapper;

  // Add functions to the `Set` cache.
  SetCache.prototype.push = cachePush;

  // Add functions that return wrapped values when chaining.
  lodash.assign = assign;
  lodash.callback = callback;
  lodash.chain = chain;
  lodash.create = create;
  lodash.debounce = debounce;
  lodash.filter = filter;
  lodash.flatten = flatten;
  lodash.forEach = forEach;
  lodash.invert = invert;
  lodash.keys = keys;
  lodash.keysIn = keysIn;
  lodash.map = map;
  lodash.mapValues = mapValues;
  lodash.matches = matches;
  lodash.mixin = mixin;
  lodash.pairs = pairs;
  lodash.pick = pick;
  lodash.pluck = pluck;
  lodash.property = property;
  lodash.restParam = restParam;
  lodash.tap = tap;
  lodash.thru = thru;
  lodash.toArray = toArray;
  lodash.uniq = uniq;
  lodash.values = values;
  lodash.zipObject = zipObject;

  // Add aliases.
  lodash.collect = map;
  lodash.each = forEach;
  lodash.extend = assign;
  lodash.iteratee = callback;
  lodash.object = zipObject;
  lodash.select = filter;
  lodash.unique = uniq;

  // Add functions to `lodash.prototype`.
  mixin(lodash, lodash);

  /*------------------------------------------------------------------------*/

  // Add functions that return unwrapped values when chaining.
  lodash.first = first;
  lodash.get = get;
  lodash.gt = gt;
  lodash.has = has;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isFunction = isFunction;
  lodash.isNative = isNative;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isString = isString;
  lodash.isTypedArray = isTypedArray;
  lodash.last = last;
  lodash.max = max;
  lodash.noop = noop;
  lodash.now = now;
  lodash.reduce = reduce;
  lodash.size = size;
  lodash.uniqueId = uniqueId;

  // Add aliases.
  lodash.foldl = reduce;
  lodash.head = first;
  lodash.inject = reduce;

  mixin(lodash, (function() {
    var source = {};
    baseForOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        source[methodName] = func;
      }
    });
    return source;
  }()), false);

  /*------------------------------------------------------------------------*/

  lodash.prototype.sample = function(n) {
    if (!this.__chain__ && n == null) {
      return sample(this.value());
    }
    return this.thru(function(value) {
      return sample(value, n);
    });
  };

  /*------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type string
   */
  lodash.VERSION = VERSION;

  // Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
  arrayEach(['drop', 'take'], function(methodName, index) {
    LazyWrapper.prototype[methodName] = function(n) {
      var filtered = this.__filtered__;
      if (filtered && !index) {
        return new LazyWrapper(this);
      }
      n = n == null ? 1 : nativeMax(nativeFloor(n) || 0, 0);

      var result = this.clone();
      if (filtered) {
        result.__takeCount__ = nativeMin(result.__takeCount__, n);
      } else {
        result.__views__.push({ 'size': n, 'type': methodName + (result.__dir__ < 0 ? 'Right' : '') });
      }
      return result;
    };

    LazyWrapper.prototype[methodName + 'Right'] = function(n) {
      return this.reverse()[methodName](n).reverse();
    };
  });

  // Add `LazyWrapper` methods that accept an `iteratee` value.
  arrayEach(['filter', 'map', 'takeWhile'], function(methodName, index) {
    var type = index + 1,
        isFilter = type != LAZY_MAP_FLAG;

    LazyWrapper.prototype[methodName] = function(iteratee, thisArg) {
      var result = this.clone();
      result.__iteratees__.push({ 'iteratee': getCallback(iteratee, thisArg, 1), 'type': type });
      result.__filtered__ = result.__filtered__ || isFilter;
      return result;
    };
  });

  // Add `LazyWrapper` methods for `_.first` and `_.last`.
  arrayEach(['first', 'last'], function(methodName, index) {
    var takeName = 'take' + (index ? 'Right' : '');

    LazyWrapper.prototype[methodName] = function() {
      return this[takeName](1).value()[0];
    };
  });

  // Add `LazyWrapper` methods for `_.initial` and `_.rest`.
  arrayEach(['initial', 'rest'], function(methodName, index) {
    var dropName = 'drop' + (index ? '' : 'Right');

    LazyWrapper.prototype[methodName] = function() {
      return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
    };
  });

  // Add `LazyWrapper` methods for `_.pluck` and `_.where`.
  arrayEach(['pluck', 'where'], function(methodName, index) {
    var operationName = index ? 'filter' : 'map',
        createCallback = index ? baseMatches : property;

    LazyWrapper.prototype[methodName] = function(value) {
      return this[operationName](createCallback(value));
    };
  });

  LazyWrapper.prototype.compact = function() {
    return this.filter(identity);
  };

  LazyWrapper.prototype.reject = function(predicate, thisArg) {
    predicate = getCallback(predicate, thisArg, 1);
    return this.filter(function(value) {
      return !predicate(value);
    });
  };

  LazyWrapper.prototype.slice = function(start, end) {
    start = start == null ? 0 : (+start || 0);

    var result = this;
    if (result.__filtered__ && (start > 0 || end < 0)) {
      return new LazyWrapper(result);
    }
    if (start < 0) {
      result = result.takeRight(-start);
    } else if (start) {
      result = result.drop(start);
    }
    if (end !== undefined) {
      end = (+end || 0);
      result = end < 0 ? result.dropRight(-end) : result.take(end - start);
    }
    return result;
  };

  LazyWrapper.prototype.takeRightWhile = function(predicate, thisArg) {
    return this.reverse().takeWhile(predicate, thisArg).reverse();
  };

  LazyWrapper.prototype.toArray = function() {
    return this.take(POSITIVE_INFINITY);
  };

  // Add `LazyWrapper` methods to `lodash.prototype`.
  baseForOwn(LazyWrapper.prototype, function(func, methodName) {
    var checkIteratee = /^(?:filter|map|reject)|While$/.test(methodName),
        retUnwrapped = /^(?:first|last)$/.test(methodName),
        lodashFunc = lodash[retUnwrapped ? ('take' + (methodName == 'last' ? 'Right' : '')) : methodName];

    if (!lodashFunc) {
      return;
    }
    lodash.prototype[methodName] = function() {
      var args = retUnwrapped ? [1] : arguments,
          chainAll = this.__chain__,
          value = this.__wrapped__,
          isHybrid = !!this.__actions__.length,
          isLazy = value instanceof LazyWrapper,
          iteratee = args[0],
          useLazy = isLazy || isArray(value);

      if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
        // Avoid lazy use if the iteratee has a "length" value other than `1`.
        isLazy = useLazy = false;
      }
      var interceptor = function(value) {
        return (retUnwrapped && chainAll)
          ? lodashFunc(value, 1)[0]
          : lodashFunc.apply(undefined, arrayPush([value], args));
      };

      var action = { 'func': thru, 'args': [interceptor], 'thisArg': undefined },
          onlyLazy = isLazy && !isHybrid;

      if (retUnwrapped && !chainAll) {
        if (onlyLazy) {
          value = value.clone();
          value.__actions__.push(action);
          return func.call(value);
        }
        return lodashFunc.call(undefined, this.value())[0];
      }
      if (!retUnwrapped && useLazy) {
        value = onlyLazy ? value : new LazyWrapper(this);
        var result = func.apply(value, args);
        result.__actions__.push(action);
        return new LodashWrapper(result, chainAll);
      }
      return this.thru(interceptor);
    };
  });

  // Add `Array` and `String` methods to `lodash.prototype`.
  arrayEach(['join', 'pop', 'push', 'replace', 'shift', 'sort', 'splice', 'split', 'unshift'], function(methodName) {
    var func = (/^(?:replace|split)$/.test(methodName) ? stringProto : arrayProto)[methodName],
        chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
        retUnwrapped = /^(?:join|pop|replace|shift)$/.test(methodName);

    lodash.prototype[methodName] = function() {
      var args = arguments;
      if (retUnwrapped && !this.__chain__) {
        return func.apply(this.value(), args);
      }
      return this[chainName](function(value) {
        return func.apply(value, args);
      });
    };
  });

  // Map minified function names to their real names.
  baseForOwn(LazyWrapper.prototype, function(func, methodName) {
    var lodashFunc = lodash[methodName];
    if (lodashFunc) {
      var key = lodashFunc.name,
          names = realNames[key] || (realNames[key] = []);

      names.push({ 'name': methodName, 'func': lodashFunc });
    }
  });

  realNames[createHybridWrapper(undefined, BIND_KEY_FLAG).name] = [{ 'name': 'wrapper', 'func': undefined }];

  // Add functions to the lazy wrapper.
  LazyWrapper.prototype.clone = lazyClone;
  LazyWrapper.prototype.reverse = lazyReverse;
  LazyWrapper.prototype.value = lazyValue;

  // Add chaining functions to the `lodash` wrapper.
  lodash.prototype.chain = wrapperChain;
  lodash.prototype.commit = wrapperCommit;
  lodash.prototype.concat = wrapperConcat;
  lodash.prototype.plant = wrapperPlant;
  lodash.prototype.reverse = wrapperReverse;
  lodash.prototype.toString = wrapperToString;
  lodash.prototype.run = lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

  // Add function aliases to the `lodash` wrapper.
  lodash.prototype.collect = lodash.prototype.map;
  lodash.prototype.head = lodash.prototype.first;
  lodash.prototype.select = lodash.prototype.filter;
  lodash.prototype.tail = lodash.prototype.rest;

  /*--------------------------------------------------------------------------*/

  if (freeExports && freeModule) {
    // Export for Node.js or RingoJS.
    if (moduleExports) {
      (freeModule.exports = lodash)._ = lodash;
    }
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},["/Volumes/alien/projects/decipher/angular-envoy/lib/index.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvZGlyZWN0aXZlcy9hY3Rpb24uanMiLCJsaWIvZGlyZWN0aXZlcy9mb3JtL2Zvcm1jb250cm9sbGVyLmpzIiwibGliL2RpcmVjdGl2ZXMvZm9ybS9pbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2Zvcm0vdmlld2RhdGEuanMiLCJsaWIvZGlyZWN0aXZlcy9pbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2xpc3QuanMiLCJsaWIvZGlyZWN0aXZlcy9wcm94eS5qcyIsImxpYi9lbnZveS9mYWN0b3J5LmpzIiwibGliL2Vudm95L2luZGV4LmpzIiwibGliL2Vudm95L29wdHMuanMiLCJsaWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVidWcvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9ub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJwYWNrYWdlLmpzb24iLCJzdXBwb3J0L2xvZGFzaC5jdXN0b20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlOmVudm95QWN0aW9uXG4gKiBAcmVzdHJpY3QgQVxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXNjcmliZXMgYSBkaXJlY3RpdmUgd2hlcmVpbiB5b3UgY2FuIHN1cHBseSBhbiBhY3Rpb24gKEFuZ3VsYXJKU1xuICogZXhwcmVzc2lvbikgdG8gYmUgZXhlY3V0ZWQgZnJvbSB0aGUgbWVzc2FnZSBsaXN0IGZvciBhIHBhcnRpY3VsYXJcbiAqIGNvbnRyb2wuXG4gKlxuICogSW4gc2hvcnQsIHlvdSB3YW50IHRvIHVzZSB0aGlzIHRvIGFjdGl2YXRlIGEgZm9ybSBmaWVsZCB3aGVuIHRoZSB1c2VyXG4gKiBjbGlja3Mgb24gdGhlIGVycm9yIG1lc3NhZ2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGh0bWxcbiAqIDxpbnB1dCBuYW1lPVwidGl0bGVcIlxuICogICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAqICAgICAgICBuZy1tb2RlbD1cIm15TW9kZWwudGl0bGVcIlxuICogICAgICAgIGVudm95LWFjdGlvbj1cImRvU29tZXRoaW5nKClcIi8+XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gYWN0aW9uKCRlbnZveSkge1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiBbJ25nTW9kZWwnLCAnXmZvcm0nXSxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJscykge1xuICAgICAgdmFyIG5nTW9kZWwgPSBjdHJsc1swXTtcbiAgICAgIHZhciBmb3JtID0gY3RybHNbMV07XG4gICAgICB2YXIgYWN0aW9uO1xuXG4gICAgICBpZiAoKGFjdGlvbiA9IGF0dHJzLmVudm95QWN0aW9uKSAmJiBuZ01vZGVsLiRuYW1lICYmIGZvcm0uJG5hbWUpIHtcbiAgICAgICAgJGVudm95LnNldEFjdGlvbihmb3JtLiRuYW1lLCBuZ01vZGVsLiRuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2NvcGUuJGV2YWwoYWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuYWN0aW9uLiRpbmplY3QgPSBbJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcbnZhciB2aWV3RGF0YSA9IHJlcXVpcmUoJy4vdmlld2RhdGEnKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczplbnZveUZvcm06Y29udHJvbGxlcicpO1xuXG4vKipcbiAqIEBuZ2RvYyBtZXRob2RcbiAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXIjJHNldFZhbGlkaXR5XG4gKiBAbWV0aG9kT2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lGb3JtQ29udHJvbGxlclxuICogQGRlc2NyaXB0aW9uXG4gKiBJZiB0aGUgbnVtYmVyIG9mIGVycm9ycyBpbiB0aGlzIGZvcm0gaGFzIGluY3JlYXNlZCBvciBkZWNyZWFzZWRcbiAqIGFuZCB0aGUgY29udHJvbCBiZWluZyBzZXQgdmFsaWQgb3IgaW52YWxpZCBpcyBhIG1lbWJlciBvZiB0aGlzXG4gKiBmb3JtIHByb3BlciwgdGhlbiB0ZWxsIHtAbGluayBmdi5lbnZveS5lbnZveTokZW52b3kgJGVudm95fSBoYW5kbGVcbiAqICAgICB0aGUgY2hhbmdlLlxuICpcbiAqICpOb3RlKjogd2Ugb25seSB0ZWxsIGAkZW52b3lgIHRvIHVwZGF0ZSBpZiB0aGUgY29udHJvbCBpcyBhIGRpcmVjdFxuICogZGVzY2VuZGFudCBvZiB0aGlzIGZvcm0uXG4gKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gVmFsaWRhdGlvbiB0b2tlblxuICogQHBhcmFtIHsoYm9vbGVhbnwqKX0gdmFsdWUgSWYgdHJ1dGh5LCB0aGVuIHRoZSB2YWxpZGF0aW9uIHRva2VuIGlzXG4gKiBpbiBhbiBlcnJvciBzdGF0ZS5cbiAqIEBwYXJhbSB7KG5nTW9kZWwuTmdNb2RlbENvbnRyb2xsZXJ8Rm9ybUNvbnRyb2xsZXIuRm9ybUNvbnRyb2xsZXJ8ZnYuZW52b3kuY29udHJvbGxlcnMuRW52b3lGb3JtQ29udHJvbGxlcil9IGNvbnRyb2xcbiAqIFNvbWUgY29udHJvbCBvbiB0aGUgZm9ybTsgbWF5IGJlIGEgc3ViZm9ybSBvciBhIGZpZWxkLlxuICogQHRoaXMgRm9ybUNvbnRyb2xsZXJcbiAqL1xuZnVuY3Rpb24gJGVudm95U2V0VmFsaWRpdHkodG9rZW4sIHZhbHVlLCBjb250cm9sKSB7XG5cbiAgLyoqXG4gICAqIElmIHdlIHNldCAkaXNGb3JtIGFib3ZlLCB0aGlzIGlzIGEgc3ViZm9ybSBvZiB0aGUgcGFyZW50XG4gICAqIGFuZCB3ZSBkb24ndCBjYXJlLlxuICAgKiBAdG9kbyBtYXliZSB3ZSBkbyBjYXJlP1xuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICovXG4gIHZhciBpc05vdEZvcm0gPSAhY29udHJvbC4kJGVudm95Rm9ybTtcblxuICAvKipcbiAgICogV2Ugb25seSBjYXJlIGFib3V0IGNvbnRyb2xzIHRoYXQgd2VyZSBleHBsaWNpdGx5IGFkZGVkXG4gICAqIHRvIHRoaXMgZm9ybS5cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqL1xuICB2YXIgZm9ybUhhc0NvbnRyb2wgPSBpc05vdEZvcm0gJiYgXy5oYXModGhpcywgY29udHJvbC4kbmFtZSk7XG5cbiAgdGhpcy5fJHNldFZhbGlkaXR5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKGZvcm1IYXNDb250cm9sICYmXG4gICAgXy5zaXplKHRoaXMuJGVycm9yKSAhPT0gdGhpcy4kJGxhc3RFcnJvclNpemUpIHtcbiAgICB0aGlzLiRlbnZveS5yZWZyZXNoKHRoaXMsIGNvbnRyb2wpO1xuICAgIHRoaXMuJCRsYXN0RXJyb3JTaXplID0gXy5zaXplKHRoaXMuJGVycm9yKTtcbiAgfVxufVxuXG5cbi8qKlxuICogQG5nZG9jIGNvbnRyb2xsZXJcbiAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXJcbiAqIEBkZXNjcmlwdGlvblxuICogYEVudm95Rm9ybUNvbnRyb2xsZXJgIGlzIGEgc3VwZXJzZXQgb2ZcbiAqICAgICBbYEZvcm1Db250cm9sbGVyYF0oaHR0cHM6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nL3R5cGUvZm9ybS5Gb3JtQ29udHJvbGxlciMhKS5cbiAqICAgSXQgKnJlcXVpcmVzKiBhIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRW52b3lGb3JtQ29udHJvbGxlcigkc2NvcGUsXG4gICRlbGVtZW50LFxuICAkYXR0cnMsXG4gICRpbmplY3RvcixcbiAgJGFuaW1hdGUsXG4gICRpbnRlcnBvbGF0ZSxcbiAgJGVudm95LFxuICBmb3JtRGlyZWN0aXZlKSB7XG5cbiAgdmFyIHVuYmluZEZvcm07XG4gIHZhciBsb2NhbHMgPSB7XG4gICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgJGVsZW1lbnQ6ICRlbGVtZW50LFxuICAgICRhdHRyczogJGF0dHJzXG4gIH07XG4gIHZhciBGb3JtQ29udHJvbGxlciA9IF8uZmlyc3QoZm9ybURpcmVjdGl2ZSkuY29udHJvbGxlcjtcblxuICAkaW5qZWN0b3IuaW52b2tlKEZvcm1Db250cm9sbGVyLCB0aGlzLCBsb2NhbHMpO1xuXG4gIC8qKlxuICAgKiBUaGlzIEZvcm1Db250cm9sbGVyJ3Mgb3JpZ2luYWwgJHNldFZhbGlkaXR5KCkgbWV0aG9kXG4gICAqIEB0eXBlIHtGb3JtQ29udHJvbGxlci5Gb3JtQ29udHJvbGxlciMkc2V0VmFsaWRpdHl9XG4gICAqL1xuXG4gIHRoaXMuXyRzZXRWYWxpZGl0eSA9IHRoaXMuJHNldFZhbGlkaXR5O1xuICBpZiAoIXRoaXMuJG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Vudm95Rm9ybSByZXF1aXJlcyBhIG5hbWUhJyk7XG4gIH1cblxuICBfLmV4dGVuZCh0aGlzLCBsb2NhbHMsIHtcbiAgICAkYW5pbWF0ZTogJGFuaW1hdGUsXG4gICAgJGludGVycG9sYXRlOiAkaW50ZXJwb2xhdGUsXG4gICAgJGVudm95OiAkZW52b3lcbiAgfSk7XG5cbiAgdGhpcy4kJGVudm95Rm9ybSA9IHRydWU7XG4gIHRoaXMuJGNoaWxkcmVuID0gW107XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyIyRhbGlhc1xuICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBJZiB0aGUgcGFyZW50IHtAbGluayBmdi5lbnZveS5kaXJlY3RpdmVzOmZvcm0gZm9ybSBkaXJlY3RpdmV9XG4gICAqIGNvbnRhaW5zIGFuIFwiYWxpYXNcIiBhdHRyaWJ1dGUsIHdlJ2xsIHVzZSBpdFxuICAgKiB0byBsb29rIHVwIG1lc3NhZ2VzLiAgVGhpcyBpcyB1c2VmdWwgaWYgeW91ciBmb3JtIG5hbWUgaXNcbiAgICogXCJkeW5hbWljXCIgKGludGVycG9sYXRlZCkuICAqTm90ZToqIGludGVycG9sYXRlZCBmb3JtIG5hbWVzIHdlcmVcbiAgICogbm90IGltcGxlbWVudGVkIGJlZm9yZSBBbmd1bGFySlMgMS4zLjAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIHdoYXRldmVyIHRoZSBuYW1lIG9mIHRoZSBmb3JtIGlzLlxuICAgKlxuICAgKiBJZiB0aGUgYWxpYXMgaXMgbm90IHByZXNlbnQgaW4gdGhpcyBmb3JtJ3MgU2NvcGUsIHRoZW4gaXQgaXMgcGxhY2VkXG4gICAqIHRoZXJlLS1tdWNoIGxpa2UgYEZvcm1Db250cm9sbGVyYCBwbGFjZXMgaXRzIGBuYW1lYCBhdHRyaWJ1dGUgb24gaXRzXG4gICAqIFNjb3BlLCBpZiBwcmVzZW50LiAgQmVjYXVzZSBjb2xsaXNpb25zIGNvdWxkIGV4aXN0IGluIHRoZSBjYXNlIG9mXG4gICAqIFwiZHluYW1pY1wiIGZvcm1zLCB0aGUge0BsaW5rIGZ2LmVudm95LmRpcmVjdGl2ZXM6Zm9ybSBmb3JtIGRpcmVjdGl2ZX1cbiAgICogbXVzdCBjcmVhdGUgYSBuZXcgU2NvcGUuXG4gICAqL1xuICB0aGlzLiRhbGlhcyA9ICRhdHRycy4kYWxpYXMgfHwgdGhpcy4kbmFtZTtcblxuICAvKipcbiAgICogVXNlZCB0byB0cmFjayB0aGlzIGZvcm0ncyBlcnJvciBzdGF0ZS4gIFdlJ2xsIG5lZWQgdG9cbiAgICogZG8gc3R1ZmYgaWYgdGhlIHN0YXRlIGNoYW5nZXMuXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB0aGlzLiQkbGFzdEVycm9yU2l6ZSA9IDA7XG4gIHRoaXMuJHBhcmVudCA9IG51bGw7XG4gIHRoaXMuJGVycm9yTGV2ZWwgPSAkZW52b3kuREVGQVVMVF9FUlJPUkxFVkVMO1xuICB0aGlzLiR2aWV3ID0gdGhpcy4kcGFyZW50ID9cbiAgICAodGhpcy4kdmlldyA9IHRoaXMuJHBhcmVudC4kdmlldykgOlxuICAgICh0aGlzLiR2aWV3ID0ge30pO1xuXG4gIHRoaXMuJHNldFZhbGlkaXR5ID0gJGVudm95U2V0VmFsaWRpdHk7XG5cbiAgdGhpcy4kX3NldFBhcmVudCgpO1xuXG4gIHVuYmluZEZvcm0gPSB0aGlzLl9iaW5kKCk7XG4gICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLiRwYXJlbnQpIHtcbiAgICAgIHRoaXMuJHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgICB9XG4gICAgdW5iaW5kRm9ybSgpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gICRzY29wZVt0aGlzLiRhbGlhcyB8fCB0aGlzLiRuYW1lXSA9IHRoaXM7XG5cbiAgZGVidWcoJ0Vudm95Rm9ybUNvbnRyb2xsZXIgXCIlc1wiIGluc3RhbnRpYXRlZCcsIHRoaXMuJG5hbWUsIHRoaXMpO1xufVxuXG5FbnZveUZvcm1Db250cm9sbGVyLiRpbmplY3QgPSBbXG4gICckc2NvcGUnLFxuICAnJGVsZW1lbnQnLFxuICAnJGF0dHJzJyxcbiAgJyRpbmplY3RvcicsXG4gICckYW5pbWF0ZScsXG4gICckaW50ZXJwb2xhdGUnLFxuICAnJGVudm95JyxcbiAgJ2Zvcm1EaXJlY3RpdmUnXG5dO1xuXG5FbnZveUZvcm1Db250cm9sbGVyLnByb3RvdHlwZSA9IHtcblxuICBfYmluZDogZnVuY3Rpb24gX2JpbmQoKSB7XG4gICAgcmV0dXJuIHRoaXMuJGVudm95LmJpbmRGb3JtKHRoaXMsIHRoaXMuJG5hbWUsICdFbnZveUZvcm1Db250cm9sbGVyJyk7XG4gIH0sXG5cbiAgJF9zZXRQYXJlbnQ6IGZ1bmN0aW9uICRzZXRQYXJlbnQoKSB7XG4gICAgdmFyIHBhcmVudE5hbWU7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMuJGF0dHJzLnBhcmVudDtcbiAgICBpZiAocGFyZW50ICYmIChwYXJlbnROYW1lID0gdGhpcy4kaW50ZXJwb2xhdGUocGFyZW50KSh0aGlzLiRzY29wZSkpKSB7XG4gICAgICB0aGlzLiRlbnZveS5maW5kQ29udHJvbGxlcihwYXJlbnROYW1lKS4kYWRkQ2hpbGQodGhpcyk7XG5cbiAgICAgIGlmICh0aGlzLiRwYXJlbnQgPT09IHRoaXMpIHtcbiAgICAgICAgdGhpcy4kcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgICAgICBkZWJ1ZygnQXR0ZW1wdGVkIHRvIGluaXRpYWxpemUgJXMgd2l0aCBpdHMgb3duIHBhcmVudCcsIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmluZCBhIHZpZXcgU2NvcGUgdG8gdGhpcyBkaXJlY3RpdmUgZm9yIGRpc3BsYXkuICBVc2VkIGJ5XG4gICAqIGBtZXNzYWdlc0xpc3RgIGRpcmVjdGl2ZS5cbiAgICogQHBhcmFtIHtuZy4kcm9vdFNjb3BlLlNjb3BlfSBzY29wZVxuICAgKiBAcmV0dXJucyB7Y3JlYXRlRW52b3lGb3JtQ29udHJvbGxlcn0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICAkYmluZFZpZXc6IGZ1bmN0aW9uICRiaW5kVmlldyhzY29wZSkge1xuICAgIGlmICh0aGlzLiR2aWV3LnNjb3BlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ZpZXcgYWxyZWFkeSBib3VuZCEnKTtcbiAgICB9XG4gICAgdGhpcy4kdmlldy5zY29wZSA9IHNjb3BlO1xuICAgIHNjb3BlLmRhdGEgPSB2aWV3RGF0YSh0aGlzLiRlbnZveS5ERUZBVUxUX0xFVkVMKTtcbiAgICBkZWJ1ZygnVmlldyBib3VuZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gICR1cGRhdGU6IGZ1bmN0aW9uICR1cGRhdGUoZGF0YSkge1xuICAgIHZhciB2aWV3RGF0YSA9IHRoaXMuJHZpZXdEYXRhO1xuICAgIHZhciBlcnJvckxldmVsO1xuXG4gICAgaWYgKHZpZXdEYXRhKSB7XG5cbiAgICAgIGRlYnVnKCdcIiVzXCIgdXBkYXRpbmcgd2l0aCBuZXcgZGF0YTonLCB0aGlzLiRuYW1lLCBkYXRhKTtcblxuICAgICAgdGhpcy4kZXJyb3JMZXZlbCA9XG4gICAgICAgIGVycm9yTGV2ZWwgPVxuICAgICAgICAgIF8uaXNOdW1iZXIoZGF0YS5lcnJvckxldmVsKSA/IGRhdGEuZXJyb3JMZXZlbCA6IHRoaXMuJGVycm9yTGV2ZWw7XG5cbiAgICAgIC8vIHRoaXMgYmVhc3QgaXMga2luZCBvZiBhIGN1c3RvbSBtZXJnZVxuICAgICAgXy5lYWNoKGRhdGEubWVzc2FnZXMsIGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMsIGZvcm1OYW1lKSB7XG4gICAgICAgIGlmICh2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV0pIHtcbiAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzLCBmdW5jdGlvbiAoY29udHJvbE1lc3NhZ2VzLCBjb250cm9sTmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QoY29udHJvbE1lc3NhZ2VzKSkge1xuICAgICAgICAgICAgICBpZiAodmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSkge1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0sXG4gICAgICAgICAgICAgICAgICBjb250cm9sTWVzc2FnZXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0gPSBjb250cm9sTWVzc2FnZXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV1bY29udHJvbE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXSA9IGZvcm1NZXNzYWdlcztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3RGF0YS5lcnJvciA9ICEhZXJyb3JMZXZlbDtcbiAgICAgIHZpZXdEYXRhLmNsYXNzTmFtZSA9IHRoaXMuJGVudm95LmxldmVsKGVycm9yTGV2ZWwpO1xuICAgICAgdmlld0RhdGEudGl0bGUgPSB0aGlzLiR0aXRsZShlcnJvckxldmVsKTtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGVkOyB2aWV3IGRhdGE6JywgdGhpcy4kbmFtZSwgdmlld0RhdGEpO1xuXG4gICAgICByZXR1cm4gdmlld0RhdGE7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVbmJpbmQgdGhlIGJvdW5kIFNjb3BlIG9mIHRoaXMgY29udHJvbGxlci5cbiAgICogQHJldHVybnMge2NyZWF0ZUVudm95Rm9ybUNvbnRyb2xsZXJ9IFRoaXMgY29udHJvbGxlclxuICAgKi9cbiAgJHVuYmluZFZpZXc6IGZ1bmN0aW9uICR1bmJpbmRWaWV3KCkge1xuICAgIGRlbGV0ZSB0aGlzLiR2aWV3LnNjb3BlO1xuICAgIHRoaXMuJHZpZXcgPSBudWxsO1xuICAgIGRlYnVnKCdWaWV3IHVuYm91bmQnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAkYWRkQ2hpbGQ6IGZ1bmN0aW9uICRhZGRDaGlsZChjaGlsZCkge1xuICAgIGRlYnVnKCdBZGRpbmcgY2hpbGQgXCIlc1wiIHRvIFwiJXNcIicsIGNoaWxkLiRuYW1lLCB0aGlzLiRuYW1lKTtcbiAgICB0aGlzLiRjaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICBjaGlsZC4kcGFyZW50ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAkcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uICRyZW1vdmVDaGlsZChjaGlsZCkge1xuICAgIGRlYnVnKCdSZW1vdmluZyBjaGlsZCBcIiVzXCIgZnJvbSBcIiVzXCInLCBjaGlsZC4kbmFtZSwgdGhpcy4kbmFtZSk7XG4gICAgdGhpcy4kY2hpbGRyZW4uc3BsaWNlKHRoaXMuJGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxKTtcbiAgICBkZWxldGUgY2hpbGQuJHBhcmVudDtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAkdGl0bGU6IGZ1bmN0aW9uICR0aXRsZShlcnJvckxldmVsKSB7XG4gICAgcmV0dXJuIHRoaXMuJGVudm95LmxldmVsRGVzY3JpcHRpb24oZXJyb3JMZXZlbCk7XG4gIH0sXG5cbiAgdG9TdHJpbmc6IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLiRuYW1lO1xuICB9XG5cbn07XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRW52b3lGb3JtQ29udHJvbGxlci5wcm90b3R5cGUsIHtcbiAgJHZpZXdEYXRhOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiBnZXRWaWV3RGF0YSgpIHtcbiAgICAgIHZhciBkYXRhO1xuICAgICAgaWYgKChkYXRhID0gXy5nZXQodGhpcy4kdmlldywgJ3Njb3BlLmRhdGEnKSkpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy4kdmlldy5zY29wZSkge1xuICAgICAgICByZXR1cm4gKHRoaXMuJHZpZXcuc2NvcGUuZGF0YSA9IHZpZXdEYXRhKHRoaXMuJGVudm95LkRFRkFVTFRfTEVWRUwpKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24gc2V0Vmlld0RhdGEoZGF0YSkge1xuICAgICAgdGhpcy4kdmlldy5zY29wZS5kYXRhID0gZGF0YTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudm95Rm9ybUNvbnRyb2xsZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlczplbnZveUZvcm1cbiAqIEByZXN0cmljdCBFQUNcbiAqIEBzY29wZVxuICogQHBhcmFtIHtzdHJpbmc9fSBuYW1lIE5hbWUgb2YgdGhpcyBmb3JtLiAgSWYgb21pdHRlZCwgdGhlIGZvcm0gaXMgKmlnbm9yZWQqXG4gKiBieSBFbnZveS5cbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFVzZSB0aGlzIGluc3RlYWQgb2YgQW5ndWxhckpTJ1xuICogICAgIFtgZm9ybWBdKGh0dHBzOi8vZG9jcy5hbmd1bGFyanMub3JnL2FwaS9uZy9kaXJlY3RpdmUvZm9ybSkgKG9yIGBuZ0Zvcm1gKVxuICogICAgIGRpcmVjdGl2ZXMuXG4gKlxuICogTWFpbiBkaWZmZXJlbmNlczpcbiAqXG4gKiAtIEl0IGVuYWJsZXMgdHJhY2tpbmcgb2YgbWVzc2FnZXMgb24gdGhlIGZvcm0uXG4gKiAtIFRoZSBjb250cm9sbGVyIGlzIHJlcGxhY2VkIHdpdGggYSB7QGxpbmtcbiAgKiAgICAgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lGb3JtQ29udHJvbGxlciBFbnZveUZvcm1Db250cm9sbGVyfS5cbiAqIC0gVGhlIGRpcmVjdGl2ZSBjcmVhdGVzIGEgbmV3IFNjb3BlLiAgU2VlIHRoZSB7QGxpbmtcbiAgKiAgICAgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlciMkYWxpYXMgJGFsaWFzIHByb3BlcnR5fSBmb3JcbiAqICAgICBmdXJ0aGVyIGluZm9ybWF0aW9uLlxuICovXG5mdW5jdGlvbiBlbnZveUZvcm1EaXJlY3RpdmUoZm9ybURpcmVjdGl2ZSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgIC8qKlxuICAgICAqIFNvIHRoaXMgaXMgYSBsaXR0bGUgaGFjay4gIEknbSBwcmV0dHkgc3VyZSB0aGlzIGlzIG5vdCBkYW5nZXJvdXMsIGJ1dFxuICAgICAqIGl0IGNvdWxkIGJlLiAgVGhlIHJlYXNvbiBmb3IgdGhpcyBpcyB0aGF0IHlvdSBtYXkgaGF2ZSBhIGR5bmFtaWMgZm9ybVxuICAgICAqIG5hbWU7IHNvbWV0aGluZyBpbnRlcnBvbGF0ZWQuICBTYXksIFwibXlGb3JtLTI3ODk2MThcIi4gIEEgRm9ybUNvbnRyb2xsZXJcbiAgICAgKiB3aWxsIGFsd2F5cyBwbGFjZSBpdHNlbGYgb24gdGhlIHNjb3BlIGlmIGl0J3MgZ2l2ZW4gYSBuYW1lLiAgQnV0IGl0J3NcbiAgICAgKiBhbHNvIGhhbmR5IHRvIGJlIGFibGUgdG8gcmVmZXJlbmNlIFwibXlGb3JtXCIuICBJZiBmb3JtIFwibXlGb3JtLTg3MzI5XCJcbiAgICAgKiBzaGFyZWQgdGhlIHNhbWUgc2NvcGUgd2l0aCBcIm15Rm9ybS0yNzg5NjE4XCIsIG9ubHkgb25lIFwibXlGb3JtXCIgY291bGRcbiAgICAgKiBleGlzdDsgdGh1cywgd2UganVzdCBtYWtlIGEgbmV3IHNjb3BlLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNjb3BlOiB0cnVlLFxuICAgIG5hbWU6ICdmb3JtJywgLy8gbWFzcXVlcmFkZSBhcyBhIHJlYWwgZm9ybSBkaXJlY3RpdmVcbiAgICBjb21waWxlOiBfLmZpcnN0KGZvcm1EaXJlY3RpdmUpLmNvbXBpbGUsXG4gICAgY29udHJvbGxlcjogcmVxdWlyZSgnLi9mb3JtY29udHJvbGxlcicpXG4gIH07XG59XG5lbnZveUZvcm1EaXJlY3RpdmUuJGluamVjdCA9IFsnZm9ybURpcmVjdGl2ZSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95Rm9ybURpcmVjdGl2ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxudmFyIElEX1BSRUZJWCA9ICdlbnZveS12aWV3ZGF0YS0nO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczplbnZveUZvcm06dmlld2RhdGEnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENyZWF0ZXMgYSB2aWV3IGRhdGEgb2JqZWN0LlxuICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRMZXZlbCBUaGUgbGV2ZWwgYXQgd2hpY2ggb2JqZWN0IHNob3VsZCBzdGFydCBhdC5cbiAqIEByZXR1cm5zIHt7cmVzZXQ6IEZ1bmN0aW9uLCBpZDogKn19XG4gKi9cbmZ1bmN0aW9uIHZpZXdEYXRhKGRlZmF1bHRMZXZlbCkge1xuICB2YXIgZGF0YSA9IHtcbiAgICAvKipcbiAgICAgKiBSZXNldHMgdGhpcyBvYmplY3QuXG4gICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgLyoqXG4gICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGlzIHNob3VsZCBkaXNwbGF5XG4gICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAqL1xuICAgICAgdGhpcy5lcnJvciA9IGZhbHNlO1xuXG4gICAgICAvKipcbiAgICAgICAqIEZvcm0gTWVzc2FnZXNcbiAgICAgICAqIEB0eXBlIHt7fX1cbiAgICAgICAqL1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IHt9O1xuXG4gICAgICAvKipcbiAgICAgICAqIERlc2NyaXB0aW9uXG4gICAgICAgKiBAdHlwZSB7P3N0cmluZ31cbiAgICAgICAqL1xuICAgICAgdGhpcy50aXRsZSA9IG51bGw7XG5cbiAgICAgIC8qKlxuICAgICAgICogQ2xhc3MgbmFtZSAoQ1NTKSB0byBhcHBseVxuICAgICAgICogQHR5cGUgez9zdHJpbmd9XG4gICAgICAgKi9cbiAgICAgIHRoaXMuY2xhc3NOYW1lID0gbnVsbDtcblxuICAgICAgLyoqXG4gICAgICAgKiBBbiBlcnJvcmxldmVsXG4gICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICovXG4gICAgICB0aGlzLmVycm9yTGV2ZWwgPSBkZWZhdWx0TGV2ZWw7XG4gICAgfSxcbiAgICBpZDogXy51bmlxdWVJZChJRF9QUkVGSVgpXG4gIH07XG4gIGRhdGEucmVzZXQoKTtcbiAgZGVidWcoJ0NyZWF0ZWQgdmlld2RhdGEgb2JqZWN0IHdpdGggaWQgXCIlc1wiJywgZGF0YS5pZCk7XG4gIHJldHVybiBkYXRhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXdEYXRhO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAnZW52b3lBY3Rpb24nOiByZXF1aXJlKCcuL2FjdGlvbicpLFxuICAnZW52b3lGb3JtJzogcmVxdWlyZSgnLi9mb3JtJyksXG4gICdlbnZveUxpc3QnOiByZXF1aXJlKCcuL2xpc3QnKSxcbiAgJ2Vudm95UHJveHknOiByZXF1aXJlKCcuL3Byb3h5Jylcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcHRzID0gcmVxdWlyZSgnLi4vZW52b3kvb3B0cycpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveUxpc3RcbiAqIEBkZXNjcmlwdGlvblxuICogRGVmaW5lcyBhIGRpcmVjdGl2ZSB3aGljaCB3aWxsIGRpc3BsYXkgYSBsaXN0IG9mIGFsbCBtZXNzYWdlc1xuICogZm9yIGEgZm9ybS5cbiAqXG4gKiBUaGUgdGVtcGxhdGUgZm9yIHRoZSBsaXN0IGlzIHRoZSBwcm9wZXJ0eSBgdGVtcGxhdGVVcmxgIG9mXG4gKiAkZW52b3lQcm92aWRlci5cbiAqXG4gKiBUaGUgdGFyZ2V0IGZvcm0gY2FuIGJlIHNwZWNpZmllZCwgYnkgbmFtZSAod2l0aCBpbnRlcnBvbGF0aW9uIGF2YWlsYWJsZSksXG4gKiBpbiB0aGUgYGVudm95TGlzdGAgYXR0cmlidXRlIG9yIHRoZSBgZm9yYCBhdHRyaWJ1dGUuICBUaGlzIGF0dHJpYnV0ZSBtYXlcbiAqIGJlIG9taXR0ZWQgaWYgdGhlIGBlbnZveUxpc3RgIGRpcmVjdGl2ZSBoYXMgYW4gYGVudm95TWVzc2FnZXNgIGFuY2VzdG9yLlxuICogQGV4YW1wbGVcbiAqIGBgYGh0bWxcbiAqIDxkaXYgZW52b3ktbGlzdD1cImNvbmZpZ0Zvcm1cIj48L2Rpdj5cbiAqIDwhLS0gb3IgLS0+XG4gKiA8ZW52b3ktbGlzdCBmb3I9XCJjb25maWdGb3JtXCI+PC9lbnZveS1saXN0PlxuICogYGBgXG4gKi9cbmZ1bmN0aW9uIGxpc3QoJGVudm95LCAkaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICByZXF1aXJlOiAnP15mb3JtJyxcbiAgICB0ZW1wbGF0ZVVybDogb3B0cy50ZW1wbGF0ZVVybCxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBmb3JtKSB7XG4gICAgICB2YXIgcGFyZW50TmFtZSA9IGF0dHJzLmVudm95TGlzdCB8fCBhdHRycy5mb3I7XG4gICAgICB2YXIgcGFyZW50O1xuXG4gICAgICBpZiAocGFyZW50TmFtZSkge1xuICAgICAgICBwYXJlbnQgPSAkZW52b3kuZmluZENvbnRyb2xsZXIoJGludGVycG9sYXRlKHBhcmVudE5hbWUpKHNjb3BlKSk7XG4gICAgICB9IGVsc2UgaWYgKGZvcm0pIHtcbiAgICAgICAgcGFyZW50ID0gZm9ybTtcbiAgICAgIH1cblxuICAgICAgaWYgKCEocGFyZW50ICYmIHBhcmVudC4kJGVudm95Rm9ybSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdlbnZveUxpc3QgcmVxdWlyZXMgYW4gYW5jZXN0b3IgZW52b3lGb3JtICcgK1xuICAgICAgICAgICdkaXJlY3RpdmUgb3IgYSBmb3JtIG5hbWUnKTtcbiAgICAgIH1cblxuICAgICAgcGFyZW50LiRiaW5kVmlldyhzY29wZSk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHBhcmVudC4kdW5iaW5kVmlldygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIGlmIChvcHRzLnRlbXBsYXRlKSB7XG4gICAgZGlyZWN0aXZlLnRlbXBsYXRlID0gb3B0cy50ZW1wbGF0ZTtcbiAgICBkZWxldGUgZGlyZWN0aXZlLnRlbXBsYXRlVXJsO1xuICB9XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcbn1cbmxpc3QuJGluamVjdCA9IFsnJGVudm95JywgJyRpbnRlcnBvbGF0ZSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlOmVudm95UHJveHlcbiAqIEByZXN0cmljdCBBXG4gKiBAZGVzY3JpcHRpb25cbiAqIERlZmluZXMgYSBkaXJlY3RpdmUgd2hpY2gsIHdoZW4gdXNlZCB3aXRoIG5nTW9kZWwsIHdpbGwgc2V0IHRoZSB2YWxpZGl0eVxuICogb2YgdGhlIGFzc29jaWF0ZWQgTmdNb2RlbENvbnRyb2xsZXIsIGJhc2VkIG9uIHRoZSB2YWxpZGl0eSBvZiB0aGUgdGFyZ2V0XG4gKiBmb3JtLlxuICovXG5mdW5jdGlvbiBwcm94eSgpIHtcblxuICAvKipcbiAgICogQW55dGhpbmcgdGhhdCBuZWVkcyB2YWxpZGF0aW5nIG5lZWRzIGEgdG9rZW4sIHNvLCBoZXJlJ3Mgb25lLlxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgdmFyIFRPS0VOID0gJ3Byb3h5JztcblxuICAvKipcbiAgICogVGhlIGNsYXNzIHRvIGJlIGFwcGxpZWQgaWYgdGhlIGRpcmVjdGl2ZSdzIHZhbHVlIGlzIHByZXNlbnRcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHZhciBDTEFTU05BTUUgPSAnZXJyb3JsZXZlbCc7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICBjb250cm9sbGVyOiBbXG4gICAgICAnJHNjb3BlJyxcbiAgICAgICckZWxlbWVudCcsXG4gICAgICAnJGF0dHJzJyxcbiAgICAgICckZW52b3knLFxuICAgICAgJyRpbnRlcnBvbGF0ZScsXG4gICAgICAnJGFuaW1hdGUnLFxuICAgICAgZnVuY3Rpb24gUHJveHlDb250cm9sbGVyKCRzY29wZSxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgICRhdHRycyxcbiAgICAgICAgJGVudm95LFxuICAgICAgICAkaW50ZXJwb2xhdGUsXG4gICAgICAgICRhbmltYXRlKSB7XG5cbiAgICAgICAgdmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczpwcm94eTpjb250cm9sbGVyJyk7XG4gICAgICAgIHZhciB0YXJnZXQgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLmVudm95UHJveHkgfHwgJycpKCRzY29wZSk7XG4gICAgICAgIHZhciBuZ01vZGVsID0gJGVsZW1lbnQuY29udHJvbGxlcignbmdNb2RlbCcpO1xuXG4gICAgICAgICRhbmltYXRlID0gJGFuaW1hdGUgfHwgJGVsZW1lbnQ7XG5cbiAgICAgICAgdGhpcy4kdXBkYXRlID0gZnVuY3Rpb24gJHVwZGF0ZShkYXRhKSB7XG4gICAgICAgICAgdmFyIGlzVmFsaWQgPSAhZGF0YS5lcnJvckxldmVsO1xuICAgICAgICAgIHZhciBlcnJvckxldmVsTmFtZSA9ICRlbnZveS5sZXZlbChkYXRhLmVycm9yTGV2ZWwpO1xuICAgICAgICAgIGRlYnVnKCdQcm94eSBcIiVzXCIgdXBkYXRlZCB3LyBlcnJvckxldmVsICVzJywgdGFyZ2V0LCBlcnJvckxldmVsTmFtZSk7XG4gICAgICAgICAgXy5lYWNoKCRlbnZveS5FUlJPUkxFVkVMUywgZnVuY3Rpb24gKGVycm9ybGV2ZWwsIGVycm9yTGV2ZWxOYW1lKSB7XG4gICAgICAgICAgICAkYW5pbWF0ZS5yZW1vdmVDbGFzcygkZWxlbWVudCwgZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIG5nTW9kZWwuJHNldFZhbGlkaXR5KFRPS0VOLCBpc1ZhbGlkKTtcbiAgICAgICAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgICAgICRhbmltYXRlLmFkZENsYXNzKCRlbGVtZW50LCBlcnJvckxldmVsTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy4kbmFtZSArICctcHJveHknO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuJG5hbWUgPSB0YXJnZXQ7XG5cbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKENMQVNTTkFNRSk7XG4gICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAkZW52b3kuYmluZEZvcm0odGhpcywgdGFyZ2V0LCAnUHJveHlDb250cm9sbGVyJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZW52b3lQcm94eSBkaXJlY3RpdmUgbmVlZHMgYSB2YWx1ZSEnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF1cbiAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gcHJveHk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG52YXIgb3B0cyA9IHJlcXVpcmUoJy4vb3B0cycpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTokZW52b3k6ZmFjdG9yeScpO1xuXG52YXIgREVCT1VOQ0VfTVMgPSAyNTA7XG5cbmZ1bmN0aW9uIGVudm95RmFjdG9yeSgkaHR0cCwgJHEpIHtcblxuICAvKipcbiAgICogRXJyb3IgbGV2ZWxzIGFzIGNvbmZpZ3VyZWQgaW4gb3B0cyBpbiBvcmRlciwgYnkgbmFtZVxuICAgKiBAdHlwZSB7QXJyYXkuPHN0cmluZz59XG4gICAqL1xuICB2YXIgTEVWRUxfQVJSQVkgPSBfLnBsdWNrKG9wdHMubGV2ZWxzLCAnbmFtZScpO1xuXG4gIC8qKlxuICAgKiBNYXBwaW5nIG9mIGVycm9yIGxldmVsIG5hbWVzIHRvIGluZGljZXMgaW4ge0BsaW5rIExFVkVMX0FSUkFZfVxuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cbiAgICovXG4gIHZhciBMRVZFTFMgPSBfKExFVkVMX0FSUkFZKVxuICAgIC5pbnZlcnQoKVxuICAgIC5tYXBWYWx1ZXMoXy5wYXJzZUludClcbiAgICAudmFsdWUoKTtcblxuICAvKipcbiAgICogTG9va3VwIG9mIGZvcm1zIGFuZCBjb250cm9scyB0byBhbnkgYWN0aW9ucyBib3VuZCB2aWEgdGhlXG4gICAqIG1lc3NhZ2VBY3Rpb24gZGlyZWN0aXZlLiAgQW4gYWN0aW9uIGlzIHNpbXBseSBhbiBBbmd1bGFySlNcbiAgICogZXhwcmVzc2lvbiB3aGljaCB3aWxsIGJlIGV2YWx1YXRlZC5cbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLE9iamVjdC48c3RyaW5nLHN0cmluZz4+fVxuICAgKi9cbiAgdmFyIGFjdGlvbnMgPSB7fTtcblxuICAvKipcbiAgICogTWFwIG9mIGZvcm0gbmFtZSB0byBFbnZveU1lc3NhZ2VzQ29udHJvbGxlciBiaW5kaW5nc1xuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsRW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgKi9cbiAgdmFyIGJpbmRpbmdzID0ge307XG5cbiAgdmFyIHByb3RvdHlwZTtcblxuICAvKipcbiAgICogQG5nZG9jIHNlcnZpY2VcbiAgICogQG5hbWUgZnYuZW52b3kuJGVudm95XG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZXRyaWV2ZXMgYSBjb2xsZWN0aW9uIG9mIG1lc3NhZ2VzIGZvciBhIGZvcm0gYW5kL29yIGNvbnRyb2xcbiAgICogd2l0aGluIHRoYXQgZm9ybS4gIElmIG5vIHBhcmFtZXRlcnMsIHJldHVybnMgdGhlIGVudGlyZXR5IG9mIHRoZVxuICAgKiBkYXRhIGZpbGUuXG4gICAqIEBwYXJhbSB7Rm9ybUNvbnRyb2xsZXJ9IGZvcm0gRm9ybSBjb250cm9sbGVyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IE1lc3NhZ2VzIGluZGV4ZWQgYnkgZm9ybSBuYW1lLCB0aGVuIGNvbnRyb2wgbmFtZSxcbiAgICogYW5kIGZpbmFsbHkgdmFsaWRhdGlvbiB0b2tlbi4gIE1heSBiZSBlbXB0eSBpZiBub3RoaW5nIGlzIHdyb25nXG4gICAqIHdpdGggdGhlIGZvcm0uXG4gICAqL1xuICBmdW5jdGlvbiAkZW52b3koZm9ybSkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKCFmb3JtKSB7XG4gICAgICByZXR1cm4gJHEucmVqZWN0KG5ldyBFcnJvcignTXVzdCBwYXNzIFwiZm9ybVwiIHBhcmFtZXRlcicpKTtcbiAgICB9XG4gICAgaWYgKChyZXN1bHQgPSAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdKSkge1xuICAgICAgcmV0dXJuICRxLndoZW4ocmVzdWx0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICBpZiAob3B0cy5tZXNzYWdlc0NvbmZpZykge1xuICAgICAgICByZXR1cm4gJHEud2hlbihvcHRzLm1lc3NhZ2VzQ29uZmlnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAkaHR0cC5nZXQob3B0cy5tZXNzYWdlc0NvbmZpZ1VybCwge1xuICAgICAgICBjYWNoZTogdHJ1ZVxuICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgIHJldHVybiByZXMuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfShvcHRzKSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChtZXNzYWdlcykge1xuXG4gICAgICAgIC8vIElmIHRoZSBmb3JtIGhhcyBhbiBhbGlhcyAodXNlIHRoZSBcImFsaWFzXCIgZGlyZWN0aXZlKSxcbiAgICAgICAgLy8gdGhpcyBuYW1lIHRha2VzIHByZWNlZGVuY2UuXG4gICAgICAgIG1lc3NhZ2VzID0gXyhtZXNzYWdlc1tmb3JtLiRhbGlhcyB8fCBmb3JtLiRuYW1lXSlcbiAgICAgICAgICAvLyBoZXJlIHdlIHBpY2sgb25seSB0aGUgY29udHJvbHMgdGhhdCBhcmUgaW52YWxpZC5cbiAgICAgICAgICAubWFwVmFsdWVzKGZ1bmN0aW9uIChjb250cm9sTXNnT3B0aW9ucywgY29udHJvbE1zZ05hbWUpIHtcbiAgICAgICAgICAgIHZhciBmb3JtQ29udHJvbCA9IGZvcm1bY29udHJvbE1zZ05hbWVdO1xuICAgICAgICAgICAgdmFyICRlcnJvcjtcbiAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgdHJ1dGh5LCB0aGVuIHdlIGhhdmUgZXJyb3JzIGluIHRoZSBnaXZlblxuICAgICAgICAgICAgLy8gY29udHJvbFxuICAgICAgICAgICAgaWYgKGZvcm1Db250cm9sICYmIF8uc2l6ZSgkZXJyb3IgPSBmb3JtQ29udHJvbC4kZXJyb3IpKSB7XG4gICAgICAgICAgICAgIC8vIGdldCB0aGUgcHJvYmxlbSB0b2tlbnMgYW5kIGdyYWIgYW55IGFjdGlvbnNcbiAgICAgICAgICAgICAgLy8gaWYgcHJlc2VudC4gIGFjdGlvbnMgYXJlIGFzc2lnbmVkIGF0IHRoZSB0b2tlblxuICAgICAgICAgICAgICAvLyBsZXZlbCwgYnV0IHdlIGRvbid0IGhhdmUgZ3JhbnVsYXIgY29udHJvbCBvdmVyXG4gICAgICAgICAgICAgIC8vIHdoaWNoIHZhbGlkYXRpb24gdG9rZW4gdHJpZ2dlcnMgd2hpY2ggYWN0aW9uLlxuICAgICAgICAgICAgICAvLyBzbywgaWYgdGhlcmUgd2VyZSB0d28gcHJvYmxlbXMgd2l0aCBvbmUgY29udHJvbCxcbiAgICAgICAgICAgICAgLy8gYm90aCB0b2tlbnMgd291bGQgcmVjZWl2ZSB0aGUgYWN0aW9uIHByb3AuXG4gICAgICAgICAgICAgIC8vIFRPRE86IGRldGVybWluZSBpZiB3ZSB3YW50L25lZWQgdG8gaGF2ZSBhY3Rpb25zIHBlclxuICAgICAgICAgICAgICAvLyB2YWxpZGF0aW9uIHRva2VuLlxuICAgICAgICAgICAgICByZXR1cm4gXyhjb250cm9sTXNnT3B0aW9ucylcbiAgICAgICAgICAgICAgICAucGljayhfLmtleXMoJGVycm9yKSlcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAodG9rZW5JbmZvKSB7XG4gICAgICAgICAgICAgICAgICB0b2tlbkluZm8uYWN0aW9uID1cbiAgICAgICAgICAgICAgICAgICAgJGVudm95LmdldEFjdGlvbihmb3JtLiRuYW1lLCBjb250cm9sTXNnTmFtZSk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAudmFsdWUoKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnZhbHVlKCk7XG5cbiAgICAgICAgJGVudm95Ll9jYWNoZVtmb3JtLiRuYW1lXSA9IG1lc3NhZ2VzO1xuXG4gICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE1peGlucyBmb3IgdGhpcyBmYWN0b3J5XG4gICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywoRnVuY3Rpb258Kik+fVxuICAgKi9cbiAgcHJvdG90eXBlID0ge1xuXG4gICAgLyoqXG4gICAgICogQ2FjaGUgb2YgbWVzc2FnZXMsIGtleWVkIG9uIGZvcm0gbmFtZVxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxPYmplY3Q+fVxuICAgICAqL1xuICAgIF9jYWNoZToge30sXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3kjbGV2ZWxcbiAgICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuJGVudm95XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVXRpbGl0eSBmdW5jdGlvbiB0byBjb252ZXJ0IGFuIGVycm9yIGxldmVsIGludG8gYSBudW1iZXIgb3JcbiAgICAgKiBzdHJpbmcgb3IgdmljZSB2ZXJzYVxuICAgICAqIEBwYXJhbSB7KG51bWJlcnxzdHJpbmcpPX0gZXJyb3JMZXZlbCBFcnJvciBsZXZlbC4gIElmIG9taXR0ZWQsIHdpbGxcbiAgICAgKiByZXR1cm4gdGhlIGRlZmF1bHQgZXJyb3IgbGV2ZWwgYXMgYSBzdHJpbmcuXG4gICAgICogQHJldHVybnMgeyhudW1iZXJ8c3RyaW5nKX0gQ29ycmVzcG9uZGluZyBzdHJpbmcvbnVtYmVyXG4gICAgICovXG4gICAgbGV2ZWw6IGZ1bmN0aW9uIGxldmVsKGVycm9yTGV2ZWwpIHtcbiAgICAgIHJldHVybiBfLmlzU3RyaW5nKGVycm9yTGV2ZWwpID9cbiAgICAgIExFVkVMU1tlcnJvckxldmVsXSB8fCBMRVZFTFNbb3B0cy5kZWZhdWx0TGV2ZWxdIDpcbiAgICAgIExFVkVMX0FSUkFZW2Vycm9yTGV2ZWxdIHx8IG9wdHMuZGVmYXVsdExldmVsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIGZvcm0gYW5kIG1lc3NhZ2VzIGZvciBpdCwgYXMgcmV0dXJuZWQgYnkgJGVudm95KCksXG4gICAgICogY2FsY3VsYXRlIHRoZSBtYXggZXJyb3IgbGV2ZWwuXG4gICAgICogQHBhcmFtIGZvcm1cbiAgICAgKiBAcGFyYW0gZm9ybU1lc3NhZ2VzXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9mb3JtRXJyb3JMZXZlbDogZnVuY3Rpb24gX2Zvcm1FcnJvckxldmVsKGZvcm0sIGZvcm1NZXNzYWdlcykge1xuICAgICAgLyoqXG4gICAgICAgKiBJbmRleCBvZiB0aGUgZGVmYXVsdCBlcnJvciBsZXZlbFxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqL1xuICAgICAgdmFyIGRlZmF1bHRMZXZlbE51bSA9ICRlbnZveS5ERUZBVUxUX0VSUk9STEVWRUw7XG5cbiAgICAgIC8qKlxuICAgICAgICogTWF4aW11bSBlcnJvciBsZXZlbCBvZiBhbGwgdmFsaWRhdGlvbiB0b2tlbnMgd2l0aGluIGFsbFxuICAgICAgICogY29udHJvbHMgb2YgdGhpcyBmb3JtXG4gICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICovXG4gICAgICB2YXIgbWF4TGV2ZWwgPSBfLnJlZHVjZShmb3JtTWVzc2FnZXMsXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQsIGNvbnRyb2xNc2dPcHRzKSB7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBNYXhpbXVtIGVycm9yIGxldmVsIG9mIGFueSB2YWxpZGF0aW9uIHRva2VuIHdpdGhpblxuICAgICAgICAgICAqIHRoZSBjb250cm9sIHdoaWNoIGlzIGluIFwiaW52YWxpZFwiIHN0YXRlLlxuICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIG1heENvbnRyb2xMZXZlbCA9IF8oY29udHJvbE1zZ09wdHMpXG4gICAgICAgICAgICAucGljayhmdW5jdGlvbiAodG9rZW5PcHRzLCB0b2tlbk5hbWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZvcm0uJGVycm9yW3Rva2VuTmFtZV07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnBsdWNrKCdsZXZlbCcpXG4gICAgICAgICAgICAubWFwKCRlbnZveS5sZXZlbClcbiAgICAgICAgICAgIC5tYXgoKTtcblxuICAgICAgICAgIHJldHVybiBNYXRoLm1heChyZXN1bHQsIG1heENvbnRyb2xMZXZlbCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRMZXZlbE51bSk7XG5cbiAgICAgIHZhciBlcnJvckxldmVsTmFtZSA9ICRlbnZveS5sZXZlbChtYXhMZXZlbCk7XG4gICAgICBkZWJ1ZygnQ29tcHV0ZWQgZXJyb3JMZXZlbCBcIiVzXCIgZm9yIGZvcm0gXCIlc1wiJyxcbiAgICAgICAgZXJyb3JMZXZlbE5hbWUsXG4gICAgICAgIGZvcm0uJG5hbWUpO1xuICAgICAgcmV0dXJuIG1heExldmVsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBwbGFjZWhvbGRlciBmb3IgcHJvbWlzZSB3aGlsZSB3ZSdyZSBydW5uaW5nIHJlZnJlc2goKVxuICAgICAqL1xuICAgIF9yZWZyZXNoaW5nOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I2JpbmRGb3JtXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIEJpbmQgYSBjb250cm9sbGVyIHRvIGEgZm9ybS4gIENvdWxkIGJlIGFueSBvYmplY3QgYXMgbG9uZyBhcyBpdCBoYXMgYW5cbiAgICAgKiBgdXBkYXRlKClgIG1ldGhvZC4gIFdoZW4gdGhlIGZvcm0ncyB2YWxpZGl0eSBjaGFuZ2VzLCB0aGUgdXBkYXRlKClcbiAgICAgKiBtZXRob2Qgd2lsbCBiZSBjYWxsZWQsIGlmIHRoZSBmb3JtIGhhcyBtZXNzYWdlcyBjb25maWd1cmVkLlxuICAgICAqIEBwYXJhbSB7Kn0gY3RybCBQcmVzdW1lZCB0byBiZSBhIGBlbnZveUZvcm1gIGNvbnRyb2xsZXIgaW5zdGFuY2UsIGJ1dFxuICAgICAqIGNvdWxkIGJlIGBlbnZveVByb3h5YCBjb250cm9sbGVyIGluc3RhbmNlIGFzIHdlbGwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBncm91cCBHcm91cCBvciB0eXBlIG9mIGNvbnRyb2xsZXJcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgZnVuY3Rpb24gdGhhdCB3aWxsIGJyZWFrIHRoZSBiaW5kaW5nXG4gICAgICovXG4gICAgYmluZEZvcm06IGZ1bmN0aW9uIGJpbmRGb3JtKGN0cmwsIGZvcm1OYW1lLCB0eXBlKSB7XG5cbiAgICAgIHZhciBmb3JtQmluZGluZ3MgPSBiaW5kaW5nc1tmb3JtTmFtZV0gPSBiaW5kaW5nc1tmb3JtTmFtZV0gfHwge307XG5cbiAgICAgIGlmIChmb3JtQmluZGluZ3NbdHlwZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb250cm9sbGVyIGFscmVhZHkgYm91bmQgdG8gZm9ybSBcIiVzXCIgd2l0aCB0eXBlIFwiJXNcIicsXG4gICAgICAgICAgZm9ybU5hbWUsXG4gICAgICAgICAgdHlwZSk7XG4gICAgICB9XG4gICAgICBmb3JtQmluZGluZ3NbdHlwZV0gPSBjdHJsO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24gdW5iaW5kRm9ybSgpIHtcbiAgICAgICAgZGVsZXRlIGZvcm1CaW5kaW5nc1t0eXBlXTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvciBhIEVudm95TWVzc2FnZXNDb250cm9sbGVyLCBmaW5kIHBhcmVudHMgKHJlY3Vyc2l2ZWx5KS5cbiAgICAgKiBAcGFyYW0ge0Vudm95TWVzc2FnZXNDb250cm9sbGVyfSBjdHJsIGVudm95TWVzc2FnZSBDb250cm9sbGVyXG4gICAgICogQHBhcmFtIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBbbGlzdD1bXV0gQXJyYXkgb2YgcGFyZW50c1xuICAgICAqIEByZXR1cm5zIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBBcnJheSBvZiBwYXJlbnRzXG4gICAgICovXG4gICAgX2ZpbmRQYXJlbnRzOiBmdW5jdGlvbiBmaW5kUGFyZW50cyhjdHJsLCBsaXN0KSB7XG4gICAgICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgICAgIGlmIChjdHJsLiRwYXJlbnQpIHtcbiAgICAgICAgbGlzdC5wdXNoKGN0cmwuJHBhcmVudCk7XG4gICAgICAgIHJldHVybiBmaW5kUGFyZW50cyhjdHJsLiRwYXJlbnQsIGxpc3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvciBhIEVudm95TWVzc2FnZXNDb250cm9sbGVyLCBmaW5kIGFsbCBjaGlsZHJlbiAocmVjdXJzaXZlbHkpLlxuICAgICAqIEBwYXJhbSB7RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ9IGN0cmwgZW52b3lNZXNzYWdlIENvbnRyb2xsZXJcbiAgICAgKiBAcGFyYW0ge0FycmF5LjxFbnZveU1lc3NhZ2VzQ29udHJvbGxlcj59IFtsaXN0PVtdXSBBcnJheSBvZiBjaGlsZHJlblxuICAgICAqIEByZXR1cm5zIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBBcnJheSBvZiBjaGlsZHJlblxuICAgICAqL1xuICAgIF9maW5kQ2hpbGRyZW46IGZ1bmN0aW9uIGZpbmRDaGlsZHJlbihjdHJsLCBsaXN0KSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBjdHJsLiRjaGlsZHJlbjtcbiAgICAgIGxpc3QgPSBsaXN0IHx8IFtdO1xuICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBsaXN0LnB1c2guYXBwbHkobGlzdCwgY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gXyhjaGlsZHJlbilcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbmRDaGlsZHJlbihjaGlsZCwgbGlzdCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgLnVuaXF1ZSgpXG4gICAgICAgICAgLnZhbHVlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGlzdDtcbiAgICB9LFxuXG4gICAgX3JlZnJlc2g6IF8uZGVib3VuY2UoZnVuY3Rpb24gX3JlZnJlc2goZm9ybSwgY29udHJvbCkge1xuXG4gICAgICAvKipcbiAgICAgICAqIEFsbCBjb250cm9sbGVycyB0aGF0IGNhcmUgYWJvdXQgdGhpcyBmb3JtLCBiZSBpdCBlbnZveU1lc3NhZ2VcbiAgICAgICAqIGNvbnRyb2xsZXJzLCBvciBlbnZveVByb3h5IGNvbnRyb2xsZXJzLlxuICAgICAgICogQHR5cGUge0FycmF5LjwoRW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ8UHJveHlDb250cm9sbGVyKT59XG4gICAgICAgKi9cbiAgICAgIHZhciBib3VuZENvbnRyb2xsZXJzID0gXy50b0FycmF5KGJpbmRpbmdzW2Zvcm0uJG5hbWVdKTtcblxuICAgICAgLyoqXG4gICAgICAgKiBUaG9zZSBvZiB0aGUgYm91bmQgY29udHJvbHMgd2hpY2ggYXJlIGVudm95TWVzc2FnZSBjb250cm9sbGVycy5cbiAgICAgICAqIFRoZXNlIGhhdmUgYWN0dWFsIGZvcm0gb2JqZWN0cyB3aXRoaW4gdGhlbSwgc28gd2UnbGwgdXNlIHRoZW1cbiAgICAgICAqIHRvIGRldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgZXJyb3JsZXZlbChzKS5cbiAgICAgICAqIEB0eXBlIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgICAgICovXG4gICAgICB2YXIgRW52b3lNZXNzYWdlc0NvbnRyb2xsZXJzO1xuXG4gICAgICAvKipcbiAgICAgICAqIEFsbCBwYXJlbnQgY29udHJvbGxlcnMgb2YgdGhlIEVudm95TWVzc2FnZXNDb250cm9sbGVycy5cbiAgICAgICAqIEB0eXBlIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgICAgICovXG4gICAgICB2YXIgcGFyZW50Q29udHJvbGxlcnM7XG5cbiAgICAgIGlmICghYm91bmRDb250cm9sbGVycy5sZW5ndGgpIHtcbiAgICAgICAgLy8gbm9ib2R5IGNhcmVzLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIEVudm95TWVzc2FnZXNDb250cm9sbGVycyA9IF8uZmlsdGVyKGJvdW5kQ29udHJvbGxlcnMsIGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgIHJldHVybiBjdHJsLiRmb3JtO1xuICAgICAgfSk7XG5cbiAgICAgIHBhcmVudENvbnRyb2xsZXJzID0gXyhFbnZveU1lc3NhZ2VzQ29udHJvbGxlcnMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgcmV0dXJuICRlbnZveS5fZmluZFBhcmVudHMoY2hpbGQpO1xuICAgICAgICB9KVxuICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgIC51bmlxdWUoKVxuICAgICAgICAudmFsdWUoKTtcblxuICAgICAgJGVudm95Ll9yZWZyZXNoaW5nID0gJGVudm95KGZvcm0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMpIHtcbiAgICAgICAgICB2YXIgbGFzdEVycm9yTGV2ZWwgPSAkZW52b3kuX2Zvcm1FcnJvckxldmVsKGZvcm0sXG4gICAgICAgICAgICBmb3JtTWVzc2FnZXMpO1xuICAgICAgICAgIHZhciBtZXNzYWdlcyA9IF8ub2JqZWN0KFtmb3JtLiRuYW1lXSwgW2Zvcm1NZXNzYWdlc10pO1xuICAgICAgICAgIHZhciBpbmNyZWFzaW5nO1xuXG4gICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKGN0cmwpIHtcbiAgICAgICAgICAgIGN0cmwuJHVwZGF0ZSh7XG4gICAgICAgICAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlcyxcbiAgICAgICAgICAgICAgZXJyb3JMZXZlbDogbGFzdEVycm9yTGV2ZWxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChmb3JtLiRlcnJvckxldmVsIDwgbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgIGluY3JlYXNpbmcgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZm9ybS4kZXJyb3JMZXZlbCA+IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICBpbmNyZWFzaW5nID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzW2NvbnRyb2wuJG5hbWVdLCBmdW5jdGlvbiAodG9rZW5JbmZvKSB7XG4gICAgICAgICAgICB0b2tlbkluZm8uYWN0aW9uID0gJGVudm95LmdldEFjdGlvbihmb3JtLiRuYW1lLCBjb250cm9sLiRuYW1lKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChpbmNyZWFzaW5nID09PSBmYWxzZSkge1xuICAgICAgICAgICAgbGFzdEVycm9yTGV2ZWwgPSBNYXRoLm1heChsYXN0RXJyb3JMZXZlbCxcbiAgICAgICAgICAgICAgXyhFbnZveU1lc3NhZ2VzQ29udHJvbGxlcnMpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuICRlbnZveS5fZmluZENoaWxkcmVuKGN0cmwpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmZsYXR0ZW4oKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkQ29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uaXNOdW1iZXIoY2hpbGRDb250cm9sbGVyLiRlcnJvckxldmVsKSA/XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkQ29udHJvbGxlci4kZXJyb3JMZXZlbCA6XG4gICAgICAgICAgICAgICAgICAgICRlbnZveS5ERUZBVUxUX0VSUk9STEVWRUw7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAubWF4KCkpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF8uZWFjaChib3VuZENvbnRyb2xsZXJzLCB1cGRhdGUpO1xuXG4gICAgICAgICAgXy5lYWNoKHBhcmVudENvbnRyb2xsZXJzLCBmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgICAgaWYgKGluY3JlYXNpbmcpIHtcbiAgICAgICAgICAgICAgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPCBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdHJsLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBsYXN0RXJyb3JMZXZlbCA9IGN0cmwuJGVycm9yTGV2ZWw7XG4gICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoY3RybC4kZXJyb3JMZXZlbCA+IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPCBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gY3RybC4kZXJyb3JMZXZlbDtcbiAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBkZWJ1ZyhlcnIpO1xuICAgICAgICB9KTtcbiAgICB9LCBERUJPVU5DRV9NUyksXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3kjcmVmcmVzaFxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBDYWxsZWQgYXV0b21hdGljYWxseSBieSBmb3JtcywgYnV0IGNvdWxkIGNvbmNlaXZhYmx5IGJlIGNhbGxlZCBtYW51YWxseVxuICAgICAqIGlmIHlvdSB3aXNoIHRvIGV4dGVuZCBFbnZveSdzIGZ1bmN0aW9uYWxpdHkuICBQYXNzIGEgZm9ybSBhbmQgYSBjb250cm9sO1xuICAgICAqIGlmIHRoZSBjb250cm9sIGlzIGludmFsaWQsIG1lc3NhZ2VzIHdpbGwgYmUgcHVsbGVkIG91dCBvZiB0aGUgZGF0YSBmaWxlLFxuICAgICAqIGFuZCB0aGUgY29udHJvbGxlcnMgYm91bmQgdmlhIHtAbGluayBmdi5lbnZveS4kZW52b3kjYmluZEZvcm0gYmluZEZvcm19XG4gICAgICogd2lsbCBiZSB1cGRhdGVkLiAgSW4gdHVybiwgdGhpcyB3aWxsIHVwZGF0ZSB0aGUgdmlldywgYnV0IHlvdSBjb3VsZFxuICAgICAqIGhhdmUgYSBjdXN0b20gY29udHJvbGxlciBkbyBqdXN0IGFib3V0IGFueXRoaW5nIGluIGl0cyBgdXBkYXRlKClgXG4gICAgICogICBtZXRob2QuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIGFzeW5jaHJvbm91cywgYW5kIHRoZSB1bmRlcmx5aW5nIG1ldGhvZCBpcyBkZWJvdW5jZWQtLXlvdSBtYXlcbiAgICAgKiBsb3NlIGEgY2FsbCBpZiB5b3UncmUgdG9vIHF1aWNrLS1idXQgaWYgeW91IGNhbGwgaXQgdHdpY2Ugc3luY2hyb25vdXNseSxcbiAgICAgKiBpZiB0aGUgZmlyc3QgY2FsbCB0YWtlcyBsZXNzIHRoYW4gMjUwbXMsIHRoZSBzZWNvbmQgY2FsbCB3aWxsIG5vdFxuICAgICAqIGV4ZWN1dGUuXG4gICAgICpcbiAgICAgKiBUT0RPOiBtYWtlIHRoZSBkZWJvdW5jZSB0aW1lciBjb25maWd1cmFibGUuXG4gICAgICogQHBhcmFtIHtjcmVhdGVFbnZveUZvcm1Db250cm9sbGVyfSBmb3JtIFRoZSBmb3JtIHdob3NlIGNvbnRyb2wgY2hhbmdlZFxuICAgICAqIEBwYXJhbSB7KG5nTW9kZWwuTmdNb2RlbENvbnRyb2xsZXJ8Y3JlYXRlRW52b3lGb3JtQ29udHJvbGxlcil9IGNvbnRyb2wgVGhlXG4gICAgICogICBjb250cm9sIHdoaWNoIGNoYW5nZWQuXG4gICAgICogQHJldHVybnMge1Byb21pc2V9IFJldHVybnMgbm90aGluZ1xuICAgICAqL1xuICAgIHJlZnJlc2g6IGZ1bmN0aW9uIHJlZnJlc2goZm9ybSwgY29udHJvbCkge1xuXG4gICAgICBkZWxldGUgJGVudm95Ll9jYWNoZVtmb3JtLiRuYW1lXTtcblxuICAgICAgZGVidWcoJ0NvbnRyb2wgXCIlc1wiIGluIGZvcm0gXCIlc1wiIGNoYW5nZWQgdmFsaWRpdHknLFxuICAgICAgICBjb250cm9sLiRuYW1lLFxuICAgICAgICBmb3JtLiRuYW1lKTtcblxuICAgICAgaWYgKCRlbnZveS5fcmVmcmVzaGluZykge1xuICAgICAgICByZXR1cm4gJGVudm95Ll9yZWZyZXNoaW5nLnRoZW4oJGVudm95Ll9yZWZyZXNoLmJpbmQobnVsbCxcbiAgICAgICAgICBmb3JtLFxuICAgICAgICAgIGNvbnRyb2wpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICRxLndoZW4oJGVudm95Ll9yZWZyZXNoKGZvcm0sIGNvbnRyb2wpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I3NldEFjdGlvblxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBTZXQgYW4gYWN0aW9uIHRvIGJlIGV4ZWN1dGVkIGF0IHNvbWUgcG9pbnQuICBVc2VkIGJ5IHRoZVxuICAgICAqIGVudm95TGlzdCBkaXJlY3RpdmUncyB2aWV3LCBzbyB0aGF0IHlvdSBjYW4gY2xpY2sgb24gYW5cbiAgICAgKiBlcnJvciBhbmQgYmUgdGFrZW4gdG8gd2hlcmUgdGhlIGVycm9yIGlzLlxuICAgICAqIEB0b2RvIG1ha2UgY29udHJvbE5hbWUgb3B0aW9uYWw/XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sTmFtZSBOYW1lIG9mIGNvbnRyb2xcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIEFuZ3VsYXJKUyBleHByZXNzaW9uIHRvIGV2YWx1YXRlXG4gICAgICovXG4gICAgc2V0QWN0aW9uOiBmdW5jdGlvbiBzZXRBY3Rpb24oZm9ybU5hbWUsIGNvbnRyb2xOYW1lLCBhY3Rpb24pIHtcbiAgICAgIHZhciBmb3JtQWN0aW9ucyA9IGFjdGlvbnNbZm9ybU5hbWVdID0gYWN0aW9uc1tmb3JtTmFtZV0gfHwge307XG4gICAgICBmb3JtQWN0aW9uc1tjb250cm9sTmFtZV0gPSBhY3Rpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNnZXRBY3Rpb25cbiAgICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuJGVudm95XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogR2V0cyBhIHN0b3JlZCBhY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybSBmb3IgYWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRyb2xOYW1lIE5hbWUgb2YgY29udHJvbCBmb3IgYWN0aW9uXG4gICAgICogQHJldHVybnMgeyhzdHJpbmd8dW5kZWZpbmVkKX0gVGhlIGFjdGlvbiAoQW5ndWxhckpTXG4gICAgICogICAgIGV4cHJlc3Npb24pLCBpZiBpdCBleGlzdHMuXG4gICAgICovXG4gICAgZ2V0QWN0aW9uOiBmdW5jdGlvbiBnZXRBY3Rpb24oZm9ybU5hbWUsIGNvbnRyb2xOYW1lKSB7XG4gICAgICByZXR1cm4gXy5nZXQoYWN0aW9ucywgZm9ybU5hbWUgKyAnLicgKyBjb250cm9sTmFtZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNmaW5kQ29udHJvbGxlclxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIGdldCBhbiBlbnZveUZvcm0gZGlyZWN0aXZlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtTmFtZSBGaW5kIHRoZSBFbnZveUZvcm1Db250cm9sbGVyXG4gICAgICogICAgIGF0dGFjaGVkIHRvIGZvcm0gd2l0aCB0aGlzIG5hbWVcbiAgICAgKiBAdGhyb3dzIElmIG5vIGVudm95Rm9ybSB3aXRoIHRoYXQgbmFtZSBmb3VuZFxuICAgICAqIEByZXR1cm5zIHtFbnZveUZvcm1Db250cm9sbGVyfSBFbnZveUZvcm1Db250cm9sbGVyIGNvbnRyb2xsZXJcbiAgICAgKi9cbiAgICBmaW5kQ29udHJvbGxlcjogZnVuY3Rpb24gZmluZENvbnRyb2xsZXIoZm9ybU5hbWUpIHtcbiAgICAgIHZhciBmb3JtO1xuICAgICAgaWYgKGJpbmRpbmdzW2Zvcm1OYW1lXSAmJlxuICAgICAgICAoZm9ybSA9IGJpbmRpbmdzW2Zvcm1OYW1lXS5FbnZveUZvcm1Db250cm9sbGVyKSkge1xuICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZmluZCBlbnZveUZvcm0gd2l0aCBuYW1lICcgKyBmb3JtTmFtZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNsZXZlbERlc2NyaXB0aW9uXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFJldHVybnMgdGhlIGRlc2NyaXB0aW9uLyR0aXRsZSBmb3IgYW4gZXJyb3JsZXZlbC5cbiAgICAgKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyKX0gZXJyb3JMZXZlbCBlcnJvcmxldmVsXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGRlc2NyaXB0aW9uLyR0aXRsZSBvZiBnaXZlbiBlcnJvcmxldmVsXG4gICAgICovXG4gICAgbGV2ZWxEZXNjcmlwdGlvbjogZnVuY3Rpb24gbGV2ZWxEZXNjcmlwdGlvbihlcnJvckxldmVsKSB7XG4gICAgICBpZiAoXy5pc1N0cmluZyhlcnJvckxldmVsKSkge1xuICAgICAgICBlcnJvckxldmVsID0gJGVudm95LmxldmVsKGVycm9yTGV2ZWwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9wdHMubGV2ZWxzW2Vycm9yTGV2ZWxdLmRlc2NyaXB0aW9uO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3kjREVGQVVMVF9MRVZFTFxuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBkZWZhdWx0IGxldmVsIChhcyBhIHN0cmluZylcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIERFRkFVTFRfTEVWRUw6IG9wdHMuZGVmYXVsdExldmVsLFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I0RFRkFVTFRfRVJST1JMRVZFTFxuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBkZWZhdWx0IGVycm9ybGV2ZWwgKGFzIGEgbnVtYmVyKVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgREVGQVVMVF9FUlJPUkxFVkVMOiBMRVZFTFNbb3B0cy5kZWZhdWx0TGV2ZWxdLFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I0VSUk9STEVWRUxTXG4gICAgICogQHByb3BlcnR5T2YgZnYuZW52b3kuJGVudm95XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogVGhlIGxldmVscyBhcyBhbiBPYmplY3QsIGtleWVkIG9uIGxldmVsIG5hbWVcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cbiAgICAgKi9cbiAgICBFUlJPUkxFVkVMUzogTEVWRUxTLFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I0xFVkVMU1xuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBsZXZlbHMgYXMgYW4gYXJyYXksIHdpdGggZWFjaCBvYmplY3QgcmVwcmVzZW50aW5nIGEgbGV2ZWxcbiAgICAgKiBAdHlwZSB7QXJyYXkuPE9iamVjdC48c3RyaW5nLG51bWJlcj4+fVxuICAgICAqL1xuICAgIExFVkVMUzogb3B0cy5sZXZlbHMsXG5cblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNvcHRpb25zXG4gICAgICogQHByb3BlcnR5T2YgZnYuZW52b3kuJGVudm95XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogT3B0aW9ucywgYXMgZGVmaW5lZCBieSBkZWZhdWx0cyBhbmQgYW55IGNhbGxzIHRvIGBvcHRpb25zKClgIGluIHRoZVxuICAgICAqIHByb3ZpZGVyLlxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cbiAgICAgKi9cbiAgICBvcHRpb25zOiBvcHRzXG5cbiAgfTtcblxuICBfLmV4dGVuZCgkZW52b3ksIHByb3RvdHlwZSk7XG5cbiAgcmV0dXJuICRlbnZveTtcbn1cbmVudm95RmFjdG9yeS4kaW5qZWN0ID0gWyckaHR0cCcsICckcSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95RmFjdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9wdHMgPSByZXF1aXJlKCcuL29wdHMnKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OiRlbnZveTpwcm92aWRlcicpO1xuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgZnYuZW52b3kuJGVudm95UHJvdmlkZXJcbiAqIEBkZXNjcmlwdGlvblxuICogQWxsb3dzIGNvbmZpZ3VyYXRpb24gb2Ygb3B0aW9ucyBmb3IgRW52b3k7IHNlZSB0aGVcbiAqIHtAbGluayBmdi5lbnZveS4kZW52b3lQcm92aWRlciNvcHRpb25zIGBvcHRpb25zKClgIG1ldGhvZH0uXG4gKlxuICogIyBEZWZhdWx0IE9wdGlvbnNcbiAqXG4gKiAtIGBsZXZlbHNgOiBUaHJlZSAoMykgZGVmYXVsdCBsZXZlbHMuICBgb2tgLCBgd2FybmluZ2AsIGFuZCBgZXJyb3JgLCBpblxuICogICAgIGluY3JlYXNpbmcgc2V2ZXJpdHksIGhhdmluZyBkZXNjcmlwdGlvbnMgXCJGaXhlZCFcIiwgXCJXYXJuaW5nXCIsIGFuZFxuICogICAgIFwiRXJyb3JcIiwgcmVzcGVjdGl2ZWx5LlxuICogLSBgZGVmYXVsdExldmVsOiBgb2tgXG4gKiAtIGBkYXRhRmlsZVVybGA6IGBtZXNzYWdlcy5qc29uYFxuICogLSBgdGVtcGxhdGVVcmxgOiBgcGFydGlhbHMvbWVzc2FnZXMuaHRtbGBcbiAqL1xuZnVuY3Rpb24gZW52b3lQcm92aWRlcigpIHtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveVByb3ZpZGVyI29wdGlvbnNcbiAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVByb3ZpZGVyXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBVc2luZyB0aGlzIG1ldGhvZCwgc2V0IG9wdGlvbnMgZHVyaW5nIGBjb25maWcoKWAgcGhhc2UuXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gbmV3T3B0cyBOZXcgb3B0aW9ucyB0byBhc3NpZ24gb250byBkZWZhdWx0c1xuICAgKiBAcGFyYW0ge0FycmF5LjxPYmplY3QuPHN0cmluZyxzdHJpbmc+Pj19IG5ld09wdHMubGV2ZWxzIFVzZXItZGVmaW5lZFxuICAgKiAgICAgbGV2ZWxzLiAgRWFjaCBPYmplY3QgaW4gdGhlIEFycmF5IHNob3VsZCBoYXZlIGEgYG5hbWVgIGFuZFxuICAgKiAgICAgYGRlc2NyaXB0aW9uYCBwcm9wZXJ0eS5cbiAgICogQHBhcmFtIHtzdHJpbmc9fSBuZXdPcHRzLmRhdGFGaWxlVXJsIFRoZSBVUkwgcGF0aCB0byB0aGUgYC5qc29uYCBmaWxlXG4gICAqICAgICBjb250YWluaW5nIHRoZSBtZXNzYWdlc1xuICAgKiBAcGFyYW0ge3N0cmluZz19IG5ld09wdHMudGVtcGxhdGVVcmwgVGhlIFVSTCBwYXRoIHRvIHRoZSBwYXJ0aWFsXG4gICAqICAgICByZXByZXNlbnRpbmcgdGhlIG1lc3NhZ2UgbGlzdFxuICAgKiBAcGFyYW0ge3N0cmluZz19IG5ld09wdHMuZGVmYXVsdExldmVsIFRoZSBkZWZhdWx0IGxldmVsOyBjb3JyZXNwb25kcyB0b1xuICAgKiAgICAgdGhlIGBuYW1lYCBwcm9wZXJ0eSBvZiBlYWNoIG9iamVjdCBpbiB0aGUgYGxldmVsc2AgYXJyYXlcbiAgICogQHJldHVybnMge09iamVjdH0gVGhlIHJlc3VsdGluZyBvcHRpb25zXG4gICAvLyogQHBhcmFtIHsoc3RyaW5nfGFuZ3VsYXIuZWxlbWVudCk9fSBuZXdPcHRzLnRlbXBsYXRlIFRoZSByYXcgdGVtcGxhdGUgdG8gdXNlXG4gICAvLyogICAgIGZvciB0aGUgbWVzc2FnZSBsaXN0LiAgVGFrZXMgcHJlY2VkZW5jZSBvdmVyIGB0ZW1wbGF0ZVVybGAuXG4gICAvLyogQHBhcmFtIHtPYmplY3Q9fSBuZXdPcHRzLm1lc3NhZ2VDb25maWcgSW5zdGVhZCBvZiB0aGUgVVJMIHRvIGEgYC5qc29uYFxuICAgLy8qICAgICBmaWxlLCB0aGlzIGNhbiBiZSBhbiBgT2JqZWN0YC4gIFRha2VzIHByZWNlZGVuY2Ugb3ZlclxuICAgLy8qICAgICBgbWVzc2FnZUNvbmZpZ1VybGAuXG4gICAqL1xuICB0aGlzLm9wdGlvbnMgPSBmdW5jdGlvbiBvcHRpb25zKG5ld09wdHMpIHtcbiAgICBfLmV4dGVuZChvcHRzLCBuZXdPcHRzKTtcbiAgICBkZWJ1ZygnTmV3IG9wdGlvbnMgc2V0OicsIG9wdHMpO1xuICAgIHJldHVybiBvcHRzO1xuICB9O1xuXG4gIHRoaXMuJGdldCA9IHJlcXVpcmUoJy4vZmFjdG9yeScpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZW52b3lQcm92aWRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZWZhdWx0IGxldmVsIGFuZCBkZXNjcmlwdGlvbnNcbiAqIEB0eXBlIHtBcnJheS48T2JqZWN0LjxzdHJpbmcsIHN0cmluZz4+fVxuICovXG52YXIgREVGQVVMVF9MRVZFTFMgPSBbXG4gIHtcbiAgICBuYW1lOiAnb2snLFxuICAgIGRlc2NyaXB0aW9uOiAnRml4ZWQhJ1xuICB9LFxuICB7XG4gICAgbmFtZTogJ3dhcm5pbmcnLFxuICAgIGRlc2NyaXB0aW9uOiAnV2FybmluZydcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdlcnJvcicsXG4gICAgZGVzY3JpcHRpb246ICdFcnJvcidcbiAgfVxuXTtcblxuLyoqXG4gKiBEZWZhdWx0IHdlYiBzZXJ2ZXIgcGF0aCB0byBKU09OIG1lc3NhZ2UgZGVmaW5pdGlvbiBmaWxlXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgREVGQVVMVF9NRVNTQUdFU19DT05GSUdfVVJMID0gJ2V4YW1wbGUtZGF0YS9tZXNzYWdlcy5qc29uJztcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBsZXZlbFxuICogQHR5cGUge3N0cmluZ31cbiAqL1xudmFyIERFRkFVTFRfTEVWRUwgPSAnb2snO1xuXG4vKipcbiAqIFdoZXRoZXIgb3Igbm90IHRvIGRpc3BsYXkgbWVzc2FnZXMgaWYgdGhlIGVycm9ybGV2ZWwgaXMgdGhlIGRlZmF1bHQgb25lLlxuICogUHJhY3RpY2FsbHkgc3BlYWtpbmcsIHRoaXMgY291bGQgZ2l2ZSB0aGUgdXNlciBtb21lbnRhcnkgZmVlZGJhY2sgdGhhdFxuICogdGhleSd2ZSBmaXhlZCBhIGZpZWxkLlxuICogQHR5cGUge2Jvb2xlYW59XG4gKi9cbnZhciBERUZBVUxUX1NIT1dfREVGQVVMVF9MRVZFTCA9IGZhbHNlO1xuXG4vKipcbiAqIFRoZSBVUkwgb2YgdGhlIHRlbXBsYXRlIHRvIHVzZSBmb3IgdGhlXG4gKiB7QGxpbmsgZnYuZW52b3kuZGlyZWN0aXZlOmVudm95TGlzdCBlbnZveUxpc3R9IGRpcmVjdGl2ZS5cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBERUZBVUxUX1RFTVBMQVRFX1VSTCA9ICdwYXJ0aWFscy9tZXNzYWdlcy5odG1sJztcblxuLyoqXG4gKiBUaGUgcmF3IHRlbXBsYXRlIHRvIHVzZS4gIFRha2VzIHByZWNlZGVuY2Ugb3ZlciBgdGVtcGxhdGVVcmxgLlxuICogQHR5cGUgeyhzdHJpbmd8bnVsbHxhbmd1bGFyLmVsZW1lbnQpfVxuICovXG52YXIgREVGQVVMVF9URU1QTEFURSA9IG51bGw7XG5cbi8qKlxuICogVGhlIHJhdyBkYXRhIG9iamVjdCB0byB1c2UuICBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgYG1lc3NhZ2VzQ29uZmlnVXJsYC5cbiAqIEB0eXBlIHsoT2JqZWN0fG51bGwpfVxuICovXG52YXIgREVGQVVMVF9NRVNTQUdFX0NPTkZJRyA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsZXZlbHM6IERFRkFVTFRfTEVWRUxTLFxuICBkZWZhdWx0TGV2ZWw6IERFRkFVTFRfTEVWRUwsXG4gIG1lc3NhZ2VzQ29uZmlnVXJsOiBERUZBVUxUX01FU1NBR0VTX0NPTkZJR19VUkwsXG4gIHNob3dEZWZhdWx0TGV2ZWw6IERFRkFVTFRfU0hPV19ERUZBVUxUX0xFVkVMLFxuICB0ZW1wbGF0ZVVybDogREVGQVVMVF9URU1QTEFURV9VUkwsXG4gIG1lc3NhZ2VzQ29uZmlnOiBERUZBVUxUX01FU1NBR0VfQ09ORklHLFxuICB0ZW1wbGF0ZTogREVGQVVMVF9URU1QTEFURVxufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgZnYuZW52b3lcbiAqIEBkZXNjcmlwdGlvblxuICogIyBmdi5lbnZveVxuICpcbiAqIFRoZSBtYWluIG1vZHVsZSBmb3IgRW52b3kuICBZb3Ugd2lsbCBuZWVkIHRvIGluY2x1ZGUgdGhpcyBtb2R1bGUuXG4gKlxuICogRW52b3kgaGFzIGRlcGVuZGVuY2llcyBvZiBbbG9kYXNoXShodHRwOi8vbG9kYXNoLm9yZykgYW5kIG9mIGNvdXJzZVxuICogW0FuZ3VsYXJKU10oaHR0cDovL2FuZ3VsYXJqcy5vcmcpLlxuICpcbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICogPGh0bWwgbmctYXBwPVwibXlBcHBcIj5cbiAqIDxoZWFkPlxuICogICA8c2NyaXB0IHNyYz1cInBhdGgvdG8vYW5ndWxhci5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0IHNyYz1cInBhdGgvdG8vbG9kYXNoLmpzXCI+PC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgc3JjPVwicGF0aC90by9lbnZveS5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0PlxuICogICAgIHZhciBteUFwcCA9IGFuZ3VsYXIubW9kdWxlKCdteUFwcCcsIFsnZnYuZW52b3knXSk7XG4gKiAgIDwvc2NyaXB0PlxuICogPC9oZWFkPlxuICogPGJvZHk+XG4gKiA8L2JvZHk+XG4gKiA8L2h0bWw+XG4gKiA8L3ByZT5cbiAqL1xuXG52YXIgYW5ndWxhciA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmFuZ3VsYXIgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmFuZ3VsYXIgOiBudWxsKTtcbnZhciBfID0gcmVxdWlyZSgnbG9kYXNoJyk7XG52YXIgZGlyZWN0aXZlcyA9IHJlcXVpcmUoJy4vZGlyZWN0aXZlcycpO1xudmFyIHBrZyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xudmFyICRlbnZveSA9IHJlcXVpcmUoJy4vZW52b3knKTtcblxudmFyIE1PRFVMRV9OQU1FID0gJ2Z2LmVudm95JztcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95Jyk7XG52YXIgZW52b3k7XG52YXIgbmdBbmltYXRlUHJlc2VudCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBjb25maWcoJHByb3ZpZGUpIHtcbiAgaWYgKCFuZ0FuaW1hdGVQcmVzZW50KSB7XG4gICAgJHByb3ZpZGUudmFsdWUoJyRhbmltYXRlJywgbnVsbCk7XG4gIH1cbiAgZGVidWcoJyVzIHYlcyByZWFkeScsIHBrZy5uYW1lLCBwa2cudmVyc2lvbik7XG59XG5jb25maWcuJGluamVjdCA9IFsnJHByb3ZpZGUnXTtcblxudHJ5IHtcbiAgZW52b3kgPSBhbmd1bGFyLm1vZHVsZShNT0RVTEVfTkFNRSwgWyduZ0FuaW1hdGUnXSk7XG4gIG5nQW5pbWF0ZVByZXNlbnQgPSB0cnVlO1xufSBjYXRjaCAoaWdub3JlZCkge1xuICBlbnZveSA9IGFuZ3VsYXIubW9kdWxlKE1PRFVMRV9OQU1FLCBbXSk7XG59XG5cbmVudm95XG4gIC5jb25maWcoY29uZmlnKVxuICAucHJvdmlkZXIoJyRlbnZveScsICRlbnZveSk7XG5cbl8uZWFjaChkaXJlY3RpdmVzLCBmdW5jdGlvbiAoZGlyZWN0aXZlLCBuYW1lKSB7XG4gIGVudm95LmRpcmVjdGl2ZShuYW1lLCBkaXJlY3RpdmUpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW52b3k7XG5cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJhbmd1bGFyLWVudm95XCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJIaWdobHkgZmxleGlibGUgZm9ybSB2YWxpZGF0aW9uIG1lc3NhZ2luZyBmb3IgQW5ndWxhckpTXCIsXG4gIFwibWFpblwiOiBcImxpYi9pbmRleC5qc1wiLFxuICBcImF1dGhvclwiOiBcIkNocmlzdG9waGVyIEhpbGxlciA8Y2hpbGxlckBmb2N1c3Zpc2lvbi5jb20+XCIsXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2RlY2lwaGVyaW5jL2FuZ3VsYXItZW52b3kuZ2l0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYW5ndWxhclwiOiBcIl4xLjQuM1wiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjIuMFwiLFxuICAgIFwiZXhwb3NpZnlcIjogXCJeMC40LjNcIixcbiAgICBcImdydW50XCI6IFwiXjAuNC41XCIsXG4gICAgXCJncnVudC1ib3dlci1pbnN0YWxsLXNpbXBsZVwiOiBcIl4xLjEuNFwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcIl40LjAuMFwiLFxuICAgIFwiZ3J1bnQtYnVtcFwiOiBcIl4wLjMuMVwiLFxuICAgIFwiZ3J1bnQtY2xpXCI6IFwiXjAuMS4xM1wiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jbGVhblwiOiBcIl4wLjYuMFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jb3B5XCI6IFwiXjAuOC4wXCIsXG4gICAgXCJncnVudC1kZXYtdXBkYXRlXCI6IFwiXjEuMy4wXCIsXG4gICAgXCJncnVudC1lc2xpbnRcIjogXCJeMTcuMC4wXCIsXG4gICAgXCJncnVudC1naC1wYWdlc1wiOiBcIl4wLjEwLjBcIixcbiAgICBcImdydW50LWxvZGFzaFwiOiBcIl4wLjQuMFwiLFxuICAgIFwiZ3J1bnQtbG9kYXNoLWF1dG9idWlsZFwiOiBcIl4wLjMuMFwiLFxuICAgIFwiZ3J1bnQtbW9jaGEtaXN0YW5idWxcIjogXCJeMi40LjBcIixcbiAgICBcImdydW50LW5nZG9jc1wiOiBcIl4wLjIuN1wiLFxuICAgIFwiaXN0YW5idWxcIjogXCJeMC4zLjE3XCIsXG4gICAgXCJqaXQtZ3J1bnRcIjogXCJeMC45LjFcIixcbiAgICBcImpzb25taW5pZnlpZnlcIjogXCJeMC4xLjFcIixcbiAgICBcImxvYWQtZ3J1bnQtY29uZmlnXCI6IFwiXjAuMTcuMlwiLFxuICAgIFwibG9kYXNoLWNsaVwiOiBcIl4zLjEwLjBcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuMi41XCIsXG4gICAgXCJ0aW1lLWdydW50XCI6IFwiXjEuMi4xXCIsXG4gICAgXCJ1Z2xpZnlpZnlcIjogXCJeMy4wLjFcIlxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwidGVzdFwiOiBcImdydW50IHRlc3RcIlxuICB9LFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYW5ndWxhclwiOiBcIl4xLjQuMVwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImFuZ3VsYXItYW5pbWF0ZVwiOiBcIl4xLjMuMTdcIixcbiAgICBcImRlYnVnXCI6IFwiXjIuMi4wXCIsXG4gICAgXCJsb2Rhc2hcIjogXCJeMy45LjNcIlxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBsb2Rhc2ggMy4xMC4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIGV4cG9ydHM9XCJub2RlXCIgY2F0ZWdvcnk9XCJjaGFpblwiIGluY2x1ZGU9XCJhc3NpZ24sY3JlYXRlLGRlYm91bmNlLGZpbHRlcixmaXJzdCxmbGF0dGVuLGZvckVhY2gsZ2V0LGhhcyxpbnZlcnQsaXNOdW1iZXIsaXNPYmplY3QsaXNTdHJpbmcsbWFwVmFsdWVzLG1heCxwaWNrLHBsdWNrLHJlZHVjZSxzaXplLHRvQXJyYXksdW5pcXVlLHVuaXF1ZUlkLHppcE9iamVjdFwiIC0tb3V0cHV0IC4vc3VwcG9ydC9sb2Rhc2guY3VzdG9tLmpzYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG47KGZ1bmN0aW9uKCkge1xuXG4gIC8qKiBVc2VkIGFzIGEgc2FmZSByZWZlcmVuY2UgZm9yIGB1bmRlZmluZWRgIGluIHByZS1FUzUgZW52aXJvbm1lbnRzLiAqL1xuICB2YXIgdW5kZWZpbmVkO1xuXG4gIC8qKiBVc2VkIGFzIHRoZSBzZW1hbnRpYyB2ZXJzaW9uIG51bWJlci4gKi9cbiAgdmFyIFZFUlNJT04gPSAnMy4xMC4wJztcblxuICAvKiogVXNlZCB0byBjb21wb3NlIGJpdG1hc2tzIGZvciB3cmFwcGVyIG1ldGFkYXRhLiAqL1xuICB2YXIgQklORF9GTEFHID0gMSxcbiAgICAgIEJJTkRfS0VZX0ZMQUcgPSAyLFxuICAgICAgQ1VSUllfQk9VTkRfRkxBRyA9IDQsXG4gICAgICBDVVJSWV9GTEFHID0gOCxcbiAgICAgIENVUlJZX1JJR0hUX0ZMQUcgPSAxNixcbiAgICAgIFBBUlRJQUxfRkxBRyA9IDMyLFxuICAgICAgUEFSVElBTF9SSUdIVF9GTEFHID0gNjQsXG4gICAgICBBUllfRkxBRyA9IDEyODtcblxuICAvKiogVXNlZCB0byBkZXRlY3Qgd2hlbiBhIGZ1bmN0aW9uIGJlY29tZXMgaG90LiAqL1xuICB2YXIgSE9UX0NPVU5UID0gMTUwLFxuICAgICAgSE9UX1NQQU4gPSAxNjtcblxuICAvKiogVXNlZCBhcyB0aGUgc2l6ZSB0byBlbmFibGUgbGFyZ2UgYXJyYXkgb3B0aW1pemF0aW9ucy4gKi9cbiAgdmFyIExBUkdFX0FSUkFZX1NJWkUgPSAyMDA7XG5cbiAgLyoqIFVzZWQgdG8gaW5kaWNhdGUgdGhlIHR5cGUgb2YgbGF6eSBpdGVyYXRlZXMuICovXG4gIHZhciBMQVpZX0ZJTFRFUl9GTEFHID0gMSxcbiAgICAgIExBWllfTUFQX0ZMQUcgPSAyO1xuXG4gIC8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG4gIHZhciBGVU5DX0VSUk9SX1RFWFQgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbic7XG5cbiAgLyoqIFVzZWQgYXMgdGhlIGludGVybmFsIGFyZ3VtZW50IHBsYWNlaG9sZGVyLiAqL1xuICB2YXIgUExBQ0VIT0xERVIgPSAnX19sb2Rhc2hfcGxhY2Vob2xkZXJfXyc7XG5cbiAgLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xuICB2YXIgYXJnc1RhZyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgICAgYXJyYXlUYWcgPSAnW29iamVjdCBBcnJheV0nLFxuICAgICAgYm9vbFRhZyA9ICdbb2JqZWN0IEJvb2xlYW5dJyxcbiAgICAgIGRhdGVUYWcgPSAnW29iamVjdCBEYXRlXScsXG4gICAgICBlcnJvclRhZyA9ICdbb2JqZWN0IEVycm9yXScsXG4gICAgICBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICAgIG1hcFRhZyA9ICdbb2JqZWN0IE1hcF0nLFxuICAgICAgbnVtYmVyVGFnID0gJ1tvYmplY3QgTnVtYmVyXScsXG4gICAgICBvYmplY3RUYWcgPSAnW29iamVjdCBPYmplY3RdJyxcbiAgICAgIHJlZ2V4cFRhZyA9ICdbb2JqZWN0IFJlZ0V4cF0nLFxuICAgICAgc2V0VGFnID0gJ1tvYmplY3QgU2V0XScsXG4gICAgICBzdHJpbmdUYWcgPSAnW29iamVjdCBTdHJpbmddJyxcbiAgICAgIHdlYWtNYXBUYWcgPSAnW29iamVjdCBXZWFrTWFwXSc7XG5cbiAgdmFyIGFycmF5QnVmZmVyVGFnID0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJyxcbiAgICAgIGZsb2F0MzJUYWcgPSAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgIGZsb2F0NjRUYWcgPSAnW29iamVjdCBGbG9hdDY0QXJyYXldJyxcbiAgICAgIGludDhUYWcgPSAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgIGludDE2VGFnID0gJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgaW50MzJUYWcgPSAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICB1aW50OFRhZyA9ICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgIHVpbnQ4Q2xhbXBlZFRhZyA9ICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICB1aW50MTZUYWcgPSAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgdWludDMyVGFnID0gJ1tvYmplY3QgVWludDMyQXJyYXldJztcblxuICAvKiogVXNlZCB0byBtYXRjaCBwcm9wZXJ0eSBuYW1lcyB3aXRoaW4gcHJvcGVydHkgcGF0aHMuICovXG4gIHZhciByZUlzRGVlcFByb3AgPSAvXFwufFxcWyg/OlteW1xcXV0qfChbXCInXSkoPzooPyFcXDEpW15cXG5cXFxcXXxcXFxcLikqP1xcMSlcXF0vLFxuICAgICAgcmVJc1BsYWluUHJvcCA9IC9eXFx3KiQvLFxuICAgICAgcmVQcm9wTmFtZSA9IC9bXi5bXFxdXSt8XFxbKD86KC0/XFxkKyg/OlxcLlxcZCspPyl8KFtcIiddKSgoPzooPyFcXDIpW15cXG5cXFxcXXxcXFxcLikqPylcXDIpXFxdL2c7XG5cbiAgLyoqIFVzZWQgdG8gbWF0Y2ggYmFja3NsYXNoZXMgaW4gcHJvcGVydHkgcGF0aHMuICovXG4gIHZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZztcblxuICAvKiogVXNlZCB0byBtYXRjaCBgUmVnRXhwYCBmbGFncyBmcm9tIHRoZWlyIGNvZXJjZWQgc3RyaW5nIHZhbHVlcy4gKi9cbiAgdmFyIHJlRmxhZ3MgPSAvXFx3KiQvO1xuXG4gIC8qKiBVc2VkIHRvIGRldGVjdCBob3N0IGNvbnN0cnVjdG9ycyAoU2FmYXJpID4gNSkuICovXG4gIHZhciByZUlzSG9zdEN0b3IgPSAvXlxcW29iamVjdCAuKz9Db25zdHJ1Y3RvclxcXSQvO1xuXG4gIC8qKiBVc2VkIHRvIGRldGVjdCB1bnNpZ25lZCBpbnRlZ2VyIHZhbHVlcy4gKi9cbiAgdmFyIHJlSXNVaW50ID0gL15cXGQrJC87XG5cbiAgLyoqIFVzZWQgdG8gaWRlbnRpZnkgYHRvU3RyaW5nVGFnYCB2YWx1ZXMgb2YgdHlwZWQgYXJyYXlzLiAqL1xuICB2YXIgdHlwZWRBcnJheVRhZ3MgPSB7fTtcbiAgdHlwZWRBcnJheVRhZ3NbZmxvYXQzMlRhZ10gPSB0eXBlZEFycmF5VGFnc1tmbG9hdDY0VGFnXSA9XG4gIHR5cGVkQXJyYXlUYWdzW2ludDhUYWddID0gdHlwZWRBcnJheVRhZ3NbaW50MTZUYWddID1cbiAgdHlwZWRBcnJheVRhZ3NbaW50MzJUYWddID0gdHlwZWRBcnJheVRhZ3NbdWludDhUYWddID1cbiAgdHlwZWRBcnJheVRhZ3NbdWludDhDbGFtcGVkVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3VpbnQxNlRhZ10gPVxuICB0eXBlZEFycmF5VGFnc1t1aW50MzJUYWddID0gdHJ1ZTtcbiAgdHlwZWRBcnJheVRhZ3NbYXJnc1RhZ10gPSB0eXBlZEFycmF5VGFnc1thcnJheVRhZ10gPVxuICB0eXBlZEFycmF5VGFnc1thcnJheUJ1ZmZlclRhZ10gPSB0eXBlZEFycmF5VGFnc1tib29sVGFnXSA9XG4gIHR5cGVkQXJyYXlUYWdzW2RhdGVUYWddID0gdHlwZWRBcnJheVRhZ3NbZXJyb3JUYWddID1cbiAgdHlwZWRBcnJheVRhZ3NbZnVuY1RhZ10gPSB0eXBlZEFycmF5VGFnc1ttYXBUYWddID1cbiAgdHlwZWRBcnJheVRhZ3NbbnVtYmVyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW29iamVjdFRhZ10gPVxuICB0eXBlZEFycmF5VGFnc1tyZWdleHBUYWddID0gdHlwZWRBcnJheVRhZ3Nbc2V0VGFnXSA9XG4gIHR5cGVkQXJyYXlUYWdzW3N0cmluZ1RhZ10gPSB0eXBlZEFycmF5VGFnc1t3ZWFrTWFwVGFnXSA9IGZhbHNlO1xuXG4gIC8qKiBVc2VkIHRvIGlkZW50aWZ5IGB0b1N0cmluZ1RhZ2AgdmFsdWVzIHN1cHBvcnRlZCBieSBgXy5jbG9uZWAuICovXG4gIHZhciBjbG9uZWFibGVUYWdzID0ge307XG4gIGNsb25lYWJsZVRhZ3NbYXJnc1RhZ10gPSBjbG9uZWFibGVUYWdzW2FycmF5VGFnXSA9XG4gIGNsb25lYWJsZVRhZ3NbYXJyYXlCdWZmZXJUYWddID0gY2xvbmVhYmxlVGFnc1tib29sVGFnXSA9XG4gIGNsb25lYWJsZVRhZ3NbZGF0ZVRhZ10gPSBjbG9uZWFibGVUYWdzW2Zsb2F0MzJUYWddID1cbiAgY2xvbmVhYmxlVGFnc1tmbG9hdDY0VGFnXSA9IGNsb25lYWJsZVRhZ3NbaW50OFRhZ10gPVxuICBjbG9uZWFibGVUYWdzW2ludDE2VGFnXSA9IGNsb25lYWJsZVRhZ3NbaW50MzJUYWddID1cbiAgY2xvbmVhYmxlVGFnc1tudW1iZXJUYWddID0gY2xvbmVhYmxlVGFnc1tvYmplY3RUYWddID1cbiAgY2xvbmVhYmxlVGFnc1tyZWdleHBUYWddID0gY2xvbmVhYmxlVGFnc1tzdHJpbmdUYWddID1cbiAgY2xvbmVhYmxlVGFnc1t1aW50OFRhZ10gPSBjbG9uZWFibGVUYWdzW3VpbnQ4Q2xhbXBlZFRhZ10gPVxuICBjbG9uZWFibGVUYWdzW3VpbnQxNlRhZ10gPSBjbG9uZWFibGVUYWdzW3VpbnQzMlRhZ10gPSB0cnVlO1xuICBjbG9uZWFibGVUYWdzW2Vycm9yVGFnXSA9IGNsb25lYWJsZVRhZ3NbZnVuY1RhZ10gPVxuICBjbG9uZWFibGVUYWdzW21hcFRhZ10gPSBjbG9uZWFibGVUYWdzW3NldFRhZ10gPVxuICBjbG9uZWFibGVUYWdzW3dlYWtNYXBUYWddID0gZmFsc2U7XG5cbiAgLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgYE9iamVjdGAuICovXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBleHBvcnRzYC4gKi9cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAuICovXG4gIHZhciBmcmVlTW9kdWxlID0gb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG4gIHZhciBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSAmJiB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbCAmJiBnbG9iYWwuT2JqZWN0ICYmIGdsb2JhbDtcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYHNlbGZgLiAqL1xuICB2YXIgZnJlZVNlbGYgPSBvYmplY3RUeXBlc1t0eXBlb2Ygc2VsZl0gJiYgc2VsZiAmJiBzZWxmLk9iamVjdCAmJiBzZWxmO1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgd2luZG93YC4gKi9cbiAgdmFyIGZyZWVXaW5kb3cgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgJiYgd2luZG93Lk9iamVjdCAmJiB3aW5kb3c7XG5cbiAgLyoqIERldGVjdCB0aGUgcG9wdWxhciBDb21tb25KUyBleHRlbnNpb24gYG1vZHVsZS5leHBvcnRzYC4gKi9cbiAgdmFyIG1vZHVsZUV4cG9ydHMgPSBmcmVlTW9kdWxlICYmIGZyZWVNb2R1bGUuZXhwb3J0cyA9PT0gZnJlZUV4cG9ydHMgJiYgZnJlZUV4cG9ydHM7XG5cbiAgLyoqXG4gICAqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuXG4gICAqXG4gICAqIFRoZSBgdGhpc2AgdmFsdWUgaXMgdXNlZCBpZiBpdCdzIHRoZSBnbG9iYWwgb2JqZWN0IHRvIGF2b2lkIEdyZWFzZW1vbmtleSdzXG4gICAqIHJlc3RyaWN0ZWQgYHdpbmRvd2Agb2JqZWN0LCBvdGhlcndpc2UgdGhlIGB3aW5kb3dgIG9iamVjdCBpcyB1c2VkLlxuICAgKi9cbiAgdmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8ICgoZnJlZVdpbmRvdyAhPT0gKHRoaXMgJiYgdGhpcy53aW5kb3cpKSAmJiBmcmVlV2luZG93KSB8fCBmcmVlU2VsZiB8fCB0aGlzO1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pbmRleE9mYCB3aXRob3V0IHN1cHBvcnQgZm9yIGJpbmFyeSBzZWFyY2hlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHNlYXJjaC5cbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2VhcmNoIGZvci5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGZyb21JbmRleCBUaGUgaW5kZXggdG8gc2VhcmNoIGZyb20uXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIHZhbHVlLCBlbHNlIGAtMWAuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlSW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleCkge1xuICAgIGlmICh2YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBpbmRleE9mTmFOKGFycmF5LCBmcm9tSW5kZXgpO1xuICAgIH1cbiAgICB2YXIgaW5kZXggPSBmcm9tSW5kZXggLSAxLFxuICAgICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgaWYgKGFycmF5W2luZGV4XSA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgYHZhbHVlYCB0byBhIHN0cmluZyBpZiBpdCdzIG5vdCBvbmUuIEFuIGVtcHR5IHN0cmluZyBpcyByZXR1cm5lZFxuICAgKiBmb3IgYG51bGxgIG9yIGB1bmRlZmluZWRgIHZhbHVlcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgc3RyaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBgTmFOYCBpcyBmb3VuZCBpbiBgYXJyYXlgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2VhcmNoLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZnJvbUluZGV4IFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbS5cbiAgICogQHBhcmFtIHtib29sZWFufSBbZnJvbVJpZ2h0XSBTcGVjaWZ5IGl0ZXJhdGluZyBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBtYXRjaGVkIGBOYU5gLCBlbHNlIGAtMWAuXG4gICAqL1xuICBmdW5jdGlvbiBpbmRleE9mTmFOKGFycmF5LCBmcm9tSW5kZXgsIGZyb21SaWdodCkge1xuICAgIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIGluZGV4ID0gZnJvbUluZGV4ICsgKGZyb21SaWdodCA/IDAgOiAtMSk7XG5cbiAgICB3aGlsZSAoKGZyb21SaWdodCA/IGluZGV4LS0gOiArK2luZGV4IDwgbGVuZ3RoKSkge1xuICAgICAgdmFyIG90aGVyID0gYXJyYXlbaW5kZXhdO1xuICAgICAgaWYgKG90aGVyICE9PSBvdGhlcikge1xuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG4gIH1cblxuICAvKipcbiAgICogUmVwbGFjZXMgYWxsIGBwbGFjZWhvbGRlcmAgZWxlbWVudHMgaW4gYGFycmF5YCB3aXRoIGFuIGludGVybmFsIHBsYWNlaG9sZGVyXG4gICAqIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIHRoZWlyIGluZGV4ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBtb2RpZnkuXG4gICAqIEBwYXJhbSB7Kn0gcGxhY2Vob2xkZXIgVGhlIHBsYWNlaG9sZGVyIHRvIHJlcGxhY2UuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGFycmF5IG9mIHBsYWNlaG9sZGVyIGluZGV4ZXMuXG4gICAqL1xuICBmdW5jdGlvbiByZXBsYWNlSG9sZGVycyhhcnJheSwgcGxhY2Vob2xkZXIpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICByZXNJbmRleCA9IC0xLFxuICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBpZiAoYXJyYXlbaW5kZXhdID09PSBwbGFjZWhvbGRlcikge1xuICAgICAgICBhcnJheVtpbmRleF0gPSBQTEFDRUhPTERFUjtcbiAgICAgICAgcmVzdWx0WysrcmVzSW5kZXhdID0gaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQW4gaW1wbGVtZW50YXRpb24gb2YgYF8udW5pcWAgb3B0aW1pemVkIGZvciBzb3J0ZWQgYXJyYXlzIHdpdGhvdXQgc3VwcG9ydFxuICAgKiBmb3IgY2FsbGJhY2sgc2hvcnRoYW5kcyBhbmQgYHRoaXNgIGJpbmRpbmcuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXRlcmF0ZWVdIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGR1cGxpY2F0ZS12YWx1ZS1mcmVlIGFycmF5LlxuICAgKi9cbiAgZnVuY3Rpb24gc29ydGVkVW5pcShhcnJheSwgaXRlcmF0ZWUpIHtcbiAgICB2YXIgc2VlbixcbiAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICByZXNJbmRleCA9IC0xLFxuICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF0sXG4gICAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgYXJyYXkpIDogdmFsdWU7XG5cbiAgICAgIGlmICghaW5kZXggfHwgc2VlbiAhPT0gY29tcHV0ZWQpIHtcbiAgICAgICAgc2VlbiA9IGNvbXB1dGVkO1xuICAgICAgICByZXN1bHRbKytyZXNJbmRleF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG4gIHZhciBhcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLFxuICAgICAgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlLFxuICAgICAgc3RyaW5nUHJvdG8gPSBTdHJpbmcucHJvdG90eXBlO1xuXG4gIC8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGRlY29tcGlsZWQgc291cmNlIG9mIGZ1bmN0aW9ucy4gKi9cbiAgdmFyIGZuVG9TdHJpbmcgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmc7XG5cbiAgLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8qKiBVc2VkIHRvIGdlbmVyYXRlIHVuaXF1ZSBJRHMuICovXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIHJlc29sdmUgdGhlIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICAgKiBvZiB2YWx1ZXMuXG4gICAqL1xuICB2YXIgb2JqVG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuICAvKiogVXNlZCB0byBkZXRlY3QgaWYgYSBtZXRob2QgaXMgbmF0aXZlLiAqL1xuICB2YXIgcmVJc05hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICAgIGZuVG9TdHJpbmcuY2FsbChoYXNPd25Qcm9wZXJ0eSkucmVwbGFjZSgvW1xcXFxeJC4qKz8oKVtcXF17fXxdL2csICdcXFxcJCYnKVxuICAgIC5yZXBsYWNlKC9oYXNPd25Qcm9wZXJ0eXwoZnVuY3Rpb24pLio/KD89XFxcXFxcKCl8IGZvciAuKz8oPz1cXFxcXFxdKS9nLCAnJDEuKj8nKSArICckJ1xuICApO1xuXG4gIC8qKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG4gIHZhciBBcnJheUJ1ZmZlciA9IHJvb3QuQXJyYXlCdWZmZXIsXG4gICAgICBwcm9wZXJ0eUlzRW51bWVyYWJsZSA9IG9iamVjdFByb3RvLnByb3BlcnR5SXNFbnVtZXJhYmxlLFxuICAgICAgU2V0ID0gZ2V0TmF0aXZlKHJvb3QsICdTZXQnKSxcbiAgICAgIFVpbnQ4QXJyYXkgPSByb290LlVpbnQ4QXJyYXksXG4gICAgICBXZWFrTWFwID0gZ2V0TmF0aXZlKHJvb3QsICdXZWFrTWFwJyk7XG5cbiAgLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbiAgdmFyIG5hdGl2ZUNyZWF0ZSA9IGdldE5hdGl2ZShPYmplY3QsICdjcmVhdGUnKSxcbiAgICAgIG5hdGl2ZUZsb29yID0gTWF0aC5mbG9vcixcbiAgICAgIG5hdGl2ZUlzQXJyYXkgPSBnZXROYXRpdmUoQXJyYXksICdpc0FycmF5JyksXG4gICAgICBuYXRpdmVLZXlzID0gZ2V0TmF0aXZlKE9iamVjdCwgJ2tleXMnKSxcbiAgICAgIG5hdGl2ZU1heCA9IE1hdGgubWF4LFxuICAgICAgbmF0aXZlTWluID0gTWF0aC5taW4sXG4gICAgICBuYXRpdmVOb3cgPSBnZXROYXRpdmUoRGF0ZSwgJ25vdycpO1xuXG4gIC8qKiBVc2VkIGFzIHJlZmVyZW5jZXMgZm9yIGAtSW5maW5pdHlgIGFuZCBgSW5maW5pdHlgLiAqL1xuICB2YXIgTkVHQVRJVkVfSU5GSU5JVFkgPSBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFksXG4gICAgICBQT1NJVElWRV9JTkZJTklUWSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICAvKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB0aGUgbWF4aW11bSBsZW5ndGggYW5kIGluZGV4IG9mIGFuIGFycmF5LiAqL1xuICB2YXIgTUFYX0FSUkFZX0xFTkdUSCA9IDQyOTQ5NjcyOTUsXG4gICAgICBNQVhfQVJSQVlfSU5ERVggPSBNQVhfQVJSQVlfTEVOR1RIIC0gMSxcbiAgICAgIEhBTEZfTUFYX0FSUkFZX0xFTkdUSCA9IE1BWF9BUlJBWV9MRU5HVEggPj4+IDE7XG5cbiAgLyoqXG4gICAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gICAqIG9mIGFuIGFycmF5LWxpa2UgdmFsdWUuXG4gICAqL1xuICB2YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbiAgLyoqIFVzZWQgdG8gc3RvcmUgZnVuY3Rpb24gbWV0YWRhdGEuICovXG4gIHZhciBtZXRhTWFwID0gV2Vha01hcCAmJiBuZXcgV2Vha01hcDtcblxuICAvKiogVXNlZCB0byBsb29rdXAgdW5taW5pZmllZCBmdW5jdGlvbiBuYW1lcy4gKi9cbiAgdmFyIHJlYWxOYW1lcyA9IHt9O1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGBsb2Rhc2hgIG9iamVjdCB3aGljaCB3cmFwcyBgdmFsdWVgIHRvIGVuYWJsZSBpbXBsaWNpdCBjaGFpbmluZy5cbiAgICogTWV0aG9kcyB0aGF0IG9wZXJhdGUgb24gYW5kIHJldHVybiBhcnJheXMsIGNvbGxlY3Rpb25zLCBhbmQgZnVuY3Rpb25zIGNhblxuICAgKiBiZSBjaGFpbmVkIHRvZ2V0aGVyLiBNZXRob2RzIHRoYXQgcmV0cmlldmUgYSBzaW5nbGUgdmFsdWUgb3IgbWF5IHJldHVybiBhXG4gICAqIHByaW1pdGl2ZSB2YWx1ZSB3aWxsIGF1dG9tYXRpY2FsbHkgZW5kIHRoZSBjaGFpbiByZXR1cm5pbmcgdGhlIHVud3JhcHBlZFxuICAgKiB2YWx1ZS4gRXhwbGljaXQgY2hhaW5pbmcgbWF5IGJlIGVuYWJsZWQgdXNpbmcgYF8uY2hhaW5gLiBUaGUgZXhlY3V0aW9uIG9mXG4gICAqIGNoYWluZWQgbWV0aG9kcyBpcyBsYXp5LCB0aGF0IGlzLCBleGVjdXRpb24gaXMgZGVmZXJyZWQgdW50aWwgYF8jdmFsdWVgXG4gICAqIGlzIGltcGxpY2l0bHkgb3IgZXhwbGljaXRseSBjYWxsZWQuXG4gICAqXG4gICAqIExhenkgZXZhbHVhdGlvbiBhbGxvd3Mgc2V2ZXJhbCBtZXRob2RzIHRvIHN1cHBvcnQgc2hvcnRjdXQgZnVzaW9uLiBTaG9ydGN1dFxuICAgKiBmdXNpb24gaXMgYW4gb3B0aW1pemF0aW9uIHN0cmF0ZWd5IHdoaWNoIG1lcmdlIGl0ZXJhdGVlIGNhbGxzOyB0aGlzIGNhbiBoZWxwXG4gICAqIHRvIGF2b2lkIHRoZSBjcmVhdGlvbiBvZiBpbnRlcm1lZGlhdGUgZGF0YSBzdHJ1Y3R1cmVzIGFuZCBncmVhdGx5IHJlZHVjZSB0aGVcbiAgICogbnVtYmVyIG9mIGl0ZXJhdGVlIGV4ZWN1dGlvbnMuXG4gICAqXG4gICAqIENoYWluaW5nIGlzIHN1cHBvcnRlZCBpbiBjdXN0b20gYnVpbGRzIGFzIGxvbmcgYXMgdGhlIGBfI3ZhbHVlYCBtZXRob2QgaXNcbiAgICogZGlyZWN0bHkgb3IgaW5kaXJlY3RseSBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAqXG4gICAqIEluIGFkZGl0aW9uIHRvIGxvZGFzaCBtZXRob2RzLCB3cmFwcGVycyBoYXZlIGBBcnJheWAgYW5kIGBTdHJpbmdgIG1ldGhvZHMuXG4gICAqXG4gICAqIFRoZSB3cmFwcGVyIGBBcnJheWAgbWV0aG9kcyBhcmU6XG4gICAqIGBjb25jYXRgLCBgam9pbmAsIGBwb3BgLCBgcHVzaGAsIGByZXZlcnNlYCwgYHNoaWZ0YCwgYHNsaWNlYCwgYHNvcnRgLFxuICAgKiBgc3BsaWNlYCwgYW5kIGB1bnNoaWZ0YFxuICAgKlxuICAgKiBUaGUgd3JhcHBlciBgU3RyaW5nYCBtZXRob2RzIGFyZTpcbiAgICogYHJlcGxhY2VgIGFuZCBgc3BsaXRgXG4gICAqXG4gICAqIFRoZSB3cmFwcGVyIG1ldGhvZHMgdGhhdCBzdXBwb3J0IHNob3J0Y3V0IGZ1c2lvbiBhcmU6XG4gICAqIGBjb21wYWN0YCwgYGRyb3BgLCBgZHJvcFJpZ2h0YCwgYGRyb3BSaWdodFdoaWxlYCwgYGRyb3BXaGlsZWAsIGBmaWx0ZXJgLFxuICAgKiBgZmlyc3RgLCBgaW5pdGlhbGAsIGBsYXN0YCwgYG1hcGAsIGBwbHVja2AsIGByZWplY3RgLCBgcmVzdGAsIGByZXZlcnNlYCxcbiAgICogYHNsaWNlYCwgYHRha2VgLCBgdGFrZVJpZ2h0YCwgYHRha2VSaWdodFdoaWxlYCwgYHRha2VXaGlsZWAsIGB0b0FycmF5YCxcbiAgICogYW5kIGB3aGVyZWBcbiAgICpcbiAgICogVGhlIGNoYWluYWJsZSB3cmFwcGVyIG1ldGhvZHMgYXJlOlxuICAgKiBgYWZ0ZXJgLCBgYXJ5YCwgYGFzc2lnbmAsIGBhdGAsIGBiZWZvcmVgLCBgYmluZGAsIGBiaW5kQWxsYCwgYGJpbmRLZXlgLFxuICAgKiBgY2FsbGJhY2tgLCBgY2hhaW5gLCBgY2h1bmtgLCBgY29tbWl0YCwgYGNvbXBhY3RgLCBgY29uY2F0YCwgYGNvbnN0YW50YCxcbiAgICogYGNvdW50QnlgLCBgY3JlYXRlYCwgYGN1cnJ5YCwgYGRlYm91bmNlYCwgYGRlZmF1bHRzYCwgYGRlZmF1bHRzRGVlcGAsXG4gICAqIGBkZWZlcmAsIGBkZWxheWAsIGBkaWZmZXJlbmNlYCwgYGRyb3BgLCBgZHJvcFJpZ2h0YCwgYGRyb3BSaWdodFdoaWxlYCxcbiAgICogYGRyb3BXaGlsZWAsIGBmaWxsYCwgYGZpbHRlcmAsIGBmbGF0dGVuYCwgYGZsYXR0ZW5EZWVwYCwgYGZsb3dgLCBgZmxvd1JpZ2h0YCxcbiAgICogYGZvckVhY2hgLCBgZm9yRWFjaFJpZ2h0YCwgYGZvckluYCwgYGZvckluUmlnaHRgLCBgZm9yT3duYCwgYGZvck93blJpZ2h0YCxcbiAgICogYGZ1bmN0aW9uc2AsIGBncm91cEJ5YCwgYGluZGV4QnlgLCBgaW5pdGlhbGAsIGBpbnRlcnNlY3Rpb25gLCBgaW52ZXJ0YCxcbiAgICogYGludm9rZWAsIGBrZXlzYCwgYGtleXNJbmAsIGBtYXBgLCBgbWFwS2V5c2AsIGBtYXBWYWx1ZXNgLCBgbWF0Y2hlc2AsXG4gICAqIGBtYXRjaGVzUHJvcGVydHlgLCBgbWVtb2l6ZWAsIGBtZXJnZWAsIGBtZXRob2RgLCBgbWV0aG9kT2ZgLCBgbWl4aW5gLFxuICAgKiBgbW9kQXJnc2AsIGBuZWdhdGVgLCBgb21pdGAsIGBvbmNlYCwgYHBhaXJzYCwgYHBhcnRpYWxgLCBgcGFydGlhbFJpZ2h0YCxcbiAgICogYHBhcnRpdGlvbmAsIGBwaWNrYCwgYHBsYW50YCwgYHBsdWNrYCwgYHByb3BlcnR5YCwgYHByb3BlcnR5T2ZgLCBgcHVsbGAsXG4gICAqIGBwdWxsQXRgLCBgcHVzaGAsIGByYW5nZWAsIGByZWFyZ2AsIGByZWplY3RgLCBgcmVtb3ZlYCwgYHJlc3RgLCBgcmVzdFBhcmFtYCxcbiAgICogYHJldmVyc2VgLCBgc2V0YCwgYHNodWZmbGVgLCBgc2xpY2VgLCBgc29ydGAsIGBzb3J0QnlgLCBgc29ydEJ5QWxsYCxcbiAgICogYHNvcnRCeU9yZGVyYCwgYHNwbGljZWAsIGBzcHJlYWRgLCBgdGFrZWAsIGB0YWtlUmlnaHRgLCBgdGFrZVJpZ2h0V2hpbGVgLFxuICAgKiBgdGFrZVdoaWxlYCwgYHRhcGAsIGB0aHJvdHRsZWAsIGB0aHJ1YCwgYHRpbWVzYCwgYHRvQXJyYXlgLCBgdG9QbGFpbk9iamVjdGAsXG4gICAqIGB0cmFuc2Zvcm1gLCBgdW5pb25gLCBgdW5pcWAsIGB1bnNoaWZ0YCwgYHVuemlwYCwgYHVuemlwV2l0aGAsIGB2YWx1ZXNgLFxuICAgKiBgdmFsdWVzSW5gLCBgd2hlcmVgLCBgd2l0aG91dGAsIGB3cmFwYCwgYHhvcmAsIGB6aXBgLCBgemlwT2JqZWN0YCwgYHppcFdpdGhgXG4gICAqXG4gICAqIFRoZSB3cmFwcGVyIG1ldGhvZHMgdGhhdCBhcmUgKipub3QqKiBjaGFpbmFibGUgYnkgZGVmYXVsdCBhcmU6XG4gICAqIGBhZGRgLCBgYXR0ZW1wdGAsIGBjYW1lbENhc2VgLCBgY2FwaXRhbGl6ZWAsIGBjZWlsYCwgYGNsb25lYCwgYGNsb25lRGVlcGAsXG4gICAqIGBkZWJ1cnJgLCBgZW5kc1dpdGhgLCBgZXNjYXBlYCwgYGVzY2FwZVJlZ0V4cGAsIGBldmVyeWAsIGBmaW5kYCwgYGZpbmRJbmRleGAsXG4gICAqIGBmaW5kS2V5YCwgYGZpbmRMYXN0YCwgYGZpbmRMYXN0SW5kZXhgLCBgZmluZExhc3RLZXlgLCBgZmluZFdoZXJlYCwgYGZpcnN0YCxcbiAgICogYGZsb29yYCwgYGdldGAsIGBndGAsIGBndGVgLCBgaGFzYCwgYGlkZW50aXR5YCwgYGluY2x1ZGVzYCwgYGluZGV4T2ZgLFxuICAgKiBgaW5SYW5nZWAsIGBpc0FyZ3VtZW50c2AsIGBpc0FycmF5YCwgYGlzQm9vbGVhbmAsIGBpc0RhdGVgLCBgaXNFbGVtZW50YCxcbiAgICogYGlzRW1wdHlgLCBgaXNFcXVhbGAsIGBpc0Vycm9yYCwgYGlzRmluaXRlYCBgaXNGdW5jdGlvbmAsIGBpc01hdGNoYCxcbiAgICogYGlzTmF0aXZlYCwgYGlzTmFOYCwgYGlzTnVsbGAsIGBpc051bWJlcmAsIGBpc09iamVjdGAsIGBpc1BsYWluT2JqZWN0YCxcbiAgICogYGlzUmVnRXhwYCwgYGlzU3RyaW5nYCwgYGlzVW5kZWZpbmVkYCwgYGlzVHlwZWRBcnJheWAsIGBqb2luYCwgYGtlYmFiQ2FzZWAsXG4gICAqIGBsYXN0YCwgYGxhc3RJbmRleE9mYCwgYGx0YCwgYGx0ZWAsIGBtYXhgLCBgbWluYCwgYG5vQ29uZmxpY3RgLCBgbm9vcGAsXG4gICAqIGBub3dgLCBgcGFkYCwgYHBhZExlZnRgLCBgcGFkUmlnaHRgLCBgcGFyc2VJbnRgLCBgcG9wYCwgYHJhbmRvbWAsIGByZWR1Y2VgLFxuICAgKiBgcmVkdWNlUmlnaHRgLCBgcmVwZWF0YCwgYHJlc3VsdGAsIGByb3VuZGAsIGBydW5JbkNvbnRleHRgLCBgc2hpZnRgLCBgc2l6ZWAsXG4gICAqIGBzbmFrZUNhc2VgLCBgc29tZWAsIGBzb3J0ZWRJbmRleGAsIGBzb3J0ZWRMYXN0SW5kZXhgLCBgc3RhcnRDYXNlYCxcbiAgICogYHN0YXJ0c1dpdGhgLCBgc3VtYCwgYHRlbXBsYXRlYCwgYHRyaW1gLCBgdHJpbUxlZnRgLCBgdHJpbVJpZ2h0YCwgYHRydW5jYCxcbiAgICogYHVuZXNjYXBlYCwgYHVuaXF1ZUlkYCwgYHZhbHVlYCwgYW5kIGB3b3Jkc2BcbiAgICpcbiAgICogVGhlIHdyYXBwZXIgbWV0aG9kIGBzYW1wbGVgIHdpbGwgcmV0dXJuIGEgd3JhcHBlZCB2YWx1ZSB3aGVuIGBuYCBpcyBwcm92aWRlZCxcbiAgICogb3RoZXJ3aXNlIGFuIHVud3JhcHBlZCB2YWx1ZSBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQG5hbWUgX1xuICAgKiBAY29uc3RydWN0b3JcbiAgICogQGNhdGVnb3J5IENoYWluXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdyYXAgaW4gYSBgbG9kYXNoYCBpbnN0YW5jZS5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbmV3IGBsb2Rhc2hgIHdyYXBwZXIgaW5zdGFuY2UuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIHZhciB3cmFwcGVkID0gXyhbMSwgMiwgM10pO1xuICAgKlxuICAgKiAvLyByZXR1cm5zIGFuIHVud3JhcHBlZCB2YWx1ZVxuICAgKiB3cmFwcGVkLnJlZHVjZShmdW5jdGlvbih0b3RhbCwgbikge1xuICAgKiAgIHJldHVybiB0b3RhbCArIG47XG4gICAqIH0pO1xuICAgKiAvLyA9PiA2XG4gICAqXG4gICAqIC8vIHJldHVybnMgYSB3cmFwcGVkIHZhbHVlXG4gICAqIHZhciBzcXVhcmVzID0gd3JhcHBlZC5tYXAoZnVuY3Rpb24obikge1xuICAgKiAgIHJldHVybiBuICogbjtcbiAgICogfSk7XG4gICAqXG4gICAqIF8uaXNBcnJheShzcXVhcmVzKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICpcbiAgICogXy5pc0FycmF5KHNxdWFyZXMudmFsdWUoKSk7XG4gICAqIC8vID0+IHRydWVcbiAgICovXG4gIGZ1bmN0aW9uIGxvZGFzaCh2YWx1ZSkge1xuICAgIGlmIChpc09iamVjdExpa2UodmFsdWUpICYmICFpc0FycmF5KHZhbHVlKSAmJiAhKHZhbHVlIGluc3RhbmNlb2YgTGF6eVdyYXBwZXIpKSB7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBMb2Rhc2hXcmFwcGVyKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnX19jaGFpbl9fJykgJiYgaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ19fd3JhcHBlZF9fJykpIHtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXJDbG9uZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgTG9kYXNoV3JhcHBlcih2YWx1ZSk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGZ1bmN0aW9uIHdob3NlIHByb3RvdHlwZSBhbGwgY2hhaW5pbmcgd3JhcHBlcnMgaW5oZXJpdCBmcm9tLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZUxvZGFzaCgpIHtcbiAgICAvLyBObyBvcGVyYXRpb24gcGVyZm9ybWVkLlxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGNvbnN0cnVjdG9yIGZvciBjcmVhdGluZyBgbG9kYXNoYCB3cmFwcGVyIG9iamVjdHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHdyYXAuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NoYWluQWxsXSBFbmFibGUgY2hhaW5pbmcgZm9yIGFsbCB3cmFwcGVyIG1ldGhvZHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFthY3Rpb25zPVtdXSBBY3Rpb25zIHRvIHBlZm9ybSB0byByZXNvbHZlIHRoZSB1bndyYXBwZWQgdmFsdWUuXG4gICAqL1xuICBmdW5jdGlvbiBMb2Rhc2hXcmFwcGVyKHZhbHVlLCBjaGFpbkFsbCwgYWN0aW9ucykge1xuICAgIHRoaXMuX193cmFwcGVkX18gPSB2YWx1ZTtcbiAgICB0aGlzLl9fYWN0aW9uc19fID0gYWN0aW9ucyB8fCBbXTtcbiAgICB0aGlzLl9fY2hhaW5fXyA9ICEhY2hhaW5BbGw7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBsYXp5IHdyYXBwZXIgb2JqZWN0IHdoaWNoIHdyYXBzIGB2YWx1ZWAgdG8gZW5hYmxlIGxhenkgZXZhbHVhdGlvbi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gd3JhcC5cbiAgICovXG4gIGZ1bmN0aW9uIExhenlXcmFwcGVyKHZhbHVlKSB7XG4gICAgdGhpcy5fX3dyYXBwZWRfXyA9IHZhbHVlO1xuICAgIHRoaXMuX19hY3Rpb25zX18gPSBbXTtcbiAgICB0aGlzLl9fZGlyX18gPSAxO1xuICAgIHRoaXMuX19maWx0ZXJlZF9fID0gZmFsc2U7XG4gICAgdGhpcy5fX2l0ZXJhdGVlc19fID0gW107XG4gICAgdGhpcy5fX3Rha2VDb3VudF9fID0gUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgdGhpcy5fX3ZpZXdzX18gPSBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgY2xvbmUgb2YgdGhlIGxhenkgd3JhcHBlciBvYmplY3QuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBuYW1lIGNsb25lXG4gICAqIEBtZW1iZXJPZiBMYXp5V3JhcHBlclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBjbG9uZWQgYExhenlXcmFwcGVyYCBvYmplY3QuXG4gICAqL1xuICBmdW5jdGlvbiBsYXp5Q2xvbmUoKSB7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBMYXp5V3JhcHBlcih0aGlzLl9fd3JhcHBlZF9fKTtcbiAgICByZXN1bHQuX19hY3Rpb25zX18gPSBhcnJheUNvcHkodGhpcy5fX2FjdGlvbnNfXyk7XG4gICAgcmVzdWx0Ll9fZGlyX18gPSB0aGlzLl9fZGlyX187XG4gICAgcmVzdWx0Ll9fZmlsdGVyZWRfXyA9IHRoaXMuX19maWx0ZXJlZF9fO1xuICAgIHJlc3VsdC5fX2l0ZXJhdGVlc19fID0gYXJyYXlDb3B5KHRoaXMuX19pdGVyYXRlZXNfXyk7XG4gICAgcmVzdWx0Ll9fdGFrZUNvdW50X18gPSB0aGlzLl9fdGFrZUNvdW50X187XG4gICAgcmVzdWx0Ll9fdmlld3NfXyA9IGFycmF5Q29weSh0aGlzLl9fdmlld3NfXyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXZlcnNlcyB0aGUgZGlyZWN0aW9uIG9mIGxhenkgaXRlcmF0aW9uLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAbmFtZSByZXZlcnNlXG4gICAqIEBtZW1iZXJPZiBMYXp5V3JhcHBlclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgcmV2ZXJzZWQgYExhenlXcmFwcGVyYCBvYmplY3QuXG4gICAqL1xuICBmdW5jdGlvbiBsYXp5UmV2ZXJzZSgpIHtcbiAgICBpZiAodGhpcy5fX2ZpbHRlcmVkX18pIHtcbiAgICAgIHZhciByZXN1bHQgPSBuZXcgTGF6eVdyYXBwZXIodGhpcyk7XG4gICAgICByZXN1bHQuX19kaXJfXyA9IC0xO1xuICAgICAgcmVzdWx0Ll9fZmlsdGVyZWRfXyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMuY2xvbmUoKTtcbiAgICAgIHJlc3VsdC5fX2Rpcl9fICo9IC0xO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHRoZSB1bndyYXBwZWQgdmFsdWUgZnJvbSBpdHMgbGF6eSB3cmFwcGVyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAbmFtZSB2YWx1ZVxuICAgKiBAbWVtYmVyT2YgTGF6eVdyYXBwZXJcbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHVud3JhcHBlZCB2YWx1ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGxhenlWYWx1ZSgpIHtcbiAgICB2YXIgYXJyYXkgPSB0aGlzLl9fd3JhcHBlZF9fLnZhbHVlKCksXG4gICAgICAgIGRpciA9IHRoaXMuX19kaXJfXyxcbiAgICAgICAgaXNBcnIgPSBpc0FycmF5KGFycmF5KSxcbiAgICAgICAgaXNSaWdodCA9IGRpciA8IDAsXG4gICAgICAgIGFyckxlbmd0aCA9IGlzQXJyID8gYXJyYXkubGVuZ3RoIDogMCxcbiAgICAgICAgdmlldyA9IGdldFZpZXcoMCwgYXJyTGVuZ3RoLCB0aGlzLl9fdmlld3NfXyksXG4gICAgICAgIHN0YXJ0ID0gdmlldy5zdGFydCxcbiAgICAgICAgZW5kID0gdmlldy5lbmQsXG4gICAgICAgIGxlbmd0aCA9IGVuZCAtIHN0YXJ0LFxuICAgICAgICBpbmRleCA9IGlzUmlnaHQgPyBlbmQgOiAoc3RhcnQgLSAxKSxcbiAgICAgICAgaXRlcmF0ZWVzID0gdGhpcy5fX2l0ZXJhdGVlc19fLFxuICAgICAgICBpdGVyTGVuZ3RoID0gaXRlcmF0ZWVzLmxlbmd0aCxcbiAgICAgICAgcmVzSW5kZXggPSAwLFxuICAgICAgICB0YWtlQ291bnQgPSBuYXRpdmVNaW4obGVuZ3RoLCB0aGlzLl9fdGFrZUNvdW50X18pO1xuXG4gICAgaWYgKCFpc0FyciB8fCBhcnJMZW5ndGggPCBMQVJHRV9BUlJBWV9TSVpFIHx8IChhcnJMZW5ndGggPT0gbGVuZ3RoICYmIHRha2VDb3VudCA9PSBsZW5ndGgpKSB7XG4gICAgICByZXR1cm4gYmFzZVdyYXBwZXJWYWx1ZSgoaXNSaWdodCAmJiBpc0FycikgPyBhcnJheS5yZXZlcnNlKCkgOiBhcnJheSwgdGhpcy5fX2FjdGlvbnNfXyk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgIG91dGVyOlxuICAgIHdoaWxlIChsZW5ndGgtLSAmJiByZXNJbmRleCA8IHRha2VDb3VudCkge1xuICAgICAgaW5kZXggKz0gZGlyO1xuXG4gICAgICB2YXIgaXRlckluZGV4ID0gLTEsXG4gICAgICAgICAgdmFsdWUgPSBhcnJheVtpbmRleF07XG5cbiAgICAgIHdoaWxlICgrK2l0ZXJJbmRleCA8IGl0ZXJMZW5ndGgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBpdGVyYXRlZXNbaXRlckluZGV4XSxcbiAgICAgICAgICAgIGl0ZXJhdGVlID0gZGF0YS5pdGVyYXRlZSxcbiAgICAgICAgICAgIHR5cGUgPSBkYXRhLnR5cGUsXG4gICAgICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlKTtcblxuICAgICAgICBpZiAodHlwZSA9PSBMQVpZX01BUF9GTEFHKSB7XG4gICAgICAgICAgdmFsdWUgPSBjb21wdXRlZDtcbiAgICAgICAgfSBlbHNlIGlmICghY29tcHV0ZWQpIHtcbiAgICAgICAgICBpZiAodHlwZSA9PSBMQVpZX0ZJTFRFUl9GTEFHKSB7XG4gICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWsgb3V0ZXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXN1bHRbcmVzSW5kZXgrK10gPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICpcbiAgICogQ3JlYXRlcyBhIGNhY2hlIG9iamVjdCB0byBzdG9yZSB1bmlxdWUgdmFsdWVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzXSBUaGUgdmFsdWVzIHRvIGNhY2hlLlxuICAgKi9cbiAgZnVuY3Rpb24gU2V0Q2FjaGUodmFsdWVzKSB7XG4gICAgdmFyIGxlbmd0aCA9IHZhbHVlcyA/IHZhbHVlcy5sZW5ndGggOiAwO1xuXG4gICAgdGhpcy5kYXRhID0geyAnaGFzaCc6IG5hdGl2ZUNyZWF0ZShudWxsKSwgJ3NldCc6IG5ldyBTZXQgfTtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIHRoaXMucHVzaCh2YWx1ZXNbbGVuZ3RoXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGluIGBjYWNoZWAgbWltaWNraW5nIHRoZSByZXR1cm4gc2lnbmF0dXJlIG9mXG4gICAqIGBfLmluZGV4T2ZgIGJ5IHJldHVybmluZyBgMGAgaWYgdGhlIHZhbHVlIGlzIGZvdW5kLCBlbHNlIGAtMWAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWNoZSBUaGUgY2FjaGUgdG8gc2VhcmNoLlxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIGAwYCBpZiBgdmFsdWVgIGlzIGZvdW5kLCBlbHNlIGAtMWAuXG4gICAqL1xuICBmdW5jdGlvbiBjYWNoZUluZGV4T2YoY2FjaGUsIHZhbHVlKSB7XG4gICAgdmFyIGRhdGEgPSBjYWNoZS5kYXRhLFxuICAgICAgICByZXN1bHQgPSAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnIHx8IGlzT2JqZWN0KHZhbHVlKSkgPyBkYXRhLnNldC5oYXModmFsdWUpIDogZGF0YS5oYXNoW3ZhbHVlXTtcblxuICAgIHJldHVybiByZXN1bHQgPyAwIDogLTE7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBgdmFsdWVgIHRvIHRoZSBjYWNoZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQG5hbWUgcHVzaFxuICAgKiBAbWVtYmVyT2YgU2V0Q2FjaGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2FjaGUuXG4gICAqL1xuICBmdW5jdGlvbiBjYWNoZVB1c2godmFsdWUpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnIHx8IGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgZGF0YS5zZXQuYWRkKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGF0YS5oYXNoW3ZhbHVlXSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGFycmF5IGpvaW5pbmcgYGFycmF5YCB3aXRoIGBvdGhlcmAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBqb2luLlxuICAgKiBAcGFyYW0ge0FycmF5fSBvdGhlciBUaGUgb3RoZXIgYXJyYXkgdG8gam9pbi5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgY29uY2F0ZW5hdGVkIGFycmF5LlxuICAgKi9cbiAgZnVuY3Rpb24gYXJyYXlDb25jYXQoYXJyYXksIG90aGVyKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgb3RoSW5kZXggPSAtMSxcbiAgICAgICAgb3RoTGVuZ3RoID0gb3RoZXIubGVuZ3RoLFxuICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGggKyBvdGhMZW5ndGgpO1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHJlc3VsdFtpbmRleF0gPSBhcnJheVtpbmRleF07XG4gICAgfVxuICAgIHdoaWxlICgrK290aEluZGV4IDwgb3RoTGVuZ3RoKSB7XG4gICAgICByZXN1bHRbaW5kZXgrK10gPSBvdGhlcltvdGhJbmRleF07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29waWVzIHRoZSB2YWx1ZXMgb2YgYHNvdXJjZWAgdG8gYGFycmF5YC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gc291cmNlIFRoZSBhcnJheSB0byBjb3B5IHZhbHVlcyBmcm9tLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbYXJyYXk9W11dIFRoZSBhcnJheSB0byBjb3B5IHZhbHVlcyB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGBhcnJheWAuXG4gICAqL1xuICBmdW5jdGlvbiBhcnJheUNvcHkoc291cmNlLCBhcnJheSkge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuXG4gICAgYXJyYXkgfHwgKGFycmF5ID0gQXJyYXkobGVuZ3RoKSk7XG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIGFycmF5W2luZGV4XSA9IHNvdXJjZVtpbmRleF07XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYF8uZm9yRWFjaGAgZm9yIGFycmF5cyB3aXRob3V0IHN1cHBvcnQgZm9yIGNhbGxiYWNrXG4gICAqIHNob3J0aGFuZHMgYW5kIGB0aGlzYCBiaW5kaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAgICovXG4gIGZ1bmN0aW9uIGFycmF5RWFjaChhcnJheSwgaXRlcmF0ZWUpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIGlmIChpdGVyYXRlZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkgPT09IGZhbHNlKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlRXh0cmVtdW1gIGZvciBhcnJheXMgd2hpY2ggaW52b2tlcyBgaXRlcmF0ZWVgXG4gICAqIHdpdGggb25lIGFyZ3VtZW50OiAodmFsdWUpLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb21wYXJhdG9yIFRoZSBmdW5jdGlvbiB1c2VkIHRvIGNvbXBhcmUgdmFsdWVzLlxuICAgKiBAcGFyYW0geyp9IGV4VmFsdWUgVGhlIGluaXRpYWwgZXh0cmVtdW0gdmFsdWUuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBleHRyZW11bSB2YWx1ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGFycmF5RXh0cmVtdW0oYXJyYXksIGl0ZXJhdGVlLCBjb21wYXJhdG9yLCBleFZhbHVlKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgY29tcHV0ZWQgPSBleFZhbHVlLFxuICAgICAgICByZXN1bHQgPSBjb21wdXRlZDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF0sXG4gICAgICAgICAgY3VycmVudCA9ICtpdGVyYXRlZSh2YWx1ZSk7XG5cbiAgICAgIGlmIChjb21wYXJhdG9yKGN1cnJlbnQsIGNvbXB1dGVkKSkge1xuICAgICAgICBjb21wdXRlZCA9IGN1cnJlbnQ7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgXy5maWx0ZXJgIGZvciBhcnJheXMgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgKiBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGZpbHRlcmVkIGFycmF5LlxuICAgKi9cbiAgZnVuY3Rpb24gYXJyYXlGaWx0ZXIoYXJyYXksIHByZWRpY2F0ZSkge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIHJlc0luZGV4ID0gLTEsXG4gICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBhcnJheSkpIHtcbiAgICAgICAgcmVzdWx0WysrcmVzSW5kZXhdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLm1hcGAgZm9yIGFycmF5cyB3aXRob3V0IHN1cHBvcnQgZm9yIGNhbGxiYWNrXG4gICAqIHNob3J0aGFuZHMgYW5kIGB0aGlzYCBiaW5kaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBtYXBwZWQgYXJyYXkuXG4gICAqL1xuICBmdW5jdGlvbiBhcnJheU1hcChhcnJheSwgaXRlcmF0ZWUpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRlZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyB0aGUgZWxlbWVudHMgb2YgYHZhbHVlc2AgdG8gYGFycmF5YC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIG1vZGlmeS5cbiAgICogQHBhcmFtIHtBcnJheX0gdmFsdWVzIFRoZSB2YWx1ZXMgdG8gYXBwZW5kLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAgICovXG4gIGZ1bmN0aW9uIGFycmF5UHVzaChhcnJheSwgdmFsdWVzKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICAgIG9mZnNldCA9IGFycmF5Lmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBhcnJheVtvZmZzZXQgKyBpbmRleF0gPSB2YWx1ZXNbaW5kZXhdO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLnJlZHVjZWAgZm9yIGFycmF5cyB3aXRob3V0IHN1cHBvcnQgZm9yIGNhbGxiYWNrXG4gICAqIHNob3J0aGFuZHMgYW5kIGB0aGlzYCBiaW5kaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcGFyYW0geyp9IFthY2N1bXVsYXRvcl0gVGhlIGluaXRpYWwgdmFsdWUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2luaXRGcm9tQXJyYXldIFNwZWNpZnkgdXNpbmcgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYGFycmF5YFxuICAgKiAgYXMgdGhlIGluaXRpYWwgdmFsdWUuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBhY2N1bXVsYXRlZCB2YWx1ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGFycmF5UmVkdWNlKGFycmF5LCBpdGVyYXRlZSwgYWNjdW11bGF0b3IsIGluaXRGcm9tQXJyYXkpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXG4gICAgaWYgKGluaXRGcm9tQXJyYXkgJiYgbGVuZ3RoKSB7XG4gICAgICBhY2N1bXVsYXRvciA9IGFycmF5WysraW5kZXhdO1xuICAgIH1cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgYWNjdW11bGF0b3IgPSBpdGVyYXRlZShhY2N1bXVsYXRvciwgYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpO1xuICAgIH1cbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLnNvbWVgIGZvciBhcnJheXMgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgKiBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gcHJlZGljYXRlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbnkgZWxlbWVudCBwYXNzZXMgdGhlIHByZWRpY2F0ZSBjaGVjayxcbiAgICogIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGFycmF5U29tZShhcnJheSwgcHJlZGljYXRlKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgXy5hc3NpZ25gIGZvciBjdXN0b21pemluZyBhc3NpZ25lZCB2YWx1ZXMgd2l0aG91dFxuICAgKiBzdXBwb3J0IGZvciBhcmd1bWVudCBqdWdnbGluZywgbXVsdGlwbGUgc291cmNlcywgYW5kIGB0aGlzYCBiaW5kaW5nIGBjdXN0b21pemVyYFxuICAgKiBmdW5jdGlvbnMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSBUaGUgc291cmNlIG9iamVjdC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY3VzdG9taXplciBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGFzc2lnbmVkIHZhbHVlcy5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICovXG4gIGZ1bmN0aW9uIGFzc2lnbldpdGgob2JqZWN0LCBzb3VyY2UsIGN1c3RvbWl6ZXIpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgcHJvcHMgPSBrZXlzKHNvdXJjZSksXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdLFxuICAgICAgICAgIHZhbHVlID0gb2JqZWN0W2tleV0sXG4gICAgICAgICAgcmVzdWx0ID0gY3VzdG9taXplcih2YWx1ZSwgc291cmNlW2tleV0sIGtleSwgb2JqZWN0LCBzb3VyY2UpO1xuXG4gICAgICBpZiAoKHJlc3VsdCA9PT0gcmVzdWx0ID8gKHJlc3VsdCAhPT0gdmFsdWUpIDogKHZhbHVlID09PSB2YWx1ZSkpIHx8XG4gICAgICAgICAgKHZhbHVlID09PSB1bmRlZmluZWQgJiYgIShrZXkgaW4gb2JqZWN0KSkpIHtcbiAgICAgICAgb2JqZWN0W2tleV0gPSByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uYXNzaWduYCB3aXRob3V0IHN1cHBvcnQgZm9yIGFyZ3VtZW50IGp1Z2dsaW5nLFxuICAgKiBtdWx0aXBsZSBzb3VyY2VzLCBhbmQgYGN1c3RvbWl6ZXJgIGZ1bmN0aW9ucy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0LlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZUFzc2lnbihvYmplY3QsIHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgPT0gbnVsbFxuICAgICAgPyBvYmplY3RcbiAgICAgIDogYmFzZUNvcHkoc291cmNlLCBrZXlzKHNvdXJjZSksIG9iamVjdCk7XG4gIH1cblxuICAvKipcbiAgICogQ29waWVzIHByb3BlcnRpZXMgb2YgYHNvdXJjZWAgdG8gYG9iamVjdGAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbS5cbiAgICogQHBhcmFtIHtBcnJheX0gcHJvcHMgVGhlIHByb3BlcnR5IG5hbWVzIHRvIGNvcHkuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0PXt9XSBUaGUgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyB0by5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VDb3B5KHNvdXJjZSwgcHJvcHMsIG9iamVjdCkge1xuICAgIG9iamVjdCB8fCAob2JqZWN0ID0ge30pO1xuXG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgb2JqZWN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jYWxsYmFja2Agd2hpY2ggc3VwcG9ydHMgc3BlY2lmeWluZyB0aGVcbiAgICogbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSBbZnVuYz1fLmlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBjYWxsYmFjay5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIGZ1bmM7XG4gICAgaWYgKHR5cGUgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXNBcmcgPT09IHVuZGVmaW5lZFxuICAgICAgICA/IGZ1bmNcbiAgICAgICAgOiBiaW5kQ2FsbGJhY2soZnVuYywgdGhpc0FyZywgYXJnQ291bnQpO1xuICAgIH1cbiAgICBpZiAoZnVuYyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaWRlbnRpdHk7XG4gICAgfVxuICAgIGlmICh0eXBlID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gYmFzZU1hdGNoZXMoZnVuYyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzQXJnID09PSB1bmRlZmluZWRcbiAgICAgID8gcHJvcGVydHkoZnVuYylcbiAgICAgIDogYmFzZU1hdGNoZXNQcm9wZXJ0eShmdW5jLCB0aGlzQXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jbG9uZWAgd2l0aG91dCBzdXBwb3J0IGZvciBhcmd1bWVudCBqdWdnbGluZ1xuICAgKiBhbmQgYHRoaXNgIGJpbmRpbmcgYGN1c3RvbWl6ZXJgIGZ1bmN0aW9ucy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2xvbmUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcF0gU3BlY2lmeSBhIGRlZXAgY2xvbmUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNsb25pbmcgdmFsdWVzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2tleV0gVGhlIGtleSBvZiBgdmFsdWVgLlxuICAgKiBAcGFyYW0ge09iamVjdH0gW29iamVjdF0gVGhlIG9iamVjdCBgdmFsdWVgIGJlbG9uZ3MgdG8uXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0E9W11dIFRyYWNrcyB0cmF2ZXJzZWQgc291cmNlIG9iamVjdHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIEFzc29jaWF0ZXMgY2xvbmVzIHdpdGggc291cmNlIGNvdW50ZXJwYXJ0cy5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGNsb25lZCB2YWx1ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VDbG9uZSh2YWx1ZSwgaXNEZWVwLCBjdXN0b21pemVyLCBrZXksIG9iamVjdCwgc3RhY2tBLCBzdGFja0IpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmIChjdXN0b21pemVyKSB7XG4gICAgICByZXN1bHQgPSBvYmplY3QgPyBjdXN0b21pemVyKHZhbHVlLCBrZXksIG9iamVjdCkgOiBjdXN0b21pemVyKHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoIWlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB2YXIgaXNBcnIgPSBpc0FycmF5KHZhbHVlKTtcbiAgICBpZiAoaXNBcnIpIHtcbiAgICAgIHJlc3VsdCA9IGluaXRDbG9uZUFycmF5KHZhbHVlKTtcbiAgICAgIGlmICghaXNEZWVwKSB7XG4gICAgICAgIHJldHVybiBhcnJheUNvcHkodmFsdWUsIHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB0YWcgPSBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSxcbiAgICAgICAgICBpc0Z1bmMgPSB0YWcgPT0gZnVuY1RhZztcblxuICAgICAgaWYgKHRhZyA9PSBvYmplY3RUYWcgfHwgdGFnID09IGFyZ3NUYWcgfHwgKGlzRnVuYyAmJiAhb2JqZWN0KSkge1xuICAgICAgICByZXN1bHQgPSBpbml0Q2xvbmVPYmplY3QoaXNGdW5jID8ge30gOiB2YWx1ZSk7XG4gICAgICAgIGlmICghaXNEZWVwKSB7XG4gICAgICAgICAgcmV0dXJuIGJhc2VBc3NpZ24ocmVzdWx0LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjbG9uZWFibGVUYWdzW3RhZ11cbiAgICAgICAgICA/IGluaXRDbG9uZUJ5VGFnKHZhbHVlLCB0YWcsIGlzRGVlcClcbiAgICAgICAgICA6IChvYmplY3QgPyB2YWx1ZSA6IHt9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2hlY2sgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXMgYW5kIHJldHVybiBpdHMgY29ycmVzcG9uZGluZyBjbG9uZS5cbiAgICBzdGFja0EgfHwgKHN0YWNrQSA9IFtdKTtcbiAgICBzdGFja0IgfHwgKHN0YWNrQiA9IFtdKTtcblxuICAgIHZhciBsZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgaWYgKHN0YWNrQVtsZW5ndGhdID09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBzdGFja0JbbGVuZ3RoXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHRoZSBzb3VyY2UgdmFsdWUgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzIGFuZCBhc3NvY2lhdGUgaXQgd2l0aCBpdHMgY2xvbmUuXG4gICAgc3RhY2tBLnB1c2godmFsdWUpO1xuICAgIHN0YWNrQi5wdXNoKHJlc3VsdCk7XG5cbiAgICAvLyBSZWN1cnNpdmVseSBwb3B1bGF0ZSBjbG9uZSAoc3VzY2VwdGlibGUgdG8gY2FsbCBzdGFjayBsaW1pdHMpLlxuICAgIChpc0FyciA/IGFycmF5RWFjaCA6IGJhc2VGb3JPd24pKHZhbHVlLCBmdW5jdGlvbihzdWJWYWx1ZSwga2V5KSB7XG4gICAgICByZXN1bHRba2V5XSA9IGJhc2VDbG9uZShzdWJWYWx1ZSwgaXNEZWVwLCBjdXN0b21pemVyLCBrZXksIHZhbHVlLCBzdGFja0EsIHN0YWNrQik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jcmVhdGVgIHdpdGhvdXQgc3VwcG9ydCBmb3IgYXNzaWduaW5nXG4gICAqIHByb3BlcnRpZXMgdG8gdGhlIGNyZWF0ZWQgb2JqZWN0LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gcHJvdG90eXBlIFRoZSBvYmplY3QgdG8gaW5oZXJpdCBmcm9tLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgKi9cbiAgdmFyIGJhc2VDcmVhdGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gb2JqZWN0KCkge31cbiAgICByZXR1cm4gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgICBpZiAoaXNPYmplY3QocHJvdG90eXBlKSkge1xuICAgICAgICBvYmplY3QucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IG9iamVjdDtcbiAgICAgICAgb2JqZWN0LnByb3RvdHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQgfHwge307XG4gICAgfTtcbiAgfSgpKTtcblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZm9yRWFjaGAgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgKiBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHJldHVybnMge0FycmF5fE9iamVjdHxzdHJpbmd9IFJldHVybnMgYGNvbGxlY3Rpb25gLlxuICAgKi9cbiAgdmFyIGJhc2VFYWNoID0gY3JlYXRlQmFzZUVhY2goYmFzZUZvck93bik7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGV4dHJlbXVtIHZhbHVlIG9mIGBjb2xsZWN0aW9uYCBpbnZva2luZyBgaXRlcmF0ZWVgIGZvciBlYWNoIHZhbHVlXG4gICAqIGluIGBjb2xsZWN0aW9uYCB0byBnZW5lcmF0ZSB0aGUgY3JpdGVyaW9uIGJ5IHdoaWNoIHRoZSB2YWx1ZSBpcyByYW5rZWQuXG4gICAqIFRoZSBgaXRlcmF0ZWVgIGlzIGludm9rZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6ICh2YWx1ZSwgaW5kZXh8a2V5LCBjb2xsZWN0aW9uKS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGFyYXRvciBUaGUgZnVuY3Rpb24gdXNlZCB0byBjb21wYXJlIHZhbHVlcy5cbiAgICogQHBhcmFtIHsqfSBleFZhbHVlIFRoZSBpbml0aWFsIGV4dHJlbXVtIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZXh0cmVtdW0gdmFsdWUuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlRXh0cmVtdW0oY29sbGVjdGlvbiwgaXRlcmF0ZWUsIGNvbXBhcmF0b3IsIGV4VmFsdWUpIHtcbiAgICB2YXIgY29tcHV0ZWQgPSBleFZhbHVlLFxuICAgICAgICByZXN1bHQgPSBjb21wdXRlZDtcblxuICAgIGJhc2VFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgdmFyIGN1cnJlbnQgPSAraXRlcmF0ZWUodmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIGlmIChjb21wYXJhdG9yKGN1cnJlbnQsIGNvbXB1dGVkKSB8fCAoY3VycmVudCA9PT0gZXhWYWx1ZSAmJiBjdXJyZW50ID09PSByZXN1bHQpKSB7XG4gICAgICAgIGNvbXB1dGVkID0gY3VycmVudDtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5maWx0ZXJgIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2tcbiAgICogc2hvcnRoYW5kcyBhbmQgYHRoaXNgIGJpbmRpbmcuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHByZWRpY2F0ZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBmaWx0ZXJlZCBhcnJheS5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VGaWx0ZXIoY29sbGVjdGlvbiwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGJhc2VFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZsYXR0ZW5gIHdpdGggYWRkZWQgc3VwcG9ydCBmb3IgcmVzdHJpY3RpbmdcbiAgICogZmxhdHRlbmluZyBhbmQgc3BlY2lmeWluZyB0aGUgc3RhcnQgaW5kZXguXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBmbGF0dGVuLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0RlZXBdIFNwZWNpZnkgYSBkZWVwIGZsYXR0ZW4uXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzU3RyaWN0XSBSZXN0cmljdCBmbGF0dGVuaW5nIHRvIGFycmF5cy1saWtlIG9iamVjdHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtyZXN1bHQ9W11dIFRoZSBpbml0aWFsIHJlc3VsdCB2YWx1ZS5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgZmxhdHRlbmVkIGFycmF5LlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZUZsYXR0ZW4oYXJyYXksIGlzRGVlcCwgaXNTdHJpY3QsIHJlc3VsdCkge1xuICAgIHJlc3VsdCB8fCAocmVzdWx0ID0gW10pO1xuXG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgICBpZiAoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0FycmF5TGlrZSh2YWx1ZSkgJiZcbiAgICAgICAgICAoaXNTdHJpY3QgfHwgaXNBcnJheSh2YWx1ZSkgfHwgaXNBcmd1bWVudHModmFsdWUpKSkge1xuICAgICAgICBpZiAoaXNEZWVwKSB7XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgZmxhdHRlbiBhcnJheXMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKS5cbiAgICAgICAgICBiYXNlRmxhdHRlbih2YWx1ZSwgaXNEZWVwLCBpc1N0cmljdCwgcmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhcnJheVB1c2gocmVzdWx0LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWlzU3RyaWN0KSB7XG4gICAgICAgIHJlc3VsdFtyZXN1bHQubGVuZ3RoXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBiYXNlRm9ySW5gIGFuZCBgYmFzZUZvck93bmAgd2hpY2ggaXRlcmF0ZXNcbiAgICogb3ZlciBgb2JqZWN0YCBwcm9wZXJ0aWVzIHJldHVybmVkIGJ5IGBrZXlzRnVuY2AgaW52b2tpbmcgYGl0ZXJhdGVlYCBmb3JcbiAgICogZWFjaCBwcm9wZXJ0eS4gSXRlcmF0ZWUgZnVuY3Rpb25zIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5XG4gICAqIHJldHVybmluZyBgZmFsc2VgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlzRnVuYyBUaGUgZnVuY3Rpb24gdG8gZ2V0IHRoZSBrZXlzIG9mIGBvYmplY3RgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICAgKi9cbiAgdmFyIGJhc2VGb3IgPSBjcmVhdGVCYXNlRm9yKCk7XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZvckluYCB3aXRob3V0IHN1cHBvcnQgZm9yIGNhbGxiYWNrXG4gICAqIHNob3J0aGFuZHMgYW5kIGB0aGlzYCBiaW5kaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZUZvckluKG9iamVjdCwgaXRlcmF0ZWUpIHtcbiAgICByZXR1cm4gYmFzZUZvcihvYmplY3QsIGl0ZXJhdGVlLCBrZXlzSW4pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZvck93bmAgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgKiBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VGb3JPd24ob2JqZWN0LCBpdGVyYXRlZSkge1xuICAgIHJldHVybiBiYXNlRm9yKG9iamVjdCwgaXRlcmF0ZWUsIGtleXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLmZ1bmN0aW9uc2Agd2hpY2ggY3JlYXRlcyBhbiBhcnJheSBvZlxuICAgKiBgb2JqZWN0YCBmdW5jdGlvbiBwcm9wZXJ0eSBuYW1lcyBmaWx0ZXJlZCBmcm9tIHRob3NlIHByb3ZpZGVkLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW5zcGVjdC5cbiAgICogQHBhcmFtIHtBcnJheX0gcHJvcHMgVGhlIHByb3BlcnR5IG5hbWVzIHRvIGZpbHRlci5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgYXJyYXkgb2YgZmlsdGVyZWQgcHJvcGVydHkgbmFtZXMuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlRnVuY3Rpb25zKG9iamVjdCwgcHJvcHMpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoLFxuICAgICAgICByZXNJbmRleCA9IC0xLFxuICAgICAgICByZXN1bHQgPSBbXTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgaWYgKGlzRnVuY3Rpb24ob2JqZWN0W2tleV0pKSB7XG4gICAgICAgIHJlc3VsdFsrK3Jlc0luZGV4XSA9IGtleTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgZ2V0YCB3aXRob3V0IHN1cHBvcnQgZm9yIHN0cmluZyBwYXRoc1xuICAgKiBhbmQgZGVmYXVsdCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAgICogQHBhcmFtIHtBcnJheX0gcGF0aCBUaGUgcGF0aCBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3BhdGhLZXldIFRoZSBrZXkgcmVwcmVzZW50YXRpb24gb2YgcGF0aC5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc29sdmVkIHZhbHVlLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZUdldChvYmplY3QsIHBhdGgsIHBhdGhLZXkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHBhdGhLZXkgIT09IHVuZGVmaW5lZCAmJiBwYXRoS2V5IGluIHRvT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgIHBhdGggPSBbcGF0aEtleV07XG4gICAgfVxuICAgIHZhciBpbmRleCA9IDAsXG4gICAgICAgIGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuXG4gICAgd2hpbGUgKG9iamVjdCAhPSBudWxsICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3RbcGF0aFtpbmRleCsrXV07XG4gICAgfVxuICAgIHJldHVybiAoaW5kZXggJiYgaW5kZXggPT0gbGVuZ3RoKSA/IG9iamVjdCA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5pc0VxdWFsYCB3aXRob3V0IHN1cHBvcnQgZm9yIGB0aGlzYCBiaW5kaW5nXG4gICAqIGBjdXN0b21pemVyYCBmdW5jdGlvbnMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNvbXBhcmUuXG4gICAqIEBwYXJhbSB7Kn0gb3RoZXIgVGhlIG90aGVyIHZhbHVlIHRvIGNvbXBhcmUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmluZyB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzTG9vc2VdIFNwZWNpZnkgcGVyZm9ybWluZyBwYXJ0aWFsIGNvbXBhcmlzb25zLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tBXSBUcmFja3MgdHJhdmVyc2VkIGB2YWx1ZWAgb2JqZWN0cy5cbiAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQl0gVHJhY2tzIHRyYXZlcnNlZCBgb3RoZXJgIG9iamVjdHMuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlSXNFcXVhbCh2YWx1ZSwgb3RoZXIsIGN1c3RvbWl6ZXIsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gICAgaWYgKHZhbHVlID09PSBvdGhlcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IG90aGVyID09IG51bGwgfHwgKCFpc09iamVjdCh2YWx1ZSkgJiYgIWlzT2JqZWN0TGlrZShvdGhlcikpKSB7XG4gICAgICByZXR1cm4gdmFsdWUgIT09IHZhbHVlICYmIG90aGVyICE9PSBvdGhlcjtcbiAgICB9XG4gICAgcmV0dXJuIGJhc2VJc0VxdWFsRGVlcCh2YWx1ZSwgb3RoZXIsIGJhc2VJc0VxdWFsLCBjdXN0b21pemVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQik7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlSXNFcXVhbGAgZm9yIGFycmF5cyBhbmQgb2JqZWN0cyB3aGljaCBwZXJmb3Jtc1xuICAgKiBkZWVwIGNvbXBhcmlzb25zIGFuZCB0cmFja3MgdHJhdmVyc2VkIG9iamVjdHMgZW5hYmxpbmcgb2JqZWN0cyB3aXRoIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgdG8gYmUgY29tcGFyZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBjb21wYXJlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgVGhlIG90aGVyIG9iamVjdCB0byBjb21wYXJlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlcXVhbEZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRldGVybWluZSBlcXVpdmFsZW50cyBvZiB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGNvbXBhcmluZyBvYmplY3RzLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0xvb3NlXSBTcGVjaWZ5IHBlcmZvcm1pbmcgcGFydGlhbCBjb21wYXJpc29ucy5cbiAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQT1bXV0gVHJhY2tzIHRyYXZlcnNlZCBgdmFsdWVgIG9iamVjdHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIFRyYWNrcyB0cmF2ZXJzZWQgYG90aGVyYCBvYmplY3RzLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdHMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VJc0VxdWFsRGVlcChvYmplY3QsIG90aGVyLCBlcXVhbEZ1bmMsIGN1c3RvbWl6ZXIsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gICAgdmFyIG9iaklzQXJyID0gaXNBcnJheShvYmplY3QpLFxuICAgICAgICBvdGhJc0FyciA9IGlzQXJyYXkob3RoZXIpLFxuICAgICAgICBvYmpUYWcgPSBhcnJheVRhZyxcbiAgICAgICAgb3RoVGFnID0gYXJyYXlUYWc7XG5cbiAgICBpZiAoIW9iaklzQXJyKSB7XG4gICAgICBvYmpUYWcgPSBvYmpUb1N0cmluZy5jYWxsKG9iamVjdCk7XG4gICAgICBpZiAob2JqVGFnID09IGFyZ3NUYWcpIHtcbiAgICAgICAgb2JqVGFnID0gb2JqZWN0VGFnO1xuICAgICAgfSBlbHNlIGlmIChvYmpUYWcgIT0gb2JqZWN0VGFnKSB7XG4gICAgICAgIG9iaklzQXJyID0gaXNUeXBlZEFycmF5KG9iamVjdCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghb3RoSXNBcnIpIHtcbiAgICAgIG90aFRhZyA9IG9ialRvU3RyaW5nLmNhbGwob3RoZXIpO1xuICAgICAgaWYgKG90aFRhZyA9PSBhcmdzVGFnKSB7XG4gICAgICAgIG90aFRhZyA9IG9iamVjdFRhZztcbiAgICAgIH0gZWxzZSBpZiAob3RoVGFnICE9IG9iamVjdFRhZykge1xuICAgICAgICBvdGhJc0FyciA9IGlzVHlwZWRBcnJheShvdGhlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBvYmpJc09iaiA9IG9ialRhZyA9PSBvYmplY3RUYWcsXG4gICAgICAgIG90aElzT2JqID0gb3RoVGFnID09IG9iamVjdFRhZyxcbiAgICAgICAgaXNTYW1lVGFnID0gb2JqVGFnID09IG90aFRhZztcblxuICAgIGlmIChpc1NhbWVUYWcgJiYgIShvYmpJc0FyciB8fCBvYmpJc09iaikpIHtcbiAgICAgIHJldHVybiBlcXVhbEJ5VGFnKG9iamVjdCwgb3RoZXIsIG9ialRhZyk7XG4gICAgfVxuICAgIGlmICghaXNMb29zZSkge1xuICAgICAgdmFyIG9iaklzV3JhcHBlZCA9IG9iaklzT2JqICYmIGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCAnX193cmFwcGVkX18nKSxcbiAgICAgICAgICBvdGhJc1dyYXBwZWQgPSBvdGhJc09iaiAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG90aGVyLCAnX193cmFwcGVkX18nKTtcblxuICAgICAgaWYgKG9iaklzV3JhcHBlZCB8fCBvdGhJc1dyYXBwZWQpIHtcbiAgICAgICAgcmV0dXJuIGVxdWFsRnVuYyhvYmpJc1dyYXBwZWQgPyBvYmplY3QudmFsdWUoKSA6IG9iamVjdCwgb3RoSXNXcmFwcGVkID8gb3RoZXIudmFsdWUoKSA6IG90aGVyLCBjdXN0b21pemVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQik7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaXNTYW1lVGFnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFzc3VtZSBjeWNsaWMgdmFsdWVzIGFyZSBlcXVhbC5cbiAgICAvLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBkZXRlY3RpbmcgY2lyY3VsYXIgcmVmZXJlbmNlcyBzZWUgaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyNKTy5cbiAgICBzdGFja0EgfHwgKHN0YWNrQSA9IFtdKTtcbiAgICBzdGFja0IgfHwgKHN0YWNrQiA9IFtdKTtcblxuICAgIHZhciBsZW5ndGggPSBzdGFja0EubGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgaWYgKHN0YWNrQVtsZW5ndGhdID09IG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc3RhY2tCW2xlbmd0aF0gPT0gb3RoZXI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFkZCBgb2JqZWN0YCBhbmQgYG90aGVyYCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgc3RhY2tBLnB1c2gob2JqZWN0KTtcbiAgICBzdGFja0IucHVzaChvdGhlcik7XG5cbiAgICB2YXIgcmVzdWx0ID0gKG9iaklzQXJyID8gZXF1YWxBcnJheXMgOiBlcXVhbE9iamVjdHMpKG9iamVjdCwgb3RoZXIsIGVxdWFsRnVuYywgY3VzdG9taXplciwgaXNMb29zZSwgc3RhY2tBLCBzdGFja0IpO1xuXG4gICAgc3RhY2tBLnBvcCgpO1xuICAgIHN0YWNrQi5wb3AoKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uaXNNYXRjaGAgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICAgKiBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gICAqIEBwYXJhbSB7QXJyYXl9IG1hdGNoRGF0YSBUaGUgcHJvcGVyeSBuYW1lcywgdmFsdWVzLCBhbmQgY29tcGFyZSBmbGFncyB0byBtYXRjaC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2N1c3RvbWl6ZXJdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY29tcGFyaW5nIG9iamVjdHMuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgb2JqZWN0YCBpcyBhIG1hdGNoLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlSXNNYXRjaChvYmplY3QsIG1hdGNoRGF0YSwgY3VzdG9taXplcikge1xuICAgIHZhciBpbmRleCA9IG1hdGNoRGF0YS5sZW5ndGgsXG4gICAgICAgIGxlbmd0aCA9IGluZGV4LFxuICAgICAgICBub0N1c3RvbWl6ZXIgPSAhY3VzdG9taXplcjtcblxuICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICFsZW5ndGg7XG4gICAgfVxuICAgIG9iamVjdCA9IHRvT2JqZWN0KG9iamVjdCk7XG4gICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgIHZhciBkYXRhID0gbWF0Y2hEYXRhW2luZGV4XTtcbiAgICAgIGlmICgobm9DdXN0b21pemVyICYmIGRhdGFbMl0pXG4gICAgICAgICAgICA/IGRhdGFbMV0gIT09IG9iamVjdFtkYXRhWzBdXVxuICAgICAgICAgICAgOiAhKGRhdGFbMF0gaW4gb2JqZWN0KVxuICAgICAgICAgICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBkYXRhID0gbWF0Y2hEYXRhW2luZGV4XTtcbiAgICAgIHZhciBrZXkgPSBkYXRhWzBdLFxuICAgICAgICAgIG9ialZhbHVlID0gb2JqZWN0W2tleV0sXG4gICAgICAgICAgc3JjVmFsdWUgPSBkYXRhWzFdO1xuXG4gICAgICBpZiAobm9DdXN0b21pemVyICYmIGRhdGFbMl0pIHtcbiAgICAgICAgaWYgKG9ialZhbHVlID09PSB1bmRlZmluZWQgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGN1c3RvbWl6ZXIgPyBjdXN0b21pemVyKG9ialZhbHVlLCBzcmNWYWx1ZSwga2V5KSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCEocmVzdWx0ID09PSB1bmRlZmluZWQgPyBiYXNlSXNFcXVhbChzcmNWYWx1ZSwgb2JqVmFsdWUsIGN1c3RvbWl6ZXIsIHRydWUpIDogcmVzdWx0KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5tYXBgIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgKiBhbmQgYHRoaXNgIGJpbmRpbmcuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IG1hcHBlZCBhcnJheS5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VNYXAoY29sbGVjdGlvbiwgaXRlcmF0ZWUpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgcmVzdWx0ID0gaXNBcnJheUxpa2UoY29sbGVjdGlvbikgPyBBcnJheShjb2xsZWN0aW9uLmxlbmd0aCkgOiBbXTtcblxuICAgIGJhc2VFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pIHtcbiAgICAgIHJlc3VsdFsrK2luZGV4XSA9IGl0ZXJhdGVlKHZhbHVlLCBrZXksIGNvbGxlY3Rpb24pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ubWF0Y2hlc2Agd2hpY2ggZG9lcyBub3QgY2xvbmUgYHNvdXJjZWAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIG9iamVjdCBvZiBwcm9wZXJ0eSB2YWx1ZXMgdG8gbWF0Y2guXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZU1hdGNoZXMoc291cmNlKSB7XG4gICAgdmFyIG1hdGNoRGF0YSA9IGdldE1hdGNoRGF0YShzb3VyY2UpO1xuICAgIGlmIChtYXRjaERhdGEubGVuZ3RoID09IDEgJiYgbWF0Y2hEYXRhWzBdWzJdKSB7XG4gICAgICB2YXIga2V5ID0gbWF0Y2hEYXRhWzBdWzBdLFxuICAgICAgICAgIHZhbHVlID0gbWF0Y2hEYXRhWzBdWzFdO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqZWN0W2tleV0gPT09IHZhbHVlICYmICh2YWx1ZSAhPT0gdW5kZWZpbmVkIHx8IChrZXkgaW4gdG9PYmplY3Qob2JqZWN0KSkpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgICAgcmV0dXJuIGJhc2VJc01hdGNoKG9iamVjdCwgbWF0Y2hEYXRhKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLm1hdGNoZXNQcm9wZXJ0eWAgd2hpY2ggZG9lcyBub3QgY2xvbmUgYHNyY1ZhbHVlYC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAgICogQHBhcmFtIHsqfSBzcmNWYWx1ZSBUaGUgdmFsdWUgdG8gY29tcGFyZS5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBiYXNlTWF0Y2hlc1Byb3BlcnR5KHBhdGgsIHNyY1ZhbHVlKSB7XG4gICAgdmFyIGlzQXJyID0gaXNBcnJheShwYXRoKSxcbiAgICAgICAgaXNDb21tb24gPSBpc0tleShwYXRoKSAmJiBpc1N0cmljdENvbXBhcmFibGUoc3JjVmFsdWUpLFxuICAgICAgICBwYXRoS2V5ID0gKHBhdGggKyAnJyk7XG5cbiAgICBwYXRoID0gdG9QYXRoKHBhdGgpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIga2V5ID0gcGF0aEtleTtcbiAgICAgIG9iamVjdCA9IHRvT2JqZWN0KG9iamVjdCk7XG4gICAgICBpZiAoKGlzQXJyIHx8ICFpc0NvbW1vbikgJiYgIShrZXkgaW4gb2JqZWN0KSkge1xuICAgICAgICBvYmplY3QgPSBwYXRoLmxlbmd0aCA9PSAxID8gb2JqZWN0IDogYmFzZUdldChvYmplY3QsIGJhc2VTbGljZShwYXRoLCAwLCAtMSkpO1xuICAgICAgICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAga2V5ID0gbGFzdChwYXRoKTtcbiAgICAgICAgb2JqZWN0ID0gdG9PYmplY3Qob2JqZWN0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmplY3Rba2V5XSA9PT0gc3JjVmFsdWVcbiAgICAgICAgPyAoc3JjVmFsdWUgIT09IHVuZGVmaW5lZCB8fCAoa2V5IGluIG9iamVjdCkpXG4gICAgICAgIDogYmFzZUlzRXF1YWwoc3JjVmFsdWUsIG9iamVjdFtrZXldLCB1bmRlZmluZWQsIHRydWUpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucHJvcGVydHlgIHdpdGhvdXQgc3VwcG9ydCBmb3IgZGVlcCBwYXRocy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVByb3BlcnR5KGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlUHJvcGVydHlgIHdoaWNoIHN1cHBvcnRzIGRlZXAgcGF0aHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVByb3BlcnR5RGVlcChwYXRoKSB7XG4gICAgdmFyIHBhdGhLZXkgPSAocGF0aCArICcnKTtcbiAgICBwYXRoID0gdG9QYXRoKHBhdGgpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgIHJldHVybiBiYXNlR2V0KG9iamVjdCwgcGF0aCwgcGF0aEtleSk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5yZWR1Y2VgIGFuZCBgXy5yZWR1Y2VSaWdodGAgd2l0aG91dCBzdXBwb3J0XG4gICAqIGZvciBjYWxsYmFjayBzaG9ydGhhbmRzIGFuZCBgdGhpc2AgYmluZGluZywgd2hpY2ggaXRlcmF0ZXMgb3ZlciBgY29sbGVjdGlvbmBcbiAgICogdXNpbmcgdGhlIHByb3ZpZGVkIGBlYWNoRnVuY2AuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEBwYXJhbSB7Kn0gYWNjdW11bGF0b3IgVGhlIGluaXRpYWwgdmFsdWUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gaW5pdEZyb21Db2xsZWN0aW9uIFNwZWNpZnkgdXNpbmcgdGhlIGZpcnN0IG9yIGxhc3QgZWxlbWVudFxuICAgKiAgb2YgYGNvbGxlY3Rpb25gIGFzIHRoZSBpbml0aWFsIHZhbHVlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBlYWNoRnVuYyBUaGUgZnVuY3Rpb24gdG8gaXRlcmF0ZSBvdmVyIGBjb2xsZWN0aW9uYC5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGFjY3VtdWxhdGVkIHZhbHVlLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVJlZHVjZShjb2xsZWN0aW9uLCBpdGVyYXRlZSwgYWNjdW11bGF0b3IsIGluaXRGcm9tQ29sbGVjdGlvbiwgZWFjaEZ1bmMpIHtcbiAgICBlYWNoRnVuYyhjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgIGFjY3VtdWxhdG9yID0gaW5pdEZyb21Db2xsZWN0aW9uXG4gICAgICAgID8gKGluaXRGcm9tQ29sbGVjdGlvbiA9IGZhbHNlLCB2YWx1ZSlcbiAgICAgICAgOiBpdGVyYXRlZShhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYHNldERhdGFgIHdpdGhvdXQgc3VwcG9ydCBmb3IgaG90IGxvb3AgZGV0ZWN0aW9uLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBhc3NvY2lhdGUgbWV0YWRhdGEgd2l0aC5cbiAgICogQHBhcmFtIHsqfSBkYXRhIFRoZSBtZXRhZGF0YS5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIGBmdW5jYC5cbiAgICovXG4gIHZhciBiYXNlU2V0RGF0YSA9ICFtZXRhTWFwID8gaWRlbnRpdHkgOiBmdW5jdGlvbihmdW5jLCBkYXRhKSB7XG4gICAgbWV0YU1hcC5zZXQoZnVuYywgZGF0YSk7XG4gICAgcmV0dXJuIGZ1bmM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnNsaWNlYCB3aXRob3V0IGFuIGl0ZXJhdGVlIGNhbGwgZ3VhcmQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBzbGljZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtzdGFydD0wXSBUaGUgc3RhcnQgcG9zaXRpb24uXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbZW5kPWFycmF5Lmxlbmd0aF0gVGhlIGVuZCBwb3NpdGlvbi5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBzbGljZSBvZiBgYXJyYXlgLlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVNsaWNlKGFycmF5LCBzdGFydCwgZW5kKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICAgIHN0YXJ0ID0gc3RhcnQgPT0gbnVsbCA/IDAgOiAoK3N0YXJ0IHx8IDApO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHN0YXJ0ID0gLXN0YXJ0ID4gbGVuZ3RoID8gMCA6IChsZW5ndGggKyBzdGFydCk7XG4gICAgfVxuICAgIGVuZCA9IChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiBsZW5ndGgpID8gbGVuZ3RoIDogKCtlbmQgfHwgMCk7XG4gICAgaWYgKGVuZCA8IDApIHtcbiAgICAgIGVuZCArPSBsZW5ndGg7XG4gICAgfVxuICAgIGxlbmd0aCA9IHN0YXJ0ID4gZW5kID8gMCA6ICgoZW5kIC0gc3RhcnQpID4+PiAwKTtcbiAgICBzdGFydCA+Pj49IDA7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKTtcbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IGFycmF5W2luZGV4ICsgc3RhcnRdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnVuaXFgIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgKiBhbmQgYHRoaXNgIGJpbmRpbmcuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXRlcmF0ZWVdIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGR1cGxpY2F0ZS12YWx1ZS1mcmVlIGFycmF5LlxuICAgKi9cbiAgZnVuY3Rpb24gYmFzZVVuaXEoYXJyYXksIGl0ZXJhdGVlKSB7XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGluZGV4T2YgPSBnZXRJbmRleE9mKCksXG4gICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgaXNDb21tb24gPSBpbmRleE9mID09IGJhc2VJbmRleE9mLFxuICAgICAgICBpc0xhcmdlID0gaXNDb21tb24gJiYgbGVuZ3RoID49IExBUkdFX0FSUkFZX1NJWkUsXG4gICAgICAgIHNlZW4gPSBpc0xhcmdlID8gY3JlYXRlQ2FjaGUoKSA6IG51bGwsXG4gICAgICAgIHJlc3VsdCA9IFtdO1xuXG4gICAgaWYgKHNlZW4pIHtcbiAgICAgIGluZGV4T2YgPSBjYWNoZUluZGV4T2Y7XG4gICAgICBpc0NvbW1vbiA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpc0xhcmdlID0gZmFsc2U7XG4gICAgICBzZWVuID0gaXRlcmF0ZWUgPyBbXSA6IHJlc3VsdDtcbiAgICB9XG4gICAgb3V0ZXI6XG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XSxcbiAgICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlID8gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBhcnJheSkgOiB2YWx1ZTtcblxuICAgICAgaWYgKGlzQ29tbW9uICYmIHZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgICB2YXIgc2VlbkluZGV4ID0gc2Vlbi5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChzZWVuSW5kZXgtLSkge1xuICAgICAgICAgIGlmIChzZWVuW3NlZW5JbmRleF0gPT09IGNvbXB1dGVkKSB7XG4gICAgICAgICAgICBjb250aW51ZSBvdXRlcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0ZXJhdGVlKSB7XG4gICAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChpbmRleE9mKHNlZW4sIGNvbXB1dGVkLCAwKSA8IDApIHtcbiAgICAgICAgaWYgKGl0ZXJhdGVlIHx8IGlzTGFyZ2UpIHtcbiAgICAgICAgICBzZWVuLnB1c2goY29tcHV0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy52YWx1ZXNgIGFuZCBgXy52YWx1ZXNJbmAgd2hpY2ggY3JlYXRlcyBhblxuICAgKiBhcnJheSBvZiBgb2JqZWN0YCBwcm9wZXJ0eSB2YWx1ZXMgY29ycmVzcG9uZGluZyB0byB0aGUgcHJvcGVydHkgbmFtZXNcbiAgICogb2YgYHByb3BzYC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcGFyYW0ge0FycmF5fSBwcm9wcyBUaGUgcHJvcGVydHkgbmFtZXMgdG8gZ2V0IHZhbHVlcyBmb3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IHZhbHVlcy5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VWYWx1ZXMob2JqZWN0LCBwcm9wcykge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IG9iamVjdFtwcm9wc1tpbmRleF1dO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGB3cmFwcGVyVmFsdWVgIHdoaWNoIHJldHVybnMgdGhlIHJlc3VsdCBvZlxuICAgKiBwZXJmb3JtaW5nIGEgc2VxdWVuY2Ugb2YgYWN0aW9ucyBvbiB0aGUgdW53cmFwcGVkIGB2YWx1ZWAsIHdoZXJlIGVhY2hcbiAgICogc3VjY2Vzc2l2ZSBhY3Rpb24gaXMgc3VwcGxpZWQgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgcHJldmlvdXMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHVud3JhcHBlZCB2YWx1ZS5cbiAgICogQHBhcmFtIHtBcnJheX0gYWN0aW9ucyBBY3Rpb25zIHRvIHBlZm9ybSB0byByZXNvbHZlIHRoZSB1bndyYXBwZWQgdmFsdWUuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSByZXNvbHZlZCB2YWx1ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGJhc2VXcmFwcGVyVmFsdWUodmFsdWUsIGFjdGlvbnMpIHtcbiAgICB2YXIgcmVzdWx0ID0gdmFsdWU7XG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIExhenlXcmFwcGVyKSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQudmFsdWUoKTtcbiAgICB9XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IGFjdGlvbnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciBhY3Rpb24gPSBhY3Rpb25zW2luZGV4XTtcbiAgICAgIHJlc3VsdCA9IGFjdGlvbi5mdW5jLmFwcGx5KGFjdGlvbi50aGlzQXJnLCBhcnJheVB1c2goW3Jlc3VsdF0sIGFjdGlvbi5hcmdzKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoIG9mIGBhcnJheWAgdG8gZGV0ZXJtaW5lIHRoZSBpbmRleCBhdCB3aGljaCBgdmFsdWVgXG4gICAqIHNob3VsZCBiZSBpbnNlcnRlZCBpbnRvIGBhcnJheWAgaW4gb3JkZXIgdG8gbWFpbnRhaW4gaXRzIHNvcnQgb3JkZXIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBzb3J0ZWQgYXJyYXkgdG8gaW5zcGVjdC5cbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gZXZhbHVhdGUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JldEhpZ2hlc3RdIFNwZWNpZnkgcmV0dXJuaW5nIHRoZSBoaWdoZXN0IHF1YWxpZmllZCBpbmRleC5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgaW5kZXggYXQgd2hpY2ggYHZhbHVlYCBzaG91bGQgYmUgaW5zZXJ0ZWRcbiAgICogIGludG8gYGFycmF5YC5cbiAgICovXG4gIGZ1bmN0aW9uIGJpbmFyeUluZGV4KGFycmF5LCB2YWx1ZSwgcmV0SGlnaGVzdCkge1xuICAgIHZhciBsb3cgPSAwLFxuICAgICAgICBoaWdoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiBsb3c7XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID09PSB2YWx1ZSAmJiBoaWdoIDw9IEhBTEZfTUFYX0FSUkFZX0xFTkdUSCkge1xuICAgICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMSxcbiAgICAgICAgICAgIGNvbXB1dGVkID0gYXJyYXlbbWlkXTtcblxuICAgICAgICBpZiAoKHJldEhpZ2hlc3QgPyAoY29tcHV0ZWQgPD0gdmFsdWUpIDogKGNvbXB1dGVkIDwgdmFsdWUpKSAmJiBjb21wdXRlZCAhPT0gbnVsbCkge1xuICAgICAgICAgIGxvdyA9IG1pZCArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaGlnaCA9IG1pZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhpZ2g7XG4gICAgfVxuICAgIHJldHVybiBiaW5hcnlJbmRleEJ5KGFycmF5LCB2YWx1ZSwgaWRlbnRpdHksIHJldEhpZ2hlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgbGlrZSBgYmluYXJ5SW5kZXhgIGV4Y2VwdCB0aGF0IGl0IGludm9rZXMgYGl0ZXJhdGVlYCBmb3JcbiAgICogYHZhbHVlYCBhbmQgZWFjaCBlbGVtZW50IG9mIGBhcnJheWAgdG8gY29tcHV0ZSB0aGVpciBzb3J0IHJhbmtpbmcuIFRoZVxuICAgKiBpdGVyYXRlZSBpcyBpbnZva2VkIHdpdGggb25lIGFyZ3VtZW50OyAodmFsdWUpLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgc29ydGVkIGFycmF5IHRvIGluc3BlY3QuXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGV2YWx1YXRlLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpdGVyYXRlZSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXRIaWdoZXN0XSBTcGVjaWZ5IHJldHVybmluZyB0aGUgaGlnaGVzdCBxdWFsaWZpZWQgaW5kZXguXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIGluZGV4IGF0IHdoaWNoIGB2YWx1ZWAgc2hvdWxkIGJlIGluc2VydGVkXG4gICAqICBpbnRvIGBhcnJheWAuXG4gICAqL1xuICBmdW5jdGlvbiBiaW5hcnlJbmRleEJ5KGFycmF5LCB2YWx1ZSwgaXRlcmF0ZWUsIHJldEhpZ2hlc3QpIHtcbiAgICB2YWx1ZSA9IGl0ZXJhdGVlKHZhbHVlKTtcblxuICAgIHZhciBsb3cgPSAwLFxuICAgICAgICBoaWdoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwLFxuICAgICAgICB2YWxJc05hTiA9IHZhbHVlICE9PSB2YWx1ZSxcbiAgICAgICAgdmFsSXNOdWxsID0gdmFsdWUgPT09IG51bGwsXG4gICAgICAgIHZhbElzVW5kZWYgPSB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xuXG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSBuYXRpdmVGbG9vcigobG93ICsgaGlnaCkgLyAyKSxcbiAgICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKGFycmF5W21pZF0pLFxuICAgICAgICAgIGlzRGVmID0gY29tcHV0ZWQgIT09IHVuZGVmaW5lZCxcbiAgICAgICAgICBpc1JlZmxleGl2ZSA9IGNvbXB1dGVkID09PSBjb21wdXRlZDtcblxuICAgICAgaWYgKHZhbElzTmFOKSB7XG4gICAgICAgIHZhciBzZXRMb3cgPSBpc1JlZmxleGl2ZSB8fCByZXRIaWdoZXN0O1xuICAgICAgfSBlbHNlIGlmICh2YWxJc051bGwpIHtcbiAgICAgICAgc2V0TG93ID0gaXNSZWZsZXhpdmUgJiYgaXNEZWYgJiYgKHJldEhpZ2hlc3QgfHwgY29tcHV0ZWQgIT0gbnVsbCk7XG4gICAgICB9IGVsc2UgaWYgKHZhbElzVW5kZWYpIHtcbiAgICAgICAgc2V0TG93ID0gaXNSZWZsZXhpdmUgJiYgKHJldEhpZ2hlc3QgfHwgaXNEZWYpO1xuICAgICAgfSBlbHNlIGlmIChjb21wdXRlZCA9PSBudWxsKSB7XG4gICAgICAgIHNldExvdyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0TG93ID0gcmV0SGlnaGVzdCA/IChjb21wdXRlZCA8PSB2YWx1ZSkgOiAoY29tcHV0ZWQgPCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoc2V0TG93KSB7XG4gICAgICAgIGxvdyA9IG1pZCArIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBoaWdoID0gbWlkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmF0aXZlTWluKGhpZ2gsIE1BWF9BUlJBWV9JTkRFWCk7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlQ2FsbGJhY2tgIHdoaWNoIG9ubHkgc3VwcG9ydHMgYHRoaXNgIGJpbmRpbmdcbiAgICogYW5kIHNwZWNpZnlpbmcgdGhlIG51bWJlciBvZiBhcmd1bWVudHMgdG8gcHJvdmlkZSB0byBgZnVuY2AuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGJpbmQuXG4gICAqIEBwYXJhbSB7Kn0gdGhpc0FyZyBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW2FyZ0NvdW50XSBUaGUgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBwcm92aWRlIHRvIGBmdW5jYC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBjYWxsYmFjay5cbiAgICovXG4gIGZ1bmN0aW9uIGJpbmRDYWxsYmFjayhmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkge1xuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gaWRlbnRpdHk7XG4gICAgfVxuICAgIGlmICh0aGlzQXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmdW5jO1xuICAgIH1cbiAgICBzd2l0Y2ggKGFyZ0NvdW50KSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDU6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgb3RoZXIsIGtleSwgb2JqZWN0LCBzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgb3RoZXIsIGtleSwgb2JqZWN0LCBzb3VyY2UpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBjbG9uZSBvZiB0aGUgZ2l2ZW4gYXJyYXkgYnVmZmVyLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWZmZXIgVGhlIGFycmF5IGJ1ZmZlciB0byBjbG9uZS5cbiAgICogQHJldHVybnMge0FycmF5QnVmZmVyfSBSZXR1cm5zIHRoZSBjbG9uZWQgYXJyYXkgYnVmZmVyLlxuICAgKi9cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmZmVyKSB7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXIuYnl0ZUxlbmd0aCksXG4gICAgICAgIHZpZXcgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuXG4gICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGFycmF5IHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIHBhcnRpYWxseSBhcHBsaWVkIGFyZ3VtZW50cyxcbiAgICogcGxhY2Vob2xkZXJzLCBhbmQgcHJvdmlkZWQgYXJndW1lbnRzIGludG8gYSBzaW5nbGUgYXJyYXkgb2YgYXJndW1lbnRzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gYXJncyBUaGUgcHJvdmlkZWQgYXJndW1lbnRzLlxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXJ0aWFscyBUaGUgYXJndW1lbnRzIHRvIHByZXBlbmQgdG8gdGhvc2UgcHJvdmlkZWQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IGhvbGRlcnMgVGhlIGBwYXJ0aWFsc2AgcGxhY2Vob2xkZXIgaW5kZXhlcy5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgYXJyYXkgb2YgY29tcG9zZWQgYXJndW1lbnRzLlxuICAgKi9cbiAgZnVuY3Rpb24gY29tcG9zZUFyZ3MoYXJncywgcGFydGlhbHMsIGhvbGRlcnMpIHtcbiAgICB2YXIgaG9sZGVyc0xlbmd0aCA9IGhvbGRlcnMubGVuZ3RoLFxuICAgICAgICBhcmdzSW5kZXggPSAtMSxcbiAgICAgICAgYXJnc0xlbmd0aCA9IG5hdGl2ZU1heChhcmdzLmxlbmd0aCAtIGhvbGRlcnNMZW5ndGgsIDApLFxuICAgICAgICBsZWZ0SW5kZXggPSAtMSxcbiAgICAgICAgbGVmdExlbmd0aCA9IHBhcnRpYWxzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gQXJyYXkobGVmdExlbmd0aCArIGFyZ3NMZW5ndGgpO1xuXG4gICAgd2hpbGUgKCsrbGVmdEluZGV4IDwgbGVmdExlbmd0aCkge1xuICAgICAgcmVzdWx0W2xlZnRJbmRleF0gPSBwYXJ0aWFsc1tsZWZ0SW5kZXhdO1xuICAgIH1cbiAgICB3aGlsZSAoKythcmdzSW5kZXggPCBob2xkZXJzTGVuZ3RoKSB7XG4gICAgICByZXN1bHRbaG9sZGVyc1thcmdzSW5kZXhdXSA9IGFyZ3NbYXJnc0luZGV4XTtcbiAgICB9XG4gICAgd2hpbGUgKGFyZ3NMZW5ndGgtLSkge1xuICAgICAgcmVzdWx0W2xlZnRJbmRleCsrXSA9IGFyZ3NbYXJnc0luZGV4KytdO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgbGlrZSBgY29tcG9zZUFyZ3NgIGV4Y2VwdCB0aGF0IHRoZSBhcmd1bWVudHMgY29tcG9zaXRpb25cbiAgICogaXMgdGFpbG9yZWQgZm9yIGBfLnBhcnRpYWxSaWdodGAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBhcmdzIFRoZSBwcm92aWRlZCBhcmd1bWVudHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhcnRpYWxzIFRoZSBhcmd1bWVudHMgdG8gYXBwZW5kIHRvIHRob3NlIHByb3ZpZGVkLlxuICAgKiBAcGFyYW0ge0FycmF5fSBob2xkZXJzIFRoZSBgcGFydGlhbHNgIHBsYWNlaG9sZGVyIGluZGV4ZXMuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGFycmF5IG9mIGNvbXBvc2VkIGFyZ3VtZW50cy5cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBvc2VBcmdzUmlnaHQoYXJncywgcGFydGlhbHMsIGhvbGRlcnMpIHtcbiAgICB2YXIgaG9sZGVyc0luZGV4ID0gLTEsXG4gICAgICAgIGhvbGRlcnNMZW5ndGggPSBob2xkZXJzLmxlbmd0aCxcbiAgICAgICAgYXJnc0luZGV4ID0gLTEsXG4gICAgICAgIGFyZ3NMZW5ndGggPSBuYXRpdmVNYXgoYXJncy5sZW5ndGggLSBob2xkZXJzTGVuZ3RoLCAwKSxcbiAgICAgICAgcmlnaHRJbmRleCA9IC0xLFxuICAgICAgICByaWdodExlbmd0aCA9IHBhcnRpYWxzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gQXJyYXkoYXJnc0xlbmd0aCArIHJpZ2h0TGVuZ3RoKTtcblxuICAgIHdoaWxlICgrK2FyZ3NJbmRleCA8IGFyZ3NMZW5ndGgpIHtcbiAgICAgIHJlc3VsdFthcmdzSW5kZXhdID0gYXJnc1thcmdzSW5kZXhdO1xuICAgIH1cbiAgICB2YXIgb2Zmc2V0ID0gYXJnc0luZGV4O1xuICAgIHdoaWxlICgrK3JpZ2h0SW5kZXggPCByaWdodExlbmd0aCkge1xuICAgICAgcmVzdWx0W29mZnNldCArIHJpZ2h0SW5kZXhdID0gcGFydGlhbHNbcmlnaHRJbmRleF07XG4gICAgfVxuICAgIHdoaWxlICgrK2hvbGRlcnNJbmRleCA8IGhvbGRlcnNMZW5ndGgpIHtcbiAgICAgIHJlc3VsdFtvZmZzZXQgKyBob2xkZXJzW2hvbGRlcnNJbmRleF1dID0gYXJnc1thcmdzSW5kZXgrK107XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGBfLmFzc2lnbmAsIGBfLmRlZmF1bHRzYCwgb3IgYF8ubWVyZ2VgIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhc3NpZ25lciBUaGUgZnVuY3Rpb24gdG8gYXNzaWduIHZhbHVlcy5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYXNzaWduZXIgZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVBc3NpZ25lcihhc3NpZ25lcikge1xuICAgIHJldHVybiByZXN0UGFyYW0oZnVuY3Rpb24ob2JqZWN0LCBzb3VyY2VzKSB7XG4gICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICBsZW5ndGggPSBvYmplY3QgPT0gbnVsbCA/IDAgOiBzb3VyY2VzLmxlbmd0aCxcbiAgICAgICAgICBjdXN0b21pemVyID0gbGVuZ3RoID4gMiA/IHNvdXJjZXNbbGVuZ3RoIC0gMl0gOiB1bmRlZmluZWQsXG4gICAgICAgICAgZ3VhcmQgPSBsZW5ndGggPiAyID8gc291cmNlc1syXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0aGlzQXJnID0gbGVuZ3RoID4gMSA/IHNvdXJjZXNbbGVuZ3RoIC0gMV0gOiB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh0eXBlb2YgY3VzdG9taXplciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGN1c3RvbWl6ZXIgPSBiaW5kQ2FsbGJhY2soY3VzdG9taXplciwgdGhpc0FyZywgNSk7XG4gICAgICAgIGxlbmd0aCAtPSAyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3VzdG9taXplciA9IHR5cGVvZiB0aGlzQXJnID09ICdmdW5jdGlvbicgPyB0aGlzQXJnIDogdW5kZWZpbmVkO1xuICAgICAgICBsZW5ndGggLT0gKGN1c3RvbWl6ZXIgPyAxIDogMCk7XG4gICAgICB9XG4gICAgICBpZiAoZ3VhcmQgJiYgaXNJdGVyYXRlZUNhbGwoc291cmNlc1swXSwgc291cmNlc1sxXSwgZ3VhcmQpKSB7XG4gICAgICAgIGN1c3RvbWl6ZXIgPSBsZW5ndGggPCAzID8gdW5kZWZpbmVkIDogY3VzdG9taXplcjtcbiAgICAgICAgbGVuZ3RoID0gMTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBzb3VyY2VzW2luZGV4XTtcbiAgICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICAgIGFzc2lnbmVyKG9iamVjdCwgc291cmNlLCBjdXN0b21pemVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYGJhc2VFYWNoYCBvciBgYmFzZUVhY2hSaWdodGAgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVhY2hGdW5jIFRoZSBmdW5jdGlvbiB0byBpdGVyYXRlIG92ZXIgYSBjb2xsZWN0aW9uLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUJhc2VFYWNoKGVhY2hGdW5jLCBmcm9tUmlnaHQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgaXRlcmF0ZWUpIHtcbiAgICAgIHZhciBsZW5ndGggPSBjb2xsZWN0aW9uID8gZ2V0TGVuZ3RoKGNvbGxlY3Rpb24pIDogMDtcbiAgICAgIGlmICghaXNMZW5ndGgobGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gZWFjaEZ1bmMoY29sbGVjdGlvbiwgaXRlcmF0ZWUpO1xuICAgICAgfVxuICAgICAgdmFyIGluZGV4ID0gZnJvbVJpZ2h0ID8gbGVuZ3RoIDogLTEsXG4gICAgICAgICAgaXRlcmFibGUgPSB0b09iamVjdChjb2xsZWN0aW9uKTtcblxuICAgICAgd2hpbGUgKChmcm9tUmlnaHQgPyBpbmRleC0tIDogKytpbmRleCA8IGxlbmd0aCkpIHtcbiAgICAgICAgaWYgKGl0ZXJhdGVlKGl0ZXJhYmxlW2luZGV4XSwgaW5kZXgsIGl0ZXJhYmxlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYmFzZSBmdW5jdGlvbiBmb3IgYF8uZm9ySW5gIG9yIGBfLmZvckluUmlnaHRgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtmcm9tUmlnaHRdIFNwZWNpZnkgaXRlcmF0aW5nIGZyb20gcmlnaHQgdG8gbGVmdC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYmFzZSBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUJhc2VGb3IoZnJvbVJpZ2h0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCwgaXRlcmF0ZWUsIGtleXNGdW5jKSB7XG4gICAgICB2YXIgaXRlcmFibGUgPSB0b09iamVjdChvYmplY3QpLFxuICAgICAgICAgIHByb3BzID0ga2V5c0Z1bmMob2JqZWN0KSxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGgsXG4gICAgICAgICAgaW5kZXggPSBmcm9tUmlnaHQgPyBsZW5ndGggOiAtMTtcblxuICAgICAgd2hpbGUgKChmcm9tUmlnaHQgPyBpbmRleC0tIDogKytpbmRleCA8IGxlbmd0aCkpIHtcbiAgICAgICAgdmFyIGtleSA9IHByb3BzW2luZGV4XTtcbiAgICAgICAgaWYgKGl0ZXJhdGVlKGl0ZXJhYmxlW2tleV0sIGtleSwgaXRlcmFibGUpID09PSBmYWxzZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGBTZXRgIGNhY2hlIG9iamVjdCB0byBvcHRpbWl6ZSBsaW5lYXIgc2VhcmNoZXMgb2YgbGFyZ2UgYXJyYXlzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzXSBUaGUgdmFsdWVzIHRvIGNhY2hlLlxuICAgKiBAcmV0dXJucyB7bnVsbHxPYmplY3R9IFJldHVybnMgdGhlIG5ldyBjYWNoZSBvYmplY3QgaWYgYFNldGAgaXMgc3VwcG9ydGVkLCBlbHNlIGBudWxsYC5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNhY2hlKHZhbHVlcykge1xuICAgIHJldHVybiAobmF0aXZlQ3JlYXRlICYmIFNldCkgPyBuZXcgU2V0Q2FjaGUodmFsdWVzKSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgcHJvZHVjZXMgYW4gaW5zdGFuY2Ugb2YgYEN0b3JgIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBpdCB3YXMgaW52b2tlZCBhcyBwYXJ0IG9mIGEgYG5ld2AgZXhwcmVzc2lvbiBvciBieSBgY2FsbGAgb3IgYGFwcGx5YC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gQ3RvciBUaGUgY29uc3RydWN0b3IgdG8gd3JhcC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgd3JhcHBlZCBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUN0b3JXcmFwcGVyKEN0b3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBVc2UgYSBgc3dpdGNoYCBzdGF0ZW1lbnQgdG8gd29yayB3aXRoIGNsYXNzIGNvbnN0cnVjdG9ycy5cbiAgICAgIC8vIFNlZSBodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1lY21hc2NyaXB0LWZ1bmN0aW9uLW9iamVjdHMtY2FsbC10aGlzYXJndW1lbnQtYXJndW1lbnRzbGlzdFxuICAgICAgLy8gZm9yIG1vcmUgZGV0YWlscy5cbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6IHJldHVybiBuZXcgQ3RvcjtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gbmV3IEN0b3IoYXJnc1swXSk7XG4gICAgICAgIGNhc2UgMjogcmV0dXJuIG5ldyBDdG9yKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuICAgICAgICBjYXNlIDM6IHJldHVybiBuZXcgQ3RvcihhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdKTtcbiAgICAgICAgY2FzZSA0OiByZXR1cm4gbmV3IEN0b3IoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSk7XG4gICAgICAgIGNhc2UgNTogcmV0dXJuIG5ldyBDdG9yKGFyZ3NbMF0sIGFyZ3NbMV0sIGFyZ3NbMl0sIGFyZ3NbM10sIGFyZ3NbNF0pO1xuICAgICAgICBjYXNlIDY6IHJldHVybiBuZXcgQ3RvcihhcmdzWzBdLCBhcmdzWzFdLCBhcmdzWzJdLCBhcmdzWzNdLCBhcmdzWzRdLCBhcmdzWzVdKTtcbiAgICAgICAgY2FzZSA3OiByZXR1cm4gbmV3IEN0b3IoYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSwgYXJnc1szXSwgYXJnc1s0XSwgYXJnc1s1XSwgYXJnc1s2XSk7XG4gICAgICB9XG4gICAgICB2YXIgdGhpc0JpbmRpbmcgPSBiYXNlQ3JlYXRlKEN0b3IucHJvdG90eXBlKSxcbiAgICAgICAgICByZXN1bHQgPSBDdG9yLmFwcGx5KHRoaXNCaW5kaW5nLCBhcmdzKTtcblxuICAgICAgLy8gTWltaWMgdGhlIGNvbnN0cnVjdG9yJ3MgYHJldHVybmAgYmVoYXZpb3IuXG4gICAgICAvLyBTZWUgaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4MTMuMi4yIGZvciBtb3JlIGRldGFpbHMuXG4gICAgICByZXR1cm4gaXNPYmplY3QocmVzdWx0KSA/IHJlc3VsdCA6IHRoaXNCaW5kaW5nO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGBfLm1heGAgb3IgYF8ubWluYCBmdW5jdGlvbi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGFyYXRvciBUaGUgZnVuY3Rpb24gdXNlZCB0byBjb21wYXJlIHZhbHVlcy5cbiAgICogQHBhcmFtIHsqfSBleFZhbHVlIFRoZSBpbml0aWFsIGV4dHJlbXVtIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBleHRyZW11bSBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUV4dHJlbXVtKGNvbXBhcmF0b3IsIGV4VmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgaXRlcmF0ZWUsIHRoaXNBcmcpIHtcbiAgICAgIGlmICh0aGlzQXJnICYmIGlzSXRlcmF0ZWVDYWxsKGNvbGxlY3Rpb24sIGl0ZXJhdGVlLCB0aGlzQXJnKSkge1xuICAgICAgICBpdGVyYXRlZSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGl0ZXJhdGVlID0gZ2V0Q2FsbGJhY2soaXRlcmF0ZWUsIHRoaXNBcmcsIDMpO1xuICAgICAgaWYgKGl0ZXJhdGVlLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIGNvbGxlY3Rpb24gPSBpc0FycmF5KGNvbGxlY3Rpb24pID8gY29sbGVjdGlvbiA6IHRvSXRlcmFibGUoY29sbGVjdGlvbik7XG4gICAgICAgIHZhciByZXN1bHQgPSBhcnJheUV4dHJlbXVtKGNvbGxlY3Rpb24sIGl0ZXJhdGVlLCBjb21wYXJhdG9yLCBleFZhbHVlKTtcbiAgICAgICAgaWYgKCEoY29sbGVjdGlvbi5sZW5ndGggJiYgcmVzdWx0ID09PSBleFZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBiYXNlRXh0cmVtdW0oY29sbGVjdGlvbiwgaXRlcmF0ZWUsIGNvbXBhcmF0b3IsIGV4VmFsdWUpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIGZvciBgXy5mb3JFYWNoYCBvciBgXy5mb3JFYWNoUmlnaHRgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhcnJheUZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlciBhbiBhcnJheS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZWFjaEZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlciBhIGNvbGxlY3Rpb24uXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGVhY2ggZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVGb3JFYWNoKGFycmF5RnVuYywgZWFjaEZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY29sbGVjdGlvbiwgaXRlcmF0ZWUsIHRoaXNBcmcpIHtcbiAgICAgIHJldHVybiAodHlwZW9mIGl0ZXJhdGVlID09ICdmdW5jdGlvbicgJiYgdGhpc0FyZyA9PT0gdW5kZWZpbmVkICYmIGlzQXJyYXkoY29sbGVjdGlvbikpXG4gICAgICAgID8gYXJyYXlGdW5jKGNvbGxlY3Rpb24sIGl0ZXJhdGVlKVxuICAgICAgICA6IGVhY2hGdW5jKGNvbGxlY3Rpb24sIGJpbmRDYWxsYmFjayhpdGVyYXRlZSwgdGhpc0FyZywgMykpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIGZvciBgXy5tYXBLZXlzYCBvciBgXy5tYXBWYWx1ZXNgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc01hcEtleXNdIFNwZWNpZnkgbWFwcGluZyBrZXlzIGluc3RlYWQgb2YgdmFsdWVzLlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBtYXAgZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVPYmplY3RNYXBwZXIoaXNNYXBLZXlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCwgaXRlcmF0ZWUsIHRoaXNBcmcpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdGVlID0gZ2V0Q2FsbGJhY2soaXRlcmF0ZWUsIHRoaXNBcmcsIDMpO1xuXG4gICAgICBiYXNlRm9yT3duKG9iamVjdCwgZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqZWN0KSB7XG4gICAgICAgIHZhciBtYXBwZWQgPSBpdGVyYXRlZSh2YWx1ZSwga2V5LCBvYmplY3QpO1xuICAgICAgICBrZXkgPSBpc01hcEtleXMgPyBtYXBwZWQgOiBrZXk7XG4gICAgICAgIHZhbHVlID0gaXNNYXBLZXlzID8gdmFsdWUgOiBtYXBwZWQ7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gZm9yIGBfLnJlZHVjZWAgb3IgYF8ucmVkdWNlUmlnaHRgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBhcnJheUZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlciBhbiBhcnJheS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZWFjaEZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlciBhIGNvbGxlY3Rpb24uXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGVhY2ggZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVSZWR1Y2UoYXJyYXlGdW5jLCBlYWNoRnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbihjb2xsZWN0aW9uLCBpdGVyYXRlZSwgYWNjdW11bGF0b3IsIHRoaXNBcmcpIHtcbiAgICAgIHZhciBpbml0RnJvbUFycmF5ID0gYXJndW1lbnRzLmxlbmd0aCA8IDM7XG4gICAgICByZXR1cm4gKHR5cGVvZiBpdGVyYXRlZSA9PSAnZnVuY3Rpb24nICYmIHRoaXNBcmcgPT09IHVuZGVmaW5lZCAmJiBpc0FycmF5KGNvbGxlY3Rpb24pKVxuICAgICAgICA/IGFycmF5RnVuYyhjb2xsZWN0aW9uLCBpdGVyYXRlZSwgYWNjdW11bGF0b3IsIGluaXRGcm9tQXJyYXkpXG4gICAgICAgIDogYmFzZVJlZHVjZShjb2xsZWN0aW9uLCBnZXRDYWxsYmFjayhpdGVyYXRlZSwgdGhpc0FyZywgNCksIGFjY3VtdWxhdG9yLCBpbml0RnJvbUFycmF5LCBlYWNoRnVuYyk7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCB3cmFwcyBgZnVuY2AgYW5kIGludm9rZXMgaXQgd2l0aCBvcHRpb25hbCBgdGhpc2BcbiAgICogYmluZGluZyBvZiwgcGFydGlhbCBhcHBsaWNhdGlvbiwgYW5kIGN1cnJ5aW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufHN0cmluZ30gZnVuYyBUaGUgZnVuY3Rpb24gb3IgbWV0aG9kIG5hbWUgdG8gcmVmZXJlbmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gYml0bWFzayBUaGUgYml0bWFzayBvZiBmbGFncy4gU2VlIGBjcmVhdGVXcmFwcGVyYCBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGFydGlhbHNdIFRoZSBhcmd1bWVudHMgdG8gcHJlcGVuZCB0byB0aG9zZSBwcm92aWRlZCB0byB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbaG9sZGVyc10gVGhlIGBwYXJ0aWFsc2AgcGxhY2Vob2xkZXIgaW5kZXhlcy5cbiAgICogQHBhcmFtIHtBcnJheX0gW3BhcnRpYWxzUmlnaHRdIFRoZSBhcmd1bWVudHMgdG8gYXBwZW5kIHRvIHRob3NlIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtob2xkZXJzUmlnaHRdIFRoZSBgcGFydGlhbHNSaWdodGAgcGxhY2Vob2xkZXIgaW5kZXhlcy5cbiAgICogQHBhcmFtIHtBcnJheX0gW2FyZ1Bvc10gVGhlIGFyZ3VtZW50IHBvc2l0aW9ucyBvZiB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW2FyeV0gVGhlIGFyaXR5IGNhcCBvZiBgZnVuY2AuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbYXJpdHldIFRoZSBhcml0eSBvZiBgZnVuY2AuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHdyYXBwZWQgZnVuY3Rpb24uXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVIeWJyaWRXcmFwcGVyKGZ1bmMsIGJpdG1hc2ssIHRoaXNBcmcsIHBhcnRpYWxzLCBob2xkZXJzLCBwYXJ0aWFsc1JpZ2h0LCBob2xkZXJzUmlnaHQsIGFyZ1BvcywgYXJ5LCBhcml0eSkge1xuICAgIHZhciBpc0FyeSA9IGJpdG1hc2sgJiBBUllfRkxBRyxcbiAgICAgICAgaXNCaW5kID0gYml0bWFzayAmIEJJTkRfRkxBRyxcbiAgICAgICAgaXNCaW5kS2V5ID0gYml0bWFzayAmIEJJTkRfS0VZX0ZMQUcsXG4gICAgICAgIGlzQ3VycnkgPSBiaXRtYXNrICYgQ1VSUllfRkxBRyxcbiAgICAgICAgaXNDdXJyeUJvdW5kID0gYml0bWFzayAmIENVUlJZX0JPVU5EX0ZMQUcsXG4gICAgICAgIGlzQ3VycnlSaWdodCA9IGJpdG1hc2sgJiBDVVJSWV9SSUdIVF9GTEFHLFxuICAgICAgICBDdG9yID0gaXNCaW5kS2V5ID8gdW5kZWZpbmVkIDogY3JlYXRlQ3RvcldyYXBwZXIoZnVuYyk7XG5cbiAgICBmdW5jdGlvbiB3cmFwcGVyKCkge1xuICAgICAgLy8gQXZvaWQgYGFyZ3VtZW50c2Agb2JqZWN0IHVzZSBkaXNxdWFsaWZ5aW5nIG9wdGltaXphdGlvbnMgYnlcbiAgICAgIC8vIGNvbnZlcnRpbmcgaXQgdG8gYW4gYXJyYXkgYmVmb3JlIHByb3ZpZGluZyBpdCB0byBvdGhlciBmdW5jdGlvbnMuXG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgICBpbmRleCA9IGxlbmd0aCxcbiAgICAgICAgICBhcmdzID0gQXJyYXkobGVuZ3RoKTtcblxuICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgYXJnc1tpbmRleF0gPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgfVxuICAgICAgaWYgKHBhcnRpYWxzKSB7XG4gICAgICAgIGFyZ3MgPSBjb21wb3NlQXJncyhhcmdzLCBwYXJ0aWFscywgaG9sZGVycyk7XG4gICAgICB9XG4gICAgICBpZiAocGFydGlhbHNSaWdodCkge1xuICAgICAgICBhcmdzID0gY29tcG9zZUFyZ3NSaWdodChhcmdzLCBwYXJ0aWFsc1JpZ2h0LCBob2xkZXJzUmlnaHQpO1xuICAgICAgfVxuICAgICAgaWYgKGlzQ3VycnkgfHwgaXNDdXJyeVJpZ2h0KSB7XG4gICAgICAgIHZhciBwbGFjZWhvbGRlciA9IHdyYXBwZXIucGxhY2Vob2xkZXIsXG4gICAgICAgICAgICBhcmdzSG9sZGVycyA9IHJlcGxhY2VIb2xkZXJzKGFyZ3MsIHBsYWNlaG9sZGVyKTtcblxuICAgICAgICBsZW5ndGggLT0gYXJnc0hvbGRlcnMubGVuZ3RoO1xuICAgICAgICBpZiAobGVuZ3RoIDwgYXJpdHkpIHtcbiAgICAgICAgICB2YXIgbmV3QXJnUG9zID0gYXJnUG9zID8gYXJyYXlDb3B5KGFyZ1BvcykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIG5ld0FyaXR5ID0gbmF0aXZlTWF4KGFyaXR5IC0gbGVuZ3RoLCAwKSxcbiAgICAgICAgICAgICAgbmV3c0hvbGRlcnMgPSBpc0N1cnJ5ID8gYXJnc0hvbGRlcnMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIG5ld0hvbGRlcnNSaWdodCA9IGlzQ3VycnkgPyB1bmRlZmluZWQgOiBhcmdzSG9sZGVycyxcbiAgICAgICAgICAgICAgbmV3UGFydGlhbHMgPSBpc0N1cnJ5ID8gYXJncyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgbmV3UGFydGlhbHNSaWdodCA9IGlzQ3VycnkgPyB1bmRlZmluZWQgOiBhcmdzO1xuXG4gICAgICAgICAgYml0bWFzayB8PSAoaXNDdXJyeSA/IFBBUlRJQUxfRkxBRyA6IFBBUlRJQUxfUklHSFRfRkxBRyk7XG4gICAgICAgICAgYml0bWFzayAmPSB+KGlzQ3VycnkgPyBQQVJUSUFMX1JJR0hUX0ZMQUcgOiBQQVJUSUFMX0ZMQUcpO1xuXG4gICAgICAgICAgaWYgKCFpc0N1cnJ5Qm91bmQpIHtcbiAgICAgICAgICAgIGJpdG1hc2sgJj0gfihCSU5EX0ZMQUcgfCBCSU5EX0tFWV9GTEFHKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5ld0RhdGEgPSBbZnVuYywgYml0bWFzaywgdGhpc0FyZywgbmV3UGFydGlhbHMsIG5ld3NIb2xkZXJzLCBuZXdQYXJ0aWFsc1JpZ2h0LCBuZXdIb2xkZXJzUmlnaHQsIG5ld0FyZ1BvcywgYXJ5LCBuZXdBcml0eV0sXG4gICAgICAgICAgICAgIHJlc3VsdCA9IGNyZWF0ZUh5YnJpZFdyYXBwZXIuYXBwbHkodW5kZWZpbmVkLCBuZXdEYXRhKTtcblxuICAgICAgICAgIGlmIChpc0xhemlhYmxlKGZ1bmMpKSB7XG4gICAgICAgICAgICBzZXREYXRhKHJlc3VsdCwgbmV3RGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdC5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciB0aGlzQmluZGluZyA9IGlzQmluZCA/IHRoaXNBcmcgOiB0aGlzLFxuICAgICAgICAgIGZuID0gaXNCaW5kS2V5ID8gdGhpc0JpbmRpbmdbZnVuY10gOiBmdW5jO1xuXG4gICAgICBpZiAoYXJnUG9zKSB7XG4gICAgICAgIGFyZ3MgPSByZW9yZGVyKGFyZ3MsIGFyZ1Bvcyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNBcnkgJiYgYXJ5IDwgYXJncy5sZW5ndGgpIHtcbiAgICAgICAgYXJncy5sZW5ndGggPSBhcnk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcyAmJiB0aGlzICE9PSByb290ICYmIHRoaXMgaW5zdGFuY2VvZiB3cmFwcGVyKSB7XG4gICAgICAgIGZuID0gQ3RvciB8fCBjcmVhdGVDdG9yV3JhcHBlcihmdW5jKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzQmluZGluZywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgYmFzZUlzRXF1YWxEZWVwYCBmb3IgYXJyYXlzIHdpdGggc3VwcG9ydCBmb3JcbiAgICogcGFydGlhbCBkZWVwIGNvbXBhcmlzb25zLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gY29tcGFyZS5cbiAgICogQHBhcmFtIHtBcnJheX0gb3RoZXIgVGhlIG90aGVyIGFycmF5IHRvIGNvbXBhcmUuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGVxdWFsRnVuYyBUaGUgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGVxdWl2YWxlbnRzIG9mIHZhbHVlcy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2N1c3RvbWl6ZXJdIFRoZSBmdW5jdGlvbiB0byBjdXN0b21pemUgY29tcGFyaW5nIGFycmF5cy5cbiAgICogQHBhcmFtIHtib29sZWFufSBbaXNMb29zZV0gU3BlY2lmeSBwZXJmb3JtaW5nIHBhcnRpYWwgY29tcGFyaXNvbnMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0FdIFRyYWNrcyB0cmF2ZXJzZWQgYHZhbHVlYCBvYmplY3RzLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tCXSBUcmFja3MgdHJhdmVyc2VkIGBvdGhlcmAgb2JqZWN0cy5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBhcnJheXMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGVxdWFsQXJyYXlzKGFycmF5LCBvdGhlciwgZXF1YWxGdW5jLCBjdXN0b21pemVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQikge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBhcnJMZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICAgIG90aExlbmd0aCA9IG90aGVyLmxlbmd0aDtcblxuICAgIGlmIChhcnJMZW5ndGggIT0gb3RoTGVuZ3RoICYmICEoaXNMb29zZSAmJiBvdGhMZW5ndGggPiBhcnJMZW5ndGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIElnbm9yZSBub24taW5kZXggcHJvcGVydGllcy5cbiAgICB3aGlsZSAoKytpbmRleCA8IGFyckxlbmd0aCkge1xuICAgICAgdmFyIGFyclZhbHVlID0gYXJyYXlbaW5kZXhdLFxuICAgICAgICAgIG90aFZhbHVlID0gb3RoZXJbaW5kZXhdLFxuICAgICAgICAgIHJlc3VsdCA9IGN1c3RvbWl6ZXIgPyBjdXN0b21pemVyKGlzTG9vc2UgPyBvdGhWYWx1ZSA6IGFyclZhbHVlLCBpc0xvb3NlID8gYXJyVmFsdWUgOiBvdGhWYWx1ZSwgaW5kZXgpIDogdW5kZWZpbmVkO1xuXG4gICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgYXJyYXlzIChzdXNjZXB0aWJsZSB0byBjYWxsIHN0YWNrIGxpbWl0cykuXG4gICAgICBpZiAoaXNMb29zZSkge1xuICAgICAgICBpZiAoIWFycmF5U29tZShvdGhlciwgZnVuY3Rpb24ob3RoVmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGFyclZhbHVlID09PSBvdGhWYWx1ZSB8fCBlcXVhbEZ1bmMoYXJyVmFsdWUsIG90aFZhbHVlLCBjdXN0b21pemVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQik7XG4gICAgICAgICAgICB9KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghKGFyclZhbHVlID09PSBvdGhWYWx1ZSB8fCBlcXVhbEZ1bmMoYXJyVmFsdWUsIG90aFZhbHVlLCBjdXN0b21pemVyLCBpc0xvb3NlLCBzdGFja0EsIHN0YWNrQikpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlSXNFcXVhbERlZXBgIGZvciBjb21wYXJpbmcgb2JqZWN0cyBvZlxuICAgKiB0aGUgc2FtZSBgdG9TdHJpbmdUYWdgLlxuICAgKlxuICAgKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBvbmx5IHN1cHBvcnRzIGNvbXBhcmluZyB2YWx1ZXMgd2l0aCB0YWdzIG9mXG4gICAqIGBCb29sZWFuYCwgYERhdGVgLCBgRXJyb3JgLCBgTnVtYmVyYCwgYFJlZ0V4cGAsIG9yIGBTdHJpbmdgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gY29tcGFyZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIFRoZSBvdGhlciBvYmplY3QgdG8gY29tcGFyZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHRhZyBUaGUgYHRvU3RyaW5nVGFnYCBvZiB0aGUgb2JqZWN0cyB0byBjb21wYXJlLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdHMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGVxdWFsQnlUYWcob2JqZWN0LCBvdGhlciwgdGFnKSB7XG4gICAgc3dpdGNoICh0YWcpIHtcbiAgICAgIGNhc2UgYm9vbFRhZzpcbiAgICAgIGNhc2UgZGF0ZVRhZzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1iZXJzLCBkYXRlcyB0byBtaWxsaXNlY29uZHMgYW5kIGJvb2xlYW5zXG4gICAgICAgIC8vIHRvIGAxYCBvciBgMGAgdHJlYXRpbmcgaW52YWxpZCBkYXRlcyBjb2VyY2VkIHRvIGBOYU5gIGFzIG5vdCBlcXVhbC5cbiAgICAgICAgcmV0dXJuICtvYmplY3QgPT0gK290aGVyO1xuXG4gICAgICBjYXNlIGVycm9yVGFnOlxuICAgICAgICByZXR1cm4gb2JqZWN0Lm5hbWUgPT0gb3RoZXIubmFtZSAmJiBvYmplY3QubWVzc2FnZSA9PSBvdGhlci5tZXNzYWdlO1xuXG4gICAgICBjYXNlIG51bWJlclRhZzpcbiAgICAgICAgLy8gVHJlYXQgYE5hTmAgdnMuIGBOYU5gIGFzIGVxdWFsLlxuICAgICAgICByZXR1cm4gKG9iamVjdCAhPSArb2JqZWN0KVxuICAgICAgICAgID8gb3RoZXIgIT0gK290aGVyXG4gICAgICAgICAgOiBvYmplY3QgPT0gK290aGVyO1xuXG4gICAgICBjYXNlIHJlZ2V4cFRhZzpcbiAgICAgIGNhc2Ugc3RyaW5nVGFnOlxuICAgICAgICAvLyBDb2VyY2UgcmVnZXhlcyB0byBzdHJpbmdzIGFuZCB0cmVhdCBzdHJpbmdzIHByaW1pdGl2ZXMgYW5kIHN0cmluZ1xuICAgICAgICAvLyBvYmplY3RzIGFzIGVxdWFsLiBTZWUgaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4MTUuMTAuNi40IGZvciBtb3JlIGRldGFpbHMuXG4gICAgICAgIHJldHVybiBvYmplY3QgPT0gKG90aGVyICsgJycpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlSXNFcXVhbERlZXBgIGZvciBvYmplY3RzIHdpdGggc3VwcG9ydCBmb3JcbiAgICogcGFydGlhbCBkZWVwIGNvbXBhcmlzb25zLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gY29tcGFyZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG90aGVyIFRoZSBvdGhlciBvYmplY3QgdG8gY29tcGFyZS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZXF1YWxGdW5jIFRoZSBmdW5jdGlvbiB0byBkZXRlcm1pbmUgZXF1aXZhbGVudHMgb2YgdmFsdWVzLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9taXplcl0gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBjb21wYXJpbmcgdmFsdWVzLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0xvb3NlXSBTcGVjaWZ5IHBlcmZvcm1pbmcgcGFydGlhbCBjb21wYXJpc29ucy5cbiAgICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQV0gVHJhY2tzIHRyYXZlcnNlZCBgdmFsdWVgIG9iamVjdHMuXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0JdIFRyYWNrcyB0cmF2ZXJzZWQgYG90aGVyYCBvYmplY3RzLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG9iamVjdHMgYXJlIGVxdWl2YWxlbnQsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGVxdWFsT2JqZWN0cyhvYmplY3QsIG90aGVyLCBlcXVhbEZ1bmMsIGN1c3RvbWl6ZXIsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSB7XG4gICAgdmFyIG9ialByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICBvYmpMZW5ndGggPSBvYmpQcm9wcy5sZW5ndGgsXG4gICAgICAgIG90aFByb3BzID0ga2V5cyhvdGhlciksXG4gICAgICAgIG90aExlbmd0aCA9IG90aFByb3BzLmxlbmd0aDtcblxuICAgIGlmIChvYmpMZW5ndGggIT0gb3RoTGVuZ3RoICYmICFpc0xvb3NlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbmRleCA9IG9iakxlbmd0aDtcbiAgICB3aGlsZSAoaW5kZXgtLSkge1xuICAgICAgdmFyIGtleSA9IG9ialByb3BzW2luZGV4XTtcbiAgICAgIGlmICghKGlzTG9vc2UgPyBrZXkgaW4gb3RoZXIgOiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG90aGVyLCBrZXkpKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBza2lwQ3RvciA9IGlzTG9vc2U7XG4gICAgd2hpbGUgKCsraW5kZXggPCBvYmpMZW5ndGgpIHtcbiAgICAgIGtleSA9IG9ialByb3BzW2luZGV4XTtcbiAgICAgIHZhciBvYmpWYWx1ZSA9IG9iamVjdFtrZXldLFxuICAgICAgICAgIG90aFZhbHVlID0gb3RoZXJba2V5XSxcbiAgICAgICAgICByZXN1bHQgPSBjdXN0b21pemVyID8gY3VzdG9taXplcihpc0xvb3NlID8gb3RoVmFsdWUgOiBvYmpWYWx1ZSwgaXNMb29zZT8gb2JqVmFsdWUgOiBvdGhWYWx1ZSwga2V5KSA6IHVuZGVmaW5lZDtcblxuICAgICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIChzdXNjZXB0aWJsZSB0byBjYWxsIHN0YWNrIGxpbWl0cykuXG4gICAgICBpZiAoIShyZXN1bHQgPT09IHVuZGVmaW5lZCA/IGVxdWFsRnVuYyhvYmpWYWx1ZSwgb3RoVmFsdWUsIGN1c3RvbWl6ZXIsIGlzTG9vc2UsIHN0YWNrQSwgc3RhY2tCKSA6IHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgc2tpcEN0b3IgfHwgKHNraXBDdG9yID0ga2V5ID09ICdjb25zdHJ1Y3RvcicpO1xuICAgIH1cbiAgICBpZiAoIXNraXBDdG9yKSB7XG4gICAgICB2YXIgb2JqQ3RvciA9IG9iamVjdC5jb25zdHJ1Y3RvcixcbiAgICAgICAgICBvdGhDdG9yID0gb3RoZXIuY29uc3RydWN0b3I7XG5cbiAgICAgIC8vIE5vbiBgT2JqZWN0YCBvYmplY3QgaW5zdGFuY2VzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWFsLlxuICAgICAgaWYgKG9iakN0b3IgIT0gb3RoQ3RvciAmJlxuICAgICAgICAgICgnY29uc3RydWN0b3InIGluIG9iamVjdCAmJiAnY29uc3RydWN0b3InIGluIG90aGVyKSAmJlxuICAgICAgICAgICEodHlwZW9mIG9iakN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBvYmpDdG9yIGluc3RhbmNlb2Ygb2JqQ3RvciAmJlxuICAgICAgICAgICAgdHlwZW9mIG90aEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBvdGhDdG9yIGluc3RhbmNlb2Ygb3RoQ3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBhcHByb3ByaWF0ZSBcImNhbGxiYWNrXCIgZnVuY3Rpb24uIElmIHRoZSBgXy5jYWxsYmFja2AgbWV0aG9kIGlzXG4gICAqIGN1c3RvbWl6ZWQgdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSBjdXN0b20gbWV0aG9kLCBvdGhlcndpc2UgaXQgcmV0dXJuc1xuICAgKiB0aGUgYGJhc2VDYWxsYmFja2AgZnVuY3Rpb24uIElmIGFyZ3VtZW50cyBhcmUgcHJvdmlkZWQgdGhlIGNob3NlbiBmdW5jdGlvblxuICAgKiBpcyBpbnZva2VkIHdpdGggdGhlbSBhbmQgaXRzIHJlc3VsdCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBjaG9zZW4gZnVuY3Rpb24gb3IgaXRzIHJlc3VsdC5cbiAgICovXG4gIGZ1bmN0aW9uIGdldENhbGxiYWNrKGZ1bmMsIHRoaXNBcmcsIGFyZ0NvdW50KSB7XG4gICAgdmFyIHJlc3VsdCA9IGxvZGFzaC5jYWxsYmFjayB8fCBjYWxsYmFjaztcbiAgICByZXN1bHQgPSByZXN1bHQgPT09IGNhbGxiYWNrID8gYmFzZUNhbGxiYWNrIDogcmVzdWx0O1xuICAgIHJldHVybiBhcmdDb3VudCA/IHJlc3VsdChmdW5jLCB0aGlzQXJnLCBhcmdDb3VudCkgOiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBtZXRhZGF0YSBmb3IgYGZ1bmNgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBxdWVyeS5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIG1ldGFkYXRhIGZvciBgZnVuY2AuXG4gICAqL1xuICB2YXIgZ2V0RGF0YSA9ICFtZXRhTWFwID8gbm9vcCA6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gbWV0YU1hcC5nZXQoZnVuYyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG5hbWUgb2YgYGZ1bmNgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBxdWVyeS5cbiAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZnVuY3Rpb24gbmFtZS5cbiAgICovXG4gIGZ1bmN0aW9uIGdldEZ1bmNOYW1lKGZ1bmMpIHtcbiAgICB2YXIgcmVzdWx0ID0gZnVuYy5uYW1lLFxuICAgICAgICBhcnJheSA9IHJlYWxOYW1lc1tyZXN1bHRdLFxuICAgICAgICBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG5cbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIHZhciBkYXRhID0gYXJyYXlbbGVuZ3RoXSxcbiAgICAgICAgICBvdGhlckZ1bmMgPSBkYXRhLmZ1bmM7XG4gICAgICBpZiAob3RoZXJGdW5jID09IG51bGwgfHwgb3RoZXJGdW5jID09IGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIGRhdGEubmFtZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBhcHByb3ByaWF0ZSBcImluZGV4T2ZcIiBmdW5jdGlvbi4gSWYgdGhlIGBfLmluZGV4T2ZgIG1ldGhvZCBpc1xuICAgKiBjdXN0b21pemVkIHRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgY3VzdG9tIG1ldGhvZCwgb3RoZXJ3aXNlIGl0IHJldHVybnNcbiAgICogdGhlIGBiYXNlSW5kZXhPZmAgZnVuY3Rpb24uIElmIGFyZ3VtZW50cyBhcmUgcHJvdmlkZWQgdGhlIGNob3NlbiBmdW5jdGlvblxuICAgKiBpcyBpbnZva2VkIHdpdGggdGhlbSBhbmQgaXRzIHJlc3VsdCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufG51bWJlcn0gUmV0dXJucyB0aGUgY2hvc2VuIGZ1bmN0aW9uIG9yIGl0cyByZXN1bHQuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRJbmRleE9mKGNvbGxlY3Rpb24sIHRhcmdldCwgZnJvbUluZGV4KSB7XG4gICAgdmFyIHJlc3VsdCA9IGxvZGFzaC5pbmRleE9mIHx8IGluZGV4T2Y7XG4gICAgcmVzdWx0ID0gcmVzdWx0ID09PSBpbmRleE9mID8gYmFzZUluZGV4T2YgOiByZXN1bHQ7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24gPyByZXN1bHQoY29sbGVjdGlvbiwgdGFyZ2V0LCBmcm9tSW5kZXgpIDogcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIFwibGVuZ3RoXCIgcHJvcGVydHkgdmFsdWUgb2YgYG9iamVjdGAuXG4gICAqXG4gICAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gYXZvaWQgYSBbSklUIGJ1Z10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTE0Mjc5MilcbiAgICogdGhhdCBhZmZlY3RzIFNhZmFyaSBvbiBhdCBsZWFzdCBpT1MgOC4xLTguMyBBUk02NC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgXCJsZW5ndGhcIiB2YWx1ZS5cbiAgICovXG4gIHZhciBnZXRMZW5ndGggPSBiYXNlUHJvcGVydHkoJ2xlbmd0aCcpO1xuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwcm9wZXJ5IG5hbWVzLCB2YWx1ZXMsIGFuZCBjb21wYXJlIGZsYWdzIG9mIGBvYmplY3RgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbWF0Y2ggZGF0YSBvZiBgb2JqZWN0YC5cbiAgICovXG4gIGZ1bmN0aW9uIGdldE1hdGNoRGF0YShvYmplY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gcGFpcnMob2JqZWN0KSxcbiAgICAgICAgbGVuZ3RoID0gcmVzdWx0Lmxlbmd0aDtcblxuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgcmVzdWx0W2xlbmd0aF1bMl0gPSBpc1N0cmljdENvbXBhcmFibGUocmVzdWx0W2xlbmd0aF1bMV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG5hdGl2ZSBmdW5jdGlvbiBhdCBga2V5YCBvZiBgb2JqZWN0YC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIG1ldGhvZCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBmdW5jdGlvbiBpZiBpdCdzIG5hdGl2ZSwgZWxzZSBgdW5kZWZpbmVkYC5cbiAgICovXG4gIGZ1bmN0aW9uIGdldE5hdGl2ZShvYmplY3QsIGtleSkge1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0W2tleV07XG4gICAgcmV0dXJuIGlzTmF0aXZlKHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHZpZXcsIGFwcGx5aW5nIGFueSBgdHJhbnNmb3Jtc2AgdG8gdGhlIGBzdGFydGAgYW5kIGBlbmRgIHBvc2l0aW9ucy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFRoZSBzdGFydCBvZiB0aGUgdmlldy5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGVuZCBUaGUgZW5kIG9mIHRoZSB2aWV3LlxuICAgKiBAcGFyYW0ge0FycmF5fSB0cmFuc2Zvcm1zIFRoZSB0cmFuc2Zvcm1hdGlvbnMgdG8gYXBwbHkgdG8gdGhlIHZpZXcuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGBzdGFydGAgYW5kIGBlbmRgXG4gICAqICBwb3NpdGlvbnMgb2YgdGhlIHZpZXcuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRWaWV3KHN0YXJ0LCBlbmQsIHRyYW5zZm9ybXMpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gdHJhbnNmb3Jtcy5sZW5ndGg7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIGRhdGEgPSB0cmFuc2Zvcm1zW2luZGV4XSxcbiAgICAgICAgICBzaXplID0gZGF0YS5zaXplO1xuXG4gICAgICBzd2l0Y2ggKGRhdGEudHlwZSkge1xuICAgICAgICBjYXNlICdkcm9wJzogICAgICBzdGFydCArPSBzaXplOyBicmVhaztcbiAgICAgICAgY2FzZSAnZHJvcFJpZ2h0JzogZW5kIC09IHNpemU7IGJyZWFrO1xuICAgICAgICBjYXNlICd0YWtlJzogICAgICBlbmQgPSBuYXRpdmVNaW4oZW5kLCBzdGFydCArIHNpemUpOyBicmVhaztcbiAgICAgICAgY2FzZSAndGFrZVJpZ2h0Jzogc3RhcnQgPSBuYXRpdmVNYXgoc3RhcnQsIGVuZCAtIHNpemUpOyBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgJ3N0YXJ0Jzogc3RhcnQsICdlbmQnOiBlbmQgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBhbiBhcnJheSBjbG9uZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGNsb25lLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGluaXRpYWxpemVkIGNsb25lLlxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdENsb25lQXJyYXkoYXJyYXkpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICByZXN1bHQgPSBuZXcgYXJyYXkuY29uc3RydWN0b3IobGVuZ3RoKTtcblxuICAgIC8vIEFkZCBhcnJheSBwcm9wZXJ0aWVzIGFzc2lnbmVkIGJ5IGBSZWdFeHAjZXhlY2AuXG4gICAgaWYgKGxlbmd0aCAmJiB0eXBlb2YgYXJyYXlbMF0gPT0gJ3N0cmluZycgJiYgaGFzT3duUHJvcGVydHkuY2FsbChhcnJheSwgJ2luZGV4JykpIHtcbiAgICAgIHJlc3VsdC5pbmRleCA9IGFycmF5LmluZGV4O1xuICAgICAgcmVzdWx0LmlucHV0ID0gYXJyYXkuaW5wdXQ7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgYW4gb2JqZWN0IGNsb25lLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gY2xvbmUuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGluaXRpYWxpemVkIGNsb25lLlxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdENsb25lT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yO1xuICAgIGlmICghKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3RvciBpbnN0YW5jZW9mIEN0b3IpKSB7XG4gICAgICBDdG9yID0gT2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEN0b3I7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgYW4gb2JqZWN0IGNsb25lIGJhc2VkIG9uIGl0cyBgdG9TdHJpbmdUYWdgLlxuICAgKlxuICAgKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBvbmx5IHN1cHBvcnRzIGNsb25pbmcgdmFsdWVzIHdpdGggdGFncyBvZlxuICAgKiBgQm9vbGVhbmAsIGBEYXRlYCwgYEVycm9yYCwgYE51bWJlcmAsIGBSZWdFeHBgLCBvciBgU3RyaW5nYC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGNsb25lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGFnIFRoZSBgdG9TdHJpbmdUYWdgIG9mIHRoZSBvYmplY3QgdG8gY2xvbmUuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2lzRGVlcF0gU3BlY2lmeSBhIGRlZXAgY2xvbmUuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGluaXRpYWxpemVkIGNsb25lLlxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdENsb25lQnlUYWcob2JqZWN0LCB0YWcsIGlzRGVlcCkge1xuICAgIHZhciBDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yO1xuICAgIHN3aXRjaCAodGFnKSB7XG4gICAgICBjYXNlIGFycmF5QnVmZmVyVGFnOlxuICAgICAgICByZXR1cm4gYnVmZmVyQ2xvbmUob2JqZWN0KTtcblxuICAgICAgY2FzZSBib29sVGFnOlxuICAgICAgY2FzZSBkYXRlVGFnOlxuICAgICAgICByZXR1cm4gbmV3IEN0b3IoK29iamVjdCk7XG5cbiAgICAgIGNhc2UgZmxvYXQzMlRhZzogY2FzZSBmbG9hdDY0VGFnOlxuICAgICAgY2FzZSBpbnQ4VGFnOiBjYXNlIGludDE2VGFnOiBjYXNlIGludDMyVGFnOlxuICAgICAgY2FzZSB1aW50OFRhZzogY2FzZSB1aW50OENsYW1wZWRUYWc6IGNhc2UgdWludDE2VGFnOiBjYXNlIHVpbnQzMlRhZzpcbiAgICAgICAgdmFyIGJ1ZmZlciA9IG9iamVjdC5idWZmZXI7XG4gICAgICAgIHJldHVybiBuZXcgQ3Rvcihpc0RlZXAgPyBidWZmZXJDbG9uZShidWZmZXIpIDogYnVmZmVyLCBvYmplY3QuYnl0ZU9mZnNldCwgb2JqZWN0Lmxlbmd0aCk7XG5cbiAgICAgIGNhc2UgbnVtYmVyVGFnOlxuICAgICAgY2FzZSBzdHJpbmdUYWc6XG4gICAgICAgIHJldHVybiBuZXcgQ3RvcihvYmplY3QpO1xuXG4gICAgICBjYXNlIHJlZ2V4cFRhZzpcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBDdG9yKG9iamVjdC5zb3VyY2UsIHJlRmxhZ3MuZXhlYyhvYmplY3QpKTtcbiAgICAgICAgcmVzdWx0Lmxhc3RJbmRleCA9IG9iamVjdC5sYXN0SW5kZXg7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICE9IG51bGwgJiYgaXNMZW5ndGgoZ2V0TGVuZ3RoKHZhbHVlKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGluZGV4LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGg9TUFYX1NBRkVfSU5URUdFUl0gVGhlIHVwcGVyIGJvdW5kcyBvZiBhIHZhbGlkIGluZGV4LlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGluZGV4LCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0luZGV4KHZhbHVlLCBsZW5ndGgpIHtcbiAgICB2YWx1ZSA9ICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHwgcmVJc1VpbnQudGVzdCh2YWx1ZSkpID8gK3ZhbHVlIDogLTE7XG4gICAgbGVuZ3RoID0gbGVuZ3RoID09IG51bGwgPyBNQVhfU0FGRV9JTlRFR0VSIDogbGVuZ3RoO1xuICAgIHJldHVybiB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDwgbGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIGFyZSBmcm9tIGFuIGl0ZXJhdGVlIGNhbGwuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHBvdGVudGlhbCBpdGVyYXRlZSB2YWx1ZSBhcmd1bWVudC5cbiAgICogQHBhcmFtIHsqfSBpbmRleCBUaGUgcG90ZW50aWFsIGl0ZXJhdGVlIGluZGV4IG9yIGtleSBhcmd1bWVudC5cbiAgICogQHBhcmFtIHsqfSBvYmplY3QgVGhlIHBvdGVudGlhbCBpdGVyYXRlZSBvYmplY3QgYXJndW1lbnQuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYXJndW1lbnRzIGFyZSBmcm9tIGFuIGl0ZXJhdGVlIGNhbGwsIGVsc2UgYGZhbHNlYC5cbiAgICovXG4gIGZ1bmN0aW9uIGlzSXRlcmF0ZWVDYWxsKHZhbHVlLCBpbmRleCwgb2JqZWN0KSB7XG4gICAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciB0eXBlID0gdHlwZW9mIGluZGV4O1xuICAgIGlmICh0eXBlID09ICdudW1iZXInXG4gICAgICAgID8gKGlzQXJyYXlMaWtlKG9iamVjdCkgJiYgaXNJbmRleChpbmRleCwgb2JqZWN0Lmxlbmd0aCkpXG4gICAgICAgIDogKHR5cGUgPT0gJ3N0cmluZycgJiYgaW5kZXggaW4gb2JqZWN0KSkge1xuICAgICAgdmFyIG90aGVyID0gb2JqZWN0W2luZGV4XTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdmFsdWUgPyAodmFsdWUgPT09IG90aGVyKSA6IChvdGhlciAhPT0gb3RoZXIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBwcm9wZXJ0eSBuYW1lIGFuZCBub3QgYSBwcm9wZXJ0eSBwYXRoLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvYmplY3RdIFRoZSBvYmplY3QgdG8gcXVlcnkga2V5cyBvbi5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwcm9wZXJ0eSBuYW1lLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0tleSh2YWx1ZSwgb2JqZWN0KSB7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gICAgaWYgKCh0eXBlID09ICdzdHJpbmcnICYmIHJlSXNQbGFpblByb3AudGVzdCh2YWx1ZSkpIHx8IHR5cGUgPT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9ICFyZUlzRGVlcFByb3AudGVzdCh2YWx1ZSk7XG4gICAgcmV0dXJuIHJlc3VsdCB8fCAob2JqZWN0ICE9IG51bGwgJiYgdmFsdWUgaW4gdG9PYmplY3Qob2JqZWN0KSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGBmdW5jYCBoYXMgYSBsYXp5IGNvdW50ZXJwYXJ0LlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGBmdW5jYCBoYXMgYSBsYXp5IGNvdW50ZXJwYXJ0LCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0xhemlhYmxlKGZ1bmMpIHtcbiAgICB2YXIgZnVuY05hbWUgPSBnZXRGdW5jTmFtZShmdW5jKTtcbiAgICBpZiAoIShmdW5jTmFtZSBpbiBMYXp5V3JhcHBlci5wcm90b3R5cGUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBvdGhlciA9IGxvZGFzaFtmdW5jTmFtZV07XG4gICAgaWYgKGZ1bmMgPT09IG90aGVyKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGRhdGEgPSBnZXREYXRhKG90aGVyKTtcbiAgICByZXR1cm4gISFkYXRhICYmIGZ1bmMgPT09IGRhdGFbMF07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAgICpcbiAgICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiYgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHN1aXRhYmxlIGZvciBzdHJpY3QgZXF1YWxpdHkgY29tcGFyaXNvbnMsIGkuZS4gYD09PWAuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpZiBzdWl0YWJsZSBmb3Igc3RyaWN0XG4gICAqICBlcXVhbGl0eSBjb21wYXJpc29ucywgZWxzZSBgZmFsc2VgLlxuICAgKi9cbiAgZnVuY3Rpb24gaXNTdHJpY3RDb21wYXJhYmxlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSB2YWx1ZSAmJiAhaXNPYmplY3QodmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgc3BlY2lhbGl6ZWQgdmVyc2lvbiBvZiBgXy5waWNrYCB3aGljaCBwaWNrcyBgb2JqZWN0YCBwcm9wZXJ0aWVzIHNwZWNpZmllZFxuICAgKiBieSBgcHJvcHNgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBzb3VyY2Ugb2JqZWN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBwcm9wcyBUaGUgcHJvcGVydHkgbmFtZXMgdG8gcGljay5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbmV3IG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIHBpY2tCeUFycmF5KG9iamVjdCwgcHJvcHMpIHtcbiAgICBvYmplY3QgPSB0b09iamVjdChvYmplY3QpO1xuXG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0ge307XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIGtleSA9IHByb3BzW2luZGV4XTtcbiAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gb2JqZWN0W2tleV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLnBpY2tgIHdoaWNoIHBpY2tzIGBvYmplY3RgIHByb3BlcnRpZXMgYHByZWRpY2F0ZWBcbiAgICogcmV0dXJucyB0cnV0aHkgZm9yLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBzb3VyY2Ugb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcmVkaWNhdGUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbmV3IG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIHBpY2tCeUNhbGxiYWNrKG9iamVjdCwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGJhc2VGb3JJbihvYmplY3QsIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iamVjdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSwga2V5LCBvYmplY3QpKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW9yZGVyIGBhcnJheWAgYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWQgaW5kZXhlcyB3aGVyZSB0aGUgZWxlbWVudCBhdFxuICAgKiB0aGUgZmlyc3QgaW5kZXggaXMgYXNzaWduZWQgYXMgdGhlIGZpcnN0IGVsZW1lbnQsIHRoZSBlbGVtZW50IGF0XG4gICAqIHRoZSBzZWNvbmQgaW5kZXggaXMgYXNzaWduZWQgYXMgdGhlIHNlY29uZCBlbGVtZW50LCBhbmQgc28gb24uXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byByZW9yZGVyLlxuICAgKiBAcGFyYW0ge0FycmF5fSBpbmRleGVzIFRoZSBhcnJhbmdlZCBhcnJheSBpbmRleGVzLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAgICovXG4gIGZ1bmN0aW9uIHJlb3JkZXIoYXJyYXksIGluZGV4ZXMpIHtcbiAgICB2YXIgYXJyTGVuZ3RoID0gYXJyYXkubGVuZ3RoLFxuICAgICAgICBsZW5ndGggPSBuYXRpdmVNaW4oaW5kZXhlcy5sZW5ndGgsIGFyckxlbmd0aCksXG4gICAgICAgIG9sZEFycmF5ID0gYXJyYXlDb3B5KGFycmF5KTtcblxuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgdmFyIGluZGV4ID0gaW5kZXhlc1tsZW5ndGhdO1xuICAgICAgYXJyYXlbbGVuZ3RoXSA9IGlzSW5kZXgoaW5kZXgsIGFyckxlbmd0aCkgPyBvbGRBcnJheVtpbmRleF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIG1ldGFkYXRhIGZvciBgZnVuY2AuXG4gICAqXG4gICAqICoqTm90ZToqKiBJZiB0aGlzIGZ1bmN0aW9uIGJlY29tZXMgaG90LCBpLmUuIGlzIGludm9rZWQgYSBsb3QgaW4gYSBzaG9ydFxuICAgKiBwZXJpb2Qgb2YgdGltZSwgaXQgd2lsbCB0cmlwIGl0cyBicmVha2VyIGFuZCB0cmFuc2l0aW9uIHRvIGFuIGlkZW50aXR5IGZ1bmN0aW9uXG4gICAqIHRvIGF2b2lkIGdhcmJhZ2UgY29sbGVjdGlvbiBwYXVzZXMgaW4gVjguIFNlZSBbVjggaXNzdWUgMjA3MF0oaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIwNzApXG4gICAqIGZvciBtb3JlIGRldGFpbHMuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGFzc29jaWF0ZSBtZXRhZGF0YSB3aXRoLlxuICAgKiBAcGFyYW0geyp9IGRhdGEgVGhlIG1ldGFkYXRhLlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYGZ1bmNgLlxuICAgKi9cbiAgdmFyIHNldERhdGEgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvdW50ID0gMCxcbiAgICAgICAgbGFzdENhbGxlZCA9IDA7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgdmFyIHN0YW1wID0gbm93KCksXG4gICAgICAgICAgcmVtYWluaW5nID0gSE9UX1NQQU4gLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKTtcblxuICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgaWYgKHJlbWFpbmluZyA+IDApIHtcbiAgICAgICAgaWYgKCsrY291bnQgPj0gSE9UX0NPVU5UKSB7XG4gICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY291bnQgPSAwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VTZXREYXRhKGtleSwgdmFsdWUpO1xuICAgIH07XG4gIH0oKSk7XG5cbiAgLyoqXG4gICAqIEEgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24gb2YgYE9iamVjdC5rZXlzYCB3aGljaCBjcmVhdGVzIGFuIGFycmF5IG9mIHRoZVxuICAgKiBvd24gZW51bWVyYWJsZSBwcm9wZXJ0eSBuYW1lcyBvZiBgb2JqZWN0YC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICAgKi9cbiAgZnVuY3Rpb24gc2hpbUtleXMob2JqZWN0KSB7XG4gICAgdmFyIHByb3BzID0ga2V5c0luKG9iamVjdCksXG4gICAgICAgIHByb3BzTGVuZ3RoID0gcHJvcHMubGVuZ3RoLFxuICAgICAgICBsZW5ndGggPSBwcm9wc0xlbmd0aCAmJiBvYmplY3QubGVuZ3RoO1xuXG4gICAgdmFyIGFsbG93SW5kZXhlcyA9ICEhbGVuZ3RoICYmIGlzTGVuZ3RoKGxlbmd0aCkgJiZcbiAgICAgIChpc0FycmF5KG9iamVjdCkgfHwgaXNBcmd1bWVudHMob2JqZWN0KSk7XG5cbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgcmVzdWx0ID0gW107XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IHByb3BzTGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgaWYgKChhbGxvd0luZGV4ZXMgJiYgaXNJbmRleChrZXksIGxlbmd0aCkpIHx8IGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgYHZhbHVlYCB0byBhbiBhcnJheS1saWtlIG9iamVjdCBpZiBpdCdzIG5vdCBvbmUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gICAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R9IFJldHVybnMgdGhlIGFycmF5LWxpa2Ugb2JqZWN0LlxuICAgKi9cbiAgZnVuY3Rpb24gdG9JdGVyYWJsZSh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmICghaXNBcnJheUxpa2UodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWVzKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogT2JqZWN0KHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGFuIG9iamVjdCBpZiBpdCdzIG5vdCBvbmUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogT2JqZWN0KHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBgdmFsdWVgIHRvIHByb3BlcnR5IHBhdGggYXJyYXkgaWYgaXQncyBub3Qgb25lLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIHByb3BlcnR5IHBhdGggYXJyYXkuXG4gICAqL1xuICBmdW5jdGlvbiB0b1BhdGgodmFsdWUpIHtcbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGJhc2VUb1N0cmluZyh2YWx1ZSkucmVwbGFjZShyZVByb3BOYW1lLCBmdW5jdGlvbihtYXRjaCwgbnVtYmVyLCBxdW90ZSwgc3RyaW5nKSB7XG4gICAgICByZXN1bHQucHVzaChxdW90ZSA/IHN0cmluZy5yZXBsYWNlKHJlRXNjYXBlQ2hhciwgJyQxJykgOiAobnVtYmVyIHx8IG1hdGNoKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgY2xvbmUgb2YgYHdyYXBwZXJgLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gd3JhcHBlciBUaGUgd3JhcHBlciB0byBjbG9uZS5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY2xvbmVkIHdyYXBwZXIuXG4gICAqL1xuICBmdW5jdGlvbiB3cmFwcGVyQ2xvbmUod3JhcHBlcikge1xuICAgIHJldHVybiB3cmFwcGVyIGluc3RhbmNlb2YgTGF6eVdyYXBwZXJcbiAgICAgID8gd3JhcHBlci5jbG9uZSgpXG4gICAgICA6IG5ldyBMb2Rhc2hXcmFwcGVyKHdyYXBwZXIuX193cmFwcGVkX18sIHdyYXBwZXIuX19jaGFpbl9fLCBhcnJheUNvcHkod3JhcHBlci5fX2FjdGlvbnNfXykpO1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBmaXJzdCBlbGVtZW50IG9mIGBhcnJheWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGFsaWFzIGhlYWRcbiAgICogQGNhdGVnb3J5IEFycmF5XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBxdWVyeS5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYGFycmF5YC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5maXJzdChbMSwgMiwgM10pO1xuICAgKiAvLyA9PiAxXG4gICAqXG4gICAqIF8uZmlyc3QoW10pO1xuICAgKiAvLyA9PiB1bmRlZmluZWRcbiAgICovXG4gIGZ1bmN0aW9uIGZpcnN0KGFycmF5KSB7XG4gICAgcmV0dXJuIGFycmF5ID8gYXJyYXlbMF0gOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogRmxhdHRlbnMgYSBuZXN0ZWQgYXJyYXkuIElmIGBpc0RlZXBgIGlzIGB0cnVlYCB0aGUgYXJyYXkgaXMgcmVjdXJzaXZlbHlcbiAgICogZmxhdHRlbmVkLCBvdGhlcndpc2UgaXQgaXMgb25seSBmbGF0dGVuZWQgYSBzaW5nbGUgbGV2ZWwuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IEFycmF5XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBmbGF0dGVuLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0RlZXBdIFNwZWNpZnkgYSBkZWVwIGZsYXR0ZW4uXG4gICAqIEBwYXJhbS0ge09iamVjdH0gW2d1YXJkXSBFbmFibGVzIHVzZSBhcyBhIGNhbGxiYWNrIGZvciBmdW5jdGlvbnMgbGlrZSBgXy5tYXBgLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBmbGF0dGVuZWQgYXJyYXkuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uZmxhdHRlbihbMSwgWzIsIDMsIFs0XV1dKTtcbiAgICogLy8gPT4gWzEsIDIsIDMsIFs0XV1cbiAgICpcbiAgICogLy8gdXNpbmcgYGlzRGVlcGBcbiAgICogXy5mbGF0dGVuKFsxLCBbMiwgMywgWzRdXV0sIHRydWUpO1xuICAgKiAvLyA9PiBbMSwgMiwgMywgNF1cbiAgICovXG4gIGZ1bmN0aW9uIGZsYXR0ZW4oYXJyYXksIGlzRGVlcCwgZ3VhcmQpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuICAgIGlmIChndWFyZCAmJiBpc0l0ZXJhdGVlQ2FsbChhcnJheSwgaXNEZWVwLCBndWFyZCkpIHtcbiAgICAgIGlzRGVlcCA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gbGVuZ3RoID8gYmFzZUZsYXR0ZW4oYXJyYXksIGlzRGVlcCkgOiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBgdmFsdWVgIGlzIGZvdW5kIGluIGBhcnJheWBcbiAgICogdXNpbmcgW2BTYW1lVmFsdWVaZXJvYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtc2FtZXZhbHVlemVybylcbiAgICogZm9yIGVxdWFsaXR5IGNvbXBhcmlzb25zLiBJZiBgZnJvbUluZGV4YCBpcyBuZWdhdGl2ZSwgaXQgaXMgdXNlZCBhcyB0aGUgb2Zmc2V0XG4gICAqIGZyb20gdGhlIGVuZCBvZiBgYXJyYXlgLiBJZiBgYXJyYXlgIGlzIHNvcnRlZCBwcm92aWRpbmcgYHRydWVgIGZvciBgZnJvbUluZGV4YFxuICAgKiBwZXJmb3JtcyBhIGZhc3RlciBiaW5hcnkgc2VhcmNoLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBBcnJheVxuICAgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gc2VhcmNoLlxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZWFyY2ggZm9yLlxuICAgKiBAcGFyYW0ge2Jvb2xlYW58bnVtYmVyfSBbZnJvbUluZGV4PTBdIFRoZSBpbmRleCB0byBzZWFyY2ggZnJvbSBvciBgdHJ1ZWBcbiAgICogIHRvIHBlcmZvcm0gYSBiaW5hcnkgc2VhcmNoIG9uIGEgc29ydGVkIGFycmF5LlxuICAgKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgbWF0Y2hlZCB2YWx1ZSwgZWxzZSBgLTFgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmluZGV4T2YoWzEsIDIsIDEsIDJdLCAyKTtcbiAgICogLy8gPT4gMVxuICAgKlxuICAgKiAvLyB1c2luZyBgZnJvbUluZGV4YFxuICAgKiBfLmluZGV4T2YoWzEsIDIsIDEsIDJdLCAyLCAyKTtcbiAgICogLy8gPT4gM1xuICAgKlxuICAgKiAvLyBwZXJmb3JtaW5nIGEgYmluYXJ5IHNlYXJjaFxuICAgKiBfLmluZGV4T2YoWzEsIDEsIDIsIDJdLCAyLCB0cnVlKTtcbiAgICogLy8gPT4gMlxuICAgKi9cbiAgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleCkge1xuICAgIHZhciBsZW5ndGggPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gICAgaWYgKCFsZW5ndGgpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBmcm9tSW5kZXggPT0gJ251bWJlcicpIHtcbiAgICAgIGZyb21JbmRleCA9IGZyb21JbmRleCA8IDAgPyBuYXRpdmVNYXgobGVuZ3RoICsgZnJvbUluZGV4LCAwKSA6IGZyb21JbmRleDtcbiAgICB9IGVsc2UgaWYgKGZyb21JbmRleCkge1xuICAgICAgdmFyIGluZGV4ID0gYmluYXJ5SW5kZXgoYXJyYXksIHZhbHVlKTtcbiAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICh2YWx1ZSA9PT0gdmFsdWUgPyAodmFsdWUgPT09IGFycmF5W2luZGV4XSkgOiAoYXJyYXlbaW5kZXhdICE9PSBhcnJheVtpbmRleF0pKSkge1xuICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIHJldHVybiBiYXNlSW5kZXhPZihhcnJheSwgdmFsdWUsIGZyb21JbmRleCB8fCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBsYXN0IGVsZW1lbnQgb2YgYGFycmF5YC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgQXJyYXlcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgbGFzdCBlbGVtZW50IG9mIGBhcnJheWAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8ubGFzdChbMSwgMiwgM10pO1xuICAgKiAvLyA9PiAzXG4gICAqL1xuICBmdW5jdGlvbiBsYXN0KGFycmF5KSB7XG4gICAgdmFyIGxlbmd0aCA9IGFycmF5ID8gYXJyYXkubGVuZ3RoIDogMDtcbiAgICByZXR1cm4gbGVuZ3RoID8gYXJyYXlbbGVuZ3RoIC0gMV0gOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgYW4gYXJyYXksIHVzaW5nXG4gICAqIFtgU2FtZVZhbHVlWmVyb2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXNhbWV2YWx1ZXplcm8pXG4gICAqIGZvciBlcXVhbGl0eSBjb21wYXJpc29ucywgaW4gd2hpY2ggb25seSB0aGUgZmlyc3Qgb2NjdXJlbmNlIG9mIGVhY2ggZWxlbWVudFxuICAgKiBpcyBrZXB0LiBQcm92aWRpbmcgYHRydWVgIGZvciBgaXNTb3J0ZWRgIHBlcmZvcm1zIGEgZmFzdGVyIHNlYXJjaCBhbGdvcml0aG1cbiAgICogZm9yIHNvcnRlZCBhcnJheXMuIElmIGFuIGl0ZXJhdGVlIGZ1bmN0aW9uIGlzIHByb3ZpZGVkIGl0IGlzIGludm9rZWQgZm9yXG4gICAqIGVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkgdG8gZ2VuZXJhdGUgdGhlIGNyaXRlcmlvbiBieSB3aGljaCB1bmlxdWVuZXNzXG4gICAqIGlzIGNvbXB1dGVkLiBUaGUgYGl0ZXJhdGVlYCBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCB0aHJlZVxuICAgKiBhcmd1bWVudHM6ICh2YWx1ZSwgaW5kZXgsIGFycmF5KS5cbiAgICpcbiAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgaXRlcmF0ZWVgIHRoZSBjcmVhdGVkIGBfLnByb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICpcbiAgICogSWYgYSB2YWx1ZSBpcyBhbHNvIHByb3ZpZGVkIGZvciBgdGhpc0FyZ2AgdGhlIGNyZWF0ZWQgYF8ubWF0Y2hlc1Byb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIGEgbWF0Y2hpbmcgcHJvcGVydHlcbiAgICogdmFsdWUsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgaXRlcmF0ZWVgIHRoZSBjcmVhdGVkIGBfLm1hdGNoZXNgIHN0eWxlXG4gICAqIGNhbGxiYWNrIHJldHVybnMgYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuXG4gICAqIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBhbGlhcyB1bmlxdWVcbiAgICogQGNhdGVnb3J5IEFycmF5XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpbnNwZWN0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc1NvcnRlZF0gU3BlY2lmeSB0aGUgYXJyYXkgaXMgc29ydGVkLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtpdGVyYXRlZV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBpdGVyYXRlZWAuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGR1cGxpY2F0ZS12YWx1ZS1mcmVlIGFycmF5LlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLnVuaXEoWzIsIDEsIDJdKTtcbiAgICogLy8gPT4gWzIsIDFdXG4gICAqXG4gICAqIC8vIHVzaW5nIGBpc1NvcnRlZGBcbiAgICogXy51bmlxKFsxLCAxLCAyXSwgdHJ1ZSk7XG4gICAqIC8vID0+IFsxLCAyXVxuICAgKlxuICAgKiAvLyB1c2luZyBhbiBpdGVyYXRlZSBmdW5jdGlvblxuICAgKiBfLnVuaXEoWzEsIDIuNSwgMS41LCAyXSwgZnVuY3Rpb24obikge1xuICAgKiAgIHJldHVybiB0aGlzLmZsb29yKG4pO1xuICAgKiB9LCBNYXRoKTtcbiAgICogLy8gPT4gWzEsIDIuNV1cbiAgICpcbiAgICogLy8gdXNpbmcgdGhlIGBfLnByb3BlcnR5YCBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICogXy51bmlxKFt7ICd4JzogMSB9LCB7ICd4JzogMiB9LCB7ICd4JzogMSB9XSwgJ3gnKTtcbiAgICogLy8gPT4gW3sgJ3gnOiAxIH0sIHsgJ3gnOiAyIH1dXG4gICAqL1xuICBmdW5jdGlvbiB1bmlxKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0ZWUsIHRoaXNBcmcpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkgPyBhcnJheS5sZW5ndGggOiAwO1xuICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGlmIChpc1NvcnRlZCAhPSBudWxsICYmIHR5cGVvZiBpc1NvcnRlZCAhPSAnYm9vbGVhbicpIHtcbiAgICAgIHRoaXNBcmcgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNJdGVyYXRlZUNhbGwoYXJyYXksIGlzU29ydGVkLCB0aGlzQXJnKSA/IHVuZGVmaW5lZCA6IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGNhbGxiYWNrID0gZ2V0Q2FsbGJhY2soKTtcbiAgICBpZiAoIShpdGVyYXRlZSA9PSBudWxsICYmIGNhbGxiYWNrID09PSBiYXNlQ2FsbGJhY2spKSB7XG4gICAgICBpdGVyYXRlZSA9IGNhbGxiYWNrKGl0ZXJhdGVlLCB0aGlzQXJnLCAzKTtcbiAgICB9XG4gICAgcmV0dXJuIChpc1NvcnRlZCAmJiBnZXRJbmRleE9mKCkgPT0gYmFzZUluZGV4T2YpXG4gICAgICA/IHNvcnRlZFVuaXEoYXJyYXksIGl0ZXJhdGVlKVxuICAgICAgOiBiYXNlVW5pcShhcnJheSwgaXRlcmF0ZWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBpbnZlcnNlIG9mIGBfLnBhaXJzYDsgdGhpcyBtZXRob2QgcmV0dXJucyBhbiBvYmplY3QgY29tcG9zZWQgZnJvbSBhcnJheXNcbiAgICogb2YgcHJvcGVydHkgbmFtZXMgYW5kIHZhbHVlcy4gUHJvdmlkZSBlaXRoZXIgYSBzaW5nbGUgdHdvIGRpbWVuc2lvbmFsIGFycmF5LFxuICAgKiBlLmcuIGBbW2tleTEsIHZhbHVlMV0sIFtrZXkyLCB2YWx1ZTJdXWAgb3IgdHdvIGFycmF5cywgb25lIG9mIHByb3BlcnR5IG5hbWVzXG4gICAqIGFuZCBvbmUgb2YgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGFsaWFzIG9iamVjdFxuICAgKiBAY2F0ZWdvcnkgQXJyYXlcbiAgICogQHBhcmFtIHtBcnJheX0gcHJvcHMgVGhlIHByb3BlcnR5IG5hbWVzLlxuICAgKiBAcGFyYW0ge0FycmF5fSBbdmFsdWVzPVtdXSBUaGUgcHJvcGVydHkgdmFsdWVzLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLnppcE9iamVjdChbWydmcmVkJywgMzBdLCBbJ2Jhcm5leScsIDQwXV0pO1xuICAgKiAvLyA9PiB7ICdmcmVkJzogMzAsICdiYXJuZXknOiA0MCB9XG4gICAqXG4gICAqIF8uemlwT2JqZWN0KFsnZnJlZCcsICdiYXJuZXknXSwgWzMwLCA0MF0pO1xuICAgKiAvLyA9PiB7ICdmcmVkJzogMzAsICdiYXJuZXknOiA0MCB9XG4gICAqL1xuICBmdW5jdGlvbiB6aXBPYmplY3QocHJvcHMsIHZhbHVlcykge1xuICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICBsZW5ndGggPSBwcm9wcyA/IHByb3BzLmxlbmd0aCA6IDAsXG4gICAgICAgIHJlc3VsdCA9IHt9O1xuXG4gICAgaWYgKGxlbmd0aCAmJiAhdmFsdWVzICYmICFpc0FycmF5KHByb3BzWzBdKSkge1xuICAgICAgdmFsdWVzID0gW107XG4gICAgfVxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlc1tpbmRleF07XG4gICAgICB9IGVsc2UgaWYgKGtleSkge1xuICAgICAgICByZXN1bHRba2V5WzBdXSA9IGtleVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGBsb2Rhc2hgIG9iamVjdCB0aGF0IHdyYXBzIGB2YWx1ZWAgd2l0aCBleHBsaWNpdCBtZXRob2RcbiAgICogY2hhaW5pbmcgZW5hYmxlZC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgQ2hhaW5cbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gd3JhcC5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgbmV3IGBsb2Rhc2hgIHdyYXBwZXIgaW5zdGFuY2UuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIHZhciB1c2VycyA9IFtcbiAgICogICB7ICd1c2VyJzogJ2Jhcm5leScsICAnYWdlJzogMzYgfSxcbiAgICogICB7ICd1c2VyJzogJ2ZyZWQnLCAgICAnYWdlJzogNDAgfSxcbiAgICogICB7ICd1c2VyJzogJ3BlYmJsZXMnLCAnYWdlJzogMSB9XG4gICAqIF07XG4gICAqXG4gICAqIHZhciB5b3VuZ2VzdCA9IF8uY2hhaW4odXNlcnMpXG4gICAqICAgLnNvcnRCeSgnYWdlJylcbiAgICogICAubWFwKGZ1bmN0aW9uKGNocikge1xuICAgKiAgICAgcmV0dXJuIGNoci51c2VyICsgJyBpcyAnICsgY2hyLmFnZTtcbiAgICogICB9KVxuICAgKiAgIC5maXJzdCgpXG4gICAqICAgLnZhbHVlKCk7XG4gICAqIC8vID0+ICdwZWJibGVzIGlzIDEnXG4gICAqL1xuICBmdW5jdGlvbiBjaGFpbih2YWx1ZSkge1xuICAgIHZhciByZXN1bHQgPSBsb2Rhc2godmFsdWUpO1xuICAgIHJlc3VsdC5fX2NoYWluX18gPSB0cnVlO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaW52b2tlcyBgaW50ZXJjZXB0b3JgIGFuZCByZXR1cm5zIGB2YWx1ZWAuIFRoZSBpbnRlcmNlcHRvciBpc1xuICAgKiBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWQgd2l0aCBvbmUgYXJndW1lbnQ7ICh2YWx1ZSkuIFRoZSBwdXJwb3NlIG9mXG4gICAqIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiBpbiBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnNcbiAgICogb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgQ2hhaW5cbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvdmlkZSB0byBgaW50ZXJjZXB0b3JgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBpbnRlcmNlcHRvciBUaGUgZnVuY3Rpb24gdG8gaW52b2tlLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGludGVyY2VwdG9yYC5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgYHZhbHVlYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXyhbMSwgMiwgM10pXG4gICAqICAudGFwKGZ1bmN0aW9uKGFycmF5KSB7XG4gICAqICAgIGFycmF5LnBvcCgpO1xuICAgKiAgfSlcbiAgICogIC5yZXZlcnNlKClcbiAgICogIC52YWx1ZSgpO1xuICAgKiAvLyA9PiBbMiwgMV1cbiAgICovXG4gIGZ1bmN0aW9uIHRhcCh2YWx1ZSwgaW50ZXJjZXB0b3IsIHRoaXNBcmcpIHtcbiAgICBpbnRlcmNlcHRvci5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgaXMgbGlrZSBgXy50YXBgIGV4Y2VwdCB0aGF0IGl0IHJldHVybnMgdGhlIHJlc3VsdCBvZiBgaW50ZXJjZXB0b3JgLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDaGFpblxuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm92aWRlIHRvIGBpbnRlcmNlcHRvcmAuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGludGVyY2VwdG9yIFRoZSBmdW5jdGlvbiB0byBpbnZva2UuXG4gICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgaW50ZXJjZXB0b3JgLlxuICAgKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgcmVzdWx0IG9mIGBpbnRlcmNlcHRvcmAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8oJyAgYWJjICAnKVxuICAgKiAgLmNoYWluKClcbiAgICogIC50cmltKClcbiAgICogIC50aHJ1KGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgIHJldHVybiBbdmFsdWVdO1xuICAgKiAgfSlcbiAgICogIC52YWx1ZSgpO1xuICAgKiAvLyA9PiBbJ2FiYyddXG4gICAqL1xuICBmdW5jdGlvbiB0aHJ1KHZhbHVlLCBpbnRlcmNlcHRvciwgdGhpc0FyZykge1xuICAgIHJldHVybiBpbnRlcmNlcHRvci5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmFibGVzIGV4cGxpY2l0IG1ldGhvZCBjaGFpbmluZyBvbiB0aGUgd3JhcHBlciBvYmplY3QuXG4gICAqXG4gICAqIEBuYW1lIGNoYWluXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDaGFpblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgYGxvZGFzaGAgd3JhcHBlciBpbnN0YW5jZS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIHVzZXJzID0gW1xuICAgKiAgIHsgJ3VzZXInOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAqICAgeyAndXNlcic6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgKiBdO1xuICAgKlxuICAgKiAvLyB3aXRob3V0IGV4cGxpY2l0IGNoYWluaW5nXG4gICAqIF8odXNlcnMpLmZpcnN0KCk7XG4gICAqIC8vID0+IHsgJ3VzZXInOiAnYmFybmV5JywgJ2FnZSc6IDM2IH1cbiAgICpcbiAgICogLy8gd2l0aCBleHBsaWNpdCBjaGFpbmluZ1xuICAgKiBfKHVzZXJzKS5jaGFpbigpXG4gICAqICAgLmZpcnN0KClcbiAgICogICAucGljaygndXNlcicpXG4gICAqICAgLnZhbHVlKCk7XG4gICAqIC8vID0+IHsgJ3VzZXInOiAnYmFybmV5JyB9XG4gICAqL1xuICBmdW5jdGlvbiB3cmFwcGVyQ2hhaW4oKSB7XG4gICAgcmV0dXJuIGNoYWluKHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIHRoZSBjaGFpbmVkIHNlcXVlbmNlIGFuZCByZXR1cm5zIHRoZSB3cmFwcGVkIHJlc3VsdC5cbiAgICpcbiAgICogQG5hbWUgY29tbWl0XG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDaGFpblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgYGxvZGFzaGAgd3JhcHBlciBpbnN0YW5jZS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIGFycmF5ID0gWzEsIDJdO1xuICAgKiB2YXIgd3JhcHBlZCA9IF8oYXJyYXkpLnB1c2goMyk7XG4gICAqXG4gICAqIGNvbnNvbGUubG9nKGFycmF5KTtcbiAgICogLy8gPT4gWzEsIDJdXG4gICAqXG4gICAqIHdyYXBwZWQgPSB3cmFwcGVkLmNvbW1pdCgpO1xuICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAqIC8vID0+IFsxLCAyLCAzXVxuICAgKlxuICAgKiB3cmFwcGVkLmxhc3QoKTtcbiAgICogLy8gPT4gM1xuICAgKlxuICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAqIC8vID0+IFsxLCAyLCAzXVxuICAgKi9cbiAgZnVuY3Rpb24gd3JhcHBlckNvbW1pdCgpIHtcbiAgICByZXR1cm4gbmV3IExvZGFzaFdyYXBwZXIodGhpcy52YWx1ZSgpLCB0aGlzLl9fY2hhaW5fXyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBhcnJheSBqb2luaW5nIGEgd3JhcHBlZCBhcnJheSB3aXRoIGFueSBhZGRpdGlvbmFsIGFycmF5c1xuICAgKiBhbmQvb3IgdmFsdWVzLlxuICAgKlxuICAgKiBAbmFtZSBjb25jYXRcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IENoYWluXG4gICAqIEBwYXJhbSB7Li4uKn0gW3ZhbHVlc10gVGhlIHZhbHVlcyB0byBjb25jYXRlbmF0ZS5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgY29uY2F0ZW5hdGVkIGFycmF5LlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiB2YXIgYXJyYXkgPSBbMV07XG4gICAqIHZhciB3cmFwcGVkID0gXyhhcnJheSkuY29uY2F0KDIsIFszXSwgW1s0XV0pO1xuICAgKlxuICAgKiBjb25zb2xlLmxvZyh3cmFwcGVkLnZhbHVlKCkpO1xuICAgKiAvLyA9PiBbMSwgMiwgMywgWzRdXVxuICAgKlxuICAgKiBjb25zb2xlLmxvZyhhcnJheSk7XG4gICAqIC8vID0+IFsxXVxuICAgKi9cbiAgdmFyIHdyYXBwZXJDb25jYXQgPSByZXN0UGFyYW0oZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgdmFsdWVzID0gYmFzZUZsYXR0ZW4odmFsdWVzKTtcbiAgICByZXR1cm4gdGhpcy50aHJ1KGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgICByZXR1cm4gYXJyYXlDb25jYXQoaXNBcnJheShhcnJheSkgPyBhcnJheSA6IFt0b09iamVjdChhcnJheSldLCB2YWx1ZXMpO1xuICAgIH0pO1xuICB9KTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGNsb25lIG9mIHRoZSBjaGFpbmVkIHNlcXVlbmNlIHBsYW50aW5nIGB2YWx1ZWAgYXMgdGhlIHdyYXBwZWQgdmFsdWUuXG4gICAqXG4gICAqIEBuYW1lIHBsYW50XG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDaGFpblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgYGxvZGFzaGAgd3JhcHBlciBpbnN0YW5jZS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIGFycmF5ID0gWzEsIDJdO1xuICAgKiB2YXIgd3JhcHBlZCA9IF8oYXJyYXkpLm1hcChmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIHJldHVybiBNYXRoLnBvdyh2YWx1ZSwgMik7XG4gICAqIH0pO1xuICAgKlxuICAgKiB2YXIgb3RoZXIgPSBbMywgNF07XG4gICAqIHZhciBvdGhlcldyYXBwZWQgPSB3cmFwcGVkLnBsYW50KG90aGVyKTtcbiAgICpcbiAgICogb3RoZXJXcmFwcGVkLnZhbHVlKCk7XG4gICAqIC8vID0+IFs5LCAxNl1cbiAgICpcbiAgICogd3JhcHBlZC52YWx1ZSgpO1xuICAgKiAvLyA9PiBbMSwgNF1cbiAgICovXG4gIGZ1bmN0aW9uIHdyYXBwZXJQbGFudCh2YWx1ZSkge1xuICAgIHZhciByZXN1bHQsXG4gICAgICAgIHBhcmVudCA9IHRoaXM7XG5cbiAgICB3aGlsZSAocGFyZW50IGluc3RhbmNlb2YgYmFzZUxvZGFzaCkge1xuICAgICAgdmFyIGNsb25lID0gd3JhcHBlckNsb25lKHBhcmVudCk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHByZXZpb3VzLl9fd3JhcHBlZF9fID0gY2xvbmU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBjbG9uZTtcbiAgICAgIH1cbiAgICAgIHZhciBwcmV2aW91cyA9IGNsb25lO1xuICAgICAgcGFyZW50ID0gcGFyZW50Ll9fd3JhcHBlZF9fO1xuICAgIH1cbiAgICBwcmV2aW91cy5fX3dyYXBwZWRfXyA9IHZhbHVlO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogUmV2ZXJzZXMgdGhlIHdyYXBwZWQgYXJyYXkgc28gdGhlIGZpcnN0IGVsZW1lbnQgYmVjb21lcyB0aGUgbGFzdCwgdGhlXG4gICAqIHNlY29uZCBlbGVtZW50IGJlY29tZXMgdGhlIHNlY29uZCB0byBsYXN0LCBhbmQgc28gb24uXG4gICAqXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBtdXRhdGVzIHRoZSB3cmFwcGVkIGFycmF5LlxuICAgKlxuICAgKiBAbmFtZSByZXZlcnNlXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDaGFpblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgcmV2ZXJzZWQgYGxvZGFzaGAgd3JhcHBlciBpbnN0YW5jZS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIGFycmF5ID0gWzEsIDIsIDNdO1xuICAgKlxuICAgKiBfKGFycmF5KS5yZXZlcnNlKCkudmFsdWUoKVxuICAgKiAvLyA9PiBbMywgMiwgMV1cbiAgICpcbiAgICogY29uc29sZS5sb2coYXJyYXkpO1xuICAgKiAvLyA9PiBbMywgMiwgMV1cbiAgICovXG4gIGZ1bmN0aW9uIHdyYXBwZXJSZXZlcnNlKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuX193cmFwcGVkX187XG5cbiAgICB2YXIgaW50ZXJjZXB0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuICh3cmFwcGVkICYmIHdyYXBwZWQuX19kaXJfXyA8IDApID8gdmFsdWUgOiB2YWx1ZS5yZXZlcnNlKCk7XG4gICAgfTtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBMYXp5V3JhcHBlcikge1xuICAgICAgdmFyIHdyYXBwZWQgPSB2YWx1ZTtcbiAgICAgIGlmICh0aGlzLl9fYWN0aW9uc19fLmxlbmd0aCkge1xuICAgICAgICB3cmFwcGVkID0gbmV3IExhenlXcmFwcGVyKHRoaXMpO1xuICAgICAgfVxuICAgICAgd3JhcHBlZCA9IHdyYXBwZWQucmV2ZXJzZSgpO1xuICAgICAgd3JhcHBlZC5fX2FjdGlvbnNfXy5wdXNoKHsgJ2Z1bmMnOiB0aHJ1LCAnYXJncyc6IFtpbnRlcmNlcHRvcl0sICd0aGlzQXJnJzogdW5kZWZpbmVkIH0pO1xuICAgICAgcmV0dXJuIG5ldyBMb2Rhc2hXcmFwcGVyKHdyYXBwZWQsIHRoaXMuX19jaGFpbl9fKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudGhydShpbnRlcmNlcHRvcik7XG4gIH1cblxuICAvKipcbiAgICogUHJvZHVjZXMgdGhlIHJlc3VsdCBvZiBjb2VyY2luZyB0aGUgdW53cmFwcGVkIHZhbHVlIHRvIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAbmFtZSB0b1N0cmluZ1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgQ2hhaW5cbiAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgY29lcmNlZCBzdHJpbmcgdmFsdWUuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8oWzEsIDIsIDNdKS50b1N0cmluZygpO1xuICAgKiAvLyA9PiAnMSwyLDMnXG4gICAqL1xuICBmdW5jdGlvbiB3cmFwcGVyVG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICh0aGlzLnZhbHVlKCkgKyAnJyk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgdGhlIGNoYWluZWQgc2VxdWVuY2UgdG8gZXh0cmFjdCB0aGUgdW53cmFwcGVkIHZhbHVlLlxuICAgKlxuICAgKiBAbmFtZSB2YWx1ZVxuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAYWxpYXMgcnVuLCB0b0pTT04sIHZhbHVlT2ZcbiAgICogQGNhdGVnb3J5IENoYWluXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSByZXNvbHZlZCB1bndyYXBwZWQgdmFsdWUuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8oWzEsIDIsIDNdKS52YWx1ZSgpO1xuICAgKiAvLyA9PiBbMSwgMiwgM11cbiAgICovXG4gIGZ1bmN0aW9uIHdyYXBwZXJWYWx1ZSgpIHtcbiAgICByZXR1cm4gYmFzZVdyYXBwZXJWYWx1ZSh0aGlzLl9fd3JhcHBlZF9fLCB0aGlzLl9fYWN0aW9uc19fKTtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciBlbGVtZW50cyBvZiBgY29sbGVjdGlvbmAsIHJldHVybmluZyBhbiBhcnJheSBvZiBhbGwgZWxlbWVudHNcbiAgICogYHByZWRpY2F0ZWAgcmV0dXJucyB0cnV0aHkgZm9yLiBUaGUgcHJlZGljYXRlIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmRcbiAgICogaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLlxuICAgKlxuICAgKiBJZiBhIHByb3BlcnR5IG5hbWUgaXMgcHJvdmlkZWQgZm9yIGBwcmVkaWNhdGVgIHRoZSBjcmVhdGVkIGBfLnByb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICpcbiAgICogSWYgYSB2YWx1ZSBpcyBhbHNvIHByb3ZpZGVkIGZvciBgdGhpc0FyZ2AgdGhlIGNyZWF0ZWQgYF8ubWF0Y2hlc1Byb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIGEgbWF0Y2hpbmcgcHJvcGVydHlcbiAgICogdmFsdWUsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgcHJlZGljYXRlYCB0aGUgY3JlYXRlZCBgXy5tYXRjaGVzYCBzdHlsZVxuICAgKiBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlblxuICAgKiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAYWxpYXMgc2VsZWN0XG4gICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fHN0cmluZ30gW3ByZWRpY2F0ZT1fLmlkZW50aXR5XSBUaGUgZnVuY3Rpb24gaW52b2tlZFxuICAgKiAgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBwcmVkaWNhdGVgLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBmaWx0ZXJlZCBhcnJheS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5maWx0ZXIoWzQsIDUsIDZdLCBmdW5jdGlvbihuKSB7XG4gICAqICAgcmV0dXJuIG4gJSAyID09IDA7XG4gICAqIH0pO1xuICAgKiAvLyA9PiBbNCwgNl1cbiAgICpcbiAgICogdmFyIHVzZXJzID0gW1xuICAgKiAgIHsgJ3VzZXInOiAnYmFybmV5JywgJ2FnZSc6IDM2LCAnYWN0aXZlJzogdHJ1ZSB9LFxuICAgKiAgIHsgJ3VzZXInOiAnZnJlZCcsICAgJ2FnZSc6IDQwLCAnYWN0aXZlJzogZmFsc2UgfVxuICAgKiBdO1xuICAgKlxuICAgKiAvLyB1c2luZyB0aGUgYF8ubWF0Y2hlc2AgY2FsbGJhY2sgc2hvcnRoYW5kXG4gICAqIF8ucGx1Y2soXy5maWx0ZXIodXNlcnMsIHsgJ2FnZSc6IDM2LCAnYWN0aXZlJzogdHJ1ZSB9KSwgJ3VzZXInKTtcbiAgICogLy8gPT4gWydiYXJuZXknXVxuICAgKlxuICAgKiAvLyB1c2luZyB0aGUgYF8ubWF0Y2hlc1Byb3BlcnR5YCBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICogXy5wbHVjayhfLmZpbHRlcih1c2VycywgJ2FjdGl2ZScsIGZhbHNlKSwgJ3VzZXInKTtcbiAgICogLy8gPT4gWydmcmVkJ11cbiAgICpcbiAgICogLy8gdXNpbmcgdGhlIGBfLnByb3BlcnR5YCBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICogXy5wbHVjayhfLmZpbHRlcih1c2VycywgJ2FjdGl2ZScpLCAndXNlcicpO1xuICAgKiAvLyA9PiBbJ2Jhcm5leSddXG4gICAqL1xuICBmdW5jdGlvbiBmaWx0ZXIoY29sbGVjdGlvbiwgcHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZ1bmMgPSBpc0FycmF5KGNvbGxlY3Rpb24pID8gYXJyYXlGaWx0ZXIgOiBiYXNlRmlsdGVyO1xuICAgIHByZWRpY2F0ZSA9IGdldENhbGxiYWNrKHByZWRpY2F0ZSwgdGhpc0FyZywgMyk7XG4gICAgcmV0dXJuIGZ1bmMoY29sbGVjdGlvbiwgcHJlZGljYXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyBvdmVyIGVsZW1lbnRzIG9mIGBjb2xsZWN0aW9uYCBpbnZva2luZyBgaXRlcmF0ZWVgIGZvciBlYWNoIGVsZW1lbnQuXG4gICAqIFRoZSBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czpcbiAgICogKHZhbHVlLCBpbmRleHxrZXksIGNvbGxlY3Rpb24pLiBJdGVyYXRlZSBmdW5jdGlvbnMgbWF5IGV4aXQgaXRlcmF0aW9uIGVhcmx5XG4gICAqIGJ5IGV4cGxpY2l0bHkgcmV0dXJuaW5nIGBmYWxzZWAuXG4gICAqXG4gICAqICoqTm90ZToqKiBBcyB3aXRoIG90aGVyIFwiQ29sbGVjdGlvbnNcIiBtZXRob2RzLCBvYmplY3RzIHdpdGggYSBcImxlbmd0aFwiIHByb3BlcnR5XG4gICAqIGFyZSBpdGVyYXRlZCBsaWtlIGFycmF5cy4gVG8gYXZvaWQgdGhpcyBiZWhhdmlvciBgXy5mb3JJbmAgb3IgYF8uZm9yT3duYFxuICAgKiBtYXkgYmUgdXNlZCBmb3Igb2JqZWN0IGl0ZXJhdGlvbi5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAYWxpYXMgZWFjaFxuICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXRlcmF0ZWU9Xy5pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBpdGVyYXRlZWAuXG4gICAqIEByZXR1cm5zIHtBcnJheXxPYmplY3R8c3RyaW5nfSBSZXR1cm5zIGBjb2xsZWN0aW9uYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXyhbMSwgMl0pLmZvckVhY2goZnVuY3Rpb24obikge1xuICAgKiAgIGNvbnNvbGUubG9nKG4pO1xuICAgKiB9KS52YWx1ZSgpO1xuICAgKiAvLyA9PiBsb2dzIGVhY2ggdmFsdWUgZnJvbSBsZWZ0IHRvIHJpZ2h0IGFuZCByZXR1cm5zIHRoZSBhcnJheVxuICAgKlxuICAgKiBfLmZvckVhY2goeyAnYSc6IDEsICdiJzogMiB9LCBmdW5jdGlvbihuLCBrZXkpIHtcbiAgICogICBjb25zb2xlLmxvZyhuLCBrZXkpO1xuICAgKiB9KTtcbiAgICogLy8gPT4gbG9ncyBlYWNoIHZhbHVlLWtleSBwYWlyIGFuZCByZXR1cm5zIHRoZSBvYmplY3QgKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAgICovXG4gIHZhciBmb3JFYWNoID0gY3JlYXRlRm9yRWFjaChhcnJheUVhY2gsIGJhc2VFYWNoKTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBhcnJheSBvZiB2YWx1ZXMgYnkgcnVubmluZyBlYWNoIGVsZW1lbnQgaW4gYGNvbGxlY3Rpb25gIHRocm91Z2hcbiAgICogYGl0ZXJhdGVlYC4gVGhlIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWVcbiAgICogYXJndW1lbnRzOiAodmFsdWUsIGluZGV4fGtleSwgY29sbGVjdGlvbikuXG4gICAqXG4gICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGl0ZXJhdGVlYCB0aGUgY3JlYXRlZCBgXy5wcm9wZXJ0eWBcbiAgICogc3R5bGUgY2FsbGJhY2sgcmV0dXJucyB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqXG4gICAqIElmIGEgdmFsdWUgaXMgYWxzbyBwcm92aWRlZCBmb3IgYHRoaXNBcmdgIHRoZSBjcmVhdGVkIGBfLm1hdGNoZXNQcm9wZXJ0eWBcbiAgICogc3R5bGUgY2FsbGJhY2sgcmV0dXJucyBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSBhIG1hdGNoaW5nIHByb3BlcnR5XG4gICAqIHZhbHVlLCBlbHNlIGBmYWxzZWAuXG4gICAqXG4gICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGl0ZXJhdGVlYCB0aGUgY3JlYXRlZCBgXy5tYXRjaGVzYCBzdHlsZVxuICAgKiBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlblxuICAgKiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogTWFueSBsb2Rhc2ggbWV0aG9kcyBhcmUgZ3VhcmRlZCB0byB3b3JrIGFzIGl0ZXJhdGVlcyBmb3IgbWV0aG9kcyBsaWtlXG4gICAqIGBfLmV2ZXJ5YCwgYF8uZmlsdGVyYCwgYF8ubWFwYCwgYF8ubWFwVmFsdWVzYCwgYF8ucmVqZWN0YCwgYW5kIGBfLnNvbWVgLlxuICAgKlxuICAgKiBUaGUgZ3VhcmRlZCBtZXRob2RzIGFyZTpcbiAgICogYGFyeWAsIGBjYWxsYmFja2AsIGBjaHVua2AsIGBjbG9uZWAsIGBjcmVhdGVgLCBgY3VycnlgLCBgY3VycnlSaWdodGAsXG4gICAqIGBkcm9wYCwgYGRyb3BSaWdodGAsIGBldmVyeWAsIGBmaWxsYCwgYGZsYXR0ZW5gLCBgaW52ZXJ0YCwgYG1heGAsIGBtaW5gLFxuICAgKiBgcGFyc2VJbnRgLCBgc2xpY2VgLCBgc29ydEJ5YCwgYHRha2VgLCBgdGFrZVJpZ2h0YCwgYHRlbXBsYXRlYCwgYHRyaW1gLFxuICAgKiBgdHJpbUxlZnRgLCBgdHJpbVJpZ2h0YCwgYHRydW5jYCwgYHJhbmRvbWAsIGByYW5nZWAsIGBzYW1wbGVgLCBgc29tZWAsXG4gICAqIGBzdW1gLCBgdW5pcWAsIGFuZCBgd29yZHNgXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGFsaWFzIGNvbGxlY3RcbiAgICogQGNhdGVnb3J5IENvbGxlY3Rpb25cbiAgICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbaXRlcmF0ZWU9Xy5pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGludm9rZWRcbiAgICogIHBlciBpdGVyYXRpb24uXG4gICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgaXRlcmF0ZWVgLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIG5ldyBtYXBwZWQgYXJyYXkuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIGZ1bmN0aW9uIHRpbWVzVGhyZWUobikge1xuICAgKiAgIHJldHVybiBuICogMztcbiAgICogfVxuICAgKlxuICAgKiBfLm1hcChbMSwgMl0sIHRpbWVzVGhyZWUpO1xuICAgKiAvLyA9PiBbMywgNl1cbiAgICpcbiAgICogXy5tYXAoeyAnYSc6IDEsICdiJzogMiB9LCB0aW1lc1RocmVlKTtcbiAgICogLy8gPT4gWzMsIDZdIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gICAqXG4gICAqIHZhciB1c2VycyA9IFtcbiAgICogICB7ICd1c2VyJzogJ2Jhcm5leScgfSxcbiAgICogICB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAgICogXTtcbiAgICpcbiAgICogLy8gdXNpbmcgdGhlIGBfLnByb3BlcnR5YCBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICogXy5tYXAodXNlcnMsICd1c2VyJyk7XG4gICAqIC8vID0+IFsnYmFybmV5JywgJ2ZyZWQnXVxuICAgKi9cbiAgZnVuY3Rpb24gbWFwKGNvbGxlY3Rpb24sIGl0ZXJhdGVlLCB0aGlzQXJnKSB7XG4gICAgdmFyIGZ1bmMgPSBpc0FycmF5KGNvbGxlY3Rpb24pID8gYXJyYXlNYXAgOiBiYXNlTWFwO1xuICAgIGl0ZXJhdGVlID0gZ2V0Q2FsbGJhY2soaXRlcmF0ZWUsIHRoaXNBcmcsIDMpO1xuICAgIHJldHVybiBmdW5jKGNvbGxlY3Rpb24sIGl0ZXJhdGVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiBgcGF0aGAgZnJvbSBhbGwgZWxlbWVudHMgaW4gYGNvbGxlY3Rpb25gLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBDb2xsZWN0aW9uXG4gICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fHN0cmluZ30gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBpdGVyYXRlIG92ZXIuXG4gICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBwbHVjay5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZXMuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIHZhciB1c2VycyA9IFtcbiAgICogICB7ICd1c2VyJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgKiAgIHsgJ3VzZXInOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH1cbiAgICogXTtcbiAgICpcbiAgICogXy5wbHVjayh1c2VycywgJ3VzZXInKTtcbiAgICogLy8gPT4gWydiYXJuZXknLCAnZnJlZCddXG4gICAqXG4gICAqIHZhciB1c2VySW5kZXggPSBfLmluZGV4QnkodXNlcnMsICd1c2VyJyk7XG4gICAqIF8ucGx1Y2sodXNlckluZGV4LCAnYWdlJyk7XG4gICAqIC8vID0+IFszNiwgNDBdIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gICAqL1xuICBmdW5jdGlvbiBwbHVjayhjb2xsZWN0aW9uLCBwYXRoKSB7XG4gICAgcmV0dXJuIG1hcChjb2xsZWN0aW9uLCBwcm9wZXJ0eShwYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmVkdWNlcyBgY29sbGVjdGlvbmAgdG8gYSB2YWx1ZSB3aGljaCBpcyB0aGUgYWNjdW11bGF0ZWQgcmVzdWx0IG9mIHJ1bm5pbmdcbiAgICogZWFjaCBlbGVtZW50IGluIGBjb2xsZWN0aW9uYCB0aHJvdWdoIGBpdGVyYXRlZWAsIHdoZXJlIGVhY2ggc3VjY2Vzc2l2ZVxuICAgKiBpbnZvY2F0aW9uIGlzIHN1cHBsaWVkIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIHByZXZpb3VzLiBJZiBgYWNjdW11bGF0b3JgXG4gICAqIGlzIG5vdCBwcm92aWRlZCB0aGUgZmlyc3QgZWxlbWVudCBvZiBgY29sbGVjdGlvbmAgaXMgdXNlZCBhcyB0aGUgaW5pdGlhbFxuICAgKiB2YWx1ZS4gVGhlIGBpdGVyYXRlZWAgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggZm91ciBhcmd1bWVudHM6XG4gICAqIChhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4fGtleSwgY29sbGVjdGlvbikuXG4gICAqXG4gICAqIE1hbnkgbG9kYXNoIG1ldGhvZHMgYXJlIGd1YXJkZWQgdG8gd29yayBhcyBpdGVyYXRlZXMgZm9yIG1ldGhvZHMgbGlrZVxuICAgKiBgXy5yZWR1Y2VgLCBgXy5yZWR1Y2VSaWdodGAsIGFuZCBgXy50cmFuc2Zvcm1gLlxuICAgKlxuICAgKiBUaGUgZ3VhcmRlZCBtZXRob2RzIGFyZTpcbiAgICogYGFzc2lnbmAsIGBkZWZhdWx0c2AsIGBkZWZhdWx0c0RlZXBgLCBgaW5jbHVkZXNgLCBgbWVyZ2VgLCBgc29ydEJ5QWxsYCxcbiAgICogYW5kIGBzb3J0QnlPcmRlcmBcbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAYWxpYXMgZm9sZGwsIGluamVjdFxuICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaXRlcmF0ZWU9Xy5pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHsqfSBbYWNjdW11bGF0b3JdIFRoZSBpbml0aWFsIHZhbHVlLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGl0ZXJhdGVlYC5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGFjY3VtdWxhdGVkIHZhbHVlLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLnJlZHVjZShbMSwgMl0sIGZ1bmN0aW9uKHRvdGFsLCBuKSB7XG4gICAqICAgcmV0dXJuIHRvdGFsICsgbjtcbiAgICogfSk7XG4gICAqIC8vID0+IDNcbiAgICpcbiAgICogXy5yZWR1Y2UoeyAnYSc6IDEsICdiJzogMiB9LCBmdW5jdGlvbihyZXN1bHQsIG4sIGtleSkge1xuICAgKiAgIHJlc3VsdFtrZXldID0gbiAqIDM7XG4gICAqICAgcmV0dXJuIHJlc3VsdDtcbiAgICogfSwge30pO1xuICAgKiAvLyA9PiB7ICdhJzogMywgJ2InOiA2IH0gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAgICovXG4gIHZhciByZWR1Y2UgPSBjcmVhdGVSZWR1Y2UoYXJyYXlSZWR1Y2UsIGJhc2VFYWNoKTtcblxuICAvKipcbiAgICogR2V0cyB0aGUgc2l6ZSBvZiBgY29sbGVjdGlvbmAgYnkgcmV0dXJuaW5nIGl0cyBsZW5ndGggZm9yIGFycmF5LWxpa2VcbiAgICogdmFsdWVzIG9yIHRoZSBudW1iZXIgb2Ygb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBmb3Igb2JqZWN0cy5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgQ29sbGVjdGlvblxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaW5zcGVjdC5cbiAgICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgc2l6ZSBvZiBgY29sbGVjdGlvbmAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uc2l6ZShbMSwgMiwgM10pO1xuICAgKiAvLyA9PiAzXG4gICAqXG4gICAqIF8uc2l6ZSh7ICdhJzogMSwgJ2InOiAyIH0pO1xuICAgKiAvLyA9PiAyXG4gICAqXG4gICAqIF8uc2l6ZSgncGViYmxlcycpO1xuICAgKiAvLyA9PiA3XG4gICAqL1xuICBmdW5jdGlvbiBzaXplKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbGVuZ3RoID0gY29sbGVjdGlvbiA/IGdldExlbmd0aChjb2xsZWN0aW9uKSA6IDA7XG4gICAgcmV0dXJuIGlzTGVuZ3RoKGxlbmd0aCkgPyBsZW5ndGggOiBrZXlzKGNvbGxlY3Rpb24pLmxlbmd0aDtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICAgKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRGF0ZVxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XG4gICAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAgICogfSwgXy5ub3coKSk7XG4gICAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAgICovXG4gIHZhciBub3cgPSBuYXRpdmVOb3cgfHwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXG4gICAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICAgKiBpbnZva2VkLiBUaGUgZGVib3VuY2VkIGZ1bmN0aW9uIGNvbWVzIHdpdGggYSBgY2FuY2VsYCBtZXRob2QgdG8gY2FuY2VsXG4gICAqIGRlbGF5ZWQgaW52b2NhdGlvbnMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2BcbiAgICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICAgKiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3RcbiAgICogYGZ1bmNgIGludm9jYXRpb24uXG4gICAqXG4gICAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXMgaW52b2tlZFxuICAgKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXG4gICAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICpcbiAgICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbilcbiAgICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZ1xuICAgKiAgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmVcbiAgICogIGRlbGF5ZWQgYmVmb3JlIGl0IGlzIGludm9rZWQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICAgKlxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICogICAnbGVhZGluZyc6IHRydWUsXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcbiAgICpcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xuICAgKiAgIH1cbiAgICogfSwgWydkZWxldGUnXSk7XG4gICAqXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XG4gICAqXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJncyxcbiAgICAgICAgbWF4VGltZW91dElkLFxuICAgICAgICByZXN1bHQsXG4gICAgICAgIHN0YW1wLFxuICAgICAgICB0aGlzQXJnLFxuICAgICAgICB0aW1lb3V0SWQsXG4gICAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICAgIG1heFdhaXQgPSBmYWxzZSxcbiAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgICB9XG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgbGFzdENhbGxlZCA9IDA7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgIH1cbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHN0YW1wID0gbm93KCk7XG4gICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gbWF4V2FpdDtcblxuICAgICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGxlYWRpbmdDYWxsKSB7XG4gICAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIHJldHVybiBkZWJvdW5jZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgaW52b2tlcyBgZnVuY2Agd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlXG4gICAqIGNyZWF0ZWQgZnVuY3Rpb24gYW5kIGFyZ3VtZW50cyBmcm9tIGBzdGFydGAgYW5kIGJleW9uZCBwcm92aWRlZCBhcyBhbiBhcnJheS5cbiAgICpcbiAgICogKipOb3RlOioqIFRoaXMgbWV0aG9kIGlzIGJhc2VkIG9uIHRoZSBbcmVzdCBwYXJhbWV0ZXJdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0Z1bmN0aW9ucy9yZXN0X3BhcmFtZXRlcnMpLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBhcHBseSBhIHJlc3QgcGFyYW1ldGVyIHRvLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW3N0YXJ0PWZ1bmMubGVuZ3RoLTFdIFRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcmVzdCBwYXJhbWV0ZXIuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiB2YXIgc2F5ID0gXy5yZXN0UGFyYW0oZnVuY3Rpb24od2hhdCwgbmFtZXMpIHtcbiAgICogICByZXR1cm4gd2hhdCArICcgJyArIF8uaW5pdGlhbChuYW1lcykuam9pbignLCAnKSArXG4gICAqICAgICAoXy5zaXplKG5hbWVzKSA+IDEgPyAnLCAmICcgOiAnJykgKyBfLmxhc3QobmFtZXMpO1xuICAgKiB9KTtcbiAgICpcbiAgICogc2F5KCdoZWxsbycsICdmcmVkJywgJ2Jhcm5leScsICdwZWJibGVzJyk7XG4gICAqIC8vID0+ICdoZWxsbyBmcmVkLCBiYXJuZXksICYgcGViYmxlcydcbiAgICovXG4gIGZ1bmN0aW9uIHJlc3RQYXJhbShmdW5jLCBzdGFydCkge1xuICAgIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKEZVTkNfRVJST1JfVEVYVCk7XG4gICAgfVxuICAgIHN0YXJ0ID0gbmF0aXZlTWF4KHN0YXJ0ID09PSB1bmRlZmluZWQgPyAoZnVuYy5sZW5ndGggLSAxKSA6ICgrc3RhcnQgfHwgMCksIDApO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgICAgbGVuZ3RoID0gbmF0aXZlTWF4KGFyZ3MubGVuZ3RoIC0gc3RhcnQsIDApLFxuICAgICAgICAgIHJlc3QgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICByZXN0W2luZGV4XSA9IGFyZ3Nbc3RhcnQgKyBpbmRleF07XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCByZXN0KTtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZ3NbMF0sIHJlc3QpO1xuICAgICAgICBjYXNlIDI6IHJldHVybiBmdW5jLmNhbGwodGhpcywgYXJnc1swXSwgYXJnc1sxXSwgcmVzdCk7XG4gICAgICB9XG4gICAgICB2YXIgb3RoZXJBcmdzID0gQXJyYXkoc3RhcnQgKyAxKTtcbiAgICAgIGluZGV4ID0gLTE7XG4gICAgICB3aGlsZSAoKytpbmRleCA8IHN0YXJ0KSB7XG4gICAgICAgIG90aGVyQXJnc1tpbmRleF0gPSBhcmdzW2luZGV4XTtcbiAgICAgIH1cbiAgICAgIG90aGVyQXJnc1tzdGFydF0gPSByZXN0O1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgb3RoZXJBcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBncmVhdGVyIHRoYW4gYG90aGVyYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTGFuZ1xuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjb21wYXJlLlxuICAgKiBAcGFyYW0geyp9IG90aGVyIFRoZSBvdGhlciB2YWx1ZSB0byBjb21wYXJlLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBncmVhdGVyIHRoYW4gYG90aGVyYCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmd0KDMsIDEpO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uZ3QoMywgMyk7XG4gICAqIC8vID0+IGZhbHNlXG4gICAqXG4gICAqIF8uZ3QoMSwgMyk7XG4gICAqIC8vID0+IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiBndCh2YWx1ZSwgb3RoZXIpIHtcbiAgICByZXR1cm4gdmFsdWUgPiBvdGhlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGFuIGBhcmd1bWVudHNgIG9iamVjdC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTGFuZ1xuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5pc0FyZ3VtZW50cyhmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzQXJndW1lbnRzKFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuICAgIHJldHVybiBpc09iamVjdExpa2UodmFsdWUpICYmIGlzQXJyYXlMaWtlKHZhbHVlKSAmJlxuICAgICAgaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2NhbGxlZScpICYmICFwcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHZhbHVlLCAnY2FsbGVlJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhbiBgQXJyYXlgIG9iamVjdC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTGFuZ1xuICAgKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5pc0FycmF5KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc0FycmF5KGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJndW1lbnRzOyB9KCkpO1xuICAgKiAvLyA9PiBmYWxzZVxuICAgKi9cbiAgdmFyIGlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBhcnJheVRhZztcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBMYW5nXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzRnVuY3Rpb24oXyk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBUaGUgdXNlIG9mIGBPYmplY3QjdG9TdHJpbmdgIGF2b2lkcyBpc3N1ZXMgd2l0aCB0aGUgYHR5cGVvZmAgb3BlcmF0b3JcbiAgICAvLyBpbiBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaSB3aGljaCByZXR1cm4gJ2Z1bmN0aW9uJyBmb3IgcmVnZXhlc1xuICAgIC8vIGFuZCBTYWZhcmkgOCBlcXVpdmFsZW50cyB3aGljaCByZXR1cm4gJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGNvbnN0cnVjdG9ycy5cbiAgICByZXR1cm4gaXNPYmplY3QodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09IGZ1bmNUYWc7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KHt9KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc09iamVjdCgxKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBMYW5nXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzTmF0aXZlKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzTmF0aXZlKF8pO1xuICAgKiAvLyA9PiBmYWxzZVxuICAgKi9cbiAgZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiByZUlzTmF0aXZlLnRlc3QoZm5Ub1N0cmluZy5jYWxsKHZhbHVlKSk7XG4gICAgfVxuICAgIHJldHVybiBpc09iamVjdExpa2UodmFsdWUpICYmIHJlSXNIb3N0Q3Rvci50ZXN0KHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYE51bWJlcmAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAgICpcbiAgICogKipOb3RlOioqIFRvIGV4Y2x1ZGUgYEluZmluaXR5YCwgYC1JbmZpbml0eWAsIGFuZCBgTmFOYCwgd2hpY2ggYXJlIGNsYXNzaWZpZWRcbiAgICogYXMgbnVtYmVycywgdXNlIHRoZSBgXy5pc0Zpbml0ZWAgbWV0aG9kLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBMYW5nXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzTnVtYmVyKDguNCk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc051bWJlcihOYU4pO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uaXNOdW1iZXIoJzguNCcpO1xuICAgKiAvLyA9PiBmYWxzZVxuICAgKi9cbiAgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IChpc09iamVjdExpa2UodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09IG51bWJlclRhZyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBTdHJpbmdgIHByaW1pdGl2ZSBvciBvYmplY3QuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uaXNTdHJpbmcoJ2FiYycpO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uaXNTdHJpbmcoMSk7XG4gICAqIC8vID0+IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycgfHwgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqVG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3RyaW5nVGFnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgdHlwZWQgYXJyYXkuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8uaXNUeXBlZEFycmF5KG5ldyBVaW50OEFycmF5KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzVHlwZWRBcnJheShbXSk7XG4gICAqIC8vID0+IGZhbHNlXG4gICAqL1xuICBmdW5jdGlvbiBpc1R5cGVkQXJyYXkodmFsdWUpIHtcbiAgICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmICEhdHlwZWRBcnJheVRhZ3Nbb2JqVG9TdHJpbmcuY2FsbCh2YWx1ZSldO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYW4gYXJyYXkuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY29udmVydC5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBjb252ZXJ0ZWQgYXJyYXkuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIChmdW5jdGlvbigpIHtcbiAgICogICByZXR1cm4gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAqIH0oMSwgMiwgMykpO1xuICAgKiAvLyA9PiBbMiwgM11cbiAgICovXG4gIGZ1bmN0aW9uIHRvQXJyYXkodmFsdWUpIHtcbiAgICB2YXIgbGVuZ3RoID0gdmFsdWUgPyBnZXRMZW5ndGgodmFsdWUpIDogMDtcbiAgICBpZiAoIWlzTGVuZ3RoKGxlbmd0aCkpIHtcbiAgICAgIHJldHVybiB2YWx1ZXModmFsdWUpO1xuICAgIH1cbiAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXlDb3B5KHZhbHVlKTtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQXNzaWducyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3QocykgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAqIG9iamVjdC4gU3Vic2VxdWVudCBzb3VyY2VzIG92ZXJ3cml0ZSBwcm9wZXJ0eSBhc3NpZ25tZW50cyBvZiBwcmV2aW91cyBzb3VyY2VzLlxuICAgKiBJZiBgY3VzdG9taXplcmAgaXMgcHJvdmlkZWQgaXQgaXMgaW52b2tlZCB0byBwcm9kdWNlIHRoZSBhc3NpZ25lZCB2YWx1ZXMuXG4gICAqIFRoZSBgY3VzdG9taXplcmAgaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggZml2ZSBhcmd1bWVudHM6XG4gICAqIChvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpLlxuICAgKlxuICAgKiAqKk5vdGU6KiogVGhpcyBtZXRob2QgbXV0YXRlcyBgb2JqZWN0YCBhbmQgaXMgYmFzZWQgb25cbiAgICogW2BPYmplY3QuYXNzaWduYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LmFzc2lnbikuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGFsaWFzIGV4dGVuZFxuICAgKiBAY2F0ZWdvcnkgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAgICogQHBhcmFtIHsuLi5PYmplY3R9IFtzb3VyY2VzXSBUaGUgc291cmNlIG9iamVjdHMuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGFzc2lnbmVkIHZhbHVlcy5cbiAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBjdXN0b21pemVyYC5cbiAgICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5hc3NpZ24oeyAndXNlcic6ICdiYXJuZXknIH0sIHsgJ2FnZSc6IDQwIH0sIHsgJ3VzZXInOiAnZnJlZCcgfSk7XG4gICAqIC8vID0+IHsgJ3VzZXInOiAnZnJlZCcsICdhZ2UnOiA0MCB9XG4gICAqXG4gICAqIC8vIHVzaW5nIGEgY3VzdG9taXplciBjYWxsYmFja1xuICAgKiB2YXIgZGVmYXVsdHMgPSBfLnBhcnRpYWxSaWdodChfLmFzc2lnbiwgZnVuY3Rpb24odmFsdWUsIG90aGVyKSB7XG4gICAqICAgcmV0dXJuIF8uaXNVbmRlZmluZWQodmFsdWUpID8gb3RoZXIgOiB2YWx1ZTtcbiAgICogfSk7XG4gICAqXG4gICAqIGRlZmF1bHRzKHsgJ3VzZXInOiAnYmFybmV5JyB9LCB7ICdhZ2UnOiAzNiB9LCB7ICd1c2VyJzogJ2ZyZWQnIH0pO1xuICAgKiAvLyA9PiB7ICd1c2VyJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9XG4gICAqL1xuICB2YXIgYXNzaWduID0gY3JlYXRlQXNzaWduZXIoZnVuY3Rpb24ob2JqZWN0LCBzb3VyY2UsIGN1c3RvbWl6ZXIpIHtcbiAgICByZXR1cm4gY3VzdG9taXplclxuICAgICAgPyBhc3NpZ25XaXRoKG9iamVjdCwgc291cmNlLCBjdXN0b21pemVyKVxuICAgICAgOiBiYXNlQXNzaWduKG9iamVjdCwgc291cmNlKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gYHByb3RvdHlwZWAgb2JqZWN0LiBJZiBhXG4gICAqIGBwcm9wZXJ0aWVzYCBvYmplY3QgaXMgcHJvdmlkZWQgaXRzIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgYXJlIGFzc2lnbmVkXG4gICAqIHRvIHRoZSBjcmVhdGVkIG9iamVjdC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b3R5cGUgVGhlIG9iamVjdCB0byBpbmhlcml0IGZyb20uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbcHJvcGVydGllc10gVGhlIHByb3BlcnRpZXMgdG8gYXNzaWduIHRvIHRoZSBvYmplY3QuXG4gICAqIEBwYXJhbS0ge09iamVjdH0gW2d1YXJkXSBFbmFibGVzIHVzZSBhcyBhIGNhbGxiYWNrIGZvciBmdW5jdGlvbnMgbGlrZSBgXy5tYXBgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBmdW5jdGlvbiBTaGFwZSgpIHtcbiAgICogICB0aGlzLnggPSAwO1xuICAgKiAgIHRoaXMueSA9IDA7XG4gICAqIH1cbiAgICpcbiAgICogZnVuY3Rpb24gQ2lyY2xlKCkge1xuICAgKiAgIFNoYXBlLmNhbGwodGhpcyk7XG4gICAqIH1cbiAgICpcbiAgICogQ2lyY2xlLnByb3RvdHlwZSA9IF8uY3JlYXRlKFNoYXBlLnByb3RvdHlwZSwge1xuICAgKiAgICdjb25zdHJ1Y3Rvcic6IENpcmNsZVxuICAgKiB9KTtcbiAgICpcbiAgICogdmFyIGNpcmNsZSA9IG5ldyBDaXJjbGU7XG4gICAqIGNpcmNsZSBpbnN0YW5jZW9mIENpcmNsZTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBjaXJjbGUgaW5zdGFuY2VvZiBTaGFwZTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlKHByb3RvdHlwZSwgcHJvcGVydGllcywgZ3VhcmQpIHtcbiAgICB2YXIgcmVzdWx0ID0gYmFzZUNyZWF0ZShwcm90b3R5cGUpO1xuICAgIGlmIChndWFyZCAmJiBpc0l0ZXJhdGVlQ2FsbChwcm90b3R5cGUsIHByb3BlcnRpZXMsIGd1YXJkKSkge1xuICAgICAgcHJvcGVydGllcyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHByb3BlcnRpZXMgPyBiYXNlQXNzaWduKHJlc3VsdCwgcHJvcGVydGllcykgOiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgYXQgYHBhdGhgIG9mIGBvYmplY3RgLiBJZiB0aGUgcmVzb2x2ZWQgdmFsdWUgaXNcbiAgICogYHVuZGVmaW5lZGAgdGhlIGBkZWZhdWx0VmFsdWVgIGlzIHVzZWQgaW4gaXRzIHBsYWNlLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBPYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gcGF0aCBUaGUgcGF0aCBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICAgKiBAcGFyYW0geyp9IFtkZWZhdWx0VmFsdWVdIFRoZSB2YWx1ZSByZXR1cm5lZCBpZiB0aGUgcmVzb2x2ZWQgdmFsdWUgaXMgYHVuZGVmaW5lZGAuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSByZXNvbHZlZCB2YWx1ZS5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIG9iamVjdCA9IHsgJ2EnOiBbeyAnYic6IHsgJ2MnOiAzIH0gfV0gfTtcbiAgICpcbiAgICogXy5nZXQob2JqZWN0LCAnYVswXS5iLmMnKTtcbiAgICogLy8gPT4gM1xuICAgKlxuICAgKiBfLmdldChvYmplY3QsIFsnYScsICcwJywgJ2InLCAnYyddKTtcbiAgICogLy8gPT4gM1xuICAgKlxuICAgKiBfLmdldChvYmplY3QsICdhLmIuYycsICdkZWZhdWx0Jyk7XG4gICAqIC8vID0+ICdkZWZhdWx0J1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0KG9iamVjdCwgcGF0aCwgZGVmYXVsdFZhbHVlKSB7XG4gICAgdmFyIHJlc3VsdCA9IG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogYmFzZUdldChvYmplY3QsIHRvUGF0aChwYXRoKSwgcGF0aCArICcnKTtcbiAgICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWQgPyBkZWZhdWx0VmFsdWUgOiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGBwYXRoYCBpcyBhIGRpcmVjdCBwcm9wZXJ0eS5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAgICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgcGF0aGAgaXMgYSBkaXJlY3QgcHJvcGVydHksIGVsc2UgYGZhbHNlYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIG9iamVjdCA9IHsgJ2EnOiB7ICdiJzogeyAnYyc6IDMgfSB9IH07XG4gICAqXG4gICAqIF8uaGFzKG9iamVjdCwgJ2EnKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmhhcyhvYmplY3QsICdhLmIuYycpO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqXG4gICAqIF8uaGFzKG9iamVjdCwgWydhJywgJ2InLCAnYyddKTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKi9cbiAgZnVuY3Rpb24gaGFzKG9iamVjdCwgcGF0aCkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHBhdGgpO1xuICAgIGlmICghcmVzdWx0ICYmICFpc0tleShwYXRoKSkge1xuICAgICAgcGF0aCA9IHRvUGF0aChwYXRoKTtcbiAgICAgIG9iamVjdCA9IHBhdGgubGVuZ3RoID09IDEgPyBvYmplY3QgOiBiYXNlR2V0KG9iamVjdCwgYmFzZVNsaWNlKHBhdGgsIDAsIC0xKSk7XG4gICAgICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcGF0aCA9IGxhc3QocGF0aCk7XG4gICAgICByZXN1bHQgPSBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcGF0aCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgfHwgKGlzTGVuZ3RoKG9iamVjdC5sZW5ndGgpICYmIGlzSW5kZXgocGF0aCwgb2JqZWN0Lmxlbmd0aCkgJiZcbiAgICAgIChpc0FycmF5KG9iamVjdCkgfHwgaXNBcmd1bWVudHMob2JqZWN0KSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IGNvbXBvc2VkIG9mIHRoZSBpbnZlcnRlZCBrZXlzIGFuZCB2YWx1ZXMgb2YgYG9iamVjdGAuXG4gICAqIElmIGBvYmplY3RgIGNvbnRhaW5zIGR1cGxpY2F0ZSB2YWx1ZXMsIHN1YnNlcXVlbnQgdmFsdWVzIG92ZXJ3cml0ZSBwcm9wZXJ0eVxuICAgKiBhc3NpZ25tZW50cyBvZiBwcmV2aW91cyB2YWx1ZXMgdW5sZXNzIGBtdWx0aVZhbHVlYCBpcyBgdHJ1ZWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IE9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaW52ZXJ0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFttdWx0aVZhbHVlXSBBbGxvdyBtdWx0aXBsZSB2YWx1ZXMgcGVyIGtleS5cbiAgICogQHBhcmFtLSB7T2JqZWN0fSBbZ3VhcmRdIEVuYWJsZXMgdXNlIGFzIGEgY2FsbGJhY2sgZm9yIGZ1bmN0aW9ucyBsaWtlIGBfLm1hcGAuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG5ldyBpbnZlcnRlZCBvYmplY3QuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIHZhciBvYmplY3QgPSB7ICdhJzogMSwgJ2InOiAyLCAnYyc6IDEgfTtcbiAgICpcbiAgICogXy5pbnZlcnQob2JqZWN0KTtcbiAgICogLy8gPT4geyAnMSc6ICdjJywgJzInOiAnYicgfVxuICAgKlxuICAgKiAvLyB3aXRoIGBtdWx0aVZhbHVlYFxuICAgKiBfLmludmVydChvYmplY3QsIHRydWUpO1xuICAgKiAvLyA9PiB7ICcxJzogWydhJywgJ2MnXSwgJzInOiBbJ2InXSB9XG4gICAqL1xuICBmdW5jdGlvbiBpbnZlcnQob2JqZWN0LCBtdWx0aVZhbHVlLCBndWFyZCkge1xuICAgIGlmIChndWFyZCAmJiBpc0l0ZXJhdGVlQ2FsbChvYmplY3QsIG11bHRpVmFsdWUsIGd1YXJkKSkge1xuICAgICAgbXVsdGlWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgIHByb3BzID0ga2V5cyhvYmplY3QpLFxuICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGgsXG4gICAgICAgIHJlc3VsdCA9IHt9O1xuXG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF0sXG4gICAgICAgICAgdmFsdWUgPSBvYmplY3Rba2V5XTtcblxuICAgICAgaWYgKG11bHRpVmFsdWUpIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwocmVzdWx0LCB2YWx1ZSkpIHtcbiAgICAgICAgICByZXN1bHRbdmFsdWVdLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRbdmFsdWVdID0gW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXN1bHRbdmFsdWVdID0ga2V5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGBvYmplY3RgLlxuICAgKlxuICAgKiAqKk5vdGU6KiogTm9uLW9iamVjdCB2YWx1ZXMgYXJlIGNvZXJjZWQgdG8gb2JqZWN0cy4gU2VlIHRoZVxuICAgKiBbRVMgc3BlY10oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LmtleXMpXG4gICAqIGZvciBtb3JlIGRldGFpbHMuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IE9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIGZ1bmN0aW9uIEZvbygpIHtcbiAgICogICB0aGlzLmEgPSAxO1xuICAgKiAgIHRoaXMuYiA9IDI7XG4gICAqIH1cbiAgICpcbiAgICogRm9vLnByb3RvdHlwZS5jID0gMztcbiAgICpcbiAgICogXy5rZXlzKG5ldyBGb28pO1xuICAgKiAvLyA9PiBbJ2EnLCAnYiddIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gICAqXG4gICAqIF8ua2V5cygnaGknKTtcbiAgICogLy8gPT4gWycwJywgJzEnXVxuICAgKi9cbiAgdmFyIGtleXMgPSAhbmF0aXZlS2V5cyA/IHNoaW1LZXlzIDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgdmFyIEN0b3IgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdC5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUgPT09IG9iamVjdCkgfHxcbiAgICAgICAgKHR5cGVvZiBvYmplY3QgIT0gJ2Z1bmN0aW9uJyAmJiBpc0FycmF5TGlrZShvYmplY3QpKSkge1xuICAgICAgcmV0dXJuIHNoaW1LZXlzKG9iamVjdCk7XG4gICAgfVxuICAgIHJldHVybiBpc09iamVjdChvYmplY3QpID8gbmF0aXZlS2V5cyhvYmplY3QpIDogW107XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gICAqXG4gICAqICoqTm90ZToqKiBOb24tb2JqZWN0IHZhbHVlcyBhcmUgY29lcmNlZCB0byBvYmplY3RzLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBPYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBmdW5jdGlvbiBGb28oKSB7XG4gICAqICAgdGhpcy5hID0gMTtcbiAgICogICB0aGlzLmIgPSAyO1xuICAgKiB9XG4gICAqXG4gICAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gICAqXG4gICAqIF8ua2V5c0luKG5ldyBGb28pO1xuICAgKiAvLyA9PiBbJ2EnLCAnYicsICdjJ10gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAgICovXG4gIGZ1bmN0aW9uIGtleXNJbihvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgICBvYmplY3QgPSBPYmplY3Qob2JqZWN0KTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7XG4gICAgbGVuZ3RoID0gKGxlbmd0aCAmJiBpc0xlbmd0aChsZW5ndGgpICYmXG4gICAgICAoaXNBcnJheShvYmplY3QpIHx8IGlzQXJndW1lbnRzKG9iamVjdCkpICYmIGxlbmd0aCkgfHwgMDtcblxuICAgIHZhciBDdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuICAgICAgICBpbmRleCA9IC0xLFxuICAgICAgICBpc1Byb3RvID0gdHlwZW9mIEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBDdG9yLnByb3RvdHlwZSA9PT0gb2JqZWN0LFxuICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpLFxuICAgICAgICBza2lwSW5kZXhlcyA9IGxlbmd0aCA+IDA7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IChpbmRleCArICcnKTtcbiAgICB9XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgaWYgKCEoc2tpcEluZGV4ZXMgJiYgaXNJbmRleChrZXksIGxlbmd0aCkpICYmXG4gICAgICAgICAgIShrZXkgPT0gJ2NvbnN0cnVjdG9yJyAmJiAoaXNQcm90byB8fCAhaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpKSkge1xuICAgICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUga2V5cyBhcyBgb2JqZWN0YCBhbmQgdmFsdWVzIGdlbmVyYXRlZCBieVxuICAgKiBydW5uaW5nIGVhY2ggb3duIGVudW1lcmFibGUgcHJvcGVydHkgb2YgYG9iamVjdGAgdGhyb3VnaCBgaXRlcmF0ZWVgLiBUaGVcbiAgICogaXRlcmF0ZWUgZnVuY3Rpb24gaXMgYm91bmQgdG8gYHRoaXNBcmdgIGFuZCBpbnZva2VkIHdpdGggdGhyZWUgYXJndW1lbnRzOlxuICAgKiAodmFsdWUsIGtleSwgb2JqZWN0KS5cbiAgICpcbiAgICogSWYgYSBwcm9wZXJ0eSBuYW1lIGlzIHByb3ZpZGVkIGZvciBgaXRlcmF0ZWVgIHRoZSBjcmVhdGVkIGBfLnByb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICpcbiAgICogSWYgYSB2YWx1ZSBpcyBhbHNvIHByb3ZpZGVkIGZvciBgdGhpc0FyZ2AgdGhlIGNyZWF0ZWQgYF8ubWF0Y2hlc1Byb3BlcnR5YFxuICAgKiBzdHlsZSBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIGEgbWF0Y2hpbmcgcHJvcGVydHlcbiAgICogdmFsdWUsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogSWYgYW4gb2JqZWN0IGlzIHByb3ZpZGVkIGZvciBgaXRlcmF0ZWVgIHRoZSBjcmVhdGVkIGBfLm1hdGNoZXNgIHN0eWxlXG4gICAqIGNhbGxiYWNrIHJldHVybnMgYHRydWVgIGZvciBlbGVtZW50cyB0aGF0IGhhdmUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGdpdmVuXG4gICAqIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBPYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R8c3RyaW5nfSBbaXRlcmF0ZWU9Xy5pZGVudGl0eV0gVGhlIGZ1bmN0aW9uIGludm9rZWRcbiAgICogIHBlciBpdGVyYXRpb24uXG4gICAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgaXRlcmF0ZWVgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgbWFwcGVkIG9iamVjdC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5tYXBWYWx1ZXMoeyAnYSc6IDEsICdiJzogMiB9LCBmdW5jdGlvbihuKSB7XG4gICAqICAgcmV0dXJuIG4gKiAzO1xuICAgKiB9KTtcbiAgICogLy8gPT4geyAnYSc6IDMsICdiJzogNiB9XG4gICAqXG4gICAqIHZhciB1c2VycyA9IHtcbiAgICogICAnZnJlZCc6ICAgIHsgJ3VzZXInOiAnZnJlZCcsICAgICdhZ2UnOiA0MCB9LFxuICAgKiAgICdwZWJibGVzJzogeyAndXNlcic6ICdwZWJibGVzJywgJ2FnZSc6IDEgfVxuICAgKiB9O1xuICAgKlxuICAgKiAvLyB1c2luZyB0aGUgYF8ucHJvcGVydHlgIGNhbGxiYWNrIHNob3J0aGFuZFxuICAgKiBfLm1hcFZhbHVlcyh1c2VycywgJ2FnZScpO1xuICAgKiAvLyA9PiB7ICdmcmVkJzogNDAsICdwZWJibGVzJzogMSB9IChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gICAqL1xuICB2YXIgbWFwVmFsdWVzID0gY3JlYXRlT2JqZWN0TWFwcGVyKCk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSB0d28gZGltZW5zaW9uYWwgYXJyYXkgb2YgdGhlIGtleS12YWx1ZSBwYWlycyBmb3IgYG9iamVjdGAsXG4gICAqIGUuZy4gYFtba2V5MSwgdmFsdWUxXSwgW2tleTIsIHZhbHVlMl1dYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAgICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIHRoZSBuZXcgYXJyYXkgb2Yga2V5LXZhbHVlIHBhaXJzLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLnBhaXJzKHsgJ2Jhcm5leSc6IDM2LCAnZnJlZCc6IDQwIH0pO1xuICAgKiAvLyA9PiBbWydiYXJuZXknLCAzNl0sIFsnZnJlZCcsIDQwXV0gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAgICovXG4gIGZ1bmN0aW9uIHBhaXJzKG9iamVjdCkge1xuICAgIG9iamVjdCA9IHRvT2JqZWN0KG9iamVjdCk7XG5cbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgcHJvcHMgPSBrZXlzKG9iamVjdCksXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKTtcblxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgcmVzdWx0W2luZGV4XSA9IFtrZXksIG9iamVjdFtrZXldXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCBjb21wb3NlZCBvZiB0aGUgcGlja2VkIGBvYmplY3RgIHByb3BlcnRpZXMuIFByb3BlcnR5XG4gICAqIG5hbWVzIG1heSBiZSBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBhcmd1bWVudHMgb3IgYXMgYXJyYXlzIG9mIHByb3BlcnR5XG4gICAqIG5hbWVzLiBJZiBgcHJlZGljYXRlYCBpcyBwcm92aWRlZCBpdCBpcyBpbnZva2VkIGZvciBlYWNoIHByb3BlcnR5IG9mIGBvYmplY3RgXG4gICAqIHBpY2tpbmcgdGhlIHByb3BlcnRpZXMgYHByZWRpY2F0ZWAgcmV0dXJucyB0cnV0aHkgZm9yLiBUaGUgcHJlZGljYXRlIGlzXG4gICAqIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogKHZhbHVlLCBrZXksIG9iamVjdCkuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IE9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBzb3VyY2Ugb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufC4uLihzdHJpbmd8c3RyaW5nW10pfSBbcHJlZGljYXRlXSBUaGUgZnVuY3Rpb24gaW52b2tlZCBwZXJcbiAgICogIGl0ZXJhdGlvbiBvciBwcm9wZXJ0eSBuYW1lcyB0byBwaWNrLCBzcGVjaWZpZWQgYXMgaW5kaXZpZHVhbCBwcm9wZXJ0eVxuICAgKiAgbmFtZXMgb3IgYXJyYXlzIG9mIHByb3BlcnR5IG5hbWVzLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYHByZWRpY2F0ZWAuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG5ldyBvYmplY3QuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIHZhciBvYmplY3QgPSB7ICd1c2VyJzogJ2ZyZWQnLCAnYWdlJzogNDAgfTtcbiAgICpcbiAgICogXy5waWNrKG9iamVjdCwgJ3VzZXInKTtcbiAgICogLy8gPT4geyAndXNlcic6ICdmcmVkJyB9XG4gICAqXG4gICAqIF8ucGljayhvYmplY3QsIF8uaXNTdHJpbmcpO1xuICAgKiAvLyA9PiB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAgICovXG4gIHZhciBwaWNrID0gcmVzdFBhcmFtKGZ1bmN0aW9uKG9iamVjdCwgcHJvcHMpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVvZiBwcm9wc1swXSA9PSAnZnVuY3Rpb24nXG4gICAgICA/IHBpY2tCeUNhbGxiYWNrKG9iamVjdCwgYmluZENhbGxiYWNrKHByb3BzWzBdLCBwcm9wc1sxXSwgMykpXG4gICAgICA6IHBpY2tCeUFycmF5KG9iamVjdCwgYmFzZUZsYXR0ZW4ocHJvcHMpKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IHZhbHVlcyBvZiBgb2JqZWN0YC5cbiAgICpcbiAgICogKipOb3RlOioqIE5vbi1vYmplY3QgdmFsdWVzIGFyZSBjb2VyY2VkIHRvIG9iamVjdHMuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IE9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgdmFsdWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBmdW5jdGlvbiBGb28oKSB7XG4gICAqICAgdGhpcy5hID0gMTtcbiAgICogICB0aGlzLmIgPSAyO1xuICAgKiB9XG4gICAqXG4gICAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gICAqXG4gICAqIF8udmFsdWVzKG5ldyBGb28pO1xuICAgKiAvLyA9PiBbMSwgMl0gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAgICpcbiAgICogXy52YWx1ZXMoJ2hpJyk7XG4gICAqIC8vID0+IFsnaCcsICdpJ11cbiAgICovXG4gIGZ1bmN0aW9uIHZhbHVlcyhvYmplY3QpIHtcbiAgICByZXR1cm4gYmFzZVZhbHVlcyhvYmplY3QsIGtleXMob2JqZWN0KSk7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IGludm9rZXMgYGZ1bmNgIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIGB0aGlzQXJnYFxuICAgKiBhbmQgYXJndW1lbnRzIG9mIHRoZSBjcmVhdGVkIGZ1bmN0aW9uLiBJZiBgZnVuY2AgaXMgYSBwcm9wZXJ0eSBuYW1lIHRoZVxuICAgKiBjcmVhdGVkIGNhbGxiYWNrIHJldHVybnMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBhIGdpdmVuIGVsZW1lbnQuIElmIGBmdW5jYFxuICAgKiBpcyBhbiBvYmplY3QgdGhlIGNyZWF0ZWQgY2FsbGJhY2sgcmV0dXJucyBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgY29udGFpblxuICAgKiB0aGUgZXF1aXZhbGVudCBvYmplY3QgcHJvcGVydGllcywgb3RoZXJ3aXNlIGl0IHJldHVybnMgYGZhbHNlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAYWxpYXMgaXRlcmF0ZWVcbiAgICogQGNhdGVnb3J5IFV0aWxpdHlcbiAgICogQHBhcmFtIHsqfSBbZnVuYz1fLmlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICAgKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICAgKiBAcGFyYW0tIHtPYmplY3R9IFtndWFyZF0gRW5hYmxlcyB1c2UgYXMgYSBjYWxsYmFjayBmb3IgZnVuY3Rpb25zIGxpa2UgYF8ubWFwYC5cbiAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBjYWxsYmFjay5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIHVzZXJzID0gW1xuICAgKiAgIHsgJ3VzZXInOiAnYmFybmV5JywgJ2FnZSc6IDM2IH0sXG4gICAqICAgeyAndXNlcic6ICdmcmVkJywgICAnYWdlJzogNDAgfVxuICAgKiBdO1xuICAgKlxuICAgKiAvLyB3cmFwIHRvIGNyZWF0ZSBjdXN0b20gY2FsbGJhY2sgc2hvcnRoYW5kc1xuICAgKiBfLmNhbGxiYWNrID0gXy53cmFwKF8uY2FsbGJhY2ssIGZ1bmN0aW9uKGNhbGxiYWNrLCBmdW5jLCB0aGlzQXJnKSB7XG4gICAqICAgdmFyIG1hdGNoID0gL14oLis/KV9fKFtnbF10KSguKykkLy5leGVjKGZ1bmMpO1xuICAgKiAgIGlmICghbWF0Y2gpIHtcbiAgICogICAgIHJldHVybiBjYWxsYmFjayhmdW5jLCB0aGlzQXJnKTtcbiAgICogICB9XG4gICAqICAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgKiAgICAgcmV0dXJuIG1hdGNoWzJdID09ICdndCdcbiAgICogICAgICAgPyBvYmplY3RbbWF0Y2hbMV1dID4gbWF0Y2hbM11cbiAgICogICAgICAgOiBvYmplY3RbbWF0Y2hbMV1dIDwgbWF0Y2hbM107XG4gICAqICAgfTtcbiAgICogfSk7XG4gICAqXG4gICAqIF8uZmlsdGVyKHVzZXJzLCAnYWdlX19ndDM2Jyk7XG4gICAqIC8vID0+IFt7ICd1c2VyJzogJ2ZyZWQnLCAnYWdlJzogNDAgfV1cbiAgICovXG4gIGZ1bmN0aW9uIGNhbGxiYWNrKGZ1bmMsIHRoaXNBcmcsIGd1YXJkKSB7XG4gICAgaWYgKGd1YXJkICYmIGlzSXRlcmF0ZWVDYWxsKGZ1bmMsIHRoaXNBcmcsIGd1YXJkKSkge1xuICAgICAgdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGlzT2JqZWN0TGlrZShmdW5jKVxuICAgICAgPyBtYXRjaGVzKGZ1bmMpXG4gICAgICA6IGJhc2VDYWxsYmFjayhmdW5jLCB0aGlzQXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBwcm92aWRlZCB0byBpdC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgVXRpbGl0eVxuICAgKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAgICogQHJldHVybnMgeyp9IFJldHVybnMgYHZhbHVlYC5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogdmFyIG9iamVjdCA9IHsgJ3VzZXInOiAnZnJlZCcgfTtcbiAgICpcbiAgICogXy5pZGVudGl0eShvYmplY3QpID09PSBvYmplY3Q7XG4gICAqIC8vID0+IHRydWVcbiAgICovXG4gIGZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHBlcmZvcm1zIGEgZGVlcCBjb21wYXJpc29uIGJldHdlZW4gYSBnaXZlbiBvYmplY3RcbiAgICogYW5kIGBzb3VyY2VgLCByZXR1cm5pbmcgYHRydWVgIGlmIHRoZSBnaXZlbiBvYmplY3QgaGFzIGVxdWl2YWxlbnQgcHJvcGVydHlcbiAgICogdmFsdWVzLCBlbHNlIGBmYWxzZWAuXG4gICAqXG4gICAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBzdXBwb3J0cyBjb21wYXJpbmcgYXJyYXlzLCBib29sZWFucywgYERhdGVgIG9iamVjdHMsXG4gICAqIG51bWJlcnMsIGBPYmplY3RgIG9iamVjdHMsIHJlZ2V4ZXMsIGFuZCBzdHJpbmdzLiBPYmplY3RzIGFyZSBjb21wYXJlZCBieVxuICAgKiB0aGVpciBvd24sIG5vdCBpbmhlcml0ZWQsIGVudW1lcmFibGUgcHJvcGVydGllcy4gRm9yIGNvbXBhcmluZyBhIHNpbmdsZVxuICAgKiBvd24gb3IgaW5oZXJpdGVkIHByb3BlcnR5IHZhbHVlIHNlZSBgXy5tYXRjaGVzUHJvcGVydHlgLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIG9iamVjdCBvZiBwcm9wZXJ0eSB2YWx1ZXMgdG8gbWF0Y2guXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiB2YXIgdXNlcnMgPSBbXG4gICAqICAgeyAndXNlcic6ICdiYXJuZXknLCAnYWdlJzogMzYsICdhY3RpdmUnOiB0cnVlIH0sXG4gICAqICAgeyAndXNlcic6ICdmcmVkJywgICAnYWdlJzogNDAsICdhY3RpdmUnOiBmYWxzZSB9XG4gICAqIF07XG4gICAqXG4gICAqIF8uZmlsdGVyKHVzZXJzLCBfLm1hdGNoZXMoeyAnYWdlJzogNDAsICdhY3RpdmUnOiBmYWxzZSB9KSk7XG4gICAqIC8vID0+IFt7ICd1c2VyJzogJ2ZyZWQnLCAnYWdlJzogNDAsICdhY3RpdmUnOiBmYWxzZSB9XVxuICAgKi9cbiAgZnVuY3Rpb24gbWF0Y2hlcyhzb3VyY2UpIHtcbiAgICByZXR1cm4gYmFzZU1hdGNoZXMoYmFzZUNsb25lKHNvdXJjZSwgdHJ1ZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYWxsIG93biBlbnVtZXJhYmxlIGZ1bmN0aW9uIHByb3BlcnRpZXMgb2YgYSBzb3VyY2Ugb2JqZWN0IHRvIHRoZVxuICAgKiBkZXN0aW5hdGlvbiBvYmplY3QuIElmIGBvYmplY3RgIGlzIGEgZnVuY3Rpb24gdGhlbiBtZXRob2RzIGFyZSBhZGRlZCB0b1xuICAgKiBpdHMgcHJvdG90eXBlIGFzIHdlbGwuXG4gICAqXG4gICAqICoqTm90ZToqKiBVc2UgYF8ucnVuSW5Db250ZXh0YCB0byBjcmVhdGUgYSBwcmlzdGluZSBgbG9kYXNoYCBmdW5jdGlvbiB0b1xuICAgKiBhdm9pZCBjb25mbGljdHMgY2F1c2VkIGJ5IG1vZGlmeWluZyB0aGUgb3JpZ2luYWwuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IFV0aWxpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbnxPYmplY3R9IFtvYmplY3Q9bG9kYXNoXSBUaGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3Qgb2YgZnVuY3Rpb25zIHRvIGFkZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuY2hhaW49dHJ1ZV0gU3BlY2lmeSB3aGV0aGVyIHRoZSBmdW5jdGlvbnMgYWRkZWRcbiAgICogIGFyZSBjaGFpbmFibGUuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbnxPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIGZ1bmN0aW9uIHZvd2VscyhzdHJpbmcpIHtcbiAgICogICByZXR1cm4gXy5maWx0ZXIoc3RyaW5nLCBmdW5jdGlvbih2KSB7XG4gICAqICAgICByZXR1cm4gL1thZWlvdV0vaS50ZXN0KHYpO1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqXG4gICAqIF8ubWl4aW4oeyAndm93ZWxzJzogdm93ZWxzIH0pO1xuICAgKiBfLnZvd2VscygnZnJlZCcpO1xuICAgKiAvLyA9PiBbJ2UnXVxuICAgKlxuICAgKiBfKCdmcmVkJykudm93ZWxzKCkudmFsdWUoKTtcbiAgICogLy8gPT4gWydlJ11cbiAgICpcbiAgICogXy5taXhpbih7ICd2b3dlbHMnOiB2b3dlbHMgfSwgeyAnY2hhaW4nOiBmYWxzZSB9KTtcbiAgICogXygnZnJlZCcpLnZvd2VscygpO1xuICAgKiAvLyA9PiBbJ2UnXVxuICAgKi9cbiAgZnVuY3Rpb24gbWl4aW4ob2JqZWN0LCBzb3VyY2UsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PSBudWxsKSB7XG4gICAgICB2YXIgaXNPYmogPSBpc09iamVjdChzb3VyY2UpLFxuICAgICAgICAgIHByb3BzID0gaXNPYmogPyBrZXlzKHNvdXJjZSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWV0aG9kTmFtZXMgPSAocHJvcHMgJiYgcHJvcHMubGVuZ3RoKSA/IGJhc2VGdW5jdGlvbnMoc291cmNlLCBwcm9wcykgOiB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICghKG1ldGhvZE5hbWVzID8gbWV0aG9kTmFtZXMubGVuZ3RoIDogaXNPYmopKSB7XG4gICAgICAgIG1ldGhvZE5hbWVzID0gZmFsc2U7XG4gICAgICAgIG9wdGlvbnMgPSBzb3VyY2U7XG4gICAgICAgIHNvdXJjZSA9IG9iamVjdDtcbiAgICAgICAgb2JqZWN0ID0gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFtZXRob2ROYW1lcykge1xuICAgICAgbWV0aG9kTmFtZXMgPSBiYXNlRnVuY3Rpb25zKHNvdXJjZSwga2V5cyhzb3VyY2UpKTtcbiAgICB9XG4gICAgdmFyIGNoYWluID0gdHJ1ZSxcbiAgICAgICAgaW5kZXggPSAtMSxcbiAgICAgICAgaXNGdW5jID0gaXNGdW5jdGlvbihvYmplY3QpLFxuICAgICAgICBsZW5ndGggPSBtZXRob2ROYW1lcy5sZW5ndGg7XG5cbiAgICBpZiAob3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIGNoYWluID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSAmJiAnY2hhaW4nIGluIG9wdGlvbnMpIHtcbiAgICAgIGNoYWluID0gb3B0aW9ucy5jaGFpbjtcbiAgICB9XG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciBtZXRob2ROYW1lID0gbWV0aG9kTmFtZXNbaW5kZXhdLFxuICAgICAgICAgIGZ1bmMgPSBzb3VyY2VbbWV0aG9kTmFtZV07XG5cbiAgICAgIG9iamVjdFttZXRob2ROYW1lXSA9IGZ1bmM7XG4gICAgICBpZiAoaXNGdW5jKSB7XG4gICAgICAgIG9iamVjdC5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSAoZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjaGFpbkFsbCA9IHRoaXMuX19jaGFpbl9fO1xuICAgICAgICAgICAgaWYgKGNoYWluIHx8IGNoYWluQWxsKSB7XG4gICAgICAgICAgICAgIHZhciByZXN1bHQgPSBvYmplY3QodGhpcy5fX3dyYXBwZWRfXyksXG4gICAgICAgICAgICAgICAgICBhY3Rpb25zID0gcmVzdWx0Ll9fYWN0aW9uc19fID0gYXJyYXlDb3B5KHRoaXMuX19hY3Rpb25zX18pO1xuXG4gICAgICAgICAgICAgIGFjdGlvbnMucHVzaCh7ICdmdW5jJzogZnVuYywgJ2FyZ3MnOiBhcmd1bWVudHMsICd0aGlzQXJnJzogb2JqZWN0IH0pO1xuICAgICAgICAgICAgICByZXN1bHQuX19jaGFpbl9fID0gY2hhaW5BbGw7XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZnVuYy5hcHBseShvYmplY3QsIGFycmF5UHVzaChbdGhpcy52YWx1ZSgpXSwgYXJndW1lbnRzKSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfShmdW5jKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICAvKipcbiAgICogQSBuby1vcGVyYXRpb24gZnVuY3Rpb24gdGhhdCByZXR1cm5zIGB1bmRlZmluZWRgIHJlZ2FyZGxlc3Mgb2YgdGhlXG4gICAqIGFyZ3VtZW50cyBpdCByZWNlaXZlcy5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgVXRpbGl0eVxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiB2YXIgb2JqZWN0ID0geyAndXNlcic6ICdmcmVkJyB9O1xuICAgKlxuICAgKiBfLm5vb3Aob2JqZWN0KSA9PT0gdW5kZWZpbmVkO1xuICAgKiAvLyA9PiB0cnVlXG4gICAqL1xuICBmdW5jdGlvbiBub29wKCkge1xuICAgIC8vIE5vIG9wZXJhdGlvbiBwZXJmb3JtZWQuXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgcHJvcGVydHkgdmFsdWUgYXQgYHBhdGhgIG9uIGFcbiAgICogZ2l2ZW4gb2JqZWN0LlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiB2YXIgb2JqZWN0cyA9IFtcbiAgICogICB7ICdhJzogeyAnYic6IHsgJ2MnOiAyIH0gfSB9LFxuICAgKiAgIHsgJ2EnOiB7ICdiJzogeyAnYyc6IDEgfSB9IH1cbiAgICogXTtcbiAgICpcbiAgICogXy5tYXAob2JqZWN0cywgXy5wcm9wZXJ0eSgnYS5iLmMnKSk7XG4gICAqIC8vID0+IFsyLCAxXVxuICAgKlxuICAgKiBfLnBsdWNrKF8uc29ydEJ5KG9iamVjdHMsIF8ucHJvcGVydHkoWydhJywgJ2InLCAnYyddKSksICdhLmIuYycpO1xuICAgKiAvLyA9PiBbMSwgMl1cbiAgICovXG4gIGZ1bmN0aW9uIHByb3BlcnR5KHBhdGgpIHtcbiAgICByZXR1cm4gaXNLZXkocGF0aCkgPyBiYXNlUHJvcGVydHkocGF0aCkgOiBiYXNlUHJvcGVydHlEZWVwKHBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIHVuaXF1ZSBJRC4gSWYgYHByZWZpeGAgaXMgcHJvdmlkZWQgdGhlIElEIGlzIGFwcGVuZGVkIHRvIGl0LlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEBjYXRlZ29yeSBVdGlsaXR5XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcHJlZml4XSBUaGUgdmFsdWUgdG8gcHJlZml4IHRoZSBJRCB3aXRoLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSB1bmlxdWUgSUQuXG4gICAqIEBleGFtcGxlXG4gICAqXG4gICAqIF8udW5pcXVlSWQoJ2NvbnRhY3RfJyk7XG4gICAqIC8vID0+ICdjb250YWN0XzEwNCdcbiAgICpcbiAgICogXy51bmlxdWVJZCgpO1xuICAgKiAvLyA9PiAnMTA1J1xuICAgKi9cbiAgZnVuY3Rpb24gdW5pcXVlSWQocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXI7XG4gICAgcmV0dXJuIGJhc2VUb1N0cmluZyhwcmVmaXgpICsgaWQ7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1heGltdW0gdmFsdWUgb2YgYGNvbGxlY3Rpb25gLiBJZiBgY29sbGVjdGlvbmAgaXMgZW1wdHkgb3IgZmFsc2V5XG4gICAqIGAtSW5maW5pdHlgIGlzIHJldHVybmVkLiBJZiBhbiBpdGVyYXRlZSBmdW5jdGlvbiBpcyBwcm92aWRlZCBpdCBpcyBpbnZva2VkXG4gICAqIGZvciBlYWNoIHZhbHVlIGluIGBjb2xsZWN0aW9uYCB0byBnZW5lcmF0ZSB0aGUgY3JpdGVyaW9uIGJ5IHdoaWNoIHRoZSB2YWx1ZVxuICAgKiBpcyByYW5rZWQuIFRoZSBgaXRlcmF0ZWVgIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlXG4gICAqIGFyZ3VtZW50czogKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikuXG4gICAqXG4gICAqIElmIGEgcHJvcGVydHkgbmFtZSBpcyBwcm92aWRlZCBmb3IgYGl0ZXJhdGVlYCB0aGUgY3JlYXRlZCBgXy5wcm9wZXJ0eWBcbiAgICogc3R5bGUgY2FsbGJhY2sgcmV0dXJucyB0aGUgcHJvcGVydHkgdmFsdWUgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqXG4gICAqIElmIGEgdmFsdWUgaXMgYWxzbyBwcm92aWRlZCBmb3IgYHRoaXNBcmdgIHRoZSBjcmVhdGVkIGBfLm1hdGNoZXNQcm9wZXJ0eWBcbiAgICogc3R5bGUgY2FsbGJhY2sgcmV0dXJucyBgdHJ1ZWAgZm9yIGVsZW1lbnRzIHRoYXQgaGF2ZSBhIG1hdGNoaW5nIHByb3BlcnR5XG4gICAqIHZhbHVlLCBlbHNlIGBmYWxzZWAuXG4gICAqXG4gICAqIElmIGFuIG9iamVjdCBpcyBwcm92aWRlZCBmb3IgYGl0ZXJhdGVlYCB0aGUgY3JlYXRlZCBgXy5tYXRjaGVzYCBzdHlsZVxuICAgKiBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgZWxlbWVudHMgdGhhdCBoYXZlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBnaXZlblxuICAgKiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAgICpcbiAgICogQHN0YXRpY1xuICAgKiBAbWVtYmVyT2YgX1xuICAgKiBAY2F0ZWdvcnkgTWF0aFxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufE9iamVjdHxzdHJpbmd9IFtpdGVyYXRlZV0gVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAgICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBpdGVyYXRlZWAuXG4gICAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIHRoZSBtYXhpbXVtIHZhbHVlLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLm1heChbNCwgMiwgOCwgNl0pO1xuICAgKiAvLyA9PiA4XG4gICAqXG4gICAqIF8ubWF4KFtdKTtcbiAgICogLy8gPT4gLUluZmluaXR5XG4gICAqXG4gICAqIHZhciB1c2VycyA9IFtcbiAgICogICB7ICd1c2VyJzogJ2Jhcm5leScsICdhZ2UnOiAzNiB9LFxuICAgKiAgIHsgJ3VzZXInOiAnZnJlZCcsICAgJ2FnZSc6IDQwIH1cbiAgICogXTtcbiAgICpcbiAgICogXy5tYXgodXNlcnMsIGZ1bmN0aW9uKGNocikge1xuICAgKiAgIHJldHVybiBjaHIuYWdlO1xuICAgKiB9KTtcbiAgICogLy8gPT4geyAndXNlcic6ICdmcmVkJywgJ2FnZSc6IDQwIH1cbiAgICpcbiAgICogLy8gdXNpbmcgdGhlIGBfLnByb3BlcnR5YCBjYWxsYmFjayBzaG9ydGhhbmRcbiAgICogXy5tYXgodXNlcnMsICdhZ2UnKTtcbiAgICogLy8gPT4geyAndXNlcic6ICdmcmVkJywgJ2FnZSc6IDQwIH1cbiAgICovXG4gIHZhciBtYXggPSBjcmVhdGVFeHRyZW11bShndCwgTkVHQVRJVkVfSU5GSU5JVFkpO1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvLyBFbnN1cmUgd3JhcHBlcnMgYXJlIGluc3RhbmNlcyBvZiBgYmFzZUxvZGFzaGAuXG4gIGxvZGFzaC5wcm90b3R5cGUgPSBiYXNlTG9kYXNoLnByb3RvdHlwZTtcblxuICBMb2Rhc2hXcmFwcGVyLnByb3RvdHlwZSA9IGJhc2VDcmVhdGUoYmFzZUxvZGFzaC5wcm90b3R5cGUpO1xuICBMb2Rhc2hXcmFwcGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExvZGFzaFdyYXBwZXI7XG5cbiAgTGF6eVdyYXBwZXIucHJvdG90eXBlID0gYmFzZUNyZWF0ZShiYXNlTG9kYXNoLnByb3RvdHlwZSk7XG4gIExhenlXcmFwcGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExhenlXcmFwcGVyO1xuXG4gIC8vIEFkZCBmdW5jdGlvbnMgdG8gdGhlIGBTZXRgIGNhY2hlLlxuICBTZXRDYWNoZS5wcm90b3R5cGUucHVzaCA9IGNhY2hlUHVzaDtcblxuICAvLyBBZGQgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIHdyYXBwZWQgdmFsdWVzIHdoZW4gY2hhaW5pbmcuXG4gIGxvZGFzaC5hc3NpZ24gPSBhc3NpZ247XG4gIGxvZGFzaC5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICBsb2Rhc2guY2hhaW4gPSBjaGFpbjtcbiAgbG9kYXNoLmNyZWF0ZSA9IGNyZWF0ZTtcbiAgbG9kYXNoLmRlYm91bmNlID0gZGVib3VuY2U7XG4gIGxvZGFzaC5maWx0ZXIgPSBmaWx0ZXI7XG4gIGxvZGFzaC5mbGF0dGVuID0gZmxhdHRlbjtcbiAgbG9kYXNoLmZvckVhY2ggPSBmb3JFYWNoO1xuICBsb2Rhc2guaW52ZXJ0ID0gaW52ZXJ0O1xuICBsb2Rhc2gua2V5cyA9IGtleXM7XG4gIGxvZGFzaC5rZXlzSW4gPSBrZXlzSW47XG4gIGxvZGFzaC5tYXAgPSBtYXA7XG4gIGxvZGFzaC5tYXBWYWx1ZXMgPSBtYXBWYWx1ZXM7XG4gIGxvZGFzaC5tYXRjaGVzID0gbWF0Y2hlcztcbiAgbG9kYXNoLm1peGluID0gbWl4aW47XG4gIGxvZGFzaC5wYWlycyA9IHBhaXJzO1xuICBsb2Rhc2gucGljayA9IHBpY2s7XG4gIGxvZGFzaC5wbHVjayA9IHBsdWNrO1xuICBsb2Rhc2gucHJvcGVydHkgPSBwcm9wZXJ0eTtcbiAgbG9kYXNoLnJlc3RQYXJhbSA9IHJlc3RQYXJhbTtcbiAgbG9kYXNoLnRhcCA9IHRhcDtcbiAgbG9kYXNoLnRocnUgPSB0aHJ1O1xuICBsb2Rhc2gudG9BcnJheSA9IHRvQXJyYXk7XG4gIGxvZGFzaC51bmlxID0gdW5pcTtcbiAgbG9kYXNoLnZhbHVlcyA9IHZhbHVlcztcbiAgbG9kYXNoLnppcE9iamVjdCA9IHppcE9iamVjdDtcblxuICAvLyBBZGQgYWxpYXNlcy5cbiAgbG9kYXNoLmNvbGxlY3QgPSBtYXA7XG4gIGxvZGFzaC5lYWNoID0gZm9yRWFjaDtcbiAgbG9kYXNoLmV4dGVuZCA9IGFzc2lnbjtcbiAgbG9kYXNoLml0ZXJhdGVlID0gY2FsbGJhY2s7XG4gIGxvZGFzaC5vYmplY3QgPSB6aXBPYmplY3Q7XG4gIGxvZGFzaC5zZWxlY3QgPSBmaWx0ZXI7XG4gIGxvZGFzaC51bmlxdWUgPSB1bmlxO1xuXG4gIC8vIEFkZCBmdW5jdGlvbnMgdG8gYGxvZGFzaC5wcm90b3R5cGVgLlxuICBtaXhpbihsb2Rhc2gsIGxvZGFzaCk7XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8vIEFkZCBmdW5jdGlvbnMgdGhhdCByZXR1cm4gdW53cmFwcGVkIHZhbHVlcyB3aGVuIGNoYWluaW5nLlxuICBsb2Rhc2guZmlyc3QgPSBmaXJzdDtcbiAgbG9kYXNoLmdldCA9IGdldDtcbiAgbG9kYXNoLmd0ID0gZ3Q7XG4gIGxvZGFzaC5oYXMgPSBoYXM7XG4gIGxvZGFzaC5pZGVudGl0eSA9IGlkZW50aXR5O1xuICBsb2Rhc2guaW5kZXhPZiA9IGluZGV4T2Y7XG4gIGxvZGFzaC5pc0FyZ3VtZW50cyA9IGlzQXJndW1lbnRzO1xuICBsb2Rhc2guaXNBcnJheSA9IGlzQXJyYXk7XG4gIGxvZGFzaC5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbiAgbG9kYXNoLmlzTmF0aXZlID0gaXNOYXRpdmU7XG4gIGxvZGFzaC5pc051bWJlciA9IGlzTnVtYmVyO1xuICBsb2Rhc2guaXNPYmplY3QgPSBpc09iamVjdDtcbiAgbG9kYXNoLmlzU3RyaW5nID0gaXNTdHJpbmc7XG4gIGxvZGFzaC5pc1R5cGVkQXJyYXkgPSBpc1R5cGVkQXJyYXk7XG4gIGxvZGFzaC5sYXN0ID0gbGFzdDtcbiAgbG9kYXNoLm1heCA9IG1heDtcbiAgbG9kYXNoLm5vb3AgPSBub29wO1xuICBsb2Rhc2gubm93ID0gbm93O1xuICBsb2Rhc2gucmVkdWNlID0gcmVkdWNlO1xuICBsb2Rhc2guc2l6ZSA9IHNpemU7XG4gIGxvZGFzaC51bmlxdWVJZCA9IHVuaXF1ZUlkO1xuXG4gIC8vIEFkZCBhbGlhc2VzLlxuICBsb2Rhc2guZm9sZGwgPSByZWR1Y2U7XG4gIGxvZGFzaC5oZWFkID0gZmlyc3Q7XG4gIGxvZGFzaC5pbmplY3QgPSByZWR1Y2U7XG5cbiAgbWl4aW4obG9kYXNoLCAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNvdXJjZSA9IHt9O1xuICAgIGJhc2VGb3JPd24obG9kYXNoLCBmdW5jdGlvbihmdW5jLCBtZXRob2ROYW1lKSB7XG4gICAgICBpZiAoIWxvZGFzaC5wcm90b3R5cGVbbWV0aG9kTmFtZV0pIHtcbiAgICAgICAgc291cmNlW21ldGhvZE5hbWVdID0gZnVuYztcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlO1xuICB9KCkpLCBmYWxzZSk7XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIGxvZGFzaC5wcm90b3R5cGUuc2FtcGxlID0gZnVuY3Rpb24obikge1xuICAgIGlmICghdGhpcy5fX2NoYWluX18gJiYgbiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc2FtcGxlKHRoaXMudmFsdWUoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRocnUoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBzYW1wbGUodmFsdWUsIG4pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogVGhlIHNlbWFudGljIHZlcnNpb24gbnVtYmVyLlxuICAgKlxuICAgKiBAc3RhdGljXG4gICAqIEBtZW1iZXJPZiBfXG4gICAqIEB0eXBlIHN0cmluZ1xuICAgKi9cbiAgbG9kYXNoLlZFUlNJT04gPSBWRVJTSU9OO1xuXG4gIC8vIEFkZCBgTGF6eVdyYXBwZXJgIG1ldGhvZHMgZm9yIGBfLmRyb3BgIGFuZCBgXy50YWtlYCB2YXJpYW50cy5cbiAgYXJyYXlFYWNoKFsnZHJvcCcsICd0YWtlJ10sIGZ1bmN0aW9uKG1ldGhvZE5hbWUsIGluZGV4KSB7XG4gICAgTGF6eVdyYXBwZXIucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24obikge1xuICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5fX2ZpbHRlcmVkX187XG4gICAgICBpZiAoZmlsdGVyZWQgJiYgIWluZGV4KSB7XG4gICAgICAgIHJldHVybiBuZXcgTGF6eVdyYXBwZXIodGhpcyk7XG4gICAgICB9XG4gICAgICBuID0gbiA9PSBudWxsID8gMSA6IG5hdGl2ZU1heChuYXRpdmVGbG9vcihuKSB8fCAwLCAwKTtcblxuICAgICAgdmFyIHJlc3VsdCA9IHRoaXMuY2xvbmUoKTtcbiAgICAgIGlmIChmaWx0ZXJlZCkge1xuICAgICAgICByZXN1bHQuX190YWtlQ291bnRfXyA9IG5hdGl2ZU1pbihyZXN1bHQuX190YWtlQ291bnRfXywgbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQuX192aWV3c19fLnB1c2goeyAnc2l6ZSc6IG4sICd0eXBlJzogbWV0aG9kTmFtZSArIChyZXN1bHQuX19kaXJfXyA8IDAgPyAnUmlnaHQnIDogJycpIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgTGF6eVdyYXBwZXIucHJvdG90eXBlW21ldGhvZE5hbWUgKyAnUmlnaHQnXSA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgIHJldHVybiB0aGlzLnJldmVyc2UoKVttZXRob2ROYW1lXShuKS5yZXZlcnNlKCk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGBMYXp5V3JhcHBlcmAgbWV0aG9kcyB0aGF0IGFjY2VwdCBhbiBgaXRlcmF0ZWVgIHZhbHVlLlxuICBhcnJheUVhY2goWydmaWx0ZXInLCAnbWFwJywgJ3Rha2VXaGlsZSddLCBmdW5jdGlvbihtZXRob2ROYW1lLCBpbmRleCkge1xuICAgIHZhciB0eXBlID0gaW5kZXggKyAxLFxuICAgICAgICBpc0ZpbHRlciA9IHR5cGUgIT0gTEFaWV9NQVBfRkxBRztcblxuICAgIExhenlXcmFwcGVyLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKGl0ZXJhdGVlLCB0aGlzQXJnKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jbG9uZSgpO1xuICAgICAgcmVzdWx0Ll9faXRlcmF0ZWVzX18ucHVzaCh7ICdpdGVyYXRlZSc6IGdldENhbGxiYWNrKGl0ZXJhdGVlLCB0aGlzQXJnLCAxKSwgJ3R5cGUnOiB0eXBlIH0pO1xuICAgICAgcmVzdWx0Ll9fZmlsdGVyZWRfXyA9IHJlc3VsdC5fX2ZpbHRlcmVkX18gfHwgaXNGaWx0ZXI7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBgTGF6eVdyYXBwZXJgIG1ldGhvZHMgZm9yIGBfLmZpcnN0YCBhbmQgYF8ubGFzdGAuXG4gIGFycmF5RWFjaChbJ2ZpcnN0JywgJ2xhc3QnXSwgZnVuY3Rpb24obWV0aG9kTmFtZSwgaW5kZXgpIHtcbiAgICB2YXIgdGFrZU5hbWUgPSAndGFrZScgKyAoaW5kZXggPyAnUmlnaHQnIDogJycpO1xuXG4gICAgTGF6eVdyYXBwZXIucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpc1t0YWtlTmFtZV0oMSkudmFsdWUoKVswXTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYExhenlXcmFwcGVyYCBtZXRob2RzIGZvciBgXy5pbml0aWFsYCBhbmQgYF8ucmVzdGAuXG4gIGFycmF5RWFjaChbJ2luaXRpYWwnLCAncmVzdCddLCBmdW5jdGlvbihtZXRob2ROYW1lLCBpbmRleCkge1xuICAgIHZhciBkcm9wTmFtZSA9ICdkcm9wJyArIChpbmRleCA/ICcnIDogJ1JpZ2h0Jyk7XG5cbiAgICBMYXp5V3JhcHBlci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fZmlsdGVyZWRfXyA/IG5ldyBMYXp5V3JhcHBlcih0aGlzKSA6IHRoaXNbZHJvcE5hbWVdKDEpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBgTGF6eVdyYXBwZXJgIG1ldGhvZHMgZm9yIGBfLnBsdWNrYCBhbmQgYF8ud2hlcmVgLlxuICBhcnJheUVhY2goWydwbHVjaycsICd3aGVyZSddLCBmdW5jdGlvbihtZXRob2ROYW1lLCBpbmRleCkge1xuICAgIHZhciBvcGVyYXRpb25OYW1lID0gaW5kZXggPyAnZmlsdGVyJyA6ICdtYXAnLFxuICAgICAgICBjcmVhdGVDYWxsYmFjayA9IGluZGV4ID8gYmFzZU1hdGNoZXMgOiBwcm9wZXJ0eTtcblxuICAgIExhenlXcmFwcGVyLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpc1tvcGVyYXRpb25OYW1lXShjcmVhdGVDYWxsYmFjayh2YWx1ZSkpO1xuICAgIH07XG4gIH0pO1xuXG4gIExhenlXcmFwcGVyLnByb3RvdHlwZS5jb21wYWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKGlkZW50aXR5KTtcbiAgfTtcblxuICBMYXp5V3JhcHBlci5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24ocHJlZGljYXRlLCB0aGlzQXJnKSB7XG4gICAgcHJlZGljYXRlID0gZ2V0Q2FsbGJhY2socHJlZGljYXRlLCB0aGlzQXJnLCAxKTtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlKHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICBMYXp5V3JhcHBlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgc3RhcnQgPSBzdGFydCA9PSBudWxsID8gMCA6ICgrc3RhcnQgfHwgMCk7XG5cbiAgICB2YXIgcmVzdWx0ID0gdGhpcztcbiAgICBpZiAocmVzdWx0Ll9fZmlsdGVyZWRfXyAmJiAoc3RhcnQgPiAwIHx8IGVuZCA8IDApKSB7XG4gICAgICByZXR1cm4gbmV3IExhenlXcmFwcGVyKHJlc3VsdCk7XG4gICAgfVxuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC50YWtlUmlnaHQoLXN0YXJ0KTtcbiAgICB9IGVsc2UgaWYgKHN0YXJ0KSB7XG4gICAgICByZXN1bHQgPSByZXN1bHQuZHJvcChzdGFydCk7XG4gICAgfVxuICAgIGlmIChlbmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZW5kID0gKCtlbmQgfHwgMCk7XG4gICAgICByZXN1bHQgPSBlbmQgPCAwID8gcmVzdWx0LmRyb3BSaWdodCgtZW5kKSA6IHJlc3VsdC50YWtlKGVuZCAtIHN0YXJ0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICBMYXp5V3JhcHBlci5wcm90b3R5cGUudGFrZVJpZ2h0V2hpbGUgPSBmdW5jdGlvbihwcmVkaWNhdGUsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXZlcnNlKCkudGFrZVdoaWxlKHByZWRpY2F0ZSwgdGhpc0FyZykucmV2ZXJzZSgpO1xuICB9O1xuXG4gIExhenlXcmFwcGVyLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudGFrZShQT1NJVElWRV9JTkZJTklUWSk7XG4gIH07XG5cbiAgLy8gQWRkIGBMYXp5V3JhcHBlcmAgbWV0aG9kcyB0byBgbG9kYXNoLnByb3RvdHlwZWAuXG4gIGJhc2VGb3JPd24oTGF6eVdyYXBwZXIucHJvdG90eXBlLCBmdW5jdGlvbihmdW5jLCBtZXRob2ROYW1lKSB7XG4gICAgdmFyIGNoZWNrSXRlcmF0ZWUgPSAvXig/OmZpbHRlcnxtYXB8cmVqZWN0KXxXaGlsZSQvLnRlc3QobWV0aG9kTmFtZSksXG4gICAgICAgIHJldFVud3JhcHBlZCA9IC9eKD86Zmlyc3R8bGFzdCkkLy50ZXN0KG1ldGhvZE5hbWUpLFxuICAgICAgICBsb2Rhc2hGdW5jID0gbG9kYXNoW3JldFVud3JhcHBlZCA/ICgndGFrZScgKyAobWV0aG9kTmFtZSA9PSAnbGFzdCcgPyAnUmlnaHQnIDogJycpKSA6IG1ldGhvZE5hbWVdO1xuXG4gICAgaWYgKCFsb2Rhc2hGdW5jKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZGFzaC5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gcmV0VW53cmFwcGVkID8gWzFdIDogYXJndW1lbnRzLFxuICAgICAgICAgIGNoYWluQWxsID0gdGhpcy5fX2NoYWluX18sXG4gICAgICAgICAgdmFsdWUgPSB0aGlzLl9fd3JhcHBlZF9fLFxuICAgICAgICAgIGlzSHlicmlkID0gISF0aGlzLl9fYWN0aW9uc19fLmxlbmd0aCxcbiAgICAgICAgICBpc0xhenkgPSB2YWx1ZSBpbnN0YW5jZW9mIExhenlXcmFwcGVyLFxuICAgICAgICAgIGl0ZXJhdGVlID0gYXJnc1swXSxcbiAgICAgICAgICB1c2VMYXp5ID0gaXNMYXp5IHx8IGlzQXJyYXkodmFsdWUpO1xuXG4gICAgICBpZiAodXNlTGF6eSAmJiBjaGVja0l0ZXJhdGVlICYmIHR5cGVvZiBpdGVyYXRlZSA9PSAnZnVuY3Rpb24nICYmIGl0ZXJhdGVlLmxlbmd0aCAhPSAxKSB7XG4gICAgICAgIC8vIEF2b2lkIGxhenkgdXNlIGlmIHRoZSBpdGVyYXRlZSBoYXMgYSBcImxlbmd0aFwiIHZhbHVlIG90aGVyIHRoYW4gYDFgLlxuICAgICAgICBpc0xhenkgPSB1c2VMYXp5ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgaW50ZXJjZXB0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gKHJldFVud3JhcHBlZCAmJiBjaGFpbkFsbClcbiAgICAgICAgICA/IGxvZGFzaEZ1bmModmFsdWUsIDEpWzBdXG4gICAgICAgICAgOiBsb2Rhc2hGdW5jLmFwcGx5KHVuZGVmaW5lZCwgYXJyYXlQdXNoKFt2YWx1ZV0sIGFyZ3MpKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhY3Rpb24gPSB7ICdmdW5jJzogdGhydSwgJ2FyZ3MnOiBbaW50ZXJjZXB0b3JdLCAndGhpc0FyZyc6IHVuZGVmaW5lZCB9LFxuICAgICAgICAgIG9ubHlMYXp5ID0gaXNMYXp5ICYmICFpc0h5YnJpZDtcblxuICAgICAgaWYgKHJldFVud3JhcHBlZCAmJiAhY2hhaW5BbGwpIHtcbiAgICAgICAgaWYgKG9ubHlMYXp5KSB7XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jbG9uZSgpO1xuICAgICAgICAgIHZhbHVlLl9fYWN0aW9uc19fLnB1c2goYWN0aW9uKTtcbiAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9kYXNoRnVuYy5jYWxsKHVuZGVmaW5lZCwgdGhpcy52YWx1ZSgpKVswXTtcbiAgICAgIH1cbiAgICAgIGlmICghcmV0VW53cmFwcGVkICYmIHVzZUxhenkpIHtcbiAgICAgICAgdmFsdWUgPSBvbmx5TGF6eSA/IHZhbHVlIDogbmV3IExhenlXcmFwcGVyKHRoaXMpO1xuICAgICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgICAgIHJlc3VsdC5fX2FjdGlvbnNfXy5wdXNoKGFjdGlvbik7XG4gICAgICAgIHJldHVybiBuZXcgTG9kYXNoV3JhcHBlcihyZXN1bHQsIGNoYWluQWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRocnUoaW50ZXJjZXB0b3IpO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBgQXJyYXlgIGFuZCBgU3RyaW5nYCBtZXRob2RzIHRvIGBsb2Rhc2gucHJvdG90eXBlYC5cbiAgYXJyYXlFYWNoKFsnam9pbicsICdwb3AnLCAncHVzaCcsICdyZXBsYWNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3NwbGl0JywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIHZhciBmdW5jID0gKC9eKD86cmVwbGFjZXxzcGxpdCkkLy50ZXN0KG1ldGhvZE5hbWUpID8gc3RyaW5nUHJvdG8gOiBhcnJheVByb3RvKVttZXRob2ROYW1lXSxcbiAgICAgICAgY2hhaW5OYW1lID0gL14oPzpwdXNofHNvcnR8dW5zaGlmdCkkLy50ZXN0KG1ldGhvZE5hbWUpID8gJ3RhcCcgOiAndGhydScsXG4gICAgICAgIHJldFVud3JhcHBlZCA9IC9eKD86am9pbnxwb3B8cmVwbGFjZXxzaGlmdCkkLy50ZXN0KG1ldGhvZE5hbWUpO1xuXG4gICAgbG9kYXNoLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmV0VW53cmFwcGVkICYmICF0aGlzLl9fY2hhaW5fXykge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLnZhbHVlKCksIGFyZ3MpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNbY2hhaW5OYW1lXShmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBNYXAgbWluaWZpZWQgZnVuY3Rpb24gbmFtZXMgdG8gdGhlaXIgcmVhbCBuYW1lcy5cbiAgYmFzZUZvck93bihMYXp5V3JhcHBlci5wcm90b3R5cGUsIGZ1bmN0aW9uKGZ1bmMsIG1ldGhvZE5hbWUpIHtcbiAgICB2YXIgbG9kYXNoRnVuYyA9IGxvZGFzaFttZXRob2ROYW1lXTtcbiAgICBpZiAobG9kYXNoRnVuYykge1xuICAgICAgdmFyIGtleSA9IGxvZGFzaEZ1bmMubmFtZSxcbiAgICAgICAgICBuYW1lcyA9IHJlYWxOYW1lc1trZXldIHx8IChyZWFsTmFtZXNba2V5XSA9IFtdKTtcblxuICAgICAgbmFtZXMucHVzaCh7ICduYW1lJzogbWV0aG9kTmFtZSwgJ2Z1bmMnOiBsb2Rhc2hGdW5jIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmVhbE5hbWVzW2NyZWF0ZUh5YnJpZFdyYXBwZXIodW5kZWZpbmVkLCBCSU5EX0tFWV9GTEFHKS5uYW1lXSA9IFt7ICduYW1lJzogJ3dyYXBwZXInLCAnZnVuYyc6IHVuZGVmaW5lZCB9XTtcblxuICAvLyBBZGQgZnVuY3Rpb25zIHRvIHRoZSBsYXp5IHdyYXBwZXIuXG4gIExhenlXcmFwcGVyLnByb3RvdHlwZS5jbG9uZSA9IGxhenlDbG9uZTtcbiAgTGF6eVdyYXBwZXIucHJvdG90eXBlLnJldmVyc2UgPSBsYXp5UmV2ZXJzZTtcbiAgTGF6eVdyYXBwZXIucHJvdG90eXBlLnZhbHVlID0gbGF6eVZhbHVlO1xuXG4gIC8vIEFkZCBjaGFpbmluZyBmdW5jdGlvbnMgdG8gdGhlIGBsb2Rhc2hgIHdyYXBwZXIuXG4gIGxvZGFzaC5wcm90b3R5cGUuY2hhaW4gPSB3cmFwcGVyQ2hhaW47XG4gIGxvZGFzaC5wcm90b3R5cGUuY29tbWl0ID0gd3JhcHBlckNvbW1pdDtcbiAgbG9kYXNoLnByb3RvdHlwZS5jb25jYXQgPSB3cmFwcGVyQ29uY2F0O1xuICBsb2Rhc2gucHJvdG90eXBlLnBsYW50ID0gd3JhcHBlclBsYW50O1xuICBsb2Rhc2gucHJvdG90eXBlLnJldmVyc2UgPSB3cmFwcGVyUmV2ZXJzZTtcbiAgbG9kYXNoLnByb3RvdHlwZS50b1N0cmluZyA9IHdyYXBwZXJUb1N0cmluZztcbiAgbG9kYXNoLnByb3RvdHlwZS5ydW4gPSBsb2Rhc2gucHJvdG90eXBlLnRvSlNPTiA9IGxvZGFzaC5wcm90b3R5cGUudmFsdWVPZiA9IGxvZGFzaC5wcm90b3R5cGUudmFsdWUgPSB3cmFwcGVyVmFsdWU7XG5cbiAgLy8gQWRkIGZ1bmN0aW9uIGFsaWFzZXMgdG8gdGhlIGBsb2Rhc2hgIHdyYXBwZXIuXG4gIGxvZGFzaC5wcm90b3R5cGUuY29sbGVjdCA9IGxvZGFzaC5wcm90b3R5cGUubWFwO1xuICBsb2Rhc2gucHJvdG90eXBlLmhlYWQgPSBsb2Rhc2gucHJvdG90eXBlLmZpcnN0O1xuICBsb2Rhc2gucHJvdG90eXBlLnNlbGVjdCA9IGxvZGFzaC5wcm90b3R5cGUuZmlsdGVyO1xuICBsb2Rhc2gucHJvdG90eXBlLnRhaWwgPSBsb2Rhc2gucHJvdG90eXBlLnJlc3Q7XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUpIHtcbiAgICAvLyBFeHBvcnQgZm9yIE5vZGUuanMgb3IgUmluZ29KUy5cbiAgICBpZiAobW9kdWxlRXhwb3J0cykge1xuICAgICAgKGZyZWVNb2R1bGUuZXhwb3J0cyA9IGxvZGFzaCkuXyA9IGxvZGFzaDtcbiAgICB9XG4gIH1cbn0uY2FsbCh0aGlzKSk7XG4iXX0=
