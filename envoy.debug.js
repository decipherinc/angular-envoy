/*! angular-envoy - v0.0.1
 * 
 * Copyright (c) 2015 Focusvision Worldwide; Licensed MIT
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./lib');

},{"./lib":13}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

module.exports = {
  'envoyAction': require('./action'),
  'envoyMessages': require('./messages'),
  'envoyList': require('./list'),
  'envoyProxy': require('./proxy')
};

},{"./action":2,"./list":4,"./messages":5,"./proxy":8}],4:[function(require,module,exports){
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
    require: '?^envoyMessages',
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, envoyMessages) {
      var parentName = attrs.envoyList || attrs.for;
      var parent;

      if (parentName) {
        parent =
          $envoy.findParentController($interpolate(parentName)(scope),
            envoyMessages);
      } else if (envoyMessages) {
        parent = envoyMessages;
      } else {
        throw new Error('envoyList requires an ancestor envoyMessages ' +
          'directive or a form name');
      }

      parent.bindView(scope);

      scope.$on('$destroy', function () {
        parent.unbindView();
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

},{"../envoy/opts":11}],5:[function(require,module,exports){
'use strict';

/**
 * @ngdoc directive
 * @name fv.envoy.directive:envoyMessages
 * @restrict AE
 * @param {string} [parent] If this directive is in a subform of some other
 * form which is *also* using the `envoyMessages` directive, and you wish to
 * display messages within its list, specify its form name here.
 * @description
 * Enables display of messages for a form.
 */

var debug = require('debug')('envoy:directives:messages');

function messages($interpolate, $envoy) {
  return {
    restrict: 'AE',
    // is it dumb to require your own controller?
    require: 'envoyMessages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, ctrl) {
      var parentName;

      if (attrs.parent && (parentName = $interpolate(attrs.parent)(scope))) {
        $envoy.findParentController(parentName,
          element.parent().controller('envoyMessages')).addChild(ctrl);

        if (ctrl.$parent.$form === ctrl.$form) {
          ctrl.$parent.removeChild(ctrl);
          debug('Attempted to initialize %s with its own parent',
            ctrl.$form.$name);
        }
      }

      scope.$on('$destroy', function () {
        if (ctrl.$parent) {
          ctrl.$parent.removeChild(ctrl);
        }
      });
    }
  };
}
messages.$inject = ['$interpolate', '$envoy'];

module.exports = messages;

},{"./messages-ctrl":6,"debug":14}],6:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);
var viewData = require('./viewdata');

var debug = require('debug')('envoy:directives:messages:controller');

/**
 * @ngdoc controller
 * @name fv.envoy.controllers:EnvoyMessagesController
 * @description
 * The controller for the {@link fv.envoy.directives:envoyMessages
 *     envoyMessages} directive.
 * @constructor
 */
function EnvoyMessagesController($element,
  $envoy,
  $scope) {

  var view;

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#bindView
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @description
   * Bind a view Scope to this directive for display.  Used by
   * `messagesList` directive.
   * @param {ng.$rootScope.Scope} scope Scope
   * @returns {fv.envoy.controllers:EnvoyMessagesController} This controller
   */
  this.bindView = function bindView(scope) {
    if (view.scope) {
      throw new Error('view already bound!');
    }
    view.scope = scope;
    scope.$envoyData = viewData($envoy.DEFAULT_LEVEL);
    debug('View bound');
    return this;
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#unbindView
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @description
   * Unbind the view from this controller.
   * @returns {fv.envoy.controllers:EnvoyMessagesController} This controller
   */
  this.unbindView = function unbindView() {
    if (view) {
      delete view.scope;
      view = null;
      debug('View unbound');
    }
    return this;
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#update
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @description
   * Update this controller's view data with the object provided.  Data is
   * merged with existing data at the control level.
   * @param {Object} data View data
   * @param {number} [data.errorLevel] Numeric errorlevel of this controller's
   * form
   * @param {Object} [data.messages] Messages for this controller's form,
   * keyed on control name, then on token name
   * @returns {Object} The merged view data
   */
  this.update = function update(data) {
    var viewData = this.$viewData;
    var errorLevel;

    if (viewData) {

      debug('"%s" updating with new data:', this.$name, data);

      this.$errorLevel =
        errorLevel =
          _.isNumber(data.errorLevel) ? data.errorLevel : this.$errorLevel;

      // we overwrite data here, but don't remove entire forms.  if a
      // control is not present in the form messages, then the form has changed
      // and we can safely delete the control's info.
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
      viewData.className = $envoy.level(errorLevel);
      viewData.title = this.title(errorLevel);

      debug('"%s" updated; view data:', this.$name, viewData);

      return viewData;
    }
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#addChild
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @param {fv.envoy.controllers:EnvoyMessagesController} child Child
   *     controller
   * @description
   * Adds a child EnvoyMessagesController to this EnvoyMessagesController.
   * @returns {fv.envoy.controllers:EnvoyMessagesController} This controller
   */
  this.addChild = function addChild(child) {
    debug('Adding child "%s" to "%s"', child.$name, this.$name);
    this.$children.push(child);
    child.$parent = this;
    return this;
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#removeChild
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @param {fv.envoy.controllers:EnvoyMessagesController} child Child
   *     controller
   * @description
   * Removes a child EnvoyMessagesController from this EnvoyMessagesController.
   * @returns {fv.envoy.controllers:EnvoyMessagesController} This controller
   */
  this.removeChild = function removeChild(child) {
    debug('Removing child "%s" from "%s"', child.$name, this.$name);
    this.$children.splice(this.$children.indexOf(child), 1);
    delete child.$parent;
    return this;
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#title
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @description
   * Retrieves an errorLevel's title.
   * @see {@link fv.envoy.$envoy#levelDescription}
   * @param {(string|number)} errorLevel errorLevel
   */
  this.title = function title(errorLevel) {
    return $envoy.levelDescription(errorLevel);
  };

  /**
   * @ngdoc function
   * @name fv.envoy.controllers:EnvoyMessagesController#title
   * @methodOf fv.envoy.controllers:EnvoyMessagesController
   * @description
   * Mostly for debugging purposes; returns this controller's form's name.
   * @returns {string} This form's name
   */
  this.toString = function toString() {
    return this.$name;
  };

  /**
   * @this EnvoyMessagesController
   */
  (function init() {
    var form;

    /**
     * @ngdoc property
     * @name fv.envoy.controllers:EnvoyMessagesController#$children
     * @propertyOf fv.envoy.controllers:EnvoyMessagesController
     * @type {Array.<fv.envoy.controllers:EnvoyMessagesController>}
     * @description
     * Array of child EnvoyMessagesControllers, if any.
     */
    this.$children = [];

    /**
     * @ngdoc property
     * @name fv.envoy.controllers:EnvoyMessagesController#$parent
     * @propertyOf fv.envoy.controllers:EnvoyMessagesController
     * @type {?Array.<fv.envoy.controllers:EnvoyMessagesController>}
     * @description
     * Parent EnvoyMessagesControllers, if any.
     */
    this.$parent = null;

    Object.defineProperties(this, {
      /**
       * @ngdoc property
       * @name fv.envoy.controllers:EnvoyMessagesController#$children
       * @propertyOf fv.envoy.controllers:EnvoyMessagesController
       * @type {number}
       * @description
       * Numeric errorLevel of this controller's form.
       */
      $errorLevel: {
        get: function getErrorLevel() {
          return form.$errorLevel;
        },
        set: function setErrorLevel(value) {
          form.$errorLevel = value;
        }
      },
      /**
       * @ngdoc property
       * @name fv.envoy.controllers:EnvoyMessagesController#$name
       * @propertyOf fv.envoy.controllers:EnvoyMessagesController
       * @type {string}
       * @description
       * This controller's form's name.
       */
      $name: {
        get: function getName() {
          return form.$name;
        }
      },

      /**
       * @ngdoc property
       * @name fv.envoy.controllers:EnvoyMessagesController#$viewData
       * @propertyOf fv.envoy.controllers:EnvoyMessagesController
       * @type {Object}
       * @description
       * This controller's view data.  Only present if an `envoyList` directive
       * has been bound via `bindView()`.
       */
      $viewData: {
        get: function getViewData() {
          var data;
          if ((data = _.get(view, 'scope.$envoyData'))) {
            return data;
          }
          if (view.scope) {
            return (view.scope.$envoyData = viewData($envoy.DEFAULT_LEVEL));
          }
        },
        set: function setViewData(data) {
          view.scope.$envoyData = data;
        }
      }
    });

    /**
     * @ngdoc property
     * @name fv.envoy.controllers:EnvoyMessagesController#$form
     * @propertyOf fv.envoy.controllers:EnvoyMessagesController
     * @type {EnvoyFormController}
     * @description
     * This controller's form.
     */
    form = this.$form = $element.controller('form');

    this.$errorLevel = $envoy.DEFAULT_ERRORLEVEL;

    /**
     * @ngdoc property
     * @name fv.envoy.controllers:EnvoyMessagesController#$view
     * @propertyOf fv.envoy.controllers:EnvoyMessagesController
     * @type {Object}
     * @description
     * Generic object housing the Scope of the bound `envoyList` directive,
     * if any.
     */
    view =
      this.$parent ? (this.$view = this.$parent.$view) : (this.$view = {});

    // when we destroy, unbind this form, because it will not be updated
    // further (or until it returns).
    // (`$envoy.bindForm()` returns a function which unbinds)
    $scope.$on('$destroy', $envoy.bindForm(this, this.$name));

  }.call(this));
}

EnvoyMessagesController.$inject = [
  '$element',
  '$envoy',
  '$scope'
];

module.exports = EnvoyMessagesController;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./viewdata":7,"debug":14}],7:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

var ID_PREFIX = 'envoy-viewdata-';
var debug = require('debug')('envoy:directives:messages:viewdata');

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


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":14}],8:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

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

        this.update = function update(data) {
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
          $scope.$on('$destroy', $envoy.bindForm(this, target));
        } else {
          throw new Error('envoyProxy directive needs a value!');
        }
      }
    ]
  };
}
module.exports = proxy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":14}],9:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);
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
     * @param {*} ctrl Presumed to be a `envoyMessages` controller instance, but
     * could be `envoyProxy` controller instance as well.
     * @param {string} formName Name of form
     * @returns {Function} A function that will break the binding
     */
    bindForm: function bindForm(ctrl, formName) {

      var formBindings = bindings[formName] = bindings[formName] || {};
      var id = _.uniqueId('envoy-binding-');

      formBindings[id] = ctrl;

      return function unbindForm() {
        delete formBindings[id];
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
            ctrl.update({
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
     * have a custom controller do just about anything in its `update()` method.
     *
     * This is asynchronous, and the underlying method is debounced--you may
     * lose a call if you're too quick--but if you call it twice synchronously,
     * if the first call takes less than 250ms, the second call will not
     * execute.
     *
     * TODO: make the debounce timer configurable.
     * @param {EnvoyFormController} form The form whose control changed
     * @param {(ngModel.NgModelController|EnvoyFormController)} control The
     * control which changed.
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
     * @name fv.envoy.$envoy#findParentController
     * @methodOf fv.envoy.$envoy
     * @description
     * Utility function to get a parent envoy directive.
     * @param {string} formName Find the EnvoyMessagesController
     *     attached to form with this name
     * @param {EnvoyMessagesController} envoyMessages Current
     *     EnvoyMessagesController
     * @throws If no parent with that name found
     * @returns {EnvoyMessagesController} Parent controller
     */
    findParentController: function findParentController(formName,
      envoyMessages) {
      while (envoyMessages.$name !== formName) {
        envoyMessages = envoyMessages.$parent;
        if (!envoyMessages) {
          throw new Error('cannot find parent with name ' + formName);
        }
      }
      return envoyMessages;
    },

    /**
     * @ngdoc function
     * @name fv.envoy.$envoy#levelDescription
     * @methodOf fv.envoy.$envoy
     * @description
     * Returns the description/title for an errorlevel.
     * @param {(string|number)} errorLevel errorlevel
     * @returns {string} The description/title of given errorlevel
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./opts":11,"debug":14}],10:[function(require,module,exports){
(function (global){
'use strict';

var opts = require('./opts');
var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./factory":9,"./opts":11,"debug":14}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

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
 * - The controller is replaced with a {@link fv.envoy.controllers:EnvoyFormController EnvoyFormController}.
 * - The directive creates a new Scope.  See the {@link fv.envoy.controllers:EnvoyFormController#$alias $alias property} for
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
   * @name fv.envoy.controllers:EnvoyFormController
   * @description
   * `EnvoyFormController` replaces
   *     [`FormController`](https://docs.angularjs.org/api/ng/type/form.FormController#!)
   *     with itself; any time you use the
   *     [`form`](https://docs.angularjs.org/api/ng/directive/form) directive,
   *     your controller will be this instead, **except** if your `form` has no
   *     `name` attribute, at which point it is *ignored* by Envoy.
   *
   * @constructor
   */
  function EnvoyFormController($element,
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
       * @name fv.envoy.controllers:EnvoyFormController#$isForm
       * @propertyOf fv.envoy.controllers:EnvoyFormController
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
         * @param {(ngModel.NgModelController|form.FormController|fv.envoy.controllers.EnvoyFormController)} control
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

  EnvoyFormController.$inject = [
    '$element',
    '$attrs',
    '$scope',
    '$animate',
    '$interpolate',
    '$injector',
    '$envoy'
  ];

  form.controller = EnvoyFormController;

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":14}],13:[function(require,module,exports){
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
var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);
var directives = require('./directives');
var pkg = require('../package.json');
var formDecorator = require('./form-decorator');
var $envoy = require('./envoy');

var MODULE_NAME = 'fv.envoy';
var debug = require('debug')('envoy');
var envoy;
var ngAnimatePresent = false;

function config($provide) {
  $provide.decorator('ngFormDirective', formDecorator);

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

},{"../package.json":17,"./directives":3,"./envoy":10,"./form-decorator":12,"debug":14}],14:[function(require,module,exports){

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

},{"./debug":15}],15:[function(require,module,exports){

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

},{"ms":16}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
module.exports={
  "name": "angular-envoy",
  "version": "0.0.1",
  "description": "Highly flexible form validation messaging for AngularJS",
  "main": "index.js",
  "author": "Christopher Hiller <chiller@focusvision.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/decipherinc/angular-envoy.git"
  },
  "devDependencies": {
    "angular": "^1.4.1",
    "chai": "^3.0.0",
    "exposify": "^0.4.3",
    "grunt": "^0.4.5",
    "grunt-bower-install-simple": "^1.1.3",
    "grunt-browserify": "^3.8.0",
    "grunt-bump": "^0.3.1",
    "grunt-cli": "^0.1.13",
    "grunt-contrib-clean": "^0.6.0",
    "grunt-contrib-copy": "^0.8.0",
    "grunt-dev-update": "^1.3.0",
    "grunt-eslint": "^15.0.0",
    "grunt-gh-pages": "^0.10.0",
    "grunt-lodash": "^0.4.0",
    "grunt-lodash-autobuild": "^0.3.0",
    "grunt-mocha-istanbul": "^2.4.0",
    "grunt-ngdocs": "^0.2.7",
    "istanbul": "^0.3.17",
    "jit-grunt": "^0.9.1",
    "jsonminifyify": "^0.1.1",
    "load-grunt-config": "^0.17.1",
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2FjdGlvbi5qcyIsImxpYi9kaXJlY3RpdmVzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbGlzdC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvbWVzc2FnZXMtY3RybC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL3ZpZXdkYXRhLmpzIiwibGliL2RpcmVjdGl2ZXMvcHJveHkuanMiLCJsaWIvZW52b3kvZmFjdG9yeS5qcyIsImxpYi9lbnZveS9pbmRleC5qcyIsImxpYi9lbnZveS9vcHRzLmpzIiwibGliL2Zvcm0tZGVjb3JhdG9yLmpzIiwibGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RlYnVnL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZGVidWcvZGVidWcuanMiLCJub2RlX21vZHVsZXMvZGVidWcvbm9kZV9tb2R1bGVzL21zL2luZGV4LmpzIiwicGFja2FnZS5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdlNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWInKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lBY3Rpb25cbiAqIEByZXN0cmljdCBBXG4gKiBAZGVzY3JpcHRpb25cbiAqIERlc2NyaWJlcyBhIGRpcmVjdGl2ZSB3aGVyZWluIHlvdSBjYW4gc3VwcGx5IGFuIGFjdGlvbiAoQW5ndWxhckpTXG4gKiBleHByZXNzaW9uKSB0byBiZSBleGVjdXRlZCBmcm9tIHRoZSBtZXNzYWdlIGxpc3QgZm9yIGEgcGFydGljdWxhclxuICogY29udHJvbC5cbiAqXG4gKiBJbiBzaG9ydCwgeW91IHdhbnQgdG8gdXNlIHRoaXMgdG8gYWN0aXZhdGUgYSBmb3JtIGZpZWxkIHdoZW4gdGhlIHVzZXJcbiAqIGNsaWNrcyBvbiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgaHRtbFxuICogPGlucHV0IG5hbWU9XCJ0aXRsZVwiXG4gKiAgICAgICAgdHlwZT1cInRleHRcIlxuICogICAgICAgIG5nLW1vZGVsPVwibXlNb2RlbC50aXRsZVwiXG4gKiAgICAgICAgZW52b3ktYWN0aW9uPVwiZG9Tb21ldGhpbmcoKVwiLz5cbiAqIGBgYFxuICovXG5mdW5jdGlvbiBhY3Rpb24oJGVudm95KSB7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6IFsnbmdNb2RlbCcsICdeZm9ybSddLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmxzKSB7XG4gICAgICB2YXIgbmdNb2RlbCA9IGN0cmxzWzBdO1xuICAgICAgdmFyIGZvcm0gPSBjdHJsc1sxXTtcbiAgICAgIHZhciBhY3Rpb247XG5cbiAgICAgIGlmICgoYWN0aW9uID0gYXR0cnMuZW52b3lBY3Rpb24pICYmIG5nTW9kZWwuJG5hbWUgJiYgZm9ybS4kbmFtZSkge1xuICAgICAgICAkZW52b3kuc2V0QWN0aW9uKGZvcm0uJG5hbWUsIG5nTW9kZWwuJG5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzY29wZS4kZXZhbChhY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5hY3Rpb24uJGluamVjdCA9IFsnJGVudm95J107XG5cbm1vZHVsZS5leHBvcnRzID0gYWN0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJ2Vudm95QWN0aW9uJzogcmVxdWlyZSgnLi9hY3Rpb24nKSxcbiAgJ2Vudm95TWVzc2FnZXMnOiByZXF1aXJlKCcuL21lc3NhZ2VzJyksXG4gICdlbnZveUxpc3QnOiByZXF1aXJlKCcuL2xpc3QnKSxcbiAgJ2Vudm95UHJveHknOiByZXF1aXJlKCcuL3Byb3h5Jylcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcHRzID0gcmVxdWlyZSgnLi4vZW52b3kvb3B0cycpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveUxpc3RcbiAqIEBkZXNjcmlwdGlvblxuICogRGVmaW5lcyBhIGRpcmVjdGl2ZSB3aGljaCB3aWxsIGRpc3BsYXkgYSBsaXN0IG9mIGFsbCBtZXNzYWdlc1xuICogZm9yIGEgZm9ybS5cbiAqXG4gKiBUaGUgdGVtcGxhdGUgZm9yIHRoZSBsaXN0IGlzIHRoZSBwcm9wZXJ0eSBgdGVtcGxhdGVVcmxgIG9mXG4gKiAkZW52b3lQcm92aWRlci5cbiAqXG4gKiBUaGUgdGFyZ2V0IGZvcm0gY2FuIGJlIHNwZWNpZmllZCwgYnkgbmFtZSAod2l0aCBpbnRlcnBvbGF0aW9uIGF2YWlsYWJsZSksXG4gKiBpbiB0aGUgYGVudm95TGlzdGAgYXR0cmlidXRlIG9yIHRoZSBgZm9yYCBhdHRyaWJ1dGUuICBUaGlzIGF0dHJpYnV0ZSBtYXlcbiAqIGJlIG9taXR0ZWQgaWYgdGhlIGBlbnZveUxpc3RgIGRpcmVjdGl2ZSBoYXMgYW4gYGVudm95TWVzc2FnZXNgIGFuY2VzdG9yLlxuICogQGV4YW1wbGVcbiAqIGBgYGh0bWxcbiAqIDxkaXYgZW52b3ktbGlzdD1cImNvbmZpZ0Zvcm1cIj48L2Rpdj5cbiAqIDwhLS0gb3IgLS0+XG4gKiA8ZW52b3ktbGlzdCBmb3I9XCJjb25maWdGb3JtXCI+PC9lbnZveS1saXN0PlxuICogYGBgXG4gKi9cbmZ1bmN0aW9uIGxpc3QoJGVudm95LCAkaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGRpcmVjdGl2ZSA9IHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICByZXF1aXJlOiAnP15lbnZveU1lc3NhZ2VzJyxcbiAgICB0ZW1wbGF0ZVVybDogb3B0cy50ZW1wbGF0ZVVybCxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBlbnZveU1lc3NhZ2VzKSB7XG4gICAgICB2YXIgcGFyZW50TmFtZSA9IGF0dHJzLmVudm95TGlzdCB8fCBhdHRycy5mb3I7XG4gICAgICB2YXIgcGFyZW50O1xuXG4gICAgICBpZiAocGFyZW50TmFtZSkge1xuICAgICAgICBwYXJlbnQgPVxuICAgICAgICAgICRlbnZveS5maW5kUGFyZW50Q29udHJvbGxlcigkaW50ZXJwb2xhdGUocGFyZW50TmFtZSkoc2NvcGUpLFxuICAgICAgICAgICAgZW52b3lNZXNzYWdlcyk7XG4gICAgICB9IGVsc2UgaWYgKGVudm95TWVzc2FnZXMpIHtcbiAgICAgICAgcGFyZW50ID0gZW52b3lNZXNzYWdlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZW52b3lMaXN0IHJlcXVpcmVzIGFuIGFuY2VzdG9yIGVudm95TWVzc2FnZXMgJyArXG4gICAgICAgICAgJ2RpcmVjdGl2ZSBvciBhIGZvcm0gbmFtZScpO1xuICAgICAgfVxuXG4gICAgICBwYXJlbnQuYmluZFZpZXcoc2NvcGUpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBwYXJlbnQudW5iaW5kVmlldygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuICBpZiAob3B0cy50ZW1wbGF0ZSkge1xuICAgIGRpcmVjdGl2ZS50ZW1wbGF0ZSA9IG9wdHMudGVtcGxhdGU7XG4gICAgZGVsZXRlIGRpcmVjdGl2ZS50ZW1wbGF0ZVVybDtcbiAgfVxuICByZXR1cm4gZGlyZWN0aXZlO1xufVxubGlzdC4kaW5qZWN0ID0gWyckZW52b3knLCAnJGludGVycG9sYXRlJ107XG5cbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lNZXNzYWdlc1xuICogQHJlc3RyaWN0IEFFXG4gKiBAcGFyYW0ge3N0cmluZ30gW3BhcmVudF0gSWYgdGhpcyBkaXJlY3RpdmUgaXMgaW4gYSBzdWJmb3JtIG9mIHNvbWUgb3RoZXJcbiAqIGZvcm0gd2hpY2ggaXMgKmFsc28qIHVzaW5nIHRoZSBgZW52b3lNZXNzYWdlc2AgZGlyZWN0aXZlLCBhbmQgeW91IHdpc2ggdG9cbiAqIGRpc3BsYXkgbWVzc2FnZXMgd2l0aGluIGl0cyBsaXN0LCBzcGVjaWZ5IGl0cyBmb3JtIG5hbWUgaGVyZS5cbiAqIEBkZXNjcmlwdGlvblxuICogRW5hYmxlcyBkaXNwbGF5IG9mIG1lc3NhZ2VzIGZvciBhIGZvcm0uXG4gKi9cblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlcycpO1xuXG5mdW5jdGlvbiBtZXNzYWdlcygkaW50ZXJwb2xhdGUsICRlbnZveSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQUUnLFxuICAgIC8vIGlzIGl0IGR1bWIgdG8gcmVxdWlyZSB5b3VyIG93biBjb250cm9sbGVyP1xuICAgIHJlcXVpcmU6ICdlbnZveU1lc3NhZ2VzJyxcbiAgICBjb250cm9sbGVyOiByZXF1aXJlKCcuL21lc3NhZ2VzLWN0cmwnKSxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICBsaW5rOiBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuICAgICAgdmFyIHBhcmVudE5hbWU7XG5cbiAgICAgIGlmIChhdHRycy5wYXJlbnQgJiYgKHBhcmVudE5hbWUgPSAkaW50ZXJwb2xhdGUoYXR0cnMucGFyZW50KShzY29wZSkpKSB7XG4gICAgICAgICRlbnZveS5maW5kUGFyZW50Q29udHJvbGxlcihwYXJlbnROYW1lLFxuICAgICAgICAgIGVsZW1lbnQucGFyZW50KCkuY29udHJvbGxlcignZW52b3lNZXNzYWdlcycpKS5hZGRDaGlsZChjdHJsKTtcblxuICAgICAgICBpZiAoY3RybC4kcGFyZW50LiRmb3JtID09PSBjdHJsLiRmb3JtKSB7XG4gICAgICAgICAgY3RybC4kcGFyZW50LnJlbW92ZUNoaWxkKGN0cmwpO1xuICAgICAgICAgIGRlYnVnKCdBdHRlbXB0ZWQgdG8gaW5pdGlhbGl6ZSAlcyB3aXRoIGl0cyBvd24gcGFyZW50JyxcbiAgICAgICAgICAgIGN0cmwuJGZvcm0uJG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjdHJsLiRwYXJlbnQpIHtcbiAgICAgICAgICBjdHJsLiRwYXJlbnQucmVtb3ZlQ2hpbGQoY3RybCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cbm1lc3NhZ2VzLiRpbmplY3QgPSBbJyRpbnRlcnBvbGF0ZScsICckZW52b3knXTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXNzYWdlcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5fIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5fIDogbnVsbCk7XG52YXIgdmlld0RhdGEgPSByZXF1aXJlKCcuL3ZpZXdkYXRhJyk7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OmRpcmVjdGl2ZXM6bWVzc2FnZXM6Y29udHJvbGxlcicpO1xuXG4vKipcbiAqIEBuZ2RvYyBjb250cm9sbGVyXG4gKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGUgY29udHJvbGxlciBmb3IgdGhlIHtAbGluayBmdi5lbnZveS5kaXJlY3RpdmVzOmVudm95TWVzc2FnZXNcbiAqICAgICBlbnZveU1lc3NhZ2VzfSBkaXJlY3RpdmUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRW52b3lNZXNzYWdlc0NvbnRyb2xsZXIoJGVsZW1lbnQsXG4gICRlbnZveSxcbiAgJHNjb3BlKSB7XG5cbiAgdmFyIHZpZXc7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlciNiaW5kVmlld1xuICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEJpbmQgYSB2aWV3IFNjb3BlIHRvIHRoaXMgZGlyZWN0aXZlIGZvciBkaXNwbGF5LiAgVXNlZCBieVxuICAgKiBgbWVzc2FnZXNMaXN0YCBkaXJlY3RpdmUuXG4gICAqIEBwYXJhbSB7bmcuJHJvb3RTY29wZS5TY29wZX0gc2NvcGUgU2NvcGVcbiAgICogQHJldHVybnMge2Z2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyfSBUaGlzIGNvbnRyb2xsZXJcbiAgICovXG4gIHRoaXMuYmluZFZpZXcgPSBmdW5jdGlvbiBiaW5kVmlldyhzY29wZSkge1xuICAgIGlmICh2aWV3LnNjb3BlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ZpZXcgYWxyZWFkeSBib3VuZCEnKTtcbiAgICB9XG4gICAgdmlldy5zY29wZSA9IHNjb3BlO1xuICAgIHNjb3BlLiRlbnZveURhdGEgPSB2aWV3RGF0YSgkZW52b3kuREVGQVVMVF9MRVZFTCk7XG4gICAgZGVidWcoJ1ZpZXcgYm91bmQnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyI3VuYmluZFZpZXdcbiAgICogQG1ldGhvZE9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBVbmJpbmQgdGhlIHZpZXcgZnJvbSB0aGlzIGNvbnRyb2xsZXIuXG4gICAqIEByZXR1cm5zIHtmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlcn0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICB0aGlzLnVuYmluZFZpZXcgPSBmdW5jdGlvbiB1bmJpbmRWaWV3KCkge1xuICAgIGlmICh2aWV3KSB7XG4gICAgICBkZWxldGUgdmlldy5zY29wZTtcbiAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgZGVidWcoJ1ZpZXcgdW5ib3VuZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyI3VwZGF0ZVxuICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFVwZGF0ZSB0aGlzIGNvbnRyb2xsZXIncyB2aWV3IGRhdGEgd2l0aCB0aGUgb2JqZWN0IHByb3ZpZGVkLiAgRGF0YSBpc1xuICAgKiBtZXJnZWQgd2l0aCBleGlzdGluZyBkYXRhIGF0IHRoZSBjb250cm9sIGxldmVsLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBWaWV3IGRhdGFcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtkYXRhLmVycm9yTGV2ZWxdIE51bWVyaWMgZXJyb3JsZXZlbCBvZiB0aGlzIGNvbnRyb2xsZXInc1xuICAgKiBmb3JtXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbZGF0YS5tZXNzYWdlc10gTWVzc2FnZXMgZm9yIHRoaXMgY29udHJvbGxlcidzIGZvcm0sXG4gICAqIGtleWVkIG9uIGNvbnRyb2wgbmFtZSwgdGhlbiBvbiB0b2tlbiBuYW1lXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBtZXJnZWQgdmlldyBkYXRhXG4gICAqL1xuICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgdmFyIHZpZXdEYXRhID0gdGhpcy4kdmlld0RhdGE7XG4gICAgdmFyIGVycm9yTGV2ZWw7XG5cbiAgICBpZiAodmlld0RhdGEpIHtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGluZyB3aXRoIG5ldyBkYXRhOicsIHRoaXMuJG5hbWUsIGRhdGEpO1xuXG4gICAgICB0aGlzLiRlcnJvckxldmVsID1cbiAgICAgICAgZXJyb3JMZXZlbCA9XG4gICAgICAgICAgXy5pc051bWJlcihkYXRhLmVycm9yTGV2ZWwpID8gZGF0YS5lcnJvckxldmVsIDogdGhpcy4kZXJyb3JMZXZlbDtcblxuICAgICAgLy8gd2Ugb3ZlcndyaXRlIGRhdGEgaGVyZSwgYnV0IGRvbid0IHJlbW92ZSBlbnRpcmUgZm9ybXMuICBpZiBhXG4gICAgICAvLyBjb250cm9sIGlzIG5vdCBwcmVzZW50IGluIHRoZSBmb3JtIG1lc3NhZ2VzLCB0aGVuIHRoZSBmb3JtIGhhcyBjaGFuZ2VkXG4gICAgICAvLyBhbmQgd2UgY2FuIHNhZmVseSBkZWxldGUgdGhlIGNvbnRyb2wncyBpbmZvLlxuICAgICAgXy5lYWNoKGRhdGEubWVzc2FnZXMsIGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMsIGZvcm1OYW1lKSB7XG4gICAgICAgIGlmICh2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV0pIHtcbiAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzLCBmdW5jdGlvbiAoY29udHJvbE1lc3NhZ2VzLCBjb250cm9sTmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QoY29udHJvbE1lc3NhZ2VzKSkge1xuICAgICAgICAgICAgICBpZiAodmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSkge1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0sXG4gICAgICAgICAgICAgICAgICBjb250cm9sTWVzc2FnZXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0gPSBjb250cm9sTWVzc2FnZXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV1bY29udHJvbE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXSA9IGZvcm1NZXNzYWdlcztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3RGF0YS5lcnJvciA9ICEhZXJyb3JMZXZlbDtcbiAgICAgIHZpZXdEYXRhLmNsYXNzTmFtZSA9ICRlbnZveS5sZXZlbChlcnJvckxldmVsKTtcbiAgICAgIHZpZXdEYXRhLnRpdGxlID0gdGhpcy50aXRsZShlcnJvckxldmVsKTtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGVkOyB2aWV3IGRhdGE6JywgdGhpcy4kbmFtZSwgdmlld0RhdGEpO1xuXG4gICAgICByZXR1cm4gdmlld0RhdGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXIjYWRkQ2hpbGRcbiAgICogQG1ldGhvZE9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyXG4gICAqIEBwYXJhbSB7ZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ9IGNoaWxkIENoaWxkXG4gICAqICAgICBjb250cm9sbGVyXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBBZGRzIGEgY2hpbGQgRW52b3lNZXNzYWdlc0NvbnRyb2xsZXIgdG8gdGhpcyBFbnZveU1lc3NhZ2VzQ29udHJvbGxlci5cbiAgICogQHJldHVybnMge2Z2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyfSBUaGlzIGNvbnRyb2xsZXJcbiAgICovXG4gIHRoaXMuYWRkQ2hpbGQgPSBmdW5jdGlvbiBhZGRDaGlsZChjaGlsZCkge1xuICAgIGRlYnVnKCdBZGRpbmcgY2hpbGQgXCIlc1wiIHRvIFwiJXNcIicsIGNoaWxkLiRuYW1lLCB0aGlzLiRuYW1lKTtcbiAgICB0aGlzLiRjaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICBjaGlsZC4kcGFyZW50ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyI3JlbW92ZUNoaWxkXG4gICAqIEBtZXRob2RPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgKiBAcGFyYW0ge2Z2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyfSBjaGlsZCBDaGlsZFxuICAgKiAgICAgY29udHJvbGxlclxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVtb3ZlcyBhIGNoaWxkIEVudm95TWVzc2FnZXNDb250cm9sbGVyIGZyb20gdGhpcyBFbnZveU1lc3NhZ2VzQ29udHJvbGxlci5cbiAgICogQHJldHVybnMge2Z2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyfSBUaGlzIGNvbnRyb2xsZXJcbiAgICovXG4gIHRoaXMucmVtb3ZlQ2hpbGQgPSBmdW5jdGlvbiByZW1vdmVDaGlsZChjaGlsZCkge1xuICAgIGRlYnVnKCdSZW1vdmluZyBjaGlsZCBcIiVzXCIgZnJvbSBcIiVzXCInLCBjaGlsZC4kbmFtZSwgdGhpcy4kbmFtZSk7XG4gICAgdGhpcy4kY2hpbGRyZW4uc3BsaWNlKHRoaXMuJGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxKTtcbiAgICBkZWxldGUgY2hpbGQuJHBhcmVudDtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyI3RpdGxlXG4gICAqIEBtZXRob2RPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmV0cmlldmVzIGFuIGVycm9yTGV2ZWwncyB0aXRsZS5cbiAgICogQHNlZSB7QGxpbmsgZnYuZW52b3kuJGVudm95I2xldmVsRGVzY3JpcHRpb259XG4gICAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBlcnJvckxldmVsIGVycm9yTGV2ZWxcbiAgICovXG4gIHRoaXMudGl0bGUgPSBmdW5jdGlvbiB0aXRsZShlcnJvckxldmVsKSB7XG4gICAgcmV0dXJuICRlbnZveS5sZXZlbERlc2NyaXB0aW9uKGVycm9yTGV2ZWwpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXIjdGl0bGVcbiAgICogQG1ldGhvZE9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBNb3N0bHkgZm9yIGRlYnVnZ2luZyBwdXJwb3NlczsgcmV0dXJucyB0aGlzIGNvbnRyb2xsZXIncyBmb3JtJ3MgbmFtZS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhpcyBmb3JtJ3MgbmFtZVxuICAgKi9cbiAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLiRuYW1lO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAdGhpcyBFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgKi9cbiAgKGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdmFyIGZvcm07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlciMkY2hpbGRyZW5cbiAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgICAqIEB0eXBlIHtBcnJheS48ZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIEFycmF5IG9mIGNoaWxkIEVudm95TWVzc2FnZXNDb250cm9sbGVycywgaWYgYW55LlxuICAgICAqL1xuICAgIHRoaXMuJGNoaWxkcmVuID0gW107XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlciMkcGFyZW50XG4gICAgICogQHByb3BlcnR5T2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICAgKiBAdHlwZSB7P0FycmF5Ljxmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlcj59XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogUGFyZW50IEVudm95TWVzc2FnZXNDb250cm9sbGVycywgaWYgYW55LlxuICAgICAqL1xuICAgIHRoaXMuJHBhcmVudCA9IG51bGw7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAgICogQG5hbWUgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXIjJGNoaWxkcmVuXG4gICAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogTnVtZXJpYyBlcnJvckxldmVsIG9mIHRoaXMgY29udHJvbGxlcidzIGZvcm0uXG4gICAgICAgKi9cbiAgICAgICRlcnJvckxldmVsOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0RXJyb3JMZXZlbCgpIHtcbiAgICAgICAgICByZXR1cm4gZm9ybS4kZXJyb3JMZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXRFcnJvckxldmVsKHZhbHVlKSB7XG4gICAgICAgICAgZm9ybS4kZXJyb3JMZXZlbCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyIyRuYW1lXG4gICAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogVGhpcyBjb250cm9sbGVyJ3MgZm9ybSdzIG5hbWUuXG4gICAgICAgKi9cbiAgICAgICRuYW1lOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0TmFtZSgpIHtcbiAgICAgICAgICByZXR1cm4gZm9ybS4kbmFtZTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyIyR2aWV3RGF0YVxuICAgICAgICogQHByb3BlcnR5T2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFRoaXMgY29udHJvbGxlcidzIHZpZXcgZGF0YS4gIE9ubHkgcHJlc2VudCBpZiBhbiBgZW52b3lMaXN0YCBkaXJlY3RpdmVcbiAgICAgICAqIGhhcyBiZWVuIGJvdW5kIHZpYSBgYmluZFZpZXcoKWAuXG4gICAgICAgKi9cbiAgICAgICR2aWV3RGF0YToge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldFZpZXdEYXRhKCkge1xuICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgIGlmICgoZGF0YSA9IF8uZ2V0KHZpZXcsICdzY29wZS4kZW52b3lEYXRhJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZpZXcuc2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiAodmlldy5zY29wZS4kZW52b3lEYXRhID0gdmlld0RhdGEoJGVudm95LkRFRkFVTFRfTEVWRUwpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0Vmlld0RhdGEoZGF0YSkge1xuICAgICAgICAgIHZpZXcuc2NvcGUuJGVudm95RGF0YSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyIyRmb3JtXG4gICAgICogQHByb3BlcnR5T2YgZnYuZW52b3kuY29udHJvbGxlcnM6RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICAgKiBAdHlwZSB7RW52b3lGb3JtQ29udHJvbGxlcn1cbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGlzIGNvbnRyb2xsZXIncyBmb3JtLlxuICAgICAqL1xuICAgIGZvcm0gPSB0aGlzLiRmb3JtID0gJGVsZW1lbnQuY29udHJvbGxlcignZm9ybScpO1xuXG4gICAgdGhpcy4kZXJyb3JMZXZlbCA9ICRlbnZveS5ERUZBVUxUX0VSUk9STEVWRUw7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveU1lc3NhZ2VzQ29udHJvbGxlciMkdmlld1xuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95TWVzc2FnZXNDb250cm9sbGVyXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBHZW5lcmljIG9iamVjdCBob3VzaW5nIHRoZSBTY29wZSBvZiB0aGUgYm91bmQgYGVudm95TGlzdGAgZGlyZWN0aXZlLFxuICAgICAqIGlmIGFueS5cbiAgICAgKi9cbiAgICB2aWV3ID1cbiAgICAgIHRoaXMuJHBhcmVudCA/ICh0aGlzLiR2aWV3ID0gdGhpcy4kcGFyZW50LiR2aWV3KSA6ICh0aGlzLiR2aWV3ID0ge30pO1xuXG4gICAgLy8gd2hlbiB3ZSBkZXN0cm95LCB1bmJpbmQgdGhpcyBmb3JtLCBiZWNhdXNlIGl0IHdpbGwgbm90IGJlIHVwZGF0ZWRcbiAgICAvLyBmdXJ0aGVyIChvciB1bnRpbCBpdCByZXR1cm5zKS5cbiAgICAvLyAoYCRlbnZveS5iaW5kRm9ybSgpYCByZXR1cm5zIGEgZnVuY3Rpb24gd2hpY2ggdW5iaW5kcylcbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICRlbnZveS5iaW5kRm9ybSh0aGlzLCB0aGlzLiRuYW1lKSk7XG5cbiAgfS5jYWxsKHRoaXMpKTtcbn1cblxuRW52b3lNZXNzYWdlc0NvbnRyb2xsZXIuJGluamVjdCA9IFtcbiAgJyRlbGVtZW50JyxcbiAgJyRlbnZveScsXG4gICckc2NvcGUnXG5dO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVudm95TWVzc2FnZXNDb250cm9sbGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIElEX1BSRUZJWCA9ICdlbnZveS12aWV3ZGF0YS0nO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlczp2aWV3ZGF0YScpO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogQ3JlYXRlcyBhIHZpZXcgZGF0YSBvYmplY3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdExldmVsIFRoZSBsZXZlbCBhdCB3aGljaCBvYmplY3Qgc2hvdWxkIHN0YXJ0IGF0LlxuICogQHJldHVybnMge3tyZXNldDogRnVuY3Rpb24sIGlkOiAqfX1cbiAqL1xuZnVuY3Rpb24gdmlld0RhdGEoZGVmYXVsdExldmVsKSB7XG4gIHZhciBkYXRhID0ge1xuICAgIC8qKlxuICAgICAqIFJlc2V0cyB0aGlzIG9iamVjdC5cbiAgICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAvKipcbiAgICAgICAqIFdoZXRoZXIgb3Igbm90IHRoaXMgc2hvdWxkIGRpc3BsYXlcbiAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICovXG4gICAgICB0aGlzLmVycm9yID0gZmFsc2U7XG5cbiAgICAgIC8qKlxuICAgICAgICogRm9ybSBNZXNzYWdlc1xuICAgICAgICogQHR5cGUge3t9fVxuICAgICAgICovXG4gICAgICB0aGlzLm1lc3NhZ2VzID0ge307XG5cbiAgICAgIC8qKlxuICAgICAgICogRGVzY3JpcHRpb25cbiAgICAgICAqIEB0eXBlIHs/c3RyaW5nfVxuICAgICAgICovXG4gICAgICB0aGlzLnRpdGxlID0gbnVsbDtcblxuICAgICAgLyoqXG4gICAgICAgKiBDbGFzcyBuYW1lIChDU1MpIHRvIGFwcGx5XG4gICAgICAgKiBAdHlwZSB7P3N0cmluZ31cbiAgICAgICAqL1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBudWxsO1xuXG4gICAgICAvKipcbiAgICAgICAqIEFuIGVycm9ybGV2ZWxcbiAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgKi9cbiAgICAgIHRoaXMuZXJyb3JMZXZlbCA9IGRlZmF1bHRMZXZlbDtcbiAgICB9LFxuICAgIGlkOiBfLnVuaXF1ZUlkKElEX1BSRUZJWClcbiAgfTtcbiAgZGF0YS5yZXNldCgpO1xuICBkZWJ1ZygnQ3JlYXRlZCB2aWV3ZGF0YSBvYmplY3Qgd2l0aCBpZCBcIiVzXCInLCBkYXRhLmlkKTtcbiAgcmV0dXJuIGRhdGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdmlld0RhdGE7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5fIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5fIDogbnVsbCk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlOmVudm95UHJveHlcbiAqIEByZXN0cmljdCBBXG4gKiBAZGVzY3JpcHRpb25cbiAqIERlZmluZXMgYSBkaXJlY3RpdmUgd2hpY2gsIHdoZW4gdXNlZCB3aXRoIG5nTW9kZWwsIHdpbGwgc2V0IHRoZSB2YWxpZGl0eVxuICogb2YgdGhlIGFzc29jaWF0ZWQgTmdNb2RlbENvbnRyb2xsZXIsIGJhc2VkIG9uIHRoZSB2YWxpZGl0eSBvZiB0aGUgdGFyZ2V0XG4gKiBmb3JtLlxuICovXG5mdW5jdGlvbiBwcm94eSgpIHtcblxuICAvKipcbiAgICogQW55dGhpbmcgdGhhdCBuZWVkcyB2YWxpZGF0aW5nIG5lZWRzIGEgdG9rZW4sIHNvLCBoZXJlJ3Mgb25lLlxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgdmFyIFRPS0VOID0gJ3Byb3h5JztcblxuICAvKipcbiAgICogVGhlIGNsYXNzIHRvIGJlIGFwcGxpZWQgaWYgdGhlIGRpcmVjdGl2ZSdzIHZhbHVlIGlzIHByZXNlbnRcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHZhciBDTEFTU05BTUUgPSAnZXJyb3JsZXZlbCc7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICBjb250cm9sbGVyOiBbXG4gICAgICAnJHNjb3BlJyxcbiAgICAgICckZWxlbWVudCcsXG4gICAgICAnJGF0dHJzJyxcbiAgICAgICckZW52b3knLFxuICAgICAgJyRpbnRlcnBvbGF0ZScsXG4gICAgICAnJGFuaW1hdGUnLFxuICAgICAgZnVuY3Rpb24gUHJveHlDb250cm9sbGVyKCRzY29wZSxcbiAgICAgICAgJGVsZW1lbnQsXG4gICAgICAgICRhdHRycyxcbiAgICAgICAgJGVudm95LFxuICAgICAgICAkaW50ZXJwb2xhdGUsXG4gICAgICAgICRhbmltYXRlKSB7XG5cbiAgICAgICAgdmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczpwcm94eTpjb250cm9sbGVyJyk7XG4gICAgICAgIHZhciB0YXJnZXQgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLmVudm95UHJveHkgfHwgJycpKCRzY29wZSk7XG4gICAgICAgIHZhciBuZ01vZGVsID0gJGVsZW1lbnQuY29udHJvbGxlcignbmdNb2RlbCcpO1xuXG4gICAgICAgICRhbmltYXRlID0gJGFuaW1hdGUgfHwgJGVsZW1lbnQ7XG5cbiAgICAgICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgICAgICAgIHZhciBpc1ZhbGlkID0gIWRhdGEuZXJyb3JMZXZlbDtcbiAgICAgICAgICB2YXIgZXJyb3JMZXZlbE5hbWUgPSAkZW52b3kubGV2ZWwoZGF0YS5lcnJvckxldmVsKTtcbiAgICAgICAgICBkZWJ1ZygnUHJveHkgXCIlc1wiIHVwZGF0ZWQgdy8gZXJyb3JMZXZlbCAlcycsIHRhcmdldCwgZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIF8uZWFjaCgkZW52b3kuRVJST1JMRVZFTFMsIGZ1bmN0aW9uIChlcnJvcmxldmVsLCBlcnJvckxldmVsTmFtZSkge1xuICAgICAgICAgICAgJGFuaW1hdGUucmVtb3ZlQ2xhc3MoJGVsZW1lbnQsIGVycm9yTGV2ZWxOYW1lKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBuZ01vZGVsLiRzZXRWYWxpZGl0eShUT0tFTiwgaXNWYWxpZCk7XG4gICAgICAgICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgICAgICAkYW5pbWF0ZS5hZGRDbGFzcygkZWxlbWVudCwgZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuJG5hbWUgKyAnLXByb3h5JztcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLiRuYW1lID0gdGFyZ2V0O1xuXG4gICAgICAgIGlmICh0YXJnZXQpIHtcbiAgICAgICAgICAkZWxlbWVudC5hZGRDbGFzcyhDTEFTU05BTUUpO1xuICAgICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgJGVudm95LmJpbmRGb3JtKHRoaXMsIHRhcmdldCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZW52b3lQcm94eSBkaXJlY3RpdmUgbmVlZHMgYSB2YWx1ZSEnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF1cbiAgfTtcbn1cbm1vZHVsZS5leHBvcnRzID0gcHJveHk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xudmFyIG9wdHMgPSByZXF1aXJlKCcuL29wdHMnKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6JGVudm95OmZhY3RvcnknKTtcblxudmFyIERFQk9VTkNFX01TID0gMjUwO1xuXG5mdW5jdGlvbiBlbnZveUZhY3RvcnkoJGh0dHAsICRxKSB7XG5cbiAgLyoqXG4gICAqIEVycm9yIGxldmVscyBhcyBjb25maWd1cmVkIGluIG9wdHMgaW4gb3JkZXIsIGJ5IG5hbWVcbiAgICogQHR5cGUge0FycmF5LjxzdHJpbmc+fVxuICAgKi9cbiAgdmFyIExFVkVMX0FSUkFZID0gXy5wbHVjayhvcHRzLmxldmVscywgJ25hbWUnKTtcblxuICAvKipcbiAgICogTWFwcGluZyBvZiBlcnJvciBsZXZlbCBuYW1lcyB0byBpbmRpY2VzIGluIHtAbGluayBMRVZFTF9BUlJBWX1cbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XG4gICAqL1xuICB2YXIgTEVWRUxTID0gXyhMRVZFTF9BUlJBWSlcbiAgICAuaW52ZXJ0KClcbiAgICAubWFwVmFsdWVzKF8ucGFyc2VJbnQpXG4gICAgLnZhbHVlKCk7XG5cbiAgLyoqXG4gICAqIExvb2t1cCBvZiBmb3JtcyBhbmQgY29udHJvbHMgdG8gYW55IGFjdGlvbnMgYm91bmQgdmlhIHRoZVxuICAgKiBtZXNzYWdlQWN0aW9uIGRpcmVjdGl2ZS4gIEFuIGFjdGlvbiBpcyBzaW1wbHkgYW4gQW5ndWxhckpTXG4gICAqIGV4cHJlc3Npb24gd2hpY2ggd2lsbCBiZSBldmFsdWF0ZWQuXG4gICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxPYmplY3QuPHN0cmluZyxzdHJpbmc+Pn1cbiAgICovXG4gIHZhciBhY3Rpb25zID0ge307XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBmb3JtIG5hbWUgdG8gRW52b3lNZXNzYWdlc0NvbnRyb2xsZXIgYmluZGluZ3NcbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLEVudm95TWVzc2FnZXNDb250cm9sbGVyPn1cbiAgICovXG4gIHZhciBiaW5kaW5ncyA9IHt9O1xuXG4gIHZhciBwcm90b3R5cGU7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBzZXJ2aWNlXG4gICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveVxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmV0cmlldmVzIGEgY29sbGVjdGlvbiBvZiBtZXNzYWdlcyBmb3IgYSBmb3JtIGFuZC9vciBjb250cm9sXG4gICAqIHdpdGhpbiB0aGF0IGZvcm0uICBJZiBubyBwYXJhbWV0ZXJzLCByZXR1cm5zIHRoZSBlbnRpcmV0eSBvZiB0aGVcbiAgICogZGF0YSBmaWxlLlxuICAgKiBAcGFyYW0ge0Zvcm1Db250cm9sbGVyfSBmb3JtIEZvcm0gY29udHJvbGxlclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBNZXNzYWdlcyBpbmRleGVkIGJ5IGZvcm0gbmFtZSwgdGhlbiBjb250cm9sIG5hbWUsXG4gICAqIGFuZCBmaW5hbGx5IHZhbGlkYXRpb24gdG9rZW4uICBNYXkgYmUgZW1wdHkgaWYgbm90aGluZyBpcyB3cm9uZ1xuICAgKiB3aXRoIHRoZSBmb3JtLlxuICAgKi9cbiAgZnVuY3Rpb24gJGVudm95KGZvcm0pIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmICghZm9ybSkge1xuICAgICAgcmV0dXJuICRxLnJlamVjdChuZXcgRXJyb3IoJ011c3QgcGFzcyBcImZvcm1cIiBwYXJhbWV0ZXInKSk7XG4gICAgfVxuICAgIGlmICgocmVzdWx0ID0gJGVudm95Ll9jYWNoZVtmb3JtLiRuYW1lXSkpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKHJlc3VsdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChmdW5jdGlvbiAob3B0cykge1xuICAgICAgaWYgKG9wdHMubWVzc2FnZXNDb25maWcpIHtcbiAgICAgICAgcmV0dXJuICRxLndoZW4ob3B0cy5tZXNzYWdlc0NvbmZpZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KG9wdHMubWVzc2FnZXNDb25maWdVcmwsIHtcbiAgICAgICAgY2FjaGU6IHRydWVcbiAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH0ob3B0cykpXG4gICAgICAudGhlbihmdW5jdGlvbiAobWVzc2FnZXMpIHtcblxuICAgICAgICAvLyBJZiB0aGUgZm9ybSBoYXMgYW4gYWxpYXMgKHVzZSB0aGUgXCJhbGlhc1wiIGRpcmVjdGl2ZSksXG4gICAgICAgIC8vIHRoaXMgbmFtZSB0YWtlcyBwcmVjZWRlbmNlLlxuICAgICAgICBtZXNzYWdlcyA9IF8obWVzc2FnZXNbZm9ybS4kYWxpYXMgfHwgZm9ybS4kbmFtZV0pXG4gICAgICAgICAgLy8gaGVyZSB3ZSBwaWNrIG9ubHkgdGhlIGNvbnRyb2xzIHRoYXQgYXJlIGludmFsaWQuXG4gICAgICAgICAgLm1hcFZhbHVlcyhmdW5jdGlvbiAoY29udHJvbE1zZ09wdGlvbnMsIGNvbnRyb2xNc2dOYW1lKSB7XG4gICAgICAgICAgICB2YXIgZm9ybUNvbnRyb2wgPSBmb3JtW2NvbnRyb2xNc2dOYW1lXTtcbiAgICAgICAgICAgIHZhciAkZXJyb3I7XG4gICAgICAgICAgICAvLyBpZiB0aGlzIGlzIHRydXRoeSwgdGhlbiB3ZSBoYXZlIGVycm9ycyBpbiB0aGUgZ2l2ZW5cbiAgICAgICAgICAgIC8vIGNvbnRyb2xcbiAgICAgICAgICAgIGlmIChmb3JtQ29udHJvbCAmJiBfLnNpemUoJGVycm9yID0gZm9ybUNvbnRyb2wuJGVycm9yKSkge1xuICAgICAgICAgICAgICAvLyBnZXQgdGhlIHByb2JsZW0gdG9rZW5zIGFuZCBncmFiIGFueSBhY3Rpb25zXG4gICAgICAgICAgICAgIC8vIGlmIHByZXNlbnQuICBhY3Rpb25zIGFyZSBhc3NpZ25lZCBhdCB0aGUgdG9rZW5cbiAgICAgICAgICAgICAgLy8gbGV2ZWwsIGJ1dCB3ZSBkb24ndCBoYXZlIGdyYW51bGFyIGNvbnRyb2wgb3ZlclxuICAgICAgICAgICAgICAvLyB3aGljaCB2YWxpZGF0aW9uIHRva2VuIHRyaWdnZXJzIHdoaWNoIGFjdGlvbi5cbiAgICAgICAgICAgICAgLy8gc28sIGlmIHRoZXJlIHdlcmUgdHdvIHByb2JsZW1zIHdpdGggb25lIGNvbnRyb2wsXG4gICAgICAgICAgICAgIC8vIGJvdGggdG9rZW5zIHdvdWxkIHJlY2VpdmUgdGhlIGFjdGlvbiBwcm9wLlxuICAgICAgICAgICAgICAvLyBUT0RPOiBkZXRlcm1pbmUgaWYgd2Ugd2FudC9uZWVkIHRvIGhhdmUgYWN0aW9ucyBwZXJcbiAgICAgICAgICAgICAgLy8gdmFsaWRhdGlvbiB0b2tlbi5cbiAgICAgICAgICAgICAgcmV0dXJuIF8oY29udHJvbE1zZ09wdGlvbnMpXG4gICAgICAgICAgICAgICAgLnBpY2soXy5rZXlzKCRlcnJvcikpXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHRva2VuSW5mbykge1xuICAgICAgICAgICAgICAgICAgdG9rZW5JbmZvLmFjdGlvbiA9XG4gICAgICAgICAgICAgICAgICAgICRlbnZveS5nZXRBY3Rpb24oZm9ybS4kbmFtZSwgY29udHJvbE1zZ05hbWUpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnZhbHVlKCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgIC52YWx1ZSgpO1xuXG4gICAgICAgICRlbnZveS5fY2FjaGVbZm9ybS4kbmFtZV0gPSBtZXNzYWdlcztcblxuICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNaXhpbnMgZm9yIHRoaXMgZmFjdG9yeVxuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKEZ1bmN0aW9ufCopPn1cbiAgICovXG4gIHByb3RvdHlwZSA9IHtcblxuICAgIC8qKlxuICAgICAqIENhY2hlIG9mIG1lc3NhZ2VzLCBrZXllZCBvbiBmb3JtIG5hbWVcbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsT2JqZWN0Pn1cbiAgICAgKi9cbiAgICBfY2FjaGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I2xldmVsXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gY29udmVydCBhbiBlcnJvciBsZXZlbCBpbnRvIGEgbnVtYmVyIG9yXG4gICAgICogc3RyaW5nIG9yIHZpY2UgdmVyc2FcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8c3RyaW5nKT19IGVycm9yTGV2ZWwgRXJyb3IgbGV2ZWwuICBJZiBvbWl0dGVkLCB3aWxsXG4gICAgICogcmV0dXJuIHRoZSBkZWZhdWx0IGVycm9yIGxldmVsIGFzIGEgc3RyaW5nLlxuICAgICAqIEByZXR1cm5zIHsobnVtYmVyfHN0cmluZyl9IENvcnJlc3BvbmRpbmcgc3RyaW5nL251bWJlclxuICAgICAqL1xuICAgIGxldmVsOiBmdW5jdGlvbiBsZXZlbChlcnJvckxldmVsKSB7XG4gICAgICByZXR1cm4gXy5pc1N0cmluZyhlcnJvckxldmVsKSA/XG4gICAgICBMRVZFTFNbZXJyb3JMZXZlbF0gfHwgTEVWRUxTW29wdHMuZGVmYXVsdExldmVsXSA6XG4gICAgICBMRVZFTF9BUlJBWVtlcnJvckxldmVsXSB8fCBvcHRzLmRlZmF1bHRMZXZlbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBmb3JtIGFuZCBtZXNzYWdlcyBmb3IgaXQsIGFzIHJldHVybmVkIGJ5ICRlbnZveSgpLFxuICAgICAqIGNhbGN1bGF0ZSB0aGUgbWF4IGVycm9yIGxldmVsLlxuICAgICAqIEBwYXJhbSBmb3JtXG4gICAgICogQHBhcmFtIGZvcm1NZXNzYWdlc1xuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZm9ybUVycm9yTGV2ZWw6IGZ1bmN0aW9uIF9mb3JtRXJyb3JMZXZlbChmb3JtLCBmb3JtTWVzc2FnZXMpIHtcbiAgICAgIC8qKlxuICAgICAgICogSW5kZXggb2YgdGhlIGRlZmF1bHQgZXJyb3IgbGV2ZWxcbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKi9cbiAgICAgIHZhciBkZWZhdWx0TGV2ZWxOdW0gPSAkZW52b3kuREVGQVVMVF9FUlJPUkxFVkVMO1xuXG4gICAgICAvKipcbiAgICAgICAqIE1heGltdW0gZXJyb3IgbGV2ZWwgb2YgYWxsIHZhbGlkYXRpb24gdG9rZW5zIHdpdGhpbiBhbGxcbiAgICAgICAqIGNvbnRyb2xzIG9mIHRoaXMgZm9ybVxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqL1xuICAgICAgdmFyIG1heExldmVsID0gXy5yZWR1Y2UoZm9ybU1lc3NhZ2VzLFxuICAgICAgICBmdW5jdGlvbiAocmVzdWx0LCBjb250cm9sTXNnT3B0cykge1xuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogTWF4aW11bSBlcnJvciBsZXZlbCBvZiBhbnkgdmFsaWRhdGlvbiB0b2tlbiB3aXRoaW5cbiAgICAgICAgICAgKiB0aGUgY29udHJvbCB3aGljaCBpcyBpbiBcImludmFsaWRcIiBzdGF0ZS5cbiAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAqL1xuICAgICAgICAgIHZhciBtYXhDb250cm9sTGV2ZWwgPSBfKGNvbnRyb2xNc2dPcHRzKVxuICAgICAgICAgICAgLnBpY2soZnVuY3Rpb24gKHRva2VuT3B0cywgdG9rZW5OYW1lKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmb3JtLiRlcnJvclt0b2tlbk5hbWVdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5wbHVjaygnbGV2ZWwnKVxuICAgICAgICAgICAgLm1hcCgkZW52b3kubGV2ZWwpXG4gICAgICAgICAgICAubWF4KCk7XG5cbiAgICAgICAgICByZXR1cm4gTWF0aC5tYXgocmVzdWx0LCBtYXhDb250cm9sTGV2ZWwpO1xuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0TGV2ZWxOdW0pO1xuXG4gICAgICB2YXIgZXJyb3JMZXZlbE5hbWUgPSAkZW52b3kubGV2ZWwobWF4TGV2ZWwpO1xuICAgICAgZGVidWcoJ0NvbXB1dGVkIGVycm9yTGV2ZWwgXCIlc1wiIGZvciBmb3JtIFwiJXNcIicsXG4gICAgICAgIGVycm9yTGV2ZWxOYW1lLFxuICAgICAgICBmb3JtLiRuYW1lKTtcbiAgICAgIHJldHVybiBtYXhMZXZlbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcGxhY2Vob2xkZXIgZm9yIHByb21pc2Ugd2hpbGUgd2UncmUgcnVubmluZyByZWZyZXNoKClcbiAgICAgKi9cbiAgICBfcmVmcmVzaGluZzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNiaW5kRm9ybVxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBCaW5kIGEgY29udHJvbGxlciB0byBhIGZvcm0uICBDb3VsZCBiZSBhbnkgb2JqZWN0IGFzIGxvbmcgYXMgaXQgaGFzIGFuXG4gICAgICogYHVwZGF0ZSgpYCBtZXRob2QuICBXaGVuIHRoZSBmb3JtJ3MgdmFsaWRpdHkgY2hhbmdlcywgdGhlIHVwZGF0ZSgpXG4gICAgICogbWV0aG9kIHdpbGwgYmUgY2FsbGVkLCBpZiB0aGUgZm9ybSBoYXMgbWVzc2FnZXMgY29uZmlndXJlZC5cbiAgICAgKiBAcGFyYW0geyp9IGN0cmwgUHJlc3VtZWQgdG8gYmUgYSBgZW52b3lNZXNzYWdlc2AgY29udHJvbGxlciBpbnN0YW5jZSwgYnV0XG4gICAgICogY291bGQgYmUgYGVudm95UHJveHlgIGNvbnRyb2xsZXIgaW5zdGFuY2UgYXMgd2VsbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgTmFtZSBvZiBmb3JtXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBBIGZ1bmN0aW9uIHRoYXQgd2lsbCBicmVhayB0aGUgYmluZGluZ1xuICAgICAqL1xuICAgIGJpbmRGb3JtOiBmdW5jdGlvbiBiaW5kRm9ybShjdHJsLCBmb3JtTmFtZSkge1xuXG4gICAgICB2YXIgZm9ybUJpbmRpbmdzID0gYmluZGluZ3NbZm9ybU5hbWVdID0gYmluZGluZ3NbZm9ybU5hbWVdIHx8IHt9O1xuICAgICAgdmFyIGlkID0gXy51bmlxdWVJZCgnZW52b3ktYmluZGluZy0nKTtcblxuICAgICAgZm9ybUJpbmRpbmdzW2lkXSA9IGN0cmw7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbiB1bmJpbmRGb3JtKCkge1xuICAgICAgICBkZWxldGUgZm9ybUJpbmRpbmdzW2lkXTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvciBhIEVudm95TWVzc2FnZXNDb250cm9sbGVyLCBmaW5kIHBhcmVudHMgKHJlY3Vyc2l2ZWx5KS5cbiAgICAgKiBAcGFyYW0ge0Vudm95TWVzc2FnZXNDb250cm9sbGVyfSBjdHJsIGVudm95TWVzc2FnZSBDb250cm9sbGVyXG4gICAgICogQHBhcmFtIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBbbGlzdD1bXV0gQXJyYXkgb2YgcGFyZW50c1xuICAgICAqIEByZXR1cm5zIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBBcnJheSBvZiBwYXJlbnRzXG4gICAgICovXG4gICAgX2ZpbmRQYXJlbnRzOiBmdW5jdGlvbiBmaW5kUGFyZW50cyhjdHJsLCBsaXN0KSB7XG4gICAgICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgICAgIGlmIChjdHJsLiRwYXJlbnQpIHtcbiAgICAgICAgbGlzdC5wdXNoKGN0cmwuJHBhcmVudCk7XG4gICAgICAgIHJldHVybiBmaW5kUGFyZW50cyhjdHJsLiRwYXJlbnQsIGxpc3QpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvciBhIEVudm95TWVzc2FnZXNDb250cm9sbGVyLCBmaW5kIGFsbCBjaGlsZHJlbiAocmVjdXJzaXZlbHkpLlxuICAgICAqIEBwYXJhbSB7RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ9IGN0cmwgZW52b3lNZXNzYWdlIENvbnRyb2xsZXJcbiAgICAgKiBAcGFyYW0ge0FycmF5LjxFbnZveU1lc3NhZ2VzQ29udHJvbGxlcj59IFtsaXN0PVtdXSBBcnJheSBvZiBjaGlsZHJlblxuICAgICAqIEByZXR1cm5zIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fSBBcnJheSBvZiBjaGlsZHJlblxuICAgICAqL1xuICAgIF9maW5kQ2hpbGRyZW46IGZ1bmN0aW9uIGZpbmRDaGlsZHJlbihjdHJsLCBsaXN0KSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBjdHJsLiRjaGlsZHJlbjtcbiAgICAgIGxpc3QgPSBsaXN0IHx8IFtdO1xuICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBsaXN0LnB1c2guYXBwbHkobGlzdCwgY2hpbGRyZW4pO1xuICAgICAgICByZXR1cm4gXyhjaGlsZHJlbilcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbmRDaGlsZHJlbihjaGlsZCwgbGlzdCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgLnVuaXF1ZSgpXG4gICAgICAgICAgLnZhbHVlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGlzdDtcbiAgICB9LFxuXG4gICAgX3JlZnJlc2g6IF8uZGVib3VuY2UoZnVuY3Rpb24gX3JlZnJlc2goZm9ybSwgY29udHJvbCkge1xuXG4gICAgICAvKipcbiAgICAgICAqIEFsbCBjb250cm9sbGVycyB0aGF0IGNhcmUgYWJvdXQgdGhpcyBmb3JtLCBiZSBpdCBlbnZveU1lc3NhZ2VcbiAgICAgICAqIGNvbnRyb2xsZXJzLCBvciBlbnZveVByb3h5IGNvbnRyb2xsZXJzLlxuICAgICAgICogQHR5cGUge0FycmF5LjwoRW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ8UHJveHlDb250cm9sbGVyKT59XG4gICAgICAgKi9cbiAgICAgIHZhciBib3VuZENvbnRyb2xsZXJzID0gXy50b0FycmF5KGJpbmRpbmdzW2Zvcm0uJG5hbWVdKTtcblxuICAgICAgLyoqXG4gICAgICAgKiBUaG9zZSBvZiB0aGUgYm91bmQgY29udHJvbHMgd2hpY2ggYXJlIGVudm95TWVzc2FnZSBjb250cm9sbGVycy5cbiAgICAgICAqIFRoZXNlIGhhdmUgYWN0dWFsIGZvcm0gb2JqZWN0cyB3aXRoaW4gdGhlbSwgc28gd2UnbGwgdXNlIHRoZW1cbiAgICAgICAqIHRvIGRldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgZXJyb3JsZXZlbChzKS5cbiAgICAgICAqIEB0eXBlIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgICAgICovXG4gICAgICB2YXIgRW52b3lNZXNzYWdlc0NvbnRyb2xsZXJzO1xuXG4gICAgICAvKipcbiAgICAgICAqIEFsbCBwYXJlbnQgY29udHJvbGxlcnMgb2YgdGhlIEVudm95TWVzc2FnZXNDb250cm9sbGVycy5cbiAgICAgICAqIEB0eXBlIHtBcnJheS48RW52b3lNZXNzYWdlc0NvbnRyb2xsZXI+fVxuICAgICAgICovXG4gICAgICB2YXIgcGFyZW50Q29udHJvbGxlcnM7XG5cbiAgICAgIGlmICghYm91bmRDb250cm9sbGVycy5sZW5ndGgpIHtcbiAgICAgICAgLy8gbm9ib2R5IGNhcmVzLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIEVudm95TWVzc2FnZXNDb250cm9sbGVycyA9IF8uZmlsdGVyKGJvdW5kQ29udHJvbGxlcnMsIGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgIHJldHVybiBjdHJsLiRmb3JtO1xuICAgICAgfSk7XG5cbiAgICAgIHBhcmVudENvbnRyb2xsZXJzID0gXyhFbnZveU1lc3NhZ2VzQ29udHJvbGxlcnMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgcmV0dXJuICRlbnZveS5fZmluZFBhcmVudHMoY2hpbGQpO1xuICAgICAgICB9KVxuICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgIC51bmlxdWUoKVxuICAgICAgICAudmFsdWUoKTtcblxuICAgICAgJGVudm95Ll9yZWZyZXNoaW5nID0gJGVudm95KGZvcm0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMpIHtcbiAgICAgICAgICB2YXIgbGFzdEVycm9yTGV2ZWwgPSAkZW52b3kuX2Zvcm1FcnJvckxldmVsKGZvcm0sXG4gICAgICAgICAgICBmb3JtTWVzc2FnZXMpO1xuICAgICAgICAgIHZhciBtZXNzYWdlcyA9IF8ub2JqZWN0KFtmb3JtLiRuYW1lXSwgW2Zvcm1NZXNzYWdlc10pO1xuICAgICAgICAgIHZhciBpbmNyZWFzaW5nO1xuXG4gICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKGN0cmwpIHtcbiAgICAgICAgICAgIGN0cmwudXBkYXRlKHtcbiAgICAgICAgICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgICAgICAgICBlcnJvckxldmVsOiBsYXN0RXJyb3JMZXZlbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZvcm0uJGVycm9yTGV2ZWwgPCBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgaW5jcmVhc2luZyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChmb3JtLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgIGluY3JlYXNpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF8uZWFjaChmb3JtTWVzc2FnZXNbY29udHJvbC4kbmFtZV0sIGZ1bmN0aW9uICh0b2tlbkluZm8pIHtcbiAgICAgICAgICAgIHRva2VuSW5mby5hY3Rpb24gPSAkZW52b3kuZ2V0QWN0aW9uKGZvcm0uJG5hbWUsIGNvbnRyb2wuJG5hbWUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGluY3JlYXNpbmcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBsYXN0RXJyb3JMZXZlbCA9IE1hdGgubWF4KGxhc3RFcnJvckxldmVsLFxuICAgICAgICAgICAgICBfKEVudm95TWVzc2FnZXNDb250cm9sbGVycylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gJGVudm95Ll9maW5kQ2hpbGRyZW4oY3RybCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGRDb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gXy5pc051bWJlcihjaGlsZENvbnRyb2xsZXIuJGVycm9yTGV2ZWwpID9cbiAgICAgICAgICAgICAgICAgICAgY2hpbGRDb250cm9sbGVyLiRlcnJvckxldmVsIDpcbiAgICAgICAgICAgICAgICAgICAgJGVudm95LkRFRkFVTFRfRVJST1JMRVZFTDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5tYXgoKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgXy5lYWNoKGJvdW5kQ29udHJvbGxlcnMsIHVwZGF0ZSk7XG5cbiAgICAgICAgICBfLmVhY2gocGFyZW50Q29udHJvbGxlcnMsIGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgICBpZiAoaW5jcmVhc2luZykge1xuICAgICAgICAgICAgICBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPiBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gY3RybC4kZXJyb3JMZXZlbDtcbiAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChjdHJsLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgbGFzdEVycm9yTGV2ZWwgPSBjdHJsLiRlcnJvckxldmVsO1xuICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGRlYnVnKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIERFQk9VTkNFX01TKSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNyZWZyZXNoXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIENhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IGZvcm1zLCBidXQgY291bGQgY29uY2VpdmFibHkgYmUgY2FsbGVkIG1hbnVhbGx5XG4gICAgICogaWYgeW91IHdpc2ggdG8gZXh0ZW5kIEVudm95J3MgZnVuY3Rpb25hbGl0eS4gIFBhc3MgYSBmb3JtIGFuZCBhIGNvbnRyb2w7XG4gICAgICogaWYgdGhlIGNvbnRyb2wgaXMgaW52YWxpZCwgbWVzc2FnZXMgd2lsbCBiZSBwdWxsZWQgb3V0IG9mIHRoZSBkYXRhIGZpbGUsXG4gICAgICogYW5kIHRoZSBjb250cm9sbGVycyBib3VuZCB2aWEge0BsaW5rIGZ2LmVudm95LiRlbnZveSNiaW5kRm9ybSBiaW5kRm9ybX1cbiAgICAgKiB3aWxsIGJlIHVwZGF0ZWQuICBJbiB0dXJuLCB0aGlzIHdpbGwgdXBkYXRlIHRoZSB2aWV3LCBidXQgeW91IGNvdWxkXG4gICAgICogaGF2ZSBhIGN1c3RvbSBjb250cm9sbGVyIGRvIGp1c3QgYWJvdXQgYW55dGhpbmcgaW4gaXRzIGB1cGRhdGUoKWAgbWV0aG9kLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBhc3luY2hyb25vdXMsIGFuZCB0aGUgdW5kZXJseWluZyBtZXRob2QgaXMgZGVib3VuY2VkLS15b3UgbWF5XG4gICAgICogbG9zZSBhIGNhbGwgaWYgeW91J3JlIHRvbyBxdWljay0tYnV0IGlmIHlvdSBjYWxsIGl0IHR3aWNlIHN5bmNocm9ub3VzbHksXG4gICAgICogaWYgdGhlIGZpcnN0IGNhbGwgdGFrZXMgbGVzcyB0aGFuIDI1MG1zLCB0aGUgc2Vjb25kIGNhbGwgd2lsbCBub3RcbiAgICAgKiBleGVjdXRlLlxuICAgICAqXG4gICAgICogVE9ETzogbWFrZSB0aGUgZGVib3VuY2UgdGltZXIgY29uZmlndXJhYmxlLlxuICAgICAqIEBwYXJhbSB7RW52b3lGb3JtQ29udHJvbGxlcn0gZm9ybSBUaGUgZm9ybSB3aG9zZSBjb250cm9sIGNoYW5nZWRcbiAgICAgKiBAcGFyYW0geyhuZ01vZGVsLk5nTW9kZWxDb250cm9sbGVyfEVudm95Rm9ybUNvbnRyb2xsZXIpfSBjb250cm9sIFRoZVxuICAgICAqIGNvbnRyb2wgd2hpY2ggY2hhbmdlZC5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUmV0dXJucyBub3RoaW5nXG4gICAgICovXG4gICAgcmVmcmVzaDogZnVuY3Rpb24gcmVmcmVzaChmb3JtLCBjb250cm9sKSB7XG5cbiAgICAgIGRlbGV0ZSAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdO1xuXG4gICAgICBkZWJ1ZygnQ29udHJvbCBcIiVzXCIgaW4gZm9ybSBcIiVzXCIgY2hhbmdlZCB2YWxpZGl0eScsXG4gICAgICAgIGNvbnRyb2wuJG5hbWUsXG4gICAgICAgIGZvcm0uJG5hbWUpO1xuXG4gICAgICBpZiAoJGVudm95Ll9yZWZyZXNoaW5nKSB7XG4gICAgICAgIHJldHVybiAkZW52b3kuX3JlZnJlc2hpbmcudGhlbigkZW52b3kuX3JlZnJlc2guYmluZChudWxsLFxuICAgICAgICAgIGZvcm0sXG4gICAgICAgICAgY29udHJvbCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJHEud2hlbigkZW52b3kuX3JlZnJlc2goZm9ybSwgY29udHJvbCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3kjc2V0QWN0aW9uXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFNldCBhbiBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYXQgc29tZSBwb2ludC4gIFVzZWQgYnkgdGhlXG4gICAgICogZW52b3lMaXN0IGRpcmVjdGl2ZSdzIHZpZXcsIHNvIHRoYXQgeW91IGNhbiBjbGljayBvbiBhblxuICAgICAqIGVycm9yIGFuZCBiZSB0YWtlbiB0byB3aGVyZSB0aGUgZXJyb3IgaXMuXG4gICAgICogQHRvZG8gbWFrZSBjb250cm9sTmFtZSBvcHRpb25hbD9cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgTmFtZSBvZiBmb3JtXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRyb2xOYW1lIE5hbWUgb2YgY29udHJvbFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gQW5ndWxhckpTIGV4cHJlc3Npb24gdG8gZXZhbHVhdGVcbiAgICAgKi9cbiAgICBzZXRBY3Rpb246IGZ1bmN0aW9uIHNldEFjdGlvbihmb3JtTmFtZSwgY29udHJvbE5hbWUsIGFjdGlvbikge1xuICAgICAgdmFyIGZvcm1BY3Rpb25zID0gYWN0aW9uc1tmb3JtTmFtZV0gPSBhY3Rpb25zW2Zvcm1OYW1lXSB8fCB7fTtcbiAgICAgIGZvcm1BY3Rpb25zW2NvbnRyb2xOYW1lXSA9IGFjdGlvbjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I2dldEFjdGlvblxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBHZXRzIGEgc3RvcmVkIGFjdGlvbi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgTmFtZSBvZiBmb3JtIGZvciBhY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udHJvbE5hbWUgTmFtZSBvZiBjb250cm9sIGZvciBhY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7KHN0cmluZ3x1bmRlZmluZWQpfSBUaGUgYWN0aW9uIChBbmd1bGFySlNcbiAgICAgKiAgICAgZXhwcmVzc2lvbiksIGlmIGl0IGV4aXN0cy5cbiAgICAgKi9cbiAgICBnZXRBY3Rpb246IGZ1bmN0aW9uIGdldEFjdGlvbihmb3JtTmFtZSwgY29udHJvbE5hbWUpIHtcbiAgICAgIHJldHVybiBfLmdldChhY3Rpb25zLCBmb3JtTmFtZSArICcuJyArIGNvbnRyb2xOYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I2ZpbmRQYXJlbnRDb250cm9sbGVyXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gZ2V0IGEgcGFyZW50IGVudm95IGRpcmVjdGl2ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgRmluZCB0aGUgRW52b3lNZXNzYWdlc0NvbnRyb2xsZXJcbiAgICAgKiAgICAgYXR0YWNoZWQgdG8gZm9ybSB3aXRoIHRoaXMgbmFtZVxuICAgICAqIEBwYXJhbSB7RW52b3lNZXNzYWdlc0NvbnRyb2xsZXJ9IGVudm95TWVzc2FnZXMgQ3VycmVudFxuICAgICAqICAgICBFbnZveU1lc3NhZ2VzQ29udHJvbGxlclxuICAgICAqIEB0aHJvd3MgSWYgbm8gcGFyZW50IHdpdGggdGhhdCBuYW1lIGZvdW5kXG4gICAgICogQHJldHVybnMge0Vudm95TWVzc2FnZXNDb250cm9sbGVyfSBQYXJlbnQgY29udHJvbGxlclxuICAgICAqL1xuICAgIGZpbmRQYXJlbnRDb250cm9sbGVyOiBmdW5jdGlvbiBmaW5kUGFyZW50Q29udHJvbGxlcihmb3JtTmFtZSxcbiAgICAgIGVudm95TWVzc2FnZXMpIHtcbiAgICAgIHdoaWxlIChlbnZveU1lc3NhZ2VzLiRuYW1lICE9PSBmb3JtTmFtZSkge1xuICAgICAgICBlbnZveU1lc3NhZ2VzID0gZW52b3lNZXNzYWdlcy4kcGFyZW50O1xuICAgICAgICBpZiAoIWVudm95TWVzc2FnZXMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBmaW5kIHBhcmVudCB3aXRoIG5hbWUgJyArIGZvcm1OYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGVudm95TWVzc2FnZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNsZXZlbERlc2NyaXB0aW9uXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFJldHVybnMgdGhlIGRlc2NyaXB0aW9uL3RpdGxlIGZvciBhbiBlcnJvcmxldmVsLlxuICAgICAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXIpfSBlcnJvckxldmVsIGVycm9ybGV2ZWxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZGVzY3JpcHRpb24vdGl0bGUgb2YgZ2l2ZW4gZXJyb3JsZXZlbFxuICAgICAqL1xuICAgIGxldmVsRGVzY3JpcHRpb246IGZ1bmN0aW9uIGxldmVsRGVzY3JpcHRpb24oZXJyb3JMZXZlbCkge1xuICAgICAgaWYgKF8uaXNTdHJpbmcoZXJyb3JMZXZlbCkpIHtcbiAgICAgICAgZXJyb3JMZXZlbCA9ICRlbnZveS5sZXZlbChlcnJvckxldmVsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcHRzLmxldmVsc1tlcnJvckxldmVsXS5kZXNjcmlwdGlvbjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I0RFRkFVTFRfTEVWRUxcbiAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgZGVmYXVsdCBsZXZlbCAoYXMgYSBzdHJpbmcpXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBERUZBVUxUX0xFVkVMOiBvcHRzLmRlZmF1bHRMZXZlbCxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNERUZBVUxUX0VSUk9STEVWRUxcbiAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgZGVmYXVsdCBlcnJvcmxldmVsIChhcyBhIG51bWJlcilcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIERFRkFVTFRfRVJST1JMRVZFTDogTEVWRUxTW29wdHMuZGVmYXVsdExldmVsXSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNFUlJPUkxFVkVMU1xuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBsZXZlbHMgYXMgYW4gT2JqZWN0LCBrZXllZCBvbiBsZXZlbCBuYW1lXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XG4gICAgICovXG4gICAgRVJST1JMRVZFTFM6IExFVkVMUyxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNMRVZFTFNcbiAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBUaGUgbGV2ZWxzIGFzIGFuIGFycmF5LCB3aXRoIGVhY2ggb2JqZWN0IHJlcHJlc2VudGluZyBhIGxldmVsXG4gICAgICogQHR5cGUge0FycmF5LjxPYmplY3QuPHN0cmluZyxudW1iZXI+Pn1cbiAgICAgKi9cbiAgICBMRVZFTFM6IG9wdHMubGV2ZWxzLFxuXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3kjb3B0aW9uc1xuICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIE9wdGlvbnMsIGFzIGRlZmluZWQgYnkgZGVmYXVsdHMgYW5kIGFueSBjYWxscyB0byBgb3B0aW9ucygpYCBpbiB0aGVcbiAgICAgKiBwcm92aWRlci5cbiAgICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsKj59XG4gICAgICovXG4gICAgb3B0aW9uczogb3B0c1xuXG4gIH07XG5cbiAgXy5leHRlbmQoJGVudm95LCBwcm90b3R5cGUpO1xuXG4gIHJldHVybiAkZW52b3k7XG59XG5lbnZveUZhY3RvcnkuJGluamVjdCA9IFsnJGh0dHAnLCAnJHEnXTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbnZveUZhY3Rvcnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcHRzID0gcmVxdWlyZSgnLi9vcHRzJyk7XG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6JGVudm95OnByb3ZpZGVyJyk7XG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSBmdi5lbnZveS4kZW52b3lQcm92aWRlclxuICogQGRlc2NyaXB0aW9uXG4gKiBBbGxvd3MgY29uZmlndXJhdGlvbiBvZiBvcHRpb25zIGZvciBFbnZveTsgc2VlIHRoZVxuICoge0BsaW5rIGZ2LmVudm95LiRlbnZveVByb3ZpZGVyI29wdGlvbnMgYG9wdGlvbnMoKWAgbWV0aG9kfS5cbiAqXG4gKiAjIERlZmF1bHQgT3B0aW9uc1xuICpcbiAqIC0gYGxldmVsc2A6IFRocmVlICgzKSBkZWZhdWx0IGxldmVscy4gIGBva2AsIGB3YXJuaW5nYCwgYW5kIGBlcnJvcmAsIGluXG4gKiAgICAgaW5jcmVhc2luZyBzZXZlcml0eSwgaGF2aW5nIGRlc2NyaXB0aW9ucyBcIkZpeGVkIVwiLCBcIldhcm5pbmdcIiwgYW5kXG4gKiAgICAgXCJFcnJvclwiLCByZXNwZWN0aXZlbHkuXG4gKiAtIGBkZWZhdWx0TGV2ZWw6IGBva2BcbiAqIC0gYGRhdGFGaWxlVXJsYDogYG1lc3NhZ2VzLmpzb25gXG4gKiAtIGB0ZW1wbGF0ZVVybGA6IGBwYXJ0aWFscy9tZXNzYWdlcy5odG1sYFxuICovXG5mdW5jdGlvbiBlbnZveVByb3ZpZGVyKCkge1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgZnYuZW52b3kuJGVudm95UHJvdmlkZXIjb3B0aW9uc1xuICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuJGVudm95UHJvdmlkZXJcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFVzaW5nIHRoaXMgbWV0aG9kLCBzZXQgb3B0aW9ucyBkdXJpbmcgYGNvbmZpZygpYCBwaGFzZS5cbiAgICogQHBhcmFtIHtPYmplY3Q9fSBuZXdPcHRzIE5ldyBvcHRpb25zIHRvIGFzc2lnbiBvbnRvIGRlZmF1bHRzXG4gICAqIEBwYXJhbSB7QXJyYXkuPE9iamVjdC48c3RyaW5nLHN0cmluZz4+PX0gbmV3T3B0cy5sZXZlbHMgVXNlci1kZWZpbmVkXG4gICAqICAgICBsZXZlbHMuICBFYWNoIE9iamVjdCBpbiB0aGUgQXJyYXkgc2hvdWxkIGhhdmUgYSBgbmFtZWAgYW5kXG4gICAqICAgICBgZGVzY3JpcHRpb25gIHByb3BlcnR5LlxuICAgKiBAcGFyYW0ge3N0cmluZz19IG5ld09wdHMuZGF0YUZpbGVVcmwgVGhlIFVSTCBwYXRoIHRvIHRoZSBgLmpzb25gIGZpbGVcbiAgICogICAgIGNvbnRhaW5pbmcgdGhlIG1lc3NhZ2VzXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gbmV3T3B0cy50ZW1wbGF0ZVVybCBUaGUgVVJMIHBhdGggdG8gdGhlIHBhcnRpYWxcbiAgICogICAgIHJlcHJlc2VudGluZyB0aGUgbWVzc2FnZSBsaXN0XG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gbmV3T3B0cy5kZWZhdWx0TGV2ZWwgVGhlIGRlZmF1bHQgbGV2ZWw7IGNvcnJlc3BvbmRzIHRvXG4gICAqICAgICB0aGUgYG5hbWVgIHByb3BlcnR5IG9mIGVhY2ggb2JqZWN0IGluIHRoZSBgbGV2ZWxzYCBhcnJheVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIG9wdGlvbnNcbiAgIC8vKiBAcGFyYW0geyhzdHJpbmd8YW5ndWxhci5lbGVtZW50KT19IG5ld09wdHMudGVtcGxhdGUgVGhlIHJhdyB0ZW1wbGF0ZSB0byB1c2VcbiAgIC8vKiAgICAgZm9yIHRoZSBtZXNzYWdlIGxpc3QuICBUYWtlcyBwcmVjZWRlbmNlIG92ZXIgYHRlbXBsYXRlVXJsYC5cbiAgIC8vKiBAcGFyYW0ge09iamVjdD19IG5ld09wdHMubWVzc2FnZUNvbmZpZyBJbnN0ZWFkIG9mIHRoZSBVUkwgdG8gYSBgLmpzb25gXG4gICAvLyogICAgIGZpbGUsIHRoaXMgY2FuIGJlIGFuIGBPYmplY3RgLiAgVGFrZXMgcHJlY2VkZW5jZSBvdmVyXG4gICAvLyogICAgIGBtZXNzYWdlQ29uZmlnVXJsYC5cbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IGZ1bmN0aW9uIG9wdGlvbnMobmV3T3B0cykge1xuICAgIF8uZXh0ZW5kKG9wdHMsIG5ld09wdHMpO1xuICAgIGRlYnVnKCdOZXcgb3B0aW9ucyBzZXQ6Jywgb3B0cyk7XG4gICAgcmV0dXJuIG9wdHM7XG4gIH07XG5cbiAgdGhpcy4kZ2V0ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlbnZveVByb3ZpZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERlZmF1bHQgbGV2ZWwgYW5kIGRlc2NyaXB0aW9uc1xuICogQHR5cGUge0FycmF5LjxPYmplY3QuPHN0cmluZywgc3RyaW5nPj59XG4gKi9cbnZhciBERUZBVUxUX0xFVkVMUyA9IFtcbiAge1xuICAgIG5hbWU6ICdvaycsXG4gICAgZGVzY3JpcHRpb246ICdGaXhlZCEnXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnd2FybmluZycsXG4gICAgZGVzY3JpcHRpb246ICdXYXJuaW5nJ1xuICB9LFxuICB7XG4gICAgbmFtZTogJ2Vycm9yJyxcbiAgICBkZXNjcmlwdGlvbjogJ0Vycm9yJ1xuICB9XG5dO1xuXG4vKipcbiAqIERlZmF1bHQgd2ViIHNlcnZlciBwYXRoIHRvIEpTT04gbWVzc2FnZSBkZWZpbml0aW9uIGZpbGVcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBERUZBVUxUX01FU1NBR0VTX0NPTkZJR19VUkwgPSAnZXhhbXBsZS1kYXRhL21lc3NhZ2VzLmpzb24nO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGxldmVsXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgREVGQVVMVF9MRVZFTCA9ICdvayc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdG8gZGlzcGxheSBtZXNzYWdlcyBpZiB0aGUgZXJyb3JsZXZlbCBpcyB0aGUgZGVmYXVsdCBvbmUuXG4gKiBQcmFjdGljYWxseSBzcGVha2luZywgdGhpcyBjb3VsZCBnaXZlIHRoZSB1c2VyIG1vbWVudGFyeSBmZWVkYmFjayB0aGF0XG4gKiB0aGV5J3ZlIGZpeGVkIGEgZmllbGQuXG4gKiBAdHlwZSB7Ym9vbGVhbn1cbiAqL1xudmFyIERFRkFVTFRfU0hPV19ERUZBVUxUX0xFVkVMID0gZmFsc2U7XG5cbi8qKlxuICogVGhlIFVSTCBvZiB0aGUgdGVtcGxhdGUgdG8gdXNlIGZvciB0aGVcbiAqIHtAbGluayBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lMaXN0IGVudm95TGlzdH0gZGlyZWN0aXZlLlxuICogQHR5cGUge3N0cmluZ31cbiAqL1xudmFyIERFRkFVTFRfVEVNUExBVEVfVVJMID0gJ3BhcnRpYWxzL21lc3NhZ2VzLmh0bWwnO1xuXG4vKipcbiAqIFRoZSByYXcgdGVtcGxhdGUgdG8gdXNlLiAgVGFrZXMgcHJlY2VkZW5jZSBvdmVyIGB0ZW1wbGF0ZVVybGAuXG4gKiBAdHlwZSB7KHN0cmluZ3xudWxsfGFuZ3VsYXIuZWxlbWVudCl9XG4gKi9cbnZhciBERUZBVUxUX1RFTVBMQVRFID0gbnVsbDtcblxuLyoqXG4gKiBUaGUgcmF3IGRhdGEgb2JqZWN0IHRvIHVzZS4gIFRha2VzIHByZWNlZGVuY2Ugb3ZlciBgbWVzc2FnZXNDb25maWdVcmxgLlxuICogQHR5cGUgeyhPYmplY3R8bnVsbCl9XG4gKi9cbnZhciBERUZBVUxUX01FU1NBR0VfQ09ORklHID0gbnVsbDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxldmVsczogREVGQVVMVF9MRVZFTFMsXG4gIGRlZmF1bHRMZXZlbDogREVGQVVMVF9MRVZFTCxcbiAgbWVzc2FnZXNDb25maWdVcmw6IERFRkFVTFRfTUVTU0FHRVNfQ09ORklHX1VSTCxcbiAgc2hvd0RlZmF1bHRMZXZlbDogREVGQVVMVF9TSE9XX0RFRkFVTFRfTEVWRUwsXG4gIHRlbXBsYXRlVXJsOiBERUZBVUxUX1RFTVBMQVRFX1VSTCxcbiAgbWVzc2FnZXNDb25maWc6IERFRkFVTFRfTUVTU0FHRV9DT05GSUcsXG4gIHRlbXBsYXRlOiBERUZBVUxUX1RFTVBMQVRFXG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTpmb3JtRGVjb3JhdG9yJyk7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlczpmb3JtXG4gKiBAcmVzdHJpY3QgRVxuICogQHNjb3BlXG4gKiBAcGFyYW0ge3N0cmluZz19IG5hbWUgTmFtZSBvZiB0aGlzIGZvcm0uICBJZiBvbWl0dGVkLCB0aGUgZm9ybSBpcyAqaWdub3JlZCpcbiAqIGJ5IEVudm95LlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogIyBBbGlhczogYG5nRm9ybWBcbiAqXG4gKiBUaGlzIGRpcmVjdGl2ZSByZXBsYWNlcyBBbmd1bGFySlMnXG4gKiAgICAgW2Bmb3JtYF0oaHR0cHM6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nL2RpcmVjdGl2ZS9mb3JtKSBkaXJlY3RpdmUuXG4gKlxuICogVHdvIGRpZmZlcmVuY2VzOlxuICpcbiAqIC0gVGhlIGNvbnRyb2xsZXIgaXMgcmVwbGFjZWQgd2l0aCBhIHtAbGluayBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyIEVudm95Rm9ybUNvbnRyb2xsZXJ9LlxuICogLSBUaGUgZGlyZWN0aXZlIGNyZWF0ZXMgYSBuZXcgU2NvcGUuICBTZWUgdGhlIHtAbGluayBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyIyRhbGlhcyAkYWxpYXMgcHJvcGVydHl9IGZvclxuICogICAgIGZ1cnRoZXIgaW5mb3JtYXRpb24uXG4gKi9cblxuLyoqXG4gKiBUaGlzIGRlY29yYXRvciBtb25rZXlwYXRjaGVzIHRoZSBgZm9ybWAgZGlyZWN0aXZlLlxuICogRm9yIHNvbWUgcmVhc29uIHdoZW4geW91IGRlY29yYXRlIGEgZGlyZWN0aXZlLCAkZGVsZWdhdGUgaXMgYW4gQXJyYXlcbiAqIGFuZCB0aGUgZmlyc3QgZWxlbWVudCBpcyB0aGUgZGlyZWN0aXZlLlxuICogQHBhcmFtIHtBcnJheX0gJGRlbGVnYXRlIERpcmVjdGl2ZShzKSBhc3NvY2lhdGVkIHdpdGggdGFnIFwiZm9ybVwiLCBJIGd1ZXNzXG4gKiBAcmV0dXJucyB7QXJyYXl9IERlY29yYXRlZCBhcnJheSBvZiBkaXJlY3RpdmVzP1xuICovXG5mdW5jdGlvbiBmb3JtRGVjb3JhdG9yKCRkZWxlZ2F0ZSkge1xuXG4gIC8qKlxuICAgKiBUaGUgcmVhbCBmb3JtIGRpcmVjdGl2ZS5cbiAgICogQHR5cGUge2Zvcm19XG4gICAqL1xuICB2YXIgZm9ybSA9IF8uZmlyc3QoJGRlbGVnYXRlKTtcblxuICAvKipcbiAgICogT3JpZ2luYWwgRm9ybUNvbnRyb2xsZXIuXG4gICAqIEB0eXBlIHtmb3JtLkZvcm1Db250cm9sbGVyfVxuICAgKi9cbiAgdmFyIGZvcm1Db250cm9sbGVyID0gZm9ybS5jb250cm9sbGVyO1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgY29udHJvbGxlclxuICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBgRW52b3lGb3JtQ29udHJvbGxlcmAgcmVwbGFjZXNcbiAgICogICAgIFtgRm9ybUNvbnRyb2xsZXJgXShodHRwczovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcvdHlwZS9mb3JtLkZvcm1Db250cm9sbGVyIyEpXG4gICAqICAgICB3aXRoIGl0c2VsZjsgYW55IHRpbWUgeW91IHVzZSB0aGVcbiAgICogICAgIFtgZm9ybWBdKGh0dHBzOi8vZG9jcy5hbmd1bGFyanMub3JnL2FwaS9uZy9kaXJlY3RpdmUvZm9ybSkgZGlyZWN0aXZlLFxuICAgKiAgICAgeW91ciBjb250cm9sbGVyIHdpbGwgYmUgdGhpcyBpbnN0ZWFkLCAqKmV4Y2VwdCoqIGlmIHlvdXIgYGZvcm1gIGhhcyBub1xuICAgKiAgICAgYG5hbWVgIGF0dHJpYnV0ZSwgYXQgd2hpY2ggcG9pbnQgaXQgaXMgKmlnbm9yZWQqIGJ5IEVudm95LlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIGZ1bmN0aW9uIEVudm95Rm9ybUNvbnRyb2xsZXIoJGVsZW1lbnQsXG4gICAgJGF0dHJzLFxuICAgICRzY29wZSxcbiAgICAkYW5pbWF0ZSxcbiAgICAkaW50ZXJwb2xhdGUsXG4gICAgJGluamVjdG9yLFxuICAgICRlbnZveSkge1xuXG4gICAgLy8gbXkga2luZ2RvbSBmb3IgXCJsZXRcIlxuICAgIHZhciAkc2V0VmFsaWRpdHk7XG5cbiAgICAkaW5qZWN0b3IuaW52b2tlKGZvcm1Db250cm9sbGVyLCB0aGlzLCB7XG4gICAgICAkZWxlbWVudDogJGVsZW1lbnQsXG4gICAgICAkc2NvcGU6ICRzY29wZSxcbiAgICAgICRhbmltYXRlOiAkYW5pbWF0ZSxcbiAgICAgICRpbnRlcnBvbGF0ZTogJGludGVycG9sYXRlLFxuICAgICAgJGF0dHJzOiAkYXR0cnNcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiRuYW1lKSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyIyRpc0Zvcm1cbiAgICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXJcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogVGhpcyB3aWxsIGFsd2F5cyBiZSBgdHJ1ZWAgZm9yIGFueSBmb3JtIHRvdWNoZWQgYnkgRW52b3kuICBUaGUgcmVhc29uXG4gICAgICAgKiAgICAgZm9yIGl0cyBleGlzdGVuY2UgaXMgc2ltcGx5IHRoYXQgaXQgY2FuIGJlIHByYWN0aWNhbGx5IGRpZmZpY3VsdFxuICAgICAgICogICAgIHRvIHRlbGwgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBhIGBGb3JtQ29udHJvbGxlcmAgYW5kIGFuXG4gICAgICAgKiAgICAgW2BOZ01vZGVsQ29udHJvbGxlcmBdKGh0dHBzOi8vZG9jcy5hbmd1bGFyanMub3JnL2FwaS9uZy90eXBlL25nTW9kZWwuTmdNb2RlbENvbnRyb2xsZXIpLlxuICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGlzRm9ybSA9IHRydWU7XG5cbiAgICAgIC8qKlxuICAgICAgICogVGhpcyBGb3JtQ29udHJvbGxlcidzIG9yaWdpbmFsICRzZXRWYWxpZGl0eSgpIG1ldGhvZFxuICAgICAgICogQHR5cGUge2Zvcm0uRm9ybUNvbnRyb2xsZXIjJHNldFZhbGlkaXR5fVxuICAgICAgICovXG4gICAgICAkc2V0VmFsaWRpdHkgPSB0aGlzLiRzZXRWYWxpZGl0eTtcblxuICAgICAgZGVidWcoJ0luc3RhbnRpYXRpbmcgcGF0Y2hlZCBjb250cm9sbGVyIGZvciBmb3JtICVzJywgdGhpcy4kbmFtZSk7XG5cbiAgICAgIF8uZXh0ZW5kKHRoaXMsIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5nZG9jIHByb3BlcnR5XG4gICAgICAgICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXIjJGFsaWFzXG4gICAgICAgICAqIEBwcm9wZXJ0eU9mIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXJcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgICAqIElmIHRoZSBwYXJlbnQge0BsaW5rIGZ2LmVudm95LmRpcmVjdGl2ZXM6Zm9ybSBmb3JtIGRpcmVjdGl2ZX1cbiAgICAgICAgICogY29udGFpbnMgYW4gXCJhbGlhc1wiIGF0dHJpYnV0ZSwgd2UnbGwgdXNlIGl0XG4gICAgICAgICAqIHRvIGxvb2sgdXAgbWVzc2FnZXMuICBUaGlzIGlzIHVzZWZ1bCBpZiB5b3VyIGZvcm0gbmFtZSBpc1xuICAgICAgICAgKiBcImR5bmFtaWNcIiAoaW50ZXJwb2xhdGVkKS4gICpOb3RlOiogaW50ZXJwb2xhdGVkIGZvcm0gbmFtZXMgd2VyZVxuICAgICAgICAgKiBub3QgaW1wbGVtZW50ZWQgYmVmb3JlIEFuZ3VsYXJKUyAxLjMuMC5cbiAgICAgICAgICpcbiAgICAgICAgICogRGVmYXVsdHMgdG8gd2hhdGV2ZXIgdGhlIG5hbWUgb2YgdGhlIGZvcm0gaXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRoZSBhbGlhcyBpcyBub3QgcHJlc2VudCBpbiB0aGlzIGZvcm0ncyBTY29wZSwgdGhlbiBpdCBpcyBwbGFjZWRcbiAgICAgICAgICogdGhlcmUtLW11Y2ggbGlrZSBgRm9ybUNvbnRyb2xsZXJgIHBsYWNlcyBpdHMgYG5hbWVgIGF0dHJpYnV0ZSBvbiBpdHNcbiAgICAgICAgICogU2NvcGUsIGlmIHByZXNlbnQuICBCZWNhdXNlIGNvbGxpc2lvbnMgY291bGQgZXhpc3QgaW4gdGhlIGNhc2Ugb2ZcbiAgICAgICAgICogXCJkeW5hbWljXCIgZm9ybXMsIHRoZSB7QGxpbmsgZnYuZW52b3kuZGlyZWN0aXZlczpmb3JtIGZvcm0gZGlyZWN0aXZlfVxuICAgICAgICAgKiBtdXN0IGNyZWF0ZSBhIG5ldyBTY29wZS5cbiAgICAgICAgICovXG4gICAgICAgICRhbGlhczogJGF0dHJzLmFsaWFzIHx8IHRoaXMuJG5hbWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVzZWQgdG8gdHJhY2sgdGhpcyBmb3JtJ3MgZXJyb3Igc3RhdGUuICBXZSdsbCBuZWVkIHRvXG4gICAgICAgICAqIGRvIHN0dWZmIGlmIHRoZSBzdGF0ZSBjaGFuZ2VzLlxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgJCRsYXN0RXJyb3JTaXplOiAwLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmdkb2MgbWV0aG9kXG4gICAgICAgICAqIEBuYW1lIGZ2LmVudm95LmNvbnRyb2xsZXJzOkVudm95Rm9ybUNvbnRyb2xsZXIjJHNldFZhbGlkaXR5XG4gICAgICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS5jb250cm9sbGVyczpFbnZveUZvcm1Db250cm9sbGVyXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBJZiB0aGUgbnVtYmVyIG9mIGVycm9ycyBpbiB0aGlzIGZvcm0gaGFzIGluY3JlYXNlZCBvciBkZWNyZWFzZWRcbiAgICAgICAgICogYW5kIHRoZSBjb250cm9sIGJlaW5nIHNldCB2YWxpZCBvciBpbnZhbGlkIGlzIGEgbWVtYmVyIG9mIHRoaXNcbiAgICAgICAgICogZm9ybSBwcm9wZXIsIHRoZW4gdGVsbCB7QGxpbmsgZnYuZW52b3kuZW52b3k6JGVudm95ICRlbnZveX0gaGFuZGxlXG4gICAgICAgICAqICAgICB0aGUgY2hhbmdlLlxuICAgICAgICAgKlxuICAgICAgICAgKiAqTm90ZSo6IHdlIG9ubHkgdGVsbCBgJGVudm95YCB0byB1cGRhdGUgaWYgdGhlIGNvbnRyb2wgaXMgYSBkaXJlY3RcbiAgICAgICAgICogZGVzY2VuZGFudCBvZiB0aGlzIGZvcm0uXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2tlbiBWYWxpZGF0aW9uIHRva2VuXG4gICAgICAgICAqIEBwYXJhbSB7KGJvb2xlYW58Kil9IHZhbHVlIElmIHRydXRoeSwgdGhlbiB0aGUgdmFsaWRhdGlvbiB0b2tlbiBpc1xuICAgICAgICAgKiBpbiBhbiBlcnJvciBzdGF0ZS5cbiAgICAgICAgICogQHBhcmFtIHsobmdNb2RlbC5OZ01vZGVsQ29udHJvbGxlcnxmb3JtLkZvcm1Db250cm9sbGVyfGZ2LmVudm95LmNvbnRyb2xsZXJzLkVudm95Rm9ybUNvbnRyb2xsZXIpfSBjb250cm9sXG4gICAgICAgICAqIFNvbWUgY29udHJvbCBvbiB0aGUgZm9ybTsgbWF5IGJlIGEgc3ViZm9ybSBvciBhIGZpZWxkLlxuICAgICAgICAgKiBAdGhpcyBGb3JtQ29udHJvbGxlclxuICAgICAgICAgKi9cbiAgICAgICAgJHNldFZhbGlkaXR5OiBmdW5jdGlvbiAkZW52b3lTZXRWYWxpZGl0eSh0b2tlbixcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBjb250cm9sKSB7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBJZiB3ZSBzZXQgJGlzRm9ybSBhYm92ZSwgdGhpcyBpcyBhIHN1YmZvcm0gb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAqIGFuZCB3ZSBkb24ndCBjYXJlLlxuICAgICAgICAgICAqIEB0b2RvIG1heWJlIHdlIGRvIGNhcmU/XG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGlzTm90Rm9ybSA9ICFjb250cm9sLiRpc0Zvcm07XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBXZSBvbmx5IGNhcmUgYWJvdXQgY29udHJvbHMgdGhhdCB3ZXJlIGV4cGxpY2l0bHkgYWRkZWRcbiAgICAgICAgICAgKiB0byB0aGlzIGZvcm0uXG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGZvcm1IYXNDb250cm9sID0gaXNOb3RGb3JtICYmIF8uaGFzKHRoaXMsIGNvbnRyb2wuJG5hbWUpO1xuXG4gICAgICAgICAgJHNldFZhbGlkaXR5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICBpZiAoZm9ybUhhc0NvbnRyb2wgJiZcbiAgICAgICAgICAgIF8uc2l6ZSh0aGlzLiRlcnJvcikgIT09IHRoaXMuJCRsYXN0RXJyb3JTaXplKSB7XG4gICAgICAgICAgICAkZW52b3kucmVmcmVzaCh0aGlzLCBjb250cm9sKTtcbiAgICAgICAgICAgIHRoaXMuJCRsYXN0RXJyb3JTaXplID0gXy5zaXplKHRoaXMuJGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZWUgdGhlIG5vdGUgYmVsb3cgYXQgZm9ybURpcmVjdGl2ZS4kc2NvcGVcbiAgICAgIGlmICghXy5oYXMoJHNjb3BlLCB0aGlzLiRhbGlhcykpIHtcbiAgICAgICAgJHNjb3BlW3RoaXMuJGFsaWFzXSA9IHRoaXM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRW52b3lGb3JtQ29udHJvbGxlci4kaW5qZWN0ID0gW1xuICAgICckZWxlbWVudCcsXG4gICAgJyRhdHRycycsXG4gICAgJyRzY29wZScsXG4gICAgJyRhbmltYXRlJyxcbiAgICAnJGludGVycG9sYXRlJyxcbiAgICAnJGluamVjdG9yJyxcbiAgICAnJGVudm95J1xuICBdO1xuXG4gIGZvcm0uY29udHJvbGxlciA9IEVudm95Rm9ybUNvbnRyb2xsZXI7XG5cbiAgLyoqXG4gICAqIFNvIHRoaXMgaXMgYSBsaXR0bGUgaGFjay4gIEknbSBwcmV0dHkgc3VyZSB0aGlzIGlzIG5vdCBkYW5nZXJvdXMsIGJ1dFxuICAgKiBpdCBjb3VsZCBiZS4gIFRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCB5b3UgbWF5IGhhdmUgYSBkeW5hbWljIGZvcm1cbiAgICogbmFtZTsgc29tZXRoaW5nIGludGVycG9sYXRlZC4gIFNheSwgXCJteUZvcm0tMjc4OTYxOFwiLiAgQSBGb3JtQ29udHJvbGxlclxuICAgKiB3aWxsIGFsd2F5cyBwbGFjZSBpdHNlbGYgb24gdGhlIHNjb3BlIGlmIGl0J3MgZ2l2ZW4gYSBuYW1lLiAgQnV0IGl0J3NcbiAgICogYWxzbyBoYW5keSB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSBcIm15Rm9ybVwiLiAgSWYgZm9ybSBcIm15Rm9ybS04NzMyOVwiXG4gICAqIHNoYXJlZCB0aGUgc2FtZSBzY29wZSB3aXRoIFwibXlGb3JtLTI3ODk2MThcIiwgb25seSBvbmUgXCJteUZvcm1cIiBjb3VsZFxuICAgKiBleGlzdDsgdGh1cywgd2UganVzdCBtYWtlIGEgbmV3IHNjb3BlLlxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICovXG4gIGZvcm0uJHNjb3BlID0gdHJ1ZTtcblxuICByZXR1cm4gJGRlbGVnYXRlO1xufVxuZm9ybURlY29yYXRvci4kaW5qZWN0ID0gWyckZGVsZWdhdGUnXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtRGVjb3JhdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgZnYuZW52b3lcbiAqIEBkZXNjcmlwdGlvblxuICogIyBmdi5lbnZveVxuICpcbiAqIFRoZSBtYWluIG1vZHVsZSBmb3IgRW52b3kuICBZb3Ugd2lsbCBuZWVkIHRvIGluY2x1ZGUgdGhpcyBtb2R1bGUuXG4gKlxuICogRW52b3kgaGFzIGRlcGVuZGVuY2llcyBvZiBbbG9kYXNoXShodHRwOi8vbG9kYXNoLm9yZykgYW5kIG9mIGNvdXJzZVxuICogW0FuZ3VsYXJKU10oaHR0cDovL2FuZ3VsYXJqcy5vcmcpLlxuICpcbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICogPGh0bWwgbmctYXBwPVwibXlBcHBcIj5cbiAqIDxoZWFkPlxuICogICA8c2NyaXB0IHNyYz1cInBhdGgvdG8vYW5ndWxhci5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0IHNyYz1cInBhdGgvdG8vbG9kYXNoLmpzXCI+PC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgc3JjPVwicGF0aC90by9lbnZveS5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0PlxuICogICAgIHZhciBteUFwcCA9IGFuZ3VsYXIubW9kdWxlKCdteUFwcCcsIFsnZnYuZW52b3knXSk7XG4gKiAgIDwvc2NyaXB0PlxuICogPC9oZWFkPlxuICogPGJvZHk+XG4gKiA8L2JvZHk+XG4gKiA8L2h0bWw+XG4gKiA8L3ByZT5cbiAqL1xuXG52YXIgYW5ndWxhciA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmFuZ3VsYXIgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmFuZ3VsYXIgOiBudWxsKTtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xudmFyIGRpcmVjdGl2ZXMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKTtcbnZhciBwa2cgPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcbnZhciBmb3JtRGVjb3JhdG9yID0gcmVxdWlyZSgnLi9mb3JtLWRlY29yYXRvcicpO1xudmFyICRlbnZveSA9IHJlcXVpcmUoJy4vZW52b3knKTtcblxudmFyIE1PRFVMRV9OQU1FID0gJ2Z2LmVudm95JztcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95Jyk7XG52YXIgZW52b3k7XG52YXIgbmdBbmltYXRlUHJlc2VudCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBjb25maWcoJHByb3ZpZGUpIHtcbiAgJHByb3ZpZGUuZGVjb3JhdG9yKCduZ0Zvcm1EaXJlY3RpdmUnLCBmb3JtRGVjb3JhdG9yKTtcblxuICBpZiAoIW5nQW5pbWF0ZVByZXNlbnQpIHtcbiAgICAkcHJvdmlkZS52YWx1ZSgnJGFuaW1hdGUnLCBudWxsKTtcbiAgfVxuICBkZWJ1ZygnJXMgdiVzIHJlYWR5JywgcGtnLm5hbWUsIHBrZy52ZXJzaW9uKTtcbn1cbmNvbmZpZy4kaW5qZWN0ID0gWyckcHJvdmlkZSddO1xuXG50cnkge1xuICBlbnZveSA9IGFuZ3VsYXIubW9kdWxlKE1PRFVMRV9OQU1FLCBbJ25nQW5pbWF0ZSddKTtcbiAgbmdBbmltYXRlUHJlc2VudCA9IHRydWU7XG59IGNhdGNoIChpZ25vcmVkKSB7XG4gIGVudm95ID0gYW5ndWxhci5tb2R1bGUoTU9EVUxFX05BTUUsIFtdKTtcbn1cblxuZW52b3lcbiAgLmNvbmZpZyhjb25maWcpXG4gIC5wcm92aWRlcignJGVudm95JywgJGVudm95KTtcblxuXy5lYWNoKGRpcmVjdGl2ZXMsIGZ1bmN0aW9uIChkaXJlY3RpdmUsIG5hbWUpIHtcbiAgZW52b3kuZGlyZWN0aXZlKG5hbWUsIGRpcmVjdGl2ZSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbnZveTtcblxuIiwiXG4vKipcbiAqIFRoaXMgaXMgdGhlIHdlYiBicm93c2VyIGltcGxlbWVudGF0aW9uIG9mIGBkZWJ1ZygpYC5cbiAqXG4gKiBFeHBvc2UgYGRlYnVnKClgIGFzIHRoZSBtb2R1bGUuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kZWJ1ZycpO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG5leHBvcnRzLmZvcm1hdEFyZ3MgPSBmb3JtYXRBcmdzO1xuZXhwb3J0cy5zYXZlID0gc2F2ZTtcbmV4cG9ydHMubG9hZCA9IGxvYWQ7XG5leHBvcnRzLnVzZUNvbG9ycyA9IHVzZUNvbG9ycztcbmV4cG9ydHMuc3RvcmFnZSA9ICd1bmRlZmluZWQnICE9IHR5cGVvZiBjaHJvbWVcbiAgICAgICAgICAgICAgICYmICd1bmRlZmluZWQnICE9IHR5cGVvZiBjaHJvbWUuc3RvcmFnZVxuICAgICAgICAgICAgICAgICAgPyBjaHJvbWUuc3RvcmFnZS5sb2NhbFxuICAgICAgICAgICAgICAgICAgOiBsb2NhbHN0b3JhZ2UoKTtcblxuLyoqXG4gKiBDb2xvcnMuXG4gKi9cblxuZXhwb3J0cy5jb2xvcnMgPSBbXG4gICdsaWdodHNlYWdyZWVuJyxcbiAgJ2ZvcmVzdGdyZWVuJyxcbiAgJ2dvbGRlbnJvZCcsXG4gICdkb2RnZXJibHVlJyxcbiAgJ2RhcmtvcmNoaWQnLFxuICAnY3JpbXNvbidcbl07XG5cbi8qKlxuICogQ3VycmVudGx5IG9ubHkgV2ViS2l0LWJhc2VkIFdlYiBJbnNwZWN0b3JzLCBGaXJlZm94ID49IHYzMSxcbiAqIGFuZCB0aGUgRmlyZWJ1ZyBleHRlbnNpb24gKGFueSBGaXJlZm94IHZlcnNpb24pIGFyZSBrbm93blxuICogdG8gc3VwcG9ydCBcIiVjXCIgQ1NTIGN1c3RvbWl6YXRpb25zLlxuICpcbiAqIFRPRE86IGFkZCBhIGBsb2NhbFN0b3JhZ2VgIHZhcmlhYmxlIHRvIGV4cGxpY2l0bHkgZW5hYmxlL2Rpc2FibGUgY29sb3JzXG4gKi9cblxuZnVuY3Rpb24gdXNlQ29sb3JzKCkge1xuICAvLyBpcyB3ZWJraXQ/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE2NDU5NjA2LzM3Njc3M1xuICByZXR1cm4gKCdXZWJraXRBcHBlYXJhbmNlJyBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUpIHx8XG4gICAgLy8gaXMgZmlyZWJ1Zz8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzk4MTIwLzM3Njc3M1xuICAgICh3aW5kb3cuY29uc29sZSAmJiAoY29uc29sZS5maXJlYnVnIHx8IChjb25zb2xlLmV4Y2VwdGlvbiAmJiBjb25zb2xlLnRhYmxlKSkpIHx8XG4gICAgLy8gaXMgZmlyZWZveCA+PSB2MzE/XG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9Ub29scy9XZWJfQ29uc29sZSNTdHlsaW5nX21lc3NhZ2VzXG4gICAgKG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5tYXRjaCgvZmlyZWZveFxcLyhcXGQrKS8pICYmIHBhcnNlSW50KFJlZ0V4cC4kMSwgMTApID49IDMxKTtcbn1cblxuLyoqXG4gKiBNYXAgJWogdG8gYEpTT04uc3RyaW5naWZ5KClgLCBzaW5jZSBubyBXZWIgSW5zcGVjdG9ycyBkbyB0aGF0IGJ5IGRlZmF1bHQuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzLmogPSBmdW5jdGlvbih2KSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh2KTtcbn07XG5cblxuLyoqXG4gKiBDb2xvcml6ZSBsb2cgYXJndW1lbnRzIGlmIGVuYWJsZWQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBmb3JtYXRBcmdzKCkge1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIHVzZUNvbG9ycyA9IHRoaXMudXNlQ29sb3JzO1xuXG4gIGFyZ3NbMF0gPSAodXNlQ29sb3JzID8gJyVjJyA6ICcnKVxuICAgICsgdGhpcy5uYW1lc3BhY2VcbiAgICArICh1c2VDb2xvcnMgPyAnICVjJyA6ICcgJylcbiAgICArIGFyZ3NbMF1cbiAgICArICh1c2VDb2xvcnMgPyAnJWMgJyA6ICcgJylcbiAgICArICcrJyArIGV4cG9ydHMuaHVtYW5pemUodGhpcy5kaWZmKTtcblxuICBpZiAoIXVzZUNvbG9ycykgcmV0dXJuIGFyZ3M7XG5cbiAgdmFyIGMgPSAnY29sb3I6ICcgKyB0aGlzLmNvbG9yO1xuICBhcmdzID0gW2FyZ3NbMF0sIGMsICdjb2xvcjogaW5oZXJpdCddLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmdzLCAxKSk7XG5cbiAgLy8gdGhlIGZpbmFsIFwiJWNcIiBpcyBzb21ld2hhdCB0cmlja3ksIGJlY2F1c2UgdGhlcmUgY291bGQgYmUgb3RoZXJcbiAgLy8gYXJndW1lbnRzIHBhc3NlZCBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSAlYywgc28gd2UgbmVlZCB0b1xuICAvLyBmaWd1cmUgb3V0IHRoZSBjb3JyZWN0IGluZGV4IHRvIGluc2VydCB0aGUgQ1NTIGludG9cbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIGxhc3RDID0gMDtcbiAgYXJnc1swXS5yZXBsYWNlKC8lW2EteiVdL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgaWYgKCclJScgPT09IG1hdGNoKSByZXR1cm47XG4gICAgaW5kZXgrKztcbiAgICBpZiAoJyVjJyA9PT0gbWF0Y2gpIHtcbiAgICAgIC8vIHdlIG9ubHkgYXJlIGludGVyZXN0ZWQgaW4gdGhlICpsYXN0KiAlY1xuICAgICAgLy8gKHRoZSB1c2VyIG1heSBoYXZlIHByb3ZpZGVkIHRoZWlyIG93bilcbiAgICAgIGxhc3RDID0gaW5kZXg7XG4gICAgfVxuICB9KTtcblxuICBhcmdzLnNwbGljZShsYXN0QywgMCwgYyk7XG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIEludm9rZXMgYGNvbnNvbGUubG9nKClgIHdoZW4gYXZhaWxhYmxlLlxuICogTm8tb3Agd2hlbiBgY29uc29sZS5sb2dgIGlzIG5vdCBhIFwiZnVuY3Rpb25cIi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGxvZygpIHtcbiAgLy8gdGhpcyBoYWNrZXJ5IGlzIHJlcXVpcmVkIGZvciBJRTgvOSwgd2hlcmVcbiAgLy8gdGhlIGBjb25zb2xlLmxvZ2AgZnVuY3Rpb24gZG9lc24ndCBoYXZlICdhcHBseSdcbiAgcmV0dXJuICdvYmplY3QnID09PSB0eXBlb2YgY29uc29sZVxuICAgICYmIGNvbnNvbGUubG9nXG4gICAgJiYgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwoY29uc29sZS5sb2csIGNvbnNvbGUsIGFyZ3VtZW50cyk7XG59XG5cbi8qKlxuICogU2F2ZSBgbmFtZXNwYWNlc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNhdmUobmFtZXNwYWNlcykge1xuICB0cnkge1xuICAgIGlmIChudWxsID09IG5hbWVzcGFjZXMpIHtcbiAgICAgIGV4cG9ydHMuc3RvcmFnZS5yZW1vdmVJdGVtKCdkZWJ1ZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UuZGVidWcgPSBuYW1lc3BhY2VzO1xuICAgIH1cbiAgfSBjYXRjaChlKSB7fVxufVxuXG4vKipcbiAqIExvYWQgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJucyB0aGUgcHJldmlvdXNseSBwZXJzaXN0ZWQgZGVidWcgbW9kZXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvYWQoKSB7XG4gIHZhciByO1xuICB0cnkge1xuICAgIHIgPSBleHBvcnRzLnN0b3JhZ2UuZGVidWc7XG4gIH0gY2F0Y2goZSkge31cbiAgcmV0dXJuIHI7XG59XG5cbi8qKlxuICogRW5hYmxlIG5hbWVzcGFjZXMgbGlzdGVkIGluIGBsb2NhbFN0b3JhZ2UuZGVidWdgIGluaXRpYWxseS5cbiAqL1xuXG5leHBvcnRzLmVuYWJsZShsb2FkKCkpO1xuXG4vKipcbiAqIExvY2Fsc3RvcmFnZSBhdHRlbXB0cyB0byByZXR1cm4gdGhlIGxvY2Fsc3RvcmFnZS5cbiAqXG4gKiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNhZmFyaSB0aHJvd3NcbiAqIHdoZW4gYSB1c2VyIGRpc2FibGVzIGNvb2tpZXMvbG9jYWxzdG9yYWdlXG4gKiBhbmQgeW91IGF0dGVtcHQgdG8gYWNjZXNzIGl0LlxuICpcbiAqIEByZXR1cm4ge0xvY2FsU3RvcmFnZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvY2Fsc3RvcmFnZSgpe1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlO1xuICB9IGNhdGNoIChlKSB7fVxufVxuIiwiXG4vKipcbiAqIFRoaXMgaXMgdGhlIGNvbW1vbiBsb2dpYyBmb3IgYm90aCB0aGUgTm9kZS5qcyBhbmQgd2ViIGJyb3dzZXJcbiAqIGltcGxlbWVudGF0aW9ucyBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGRlYnVnO1xuZXhwb3J0cy5jb2VyY2UgPSBjb2VyY2U7XG5leHBvcnRzLmRpc2FibGUgPSBkaXNhYmxlO1xuZXhwb3J0cy5lbmFibGUgPSBlbmFibGU7XG5leHBvcnRzLmVuYWJsZWQgPSBlbmFibGVkO1xuZXhwb3J0cy5odW1hbml6ZSA9IHJlcXVpcmUoJ21zJyk7XG5cbi8qKlxuICogVGhlIGN1cnJlbnRseSBhY3RpdmUgZGVidWcgbW9kZSBuYW1lcywgYW5kIG5hbWVzIHRvIHNraXAuXG4gKi9cblxuZXhwb3J0cy5uYW1lcyA9IFtdO1xuZXhwb3J0cy5za2lwcyA9IFtdO1xuXG4vKipcbiAqIE1hcCBvZiBzcGVjaWFsIFwiJW5cIiBoYW5kbGluZyBmdW5jdGlvbnMsIGZvciB0aGUgZGVidWcgXCJmb3JtYXRcIiBhcmd1bWVudC5cbiAqXG4gKiBWYWxpZCBrZXkgbmFtZXMgYXJlIGEgc2luZ2xlLCBsb3dlcmNhc2VkIGxldHRlciwgaS5lLiBcIm5cIi5cbiAqL1xuXG5leHBvcnRzLmZvcm1hdHRlcnMgPSB7fTtcblxuLyoqXG4gKiBQcmV2aW91c2x5IGFzc2lnbmVkIGNvbG9yLlxuICovXG5cbnZhciBwcmV2Q29sb3IgPSAwO1xuXG4vKipcbiAqIFByZXZpb3VzIGxvZyB0aW1lc3RhbXAuXG4gKi9cblxudmFyIHByZXZUaW1lO1xuXG4vKipcbiAqIFNlbGVjdCBhIGNvbG9yLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNlbGVjdENvbG9yKCkge1xuICByZXR1cm4gZXhwb3J0cy5jb2xvcnNbcHJldkNvbG9yKysgJSBleHBvcnRzLmNvbG9ycy5sZW5ndGhdO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRlYnVnZ2VyIHdpdGggdGhlIGdpdmVuIGBuYW1lc3BhY2VgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBkZWJ1ZyhuYW1lc3BhY2UpIHtcblxuICAvLyBkZWZpbmUgdGhlIGBkaXNhYmxlZGAgdmVyc2lvblxuICBmdW5jdGlvbiBkaXNhYmxlZCgpIHtcbiAgfVxuICBkaXNhYmxlZC5lbmFibGVkID0gZmFsc2U7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZW5hYmxlZGAgdmVyc2lvblxuICBmdW5jdGlvbiBlbmFibGVkKCkge1xuXG4gICAgdmFyIHNlbGYgPSBlbmFibGVkO1xuXG4gICAgLy8gc2V0IGBkaWZmYCB0aW1lc3RhbXBcbiAgICB2YXIgY3VyciA9ICtuZXcgRGF0ZSgpO1xuICAgIHZhciBtcyA9IGN1cnIgLSAocHJldlRpbWUgfHwgY3Vycik7XG4gICAgc2VsZi5kaWZmID0gbXM7XG4gICAgc2VsZi5wcmV2ID0gcHJldlRpbWU7XG4gICAgc2VsZi5jdXJyID0gY3VycjtcbiAgICBwcmV2VGltZSA9IGN1cnI7XG5cbiAgICAvLyBhZGQgdGhlIGBjb2xvcmAgaWYgbm90IHNldFxuICAgIGlmIChudWxsID09IHNlbGYudXNlQ29sb3JzKSBzZWxmLnVzZUNvbG9ycyA9IGV4cG9ydHMudXNlQ29sb3JzKCk7XG4gICAgaWYgKG51bGwgPT0gc2VsZi5jb2xvciAmJiBzZWxmLnVzZUNvbG9ycykgc2VsZi5jb2xvciA9IHNlbGVjdENvbG9yKCk7XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICBhcmdzWzBdID0gZXhwb3J0cy5jb2VyY2UoYXJnc1swXSk7XG5cbiAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBhcmdzWzBdKSB7XG4gICAgICAvLyBhbnl0aGluZyBlbHNlIGxldCdzIGluc3BlY3Qgd2l0aCAlb1xuICAgICAgYXJncyA9IFsnJW8nXS5jb25jYXQoYXJncyk7XG4gICAgfVxuXG4gICAgLy8gYXBwbHkgYW55IGBmb3JtYXR0ZXJzYCB0cmFuc2Zvcm1hdGlvbnNcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIGFyZ3NbMF0gPSBhcmdzWzBdLnJlcGxhY2UoLyUoW2EteiVdKS9nLCBmdW5jdGlvbihtYXRjaCwgZm9ybWF0KSB7XG4gICAgICAvLyBpZiB3ZSBlbmNvdW50ZXIgYW4gZXNjYXBlZCAlIHRoZW4gZG9uJ3QgaW5jcmVhc2UgdGhlIGFycmF5IGluZGV4XG4gICAgICBpZiAobWF0Y2ggPT09ICclJScpIHJldHVybiBtYXRjaDtcbiAgICAgIGluZGV4Kys7XG4gICAgICB2YXIgZm9ybWF0dGVyID0gZXhwb3J0cy5mb3JtYXR0ZXJzW2Zvcm1hdF07XG4gICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGZvcm1hdHRlcikge1xuICAgICAgICB2YXIgdmFsID0gYXJnc1tpbmRleF07XG4gICAgICAgIG1hdGNoID0gZm9ybWF0dGVyLmNhbGwoc2VsZiwgdmFsKTtcblxuICAgICAgICAvLyBub3cgd2UgbmVlZCB0byByZW1vdmUgYGFyZ3NbaW5kZXhdYCBzaW5jZSBpdCdzIGlubGluZWQgaW4gdGhlIGBmb3JtYXRgXG4gICAgICAgIGFyZ3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgaW5kZXgtLTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcblxuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZXhwb3J0cy5mb3JtYXRBcmdzKSB7XG4gICAgICBhcmdzID0gZXhwb3J0cy5mb3JtYXRBcmdzLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgIH1cbiAgICB2YXIgbG9nRm4gPSBlbmFibGVkLmxvZyB8fCBleHBvcnRzLmxvZyB8fCBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuICAgIGxvZ0ZuLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG4gIGVuYWJsZWQuZW5hYmxlZCA9IHRydWU7XG5cbiAgdmFyIGZuID0gZXhwb3J0cy5lbmFibGVkKG5hbWVzcGFjZSkgPyBlbmFibGVkIDogZGlzYWJsZWQ7XG5cbiAgZm4ubmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuXG4gIHJldHVybiBmbjtcbn1cblxuLyoqXG4gKiBFbmFibGVzIGEgZGVidWcgbW9kZSBieSBuYW1lc3BhY2VzLiBUaGlzIGNhbiBpbmNsdWRlIG1vZGVzXG4gKiBzZXBhcmF0ZWQgYnkgYSBjb2xvbiBhbmQgd2lsZGNhcmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZShuYW1lc3BhY2VzKSB7XG4gIGV4cG9ydHMuc2F2ZShuYW1lc3BhY2VzKTtcblxuICB2YXIgc3BsaXQgPSAobmFtZXNwYWNlcyB8fCAnJykuc3BsaXQoL1tcXHMsXSsvKTtcbiAgdmFyIGxlbiA9IHNwbGl0Lmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKCFzcGxpdFtpXSkgY29udGludWU7IC8vIGlnbm9yZSBlbXB0eSBzdHJpbmdzXG4gICAgbmFtZXNwYWNlcyA9IHNwbGl0W2ldLnJlcGxhY2UoL1xcKi9nLCAnLio/Jyk7XG4gICAgaWYgKG5hbWVzcGFjZXNbMF0gPT09ICctJykge1xuICAgICAgZXhwb3J0cy5za2lwcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcy5zdWJzdHIoMSkgKyAnJCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5uYW1lcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcyArICckJykpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERpc2FibGUgZGVidWcgb3V0cHV0LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGlzYWJsZSgpIHtcbiAgZXhwb3J0cy5lbmFibGUoJycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gbW9kZSBuYW1lIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZW5hYmxlZChuYW1lKSB7XG4gIHZhciBpLCBsZW47XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMuc2tpcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5za2lwc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMubmFtZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5uYW1lc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENvZXJjZSBgdmFsYC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gY29lcmNlKHZhbCkge1xuICBpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHJldHVybiB2YWwuc3RhY2sgfHwgdmFsLm1lc3NhZ2U7XG4gIHJldHVybiB2YWw7XG59XG4iLCIvKipcbiAqIEhlbHBlcnMuXG4gKi9cblxudmFyIHMgPSAxMDAwO1xudmFyIG0gPSBzICogNjA7XG52YXIgaCA9IG0gKiA2MDtcbnZhciBkID0gaCAqIDI0O1xudmFyIHkgPSBkICogMzY1LjI1O1xuXG4vKipcbiAqIFBhcnNlIG9yIGZvcm1hdCB0aGUgZ2l2ZW4gYHZhbGAuXG4gKlxuICogT3B0aW9uczpcbiAqXG4gKiAgLSBgbG9uZ2AgdmVyYm9zZSBmb3JtYXR0aW5nIFtmYWxzZV1cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1N0cmluZ3xOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsLCBvcHRpb25zKXtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgdmFsKSByZXR1cm4gcGFyc2UodmFsKTtcbiAgcmV0dXJuIG9wdGlvbnMubG9uZ1xuICAgID8gbG9uZyh2YWwpXG4gICAgOiBzaG9ydCh2YWwpO1xufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYHN0cmAgYW5kIHJldHVybiBtaWxsaXNlY29uZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2Uoc3RyKSB7XG4gIHN0ciA9ICcnICsgc3RyO1xuICBpZiAoc3RyLmxlbmd0aCA+IDEwMDAwKSByZXR1cm47XG4gIHZhciBtYXRjaCA9IC9eKCg/OlxcZCspP1xcLj9cXGQrKSAqKG1pbGxpc2Vjb25kcz98bXNlY3M/fG1zfHNlY29uZHM/fHNlY3M/fHN8bWludXRlcz98bWlucz98bXxob3Vycz98aHJzP3xofGRheXM/fGR8eWVhcnM/fHlycz98eSk/JC9pLmV4ZWMoc3RyKTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuO1xuICB2YXIgbiA9IHBhcnNlRmxvYXQobWF0Y2hbMV0pO1xuICB2YXIgdHlwZSA9IChtYXRjaFsyXSB8fCAnbXMnKS50b0xvd2VyQ2FzZSgpO1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICd5ZWFycyc6XG4gICAgY2FzZSAneWVhcic6XG4gICAgY2FzZSAneXJzJzpcbiAgICBjYXNlICd5cic6XG4gICAgY2FzZSAneSc6XG4gICAgICByZXR1cm4gbiAqIHk7XG4gICAgY2FzZSAnZGF5cyc6XG4gICAgY2FzZSAnZGF5JzpcbiAgICBjYXNlICdkJzpcbiAgICAgIHJldHVybiBuICogZDtcbiAgICBjYXNlICdob3Vycyc6XG4gICAgY2FzZSAnaG91cic6XG4gICAgY2FzZSAnaHJzJzpcbiAgICBjYXNlICdocic6XG4gICAgY2FzZSAnaCc6XG4gICAgICByZXR1cm4gbiAqIGg7XG4gICAgY2FzZSAnbWludXRlcyc6XG4gICAgY2FzZSAnbWludXRlJzpcbiAgICBjYXNlICdtaW5zJzpcbiAgICBjYXNlICdtaW4nOlxuICAgIGNhc2UgJ20nOlxuICAgICAgcmV0dXJuIG4gKiBtO1xuICAgIGNhc2UgJ3NlY29uZHMnOlxuICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgY2FzZSAnc2Vjcyc6XG4gICAgY2FzZSAnc2VjJzpcbiAgICBjYXNlICdzJzpcbiAgICAgIHJldHVybiBuICogcztcbiAgICBjYXNlICdtaWxsaXNlY29uZHMnOlxuICAgIGNhc2UgJ21pbGxpc2Vjb25kJzpcbiAgICBjYXNlICdtc2Vjcyc6XG4gICAgY2FzZSAnbXNlYyc6XG4gICAgY2FzZSAnbXMnOlxuICAgICAgcmV0dXJuIG47XG4gIH1cbn1cblxuLyoqXG4gKiBTaG9ydCBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzaG9ydChtcykge1xuICBpZiAobXMgPj0gZCkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBkKSArICdkJztcbiAgaWYgKG1zID49IGgpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gaCkgKyAnaCc7XG4gIGlmIChtcyA+PSBtKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIG0pICsgJ20nO1xuICBpZiAobXMgPj0gcykgcmV0dXJuIE1hdGgucm91bmQobXMgLyBzKSArICdzJztcbiAgcmV0dXJuIG1zICsgJ21zJztcbn1cblxuLyoqXG4gKiBMb25nIGZvcm1hdCBmb3IgYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvbmcobXMpIHtcbiAgcmV0dXJuIHBsdXJhbChtcywgZCwgJ2RheScpXG4gICAgfHwgcGx1cmFsKG1zLCBoLCAnaG91cicpXG4gICAgfHwgcGx1cmFsKG1zLCBtLCAnbWludXRlJylcbiAgICB8fCBwbHVyYWwobXMsIHMsICdzZWNvbmQnKVxuICAgIHx8IG1zICsgJyBtcyc7XG59XG5cbi8qKlxuICogUGx1cmFsaXphdGlvbiBoZWxwZXIuXG4gKi9cblxuZnVuY3Rpb24gcGx1cmFsKG1zLCBuLCBuYW1lKSB7XG4gIGlmIChtcyA8IG4pIHJldHVybjtcbiAgaWYgKG1zIDwgbiAqIDEuNSkgcmV0dXJuIE1hdGguZmxvb3IobXMgLyBuKSArICcgJyArIG5hbWU7XG4gIHJldHVybiBNYXRoLmNlaWwobXMgLyBuKSArICcgJyArIG5hbWUgKyAncyc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcImFuZ3VsYXItZW52b3lcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIkhpZ2hseSBmbGV4aWJsZSBmb3JtIHZhbGlkYXRpb24gbWVzc2FnaW5nIGZvciBBbmd1bGFySlNcIixcbiAgXCJtYWluXCI6IFwiaW5kZXguanNcIixcbiAgXCJhdXRob3JcIjogXCJDaHJpc3RvcGhlciBIaWxsZXIgPGNoaWxsZXJAZm9jdXN2aXNpb24uY29tPlwiLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9kZWNpcGhlcmluYy9hbmd1bGFyLWVudm95LmdpdFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImFuZ3VsYXJcIjogXCJeMS40LjFcIixcbiAgICBcImNoYWlcIjogXCJeMy4wLjBcIixcbiAgICBcImV4cG9zaWZ5XCI6IFwiXjAuNC4zXCIsXG4gICAgXCJncnVudFwiOiBcIl4wLjQuNVwiLFxuICAgIFwiZ3J1bnQtYm93ZXItaW5zdGFsbC1zaW1wbGVcIjogXCJeMS4xLjNcIixcbiAgICBcImdydW50LWJyb3dzZXJpZnlcIjogXCJeMy44LjBcIixcbiAgICBcImdydW50LWJ1bXBcIjogXCJeMC4zLjFcIixcbiAgICBcImdydW50LWNsaVwiOiBcIl4wLjEuMTNcIixcbiAgICBcImdydW50LWNvbnRyaWItY2xlYW5cIjogXCJeMC42LjBcIixcbiAgICBcImdydW50LWNvbnRyaWItY29weVwiOiBcIl4wLjguMFwiLFxuICAgIFwiZ3J1bnQtZGV2LXVwZGF0ZVwiOiBcIl4xLjMuMFwiLFxuICAgIFwiZ3J1bnQtZXNsaW50XCI6IFwiXjE1LjAuMFwiLFxuICAgIFwiZ3J1bnQtZ2gtcGFnZXNcIjogXCJeMC4xMC4wXCIsXG4gICAgXCJncnVudC1sb2Rhc2hcIjogXCJeMC40LjBcIixcbiAgICBcImdydW50LWxvZGFzaC1hdXRvYnVpbGRcIjogXCJeMC4zLjBcIixcbiAgICBcImdydW50LW1vY2hhLWlzdGFuYnVsXCI6IFwiXjIuNC4wXCIsXG4gICAgXCJncnVudC1uZ2RvY3NcIjogXCJeMC4yLjdcIixcbiAgICBcImlzdGFuYnVsXCI6IFwiXjAuMy4xN1wiLFxuICAgIFwiaml0LWdydW50XCI6IFwiXjAuOS4xXCIsXG4gICAgXCJqc29ubWluaWZ5aWZ5XCI6IFwiXjAuMS4xXCIsXG4gICAgXCJsb2FkLWdydW50LWNvbmZpZ1wiOiBcIl4wLjE3LjFcIixcbiAgICBcImxvZGFzaC1jbGlcIjogXCJeMy4xMC4wXCIsXG4gICAgXCJtb2NoYVwiOiBcIl4yLjIuNVwiLFxuICAgIFwidGltZS1ncnVudFwiOiBcIl4xLjIuMVwiLFxuICAgIFwidWdsaWZ5aWZ5XCI6IFwiXjMuMC4xXCJcbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcInRlc3RcIjogXCJncnVudCB0ZXN0XCJcbiAgfSxcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImFuZ3VsYXJcIjogXCJeMS40LjFcIlxuICB9LFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJhbmd1bGFyLWFuaW1hdGVcIjogXCJeMS4zLjE3XCIsXG4gICAgXCJkZWJ1Z1wiOiBcIl4yLjIuMFwiLFxuICAgIFwibG9kYXNoXCI6IFwiXjMuOS4zXCJcbiAgfVxufVxuIl19
