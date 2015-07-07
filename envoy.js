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

},{}]},{},[1]);
