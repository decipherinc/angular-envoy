/*! angular-envoy - v0.0.1
 * 
 * Copyright (c) 2015 Focusvision Worldwide; Licensed MIT
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = require('./lib');

},{"./lib":14}],2:[function(require,module,exports){
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

},{"./action":2,"./list":4,"./messages":5,"./proxy":9}],4:[function(require,module,exports){
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
  return {
    restrict: 'EA',
    scope: true,
    require: '?^envoyMessages',
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, envoyMessages) {
      var parentName = attrs.envoyList || attrs.for;
      var parent;

      if (parentName) {
        parent = $envoy.findParentCtrl($interpolate(parentName)(scope));
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
}
list.$inject = ['$envoy', '$interpolate'];

module.exports = list;

},{"../envoy/opts":12}],5:[function(require,module,exports){
'use strict';

module.exports = require('./messages');

},{"./messages":7}],6:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);
var viewData = require('./viewdata');

var debug = require('debug')('envoy:directives:messages:controller');

function MessagesCtrl($element,
  $envoy,
  $attrs,
  $scope,
  $interpolate) {

  var view;

  /**
   * Bind a view Scope to this directive for display.  Used by
   * `messagesList` directive.
   * @param {ng.$rootScope.Scope} scope
   * @returns {MessagesCtrl} This controller
   */
  this.bindView = function bindView(scope) {
    if (view.scope) {
      throw new Error('view already bound!');
    }
    view.scope = scope;
    scope.data = viewData($envoy.DEFAULT_LEVEL);
    debug('View bound');
    return this;
  };

  this.update = function update(data) {
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
      viewData.className = $envoy.level(errorLevel);
      viewData.title = this.title(errorLevel);

      debug('"%s" updated; view data:', this.$name, viewData);

      return viewData;
    }
  };

  /**
   * Unbind the bound Scope of this controller.
   * @returns {MessagesCtrl} This controller
   */
  this.unbindView = function unbindView() {
    delete view.scope;
    view = null;
    debug('View unbound');
    return this;
  };

  this.addChild = function addChild(child) {
    debug('Adding child "%s" to "%s"', child.$name, this.$name);
    this.$children.push(child);
    child.$parent = this;
    return this;
  };

  this.removeChild = function removeChild(child) {
    debug('Removing child "%s" from "%s"', child.$name, this.$name);
    this.$children.splice(this.$children.indexOf(child), 1);
    delete child.$parent;
    return this;
  };

  this.title = function title(errorLevel) {
    return $envoy.levelDescription(errorLevel);
  };

  this.toString = function toString() {
    return this.$name;
  };

  this.broadcast = $scope.$broadcast.bind($scope);
  this.emit = $scope.$parent.$emit.bind($scope.$parent);

  /**
   * @this MessagesCtrl
   */
  (function init() {
    var form;

    this.$children = [];
    this.$parent = null;
    this.$errorLevel = $envoy.DEFAULT_ERRORLEVEL;

    Object.defineProperties(this, {
      $errorLevel: {
        get: function getErrorLevel() {
          return form.$errorLevel;
        },
        set: function setErrorLevel(value) {
          form.$errorLevel = value;
        }
      },
      $name: {
        get: function getName() {
          return form.$name;
        }
      },
      $viewData: {
        get: function getViewData() {
          var data;
          if ((data = _.get(view, 'scope.data'))) {
            return data;
          }
          if (view.scope) {
            return (view.scope.data = viewData($envoy.DEFAULT_LEVEL));
          }
        },
        set: function setViewData(data) {
          view.scope.data = data;
        }
      }
    });

    form = this.$form = $element.controller('form');

    this.$children = [];

    view =
      this.$parent ? (this.$view = this.$parent.$view) : (this.$view = {});

    $scope.$on('$destroy', $envoy.bindForm(this, this.$name));

  }.call(this));
}

MessagesCtrl.$inject = [
  '$element',
  '$envoy',
  '$attrs',
  '$scope',
  '$interpolate'
];

module.exports = MessagesCtrl;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./viewdata":8,"debug":15}],7:[function(require,module,exports){
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
        $envoy.findParentCtrl(parentName,
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

},{"./messages-ctrl":6,"debug":15}],8:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

var ID_PREFIX = 'envoy-viewdata-';
var debug = require('debug')('envoy:directives:messages:viewdata');

function viewData(defaultLevel) {
  var data = {
    reset: function reset() {
      this.error = false;
      this.messages = {};
      this.title = null;
      this.className = null;
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

},{"debug":15}],9:[function(require,module,exports){
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
      function ProxyCtrl($scope, $element, $attrs, $envoy, $interpolate) {

        var debug = require('debug')('envoy:directives:proxy:controller');
        var target = $interpolate($attrs.envoyProxy || '')($scope);
        var ngModel = $element.controller('ngModel');

        this.update = function update(data) {
          var isValid = !data.errorLevel;
          var errorLevelName = $envoy.level(data.errorLevel);
          debug('Proxy "%s" updated w/ errorLevel %s', target, errorLevelName);
          _.each($envoy.ERRORLEVELS, function (errorlevel, errorLevelName) {
            $element.removeClass(errorLevelName);
          });
          ngModel.$setValidity(TOKEN, isValid);
          if (!isValid) {
            $element.addClass(errorLevelName);
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

},{"debug":15}],10:[function(require,module,exports){
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
   * Map of form name to MessagesCtrl bindings
   * @type {Object.<string,MessagesCtrl>}
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
    if ((result = $envoy._cache[form.$name])) {
      return $q.when(result);
    }
    return $http.get(opts.dataFileUrl, {
      cache: true
    })
      .then(function (res) {

        /**
         * Entirety of the data file
         * @type {Object}
         */
        var messages = res.data;

        if (form) {
          // If the form has an alias (use the "alias" directive),
          // this name takes precedence.
          messages = _(messages[form.$alias || form.$name])
            // here we pick only the controls that are invalid.
            .mapValues(function (controlMsgOptions, controlMsgName) {
              var formControl = form[controlMsgName];
              // if this is truthy, then we have errors in the given
              // control
              var error = formControl && _.size(formControl.$error);

              if (formControl && error) {
                // get the problem tokens and grab any actions
                // if present.  actions are assigned at the control
                // level, but we don't have granular control over
                // which validation token triggers which action.
                // so, if there were two problems with one control,
                // both tokens would receive the action prop.
                return _(controlMsgOptions)
                  .pick(_.keys(formControl.$error))
                  .each(function (tokenInfo) {
                    tokenInfo.action =
                      $envoy.getAction(form.$name, controlMsgName);
                  })
                  .value();

              }
            })
            .value();
        }

        $envoy._cache[form.$name] = messages;

        return messages;
      });
  }

  prototype = {

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
      var defaultLevelNum = LEVELS[opts.defaultLevel];

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

    _findParents: function findParents(ctrl, list) {
      list = list || [];
      if (ctrl.$parent) {
        list.push(ctrl.$parent);
        return findParents(ctrl.$parent, list);
      }
      return list;
    },

    /**
     * For a MessageCtrl, find all children (recursively).
     * @param {MessageCtrl} ctrl envoyMessage Controller
     * @param {Array.<MessageCtrl>} [list=[]] Array of children
     * @returns {Array.<MessageCtrl>} Array of children
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
       * @type {Array.<(MessageCtrl|ProxyCtrl)>}
       */
      var boundCtrls = _.toArray(bindings[form.$name]);

      /**
       * Those of the bound controls which are envoyMessage controllers.
       * These have actual form objects within them, so we'll use them
       * to determine the appropriate errorlevel(s).
       * @type {Array.<MessageCtrl>}
       */
      var messageCtrls;

      /**
       * All parent controllers of the messageCtrls.
       * @type {Array.<MessageCtrl>}
       */
      var parentCtrls;

      if (!boundCtrls.length) {
        // nobody cares.
        return;
      }

      messageCtrls = _.filter(boundCtrls, function (ctrl) {
        return ctrl.$form;
      });

      parentCtrls = _(messageCtrls)
        .map(function (child) {
          return $envoy._findParents(child);
        })
        .flatten()
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
              _(messageCtrls)
                .map(function (ctrl) {
                  return $envoy._findChildren(ctrl);
                })
                .flatten()
                .map(function (childCtrl) {
                  return _.isNumber(childCtrl.$errorLevel) ?
                    childCtrl.$errorLevel :
                    $envoy.DEFAULT_ERRORLEVEL;
                })
                .max());
          }

          _.each(boundCtrls, update);

          _.each(parentCtrls, function (ctrl) {
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
     * @param {MessagesFormController} form The form whose control changed
     * @param {(ngModel.NgModelController|MessagesFormController)} control The
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
     * Gets a stored action.
     * @param {string} formName Name of form for action
     * @param {string} controlName Name of control for action
     * @returns {(string|undefined)} The action (AngularJS
     *     expression), if it exists.
     */
    getAction: function getAction(formName, controlName) {
      return _.get(actions, _.format('%s.%s', formName, controlName));
    },

    /**
     * Utility function to get a parent envoy directive.
     * @param {string} formName Find the messagesDirectiveCtrl
     *     attached to form with this name
     * @param {MessagesCtrl} envoyMessages Current
     *     messagesDirectiveCtrl
     * @returns {MessagesCtrl}
     */
    findParentCtrl: function findParentCtrl(formName, envoyMessages) {
      while (envoyMessages.$name !== formName) {
        envoyMessages = envoyMessages.$parent;
        if (!envoyMessages) {
          throw new Error('cannot find parent with name ' + formName);
        }
      }
      return envoyMessages;
    },

    levelDescription: function levelDescription(errorLevel) {
      return opts.levels[errorLevel].description;
    },

    /**
     * Exposed for handiness
     * @type {string}
     */
    DEFAULT_LEVEL: opts.defaultLevel,

    DEFAULT_ERRORLEVEL: LEVELS[opts.defaultLevel],

    /**
     * Exposed for handiness.  The kinder, gentler version of
     * opts.levels
     * @type {Object.<string,number>}
     */
    ERRORLEVELS: LEVELS,

    /**
     * Exposed for handiness
     * @type {Array.<Object.<string,string>>}
     */
    LEVELS: opts.levels,

    opts: opts

  };

  _.extend($envoy, prototype);

  return $envoy;
}
envoyFactory.$inject = ['$http', '$q'];

module.exports = envoyFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./opts":12,"debug":15}],11:[function(require,module,exports){
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

},{"./factory":10,"./opts":12,"debug":15}],12:[function(require,module,exports){
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
var DEFAULT_DATA_FILE = 'messages.json';

/**
 * The default level
 * @type {string}
 */
var DEFAULT_LEVEL = 'ok';

module.exports = {
  levels: DEFAULT_LEVELS,
  defaultLevel: DEFAULT_LEVEL,
  dataFileUrl: DEFAULT_DATA_FILE,
  templateUrl: 'partials/messages.html'
};


},{}],13:[function(require,module,exports){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":15}],14:[function(require,module,exports){
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

function config($provide) {
  $provide.decorator('ngFormDirective', formDecorator);
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

envoy = angular.module(MODULE_NAME, [])
  .config(config)
  .provider('$envoy', $envoy);

_.each(directives, function (directive, name) {
  envoy.directive(name, directive);
});

module.exports = envoy;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../package.json":18,"./directives":3,"./envoy":11,"./form-decorator":13,"debug":15}],15:[function(require,module,exports){

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

},{"./debug":16}],16:[function(require,module,exports){

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

},{"ms":17}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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
    "browserify": "^10.2.4",
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
    "grunt-mocha-istanbul": "^2.4.0",
    "grunt-ngdocs": "^0.2.7",
    "istanbul": "^0.3.17",
    "jit-grunt": "^0.9.1",
    "jsonminifyify": "^0.1.1",
    "load-grunt-config": "^0.17.1",
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
    "debug": "^2.2.0",
    "lodash": "^3.9.3"
  }
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2FjdGlvbi5qcyIsImxpYi9kaXJlY3RpdmVzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbGlzdC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvbWVzc2FnZXMtY3RybC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL21lc3NhZ2VzLmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvdmlld2RhdGEuanMiLCJsaWIvZGlyZWN0aXZlcy9wcm94eS5qcyIsImxpYi9lbnZveS9mYWN0b3J5LmpzIiwibGliL2Vudm95L2luZGV4LmpzIiwibGliL2Vudm95L29wdHMuanMiLCJsaWIvZm9ybS1kZWNvcmF0b3IuanMiLCJsaWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVidWcvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9ub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBOzs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWInKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lBY3Rpb25cbiAqIEByZXN0cmljdCBBXG4gKiBAZGVzY3JpcHRpb25cbiAqIERlc2NyaWJlcyBhIGRpcmVjdGl2ZSB3aGVyZWluIHlvdSBjYW4gc3VwcGx5IGFuIGFjdGlvbiAoQW5ndWxhckpTXG4gKiBleHByZXNzaW9uKSB0byBiZSBleGVjdXRlZCBmcm9tIHRoZSBtZXNzYWdlIGxpc3QgZm9yIGEgcGFydGljdWxhclxuICogY29udHJvbC5cbiAqXG4gKiBJbiBzaG9ydCwgeW91IHdhbnQgdG8gdXNlIHRoaXMgdG8gYWN0aXZhdGUgYSBmb3JtIGZpZWxkIHdoZW4gdGhlIHVzZXJcbiAqIGNsaWNrcyBvbiB0aGUgZXJyb3IgbWVzc2FnZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgaHRtbFxuICogPGlucHV0IG5hbWU9XCJ0aXRsZVwiXG4gKiAgICAgICAgdHlwZT1cInRleHRcIlxuICogICAgICAgIG5nLW1vZGVsPVwibXlNb2RlbC50aXRsZVwiXG4gKiAgICAgICAgZW52b3ktYWN0aW9uPVwiZG9Tb21ldGhpbmcoKVwiLz5cbiAqIGBgYFxuICovXG5mdW5jdGlvbiBhY3Rpb24oJGVudm95KSB7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIHJlcXVpcmU6IFsnbmdNb2RlbCcsICdeZm9ybSddLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmxzKSB7XG4gICAgICB2YXIgbmdNb2RlbCA9IGN0cmxzWzBdO1xuICAgICAgdmFyIGZvcm0gPSBjdHJsc1sxXTtcbiAgICAgIHZhciBhY3Rpb247XG5cbiAgICAgIGlmICgoYWN0aW9uID0gYXR0cnMuZW52b3lBY3Rpb24pICYmIG5nTW9kZWwuJG5hbWUgJiYgZm9ybS4kbmFtZSkge1xuICAgICAgICAkZW52b3kuc2V0QWN0aW9uKGZvcm0uJG5hbWUsIG5nTW9kZWwuJG5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzY29wZS4kZXZhbChhY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5hY3Rpb24uJGluamVjdCA9IFsnJGVudm95J107XG5cbm1vZHVsZS5leHBvcnRzID0gYWN0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJ2Vudm95QWN0aW9uJzogcmVxdWlyZSgnLi9hY3Rpb24nKSxcbiAgJ2Vudm95TWVzc2FnZXMnOiByZXF1aXJlKCcuL21lc3NhZ2VzJyksXG4gICdlbnZveUxpc3QnOiByZXF1aXJlKCcuL2xpc3QnKSxcbiAgJ2Vudm95UHJveHknOiByZXF1aXJlKCcuL3Byb3h5Jylcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBvcHRzID0gcmVxdWlyZSgnLi4vZW52b3kvb3B0cycpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveUxpc3RcbiAqIEBkZXNjcmlwdGlvblxuICogRGVmaW5lcyBhIGRpcmVjdGl2ZSB3aGljaCB3aWxsIGRpc3BsYXkgYSBsaXN0IG9mIGFsbCBtZXNzYWdlc1xuICogZm9yIGEgZm9ybS5cbiAqXG4gKiBUaGUgdGVtcGxhdGUgZm9yIHRoZSBsaXN0IGlzIHRoZSBwcm9wZXJ0eSBgdGVtcGxhdGVVcmxgIG9mXG4gKiAkZW52b3lQcm92aWRlci5cbiAqXG4gKiBUaGUgdGFyZ2V0IGZvcm0gY2FuIGJlIHNwZWNpZmllZCwgYnkgbmFtZSAod2l0aCBpbnRlcnBvbGF0aW9uIGF2YWlsYWJsZSksXG4gKiBpbiB0aGUgYGVudm95TGlzdGAgYXR0cmlidXRlIG9yIHRoZSBgZm9yYCBhdHRyaWJ1dGUuICBUaGlzIGF0dHJpYnV0ZSBtYXlcbiAqIGJlIG9taXR0ZWQgaWYgdGhlIGBlbnZveUxpc3RgIGRpcmVjdGl2ZSBoYXMgYW4gYGVudm95TWVzc2FnZXNgIGFuY2VzdG9yLlxuICogQGV4YW1wbGVcbiAqIGBgYGh0bWxcbiAqIDxkaXYgZW52b3ktbGlzdD1cImNvbmZpZ0Zvcm1cIj48L2Rpdj5cbiAqIDwhLS0gb3IgLS0+XG4gKiA8ZW52b3ktbGlzdCBmb3I9XCJjb25maWdGb3JtXCI+PC9lbnZveS1saXN0PlxuICogYGBgXG4gKi9cbmZ1bmN0aW9uIGxpc3QoJGVudm95LCAkaW50ZXJwb2xhdGUpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICByZXF1aXJlOiAnP15lbnZveU1lc3NhZ2VzJyxcbiAgICB0ZW1wbGF0ZVVybDogb3B0cy50ZW1wbGF0ZVVybCxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBlbnZveU1lc3NhZ2VzKSB7XG4gICAgICB2YXIgcGFyZW50TmFtZSA9IGF0dHJzLmVudm95TGlzdCB8fCBhdHRycy5mb3I7XG4gICAgICB2YXIgcGFyZW50O1xuXG4gICAgICBpZiAocGFyZW50TmFtZSkge1xuICAgICAgICBwYXJlbnQgPSAkZW52b3kuZmluZFBhcmVudEN0cmwoJGludGVycG9sYXRlKHBhcmVudE5hbWUpKHNjb3BlKSk7XG4gICAgICB9IGVsc2UgaWYgKGVudm95TWVzc2FnZXMpIHtcbiAgICAgICAgcGFyZW50ID0gZW52b3lNZXNzYWdlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZW52b3lMaXN0IHJlcXVpcmVzIGFuIGFuY2VzdG9yIGVudm95TWVzc2FnZXMgJyArXG4gICAgICAgICAgJ2RpcmVjdGl2ZSBvciBhIGZvcm0gbmFtZScpO1xuICAgICAgfVxuXG4gICAgICBwYXJlbnQuYmluZFZpZXcoc2NvcGUpO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBwYXJlbnQudW5iaW5kVmlldygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxubGlzdC4kaW5qZWN0ID0gWyckZW52b3knLCAnJGludGVycG9sYXRlJ107XG5cbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL21lc3NhZ2VzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xudmFyIHZpZXdEYXRhID0gcmVxdWlyZSgnLi92aWV3ZGF0YScpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTpkaXJlY3RpdmVzOm1lc3NhZ2VzOmNvbnRyb2xsZXInKTtcblxuZnVuY3Rpb24gTWVzc2FnZXNDdHJsKCRlbGVtZW50LFxuICAkZW52b3ksXG4gICRhdHRycyxcbiAgJHNjb3BlLFxuICAkaW50ZXJwb2xhdGUpIHtcblxuICB2YXIgdmlldztcblxuICAvKipcbiAgICogQmluZCBhIHZpZXcgU2NvcGUgdG8gdGhpcyBkaXJlY3RpdmUgZm9yIGRpc3BsYXkuICBVc2VkIGJ5XG4gICAqIGBtZXNzYWdlc0xpc3RgIGRpcmVjdGl2ZS5cbiAgICogQHBhcmFtIHtuZy4kcm9vdFNjb3BlLlNjb3BlfSBzY29wZVxuICAgKiBAcmV0dXJucyB7TWVzc2FnZXNDdHJsfSBUaGlzIGNvbnRyb2xsZXJcbiAgICovXG4gIHRoaXMuYmluZFZpZXcgPSBmdW5jdGlvbiBiaW5kVmlldyhzY29wZSkge1xuICAgIGlmICh2aWV3LnNjb3BlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ZpZXcgYWxyZWFkeSBib3VuZCEnKTtcbiAgICB9XG4gICAgdmlldy5zY29wZSA9IHNjb3BlO1xuICAgIHNjb3BlLmRhdGEgPSB2aWV3RGF0YSgkZW52b3kuREVGQVVMVF9MRVZFTCk7XG4gICAgZGVidWcoJ1ZpZXcgYm91bmQnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShkYXRhKSB7XG4gICAgdmFyIHZpZXdEYXRhID0gdGhpcy4kdmlld0RhdGE7XG4gICAgdmFyIGVycm9yTGV2ZWw7XG5cbiAgICBpZiAodmlld0RhdGEpIHtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGluZyB3aXRoIG5ldyBkYXRhOicsIHRoaXMuJG5hbWUsIGRhdGEpO1xuXG4gICAgICB0aGlzLiRlcnJvckxldmVsID1cbiAgICAgICAgZXJyb3JMZXZlbCA9XG4gICAgICAgICAgXy5pc051bWJlcihkYXRhLmVycm9yTGV2ZWwpID8gZGF0YS5lcnJvckxldmVsIDogdGhpcy4kZXJyb3JMZXZlbDtcblxuICAgICAgLy8gdGhpcyBiZWFzdCBpcyBraW5kIG9mIGEgY3VzdG9tIG1lcmdlXG4gICAgICBfLmVhY2goZGF0YS5tZXNzYWdlcywgZnVuY3Rpb24gKGZvcm1NZXNzYWdlcywgZm9ybU5hbWUpIHtcbiAgICAgICAgaWYgKHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXSkge1xuICAgICAgICAgIF8uZWFjaChmb3JtTWVzc2FnZXMsIGZ1bmN0aW9uIChjb250cm9sTWVzc2FnZXMsIGNvbnRyb2xOYW1lKSB7XG4gICAgICAgICAgICBpZiAoXy5pc09iamVjdChjb250cm9sTWVzc2FnZXMpKSB7XG4gICAgICAgICAgICAgIGlmICh2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV1bY29udHJvbE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgXy5leHRlbmQodmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSxcbiAgICAgICAgICAgICAgICAgIGNvbnRyb2xNZXNzYWdlcyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSA9IGNvbnRyb2xNZXNzYWdlcztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGVsZXRlIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdID0gZm9ybU1lc3NhZ2VzO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZpZXdEYXRhLmVycm9yID0gISFlcnJvckxldmVsO1xuICAgICAgdmlld0RhdGEuY2xhc3NOYW1lID0gJGVudm95LmxldmVsKGVycm9yTGV2ZWwpO1xuICAgICAgdmlld0RhdGEudGl0bGUgPSB0aGlzLnRpdGxlKGVycm9yTGV2ZWwpO1xuXG4gICAgICBkZWJ1ZygnXCIlc1wiIHVwZGF0ZWQ7IHZpZXcgZGF0YTonLCB0aGlzLiRuYW1lLCB2aWV3RGF0YSk7XG5cbiAgICAgIHJldHVybiB2aWV3RGF0YTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuYmluZCB0aGUgYm91bmQgU2NvcGUgb2YgdGhpcyBjb250cm9sbGVyLlxuICAgKiBAcmV0dXJucyB7TWVzc2FnZXNDdHJsfSBUaGlzIGNvbnRyb2xsZXJcbiAgICovXG4gIHRoaXMudW5iaW5kVmlldyA9IGZ1bmN0aW9uIHVuYmluZFZpZXcoKSB7XG4gICAgZGVsZXRlIHZpZXcuc2NvcGU7XG4gICAgdmlldyA9IG51bGw7XG4gICAgZGVidWcoJ1ZpZXcgdW5ib3VuZCcpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMuYWRkQ2hpbGQgPSBmdW5jdGlvbiBhZGRDaGlsZChjaGlsZCkge1xuICAgIGRlYnVnKCdBZGRpbmcgY2hpbGQgXCIlc1wiIHRvIFwiJXNcIicsIGNoaWxkLiRuYW1lLCB0aGlzLiRuYW1lKTtcbiAgICB0aGlzLiRjaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICBjaGlsZC4kcGFyZW50ID0gdGhpcztcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICB0aGlzLnJlbW92ZUNoaWxkID0gZnVuY3Rpb24gcmVtb3ZlQ2hpbGQoY2hpbGQpIHtcbiAgICBkZWJ1ZygnUmVtb3ZpbmcgY2hpbGQgXCIlc1wiIGZyb20gXCIlc1wiJywgY2hpbGQuJG5hbWUsIHRoaXMuJG5hbWUpO1xuICAgIHRoaXMuJGNoaWxkcmVuLnNwbGljZSh0aGlzLiRjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSwgMSk7XG4gICAgZGVsZXRlIGNoaWxkLiRwYXJlbnQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy50aXRsZSA9IGZ1bmN0aW9uIHRpdGxlKGVycm9yTGV2ZWwpIHtcbiAgICByZXR1cm4gJGVudm95LmxldmVsRGVzY3JpcHRpb24oZXJyb3JMZXZlbCk7XG4gIH07XG5cbiAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLiRuYW1lO1xuICB9O1xuXG4gIHRoaXMuYnJvYWRjYXN0ID0gJHNjb3BlLiRicm9hZGNhc3QuYmluZCgkc2NvcGUpO1xuICB0aGlzLmVtaXQgPSAkc2NvcGUuJHBhcmVudC4kZW1pdC5iaW5kKCRzY29wZS4kcGFyZW50KTtcblxuICAvKipcbiAgICogQHRoaXMgTWVzc2FnZXNDdHJsXG4gICAqL1xuICAoZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB2YXIgZm9ybTtcblxuICAgIHRoaXMuJGNoaWxkcmVuID0gW107XG4gICAgdGhpcy4kcGFyZW50ID0gbnVsbDtcbiAgICB0aGlzLiRlcnJvckxldmVsID0gJGVudm95LkRFRkFVTFRfRVJST1JMRVZFTDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgICRlcnJvckxldmVsOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0RXJyb3JMZXZlbCgpIHtcbiAgICAgICAgICByZXR1cm4gZm9ybS4kZXJyb3JMZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXRFcnJvckxldmVsKHZhbHVlKSB7XG4gICAgICAgICAgZm9ybS4kZXJyb3JMZXZlbCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJG5hbWU6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXROYW1lKCkge1xuICAgICAgICAgIHJldHVybiBmb3JtLiRuYW1lO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJHZpZXdEYXRhOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0Vmlld0RhdGEoKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgICAgaWYgKChkYXRhID0gXy5nZXQodmlldywgJ3Njb3BlLmRhdGEnKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmlldy5zY29wZSkge1xuICAgICAgICAgICAgcmV0dXJuICh2aWV3LnNjb3BlLmRhdGEgPSB2aWV3RGF0YSgkZW52b3kuREVGQVVMVF9MRVZFTCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBzZXRWaWV3RGF0YShkYXRhKSB7XG4gICAgICAgICAgdmlldy5zY29wZS5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZm9ybSA9IHRoaXMuJGZvcm0gPSAkZWxlbWVudC5jb250cm9sbGVyKCdmb3JtJyk7XG5cbiAgICB0aGlzLiRjaGlsZHJlbiA9IFtdO1xuXG4gICAgdmlldyA9XG4gICAgICB0aGlzLiRwYXJlbnQgPyAodGhpcy4kdmlldyA9IHRoaXMuJHBhcmVudC4kdmlldykgOiAodGhpcy4kdmlldyA9IHt9KTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgJGVudm95LmJpbmRGb3JtKHRoaXMsIHRoaXMuJG5hbWUpKTtcblxuICB9LmNhbGwodGhpcykpO1xufVxuXG5NZXNzYWdlc0N0cmwuJGluamVjdCA9IFtcbiAgJyRlbGVtZW50JyxcbiAgJyRlbnZveScsXG4gICckYXR0cnMnLFxuICAnJHNjb3BlJyxcbiAgJyRpbnRlcnBvbGF0ZSdcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZXNDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveU1lc3NhZ2VzXG4gKiBAcmVzdHJpY3QgQUVcbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGFyZW50XSBJZiB0aGlzIGRpcmVjdGl2ZSBpcyBpbiBhIHN1YmZvcm0gb2Ygc29tZSBvdGhlclxuICogZm9ybSB3aGljaCBpcyAqYWxzbyogdXNpbmcgdGhlIGBlbnZveU1lc3NhZ2VzYCBkaXJlY3RpdmUsIGFuZCB5b3Ugd2lzaCB0b1xuICogZGlzcGxheSBtZXNzYWdlcyB3aXRoaW4gaXRzIGxpc3QsIHNwZWNpZnkgaXRzIGZvcm0gbmFtZSBoZXJlLlxuICogQGRlc2NyaXB0aW9uXG4gKiBFbmFibGVzIGRpc3BsYXkgb2YgbWVzc2FnZXMgZm9yIGEgZm9ybS5cbiAqL1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTpkaXJlY3RpdmVzOm1lc3NhZ2VzJyk7XG5cbmZ1bmN0aW9uIG1lc3NhZ2VzKCRpbnRlcnBvbGF0ZSwgJGVudm95KSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgLy8gaXMgaXQgZHVtYiB0byByZXF1aXJlIHlvdXIgb3duIGNvbnRyb2xsZXI/XG4gICAgcmVxdWlyZTogJ2Vudm95TWVzc2FnZXMnLFxuICAgIGNvbnRyb2xsZXI6IHJlcXVpcmUoJy4vbWVzc2FnZXMtY3RybCcpLFxuICAgIHNjb3BlOiB0cnVlLFxuICAgIGxpbms6IGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICB2YXIgcGFyZW50TmFtZTtcblxuICAgICAgaWYgKGF0dHJzLnBhcmVudCAmJiAocGFyZW50TmFtZSA9ICRpbnRlcnBvbGF0ZShhdHRycy5wYXJlbnQpKHNjb3BlKSkpIHtcbiAgICAgICAgJGVudm95LmZpbmRQYXJlbnRDdHJsKHBhcmVudE5hbWUsXG4gICAgICAgICAgZWxlbWVudC5wYXJlbnQoKS5jb250cm9sbGVyKCdlbnZveU1lc3NhZ2VzJykpLmFkZENoaWxkKGN0cmwpO1xuXG4gICAgICAgIGlmIChjdHJsLiRwYXJlbnQuJGZvcm0gPT09IGN0cmwuJGZvcm0pIHtcbiAgICAgICAgICBjdHJsLiRwYXJlbnQucmVtb3ZlQ2hpbGQoY3RybCk7XG4gICAgICAgICAgZGVidWcoJ0F0dGVtcHRlZCB0byBpbml0aWFsaXplICVzIHdpdGggaXRzIG93biBwYXJlbnQnLFxuICAgICAgICAgICAgY3RybC4kZm9ybS4kbmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGN0cmwuJHBhcmVudCkge1xuICAgICAgICAgIGN0cmwuJHBhcmVudC5yZW1vdmVDaGlsZChjdHJsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxubWVzc2FnZXMuJGluamVjdCA9IFsnJGludGVycG9sYXRlJywgJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1lc3NhZ2VzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIElEX1BSRUZJWCA9ICdlbnZveS12aWV3ZGF0YS0nO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlczp2aWV3ZGF0YScpO1xuXG5mdW5jdGlvbiB2aWV3RGF0YShkZWZhdWx0TGV2ZWwpIHtcbiAgdmFyIGRhdGEgPSB7XG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IGZhbHNlO1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IHt9O1xuICAgICAgdGhpcy50aXRsZSA9IG51bGw7XG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IG51bGw7XG4gICAgICB0aGlzLmVycm9yTGV2ZWwgPSBkZWZhdWx0TGV2ZWw7XG4gICAgfSxcbiAgICBpZDogXy51bmlxdWVJZChJRF9QUkVGSVgpXG4gIH07XG4gIGRhdGEucmVzZXQoKTtcbiAgZGVidWcoJ0NyZWF0ZWQgdmlld2RhdGEgb2JqZWN0IHdpdGggaWQgXCIlc1wiJywgZGF0YS5pZCk7XG4gIHJldHVybiBkYXRhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXdEYXRhO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveVByb3h5XG4gKiBAcmVzdHJpY3QgQVxuICogQGRlc2NyaXB0aW9uXG4gKiBEZWZpbmVzIGEgZGlyZWN0aXZlIHdoaWNoLCB3aGVuIHVzZWQgd2l0aCBuZ01vZGVsLCB3aWxsIHNldCB0aGUgdmFsaWRpdHlcbiAqIG9mIHRoZSBhc3NvY2lhdGVkIE5nTW9kZWxDb250cm9sbGVyLCBiYXNlZCBvbiB0aGUgdmFsaWRpdHkgb2YgdGhlIHRhcmdldFxuICogZm9ybS5cbiAqL1xuZnVuY3Rpb24gcHJveHkoKSB7XG5cbiAgLyoqXG4gICAqIEFueXRoaW5nIHRoYXQgbmVlZHMgdmFsaWRhdGluZyBuZWVkcyBhIHRva2VuLCBzbywgaGVyZSdzIG9uZS5cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHZhciBUT0tFTiA9ICdwcm94eSc7XG5cbiAgLyoqXG4gICAqIFRoZSBjbGFzcyB0byBiZSBhcHBsaWVkIGlmIHRoZSBkaXJlY3RpdmUncyB2YWx1ZSBpcyBwcmVzZW50XG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICB2YXIgQ0xBU1NOQU1FID0gJ2Vycm9ybGV2ZWwnO1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGVsZW1lbnQnLFxuICAgICAgJyRhdHRycycsXG4gICAgICAnJGVudm95JyxcbiAgICAgICckaW50ZXJwb2xhdGUnLFxuICAgICAgZnVuY3Rpb24gUHJveHlDdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJGVudm95LCAkaW50ZXJwb2xhdGUpIHtcblxuICAgICAgICB2YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTpkaXJlY3RpdmVzOnByb3h5OmNvbnRyb2xsZXInKTtcbiAgICAgICAgdmFyIHRhcmdldCA9ICRpbnRlcnBvbGF0ZSgkYXR0cnMuZW52b3lQcm94eSB8fCAnJykoJHNjb3BlKTtcbiAgICAgICAgdmFyIG5nTW9kZWwgPSAkZWxlbWVudC5jb250cm9sbGVyKCduZ01vZGVsJyk7XG5cbiAgICAgICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgICAgICAgIHZhciBpc1ZhbGlkID0gIWRhdGEuZXJyb3JMZXZlbDtcbiAgICAgICAgICB2YXIgZXJyb3JMZXZlbE5hbWUgPSAkZW52b3kubGV2ZWwoZGF0YS5lcnJvckxldmVsKTtcbiAgICAgICAgICBkZWJ1ZygnUHJveHkgXCIlc1wiIHVwZGF0ZWQgdy8gZXJyb3JMZXZlbCAlcycsIHRhcmdldCwgZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIF8uZWFjaCgkZW52b3kuRVJST1JMRVZFTFMsIGZ1bmN0aW9uIChlcnJvcmxldmVsLCBlcnJvckxldmVsTmFtZSkge1xuICAgICAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIG5nTW9kZWwuJHNldFZhbGlkaXR5KFRPS0VOLCBpc1ZhbGlkKTtcbiAgICAgICAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKGVycm9yTGV2ZWxOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLiRuYW1lICsgJy1wcm94eSc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy4kbmFtZSA9IHRhcmdldDtcblxuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgJGVsZW1lbnQuYWRkQ2xhc3MoQ0xBU1NOQU1FKTtcbiAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICRlbnZveS5iaW5kRm9ybSh0aGlzLCB0YXJnZXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Vudm95UHJveHkgZGlyZWN0aXZlIG5lZWRzIGEgdmFsdWUhJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdXG4gIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IHByb3h5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciBvcHRzID0gcmVxdWlyZSgnLi9vcHRzJyk7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OiRlbnZveTpmYWN0b3J5Jyk7XG5cbnZhciBERUJPVU5DRV9NUyA9IDI1MDtcblxuZnVuY3Rpb24gZW52b3lGYWN0b3J5KCRodHRwLCAkcSkge1xuXG4gIC8qKlxuICAgKiBFcnJvciBsZXZlbHMgYXMgY29uZmlndXJlZCBpbiBvcHRzIGluIG9yZGVyLCBieSBuYW1lXG4gICAqIEB0eXBlIHtBcnJheS48c3RyaW5nPn1cbiAgICovXG4gIHZhciBMRVZFTF9BUlJBWSA9IF8ucGx1Y2sob3B0cy5sZXZlbHMsICduYW1lJyk7XG5cbiAgLyoqXG4gICAqIE1hcHBpbmcgb2YgZXJyb3IgbGV2ZWwgbmFtZXMgdG8gaW5kaWNlcyBpbiB7QGxpbmsgTEVWRUxfQVJSQVl9XG4gICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fVxuICAgKi9cbiAgdmFyIExFVkVMUyA9IF8oTEVWRUxfQVJSQVkpXG4gICAgLmludmVydCgpXG4gICAgLm1hcFZhbHVlcyhfLnBhcnNlSW50KVxuICAgIC52YWx1ZSgpO1xuXG4gIC8qKlxuICAgKiBMb29rdXAgb2YgZm9ybXMgYW5kIGNvbnRyb2xzIHRvIGFueSBhY3Rpb25zIGJvdW5kIHZpYSB0aGVcbiAgICogbWVzc2FnZUFjdGlvbiBkaXJlY3RpdmUuICBBbiBhY3Rpb24gaXMgc2ltcGx5IGFuIEFuZ3VsYXJKU1xuICAgKiBleHByZXNzaW9uIHdoaWNoIHdpbGwgYmUgZXZhbHVhdGVkLlxuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsT2JqZWN0LjxzdHJpbmcsc3RyaW5nPj59XG4gICAqL1xuICB2YXIgYWN0aW9ucyA9IHt9O1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgZm9ybSBuYW1lIHRvIE1lc3NhZ2VzQ3RybCBiaW5kaW5nc1xuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsTWVzc2FnZXNDdHJsPn1cbiAgICovXG4gIHZhciBiaW5kaW5ncyA9IHt9O1xuXG4gIHZhciBwcm90b3R5cGU7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBzZXJ2aWNlXG4gICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveVxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmV0cmlldmVzIGEgY29sbGVjdGlvbiBvZiBtZXNzYWdlcyBmb3IgYSBmb3JtIGFuZC9vciBjb250cm9sXG4gICAqIHdpdGhpbiB0aGF0IGZvcm0uICBJZiBubyBwYXJhbWV0ZXJzLCByZXR1cm5zIHRoZSBlbnRpcmV0eSBvZiB0aGVcbiAgICogZGF0YSBmaWxlLlxuICAgKiBAcGFyYW0ge0Zvcm1Db250cm9sbGVyfSBmb3JtIEZvcm0gY29udHJvbGxlclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBNZXNzYWdlcyBpbmRleGVkIGJ5IGZvcm0gbmFtZSwgdGhlbiBjb250cm9sIG5hbWUsXG4gICAqIGFuZCBmaW5hbGx5IHZhbGlkYXRpb24gdG9rZW4uICBNYXkgYmUgZW1wdHkgaWYgbm90aGluZyBpcyB3cm9uZ1xuICAgKiB3aXRoIHRoZSBmb3JtLlxuICAgKi9cbiAgZnVuY3Rpb24gJGVudm95KGZvcm0pIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gJGVudm95Ll9jYWNoZVtmb3JtLiRuYW1lXSkpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiAkaHR0cC5nZXQob3B0cy5kYXRhRmlsZVVybCwge1xuICAgICAgY2FjaGU6IHRydWVcbiAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbnRpcmV0eSBvZiB0aGUgZGF0YSBmaWxlXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbWVzc2FnZXMgPSByZXMuZGF0YTtcblxuICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgIC8vIElmIHRoZSBmb3JtIGhhcyBhbiBhbGlhcyAodXNlIHRoZSBcImFsaWFzXCIgZGlyZWN0aXZlKSxcbiAgICAgICAgICAvLyB0aGlzIG5hbWUgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICAgICAgICBtZXNzYWdlcyA9IF8obWVzc2FnZXNbZm9ybS4kYWxpYXMgfHwgZm9ybS4kbmFtZV0pXG4gICAgICAgICAgICAvLyBoZXJlIHdlIHBpY2sgb25seSB0aGUgY29udHJvbHMgdGhhdCBhcmUgaW52YWxpZC5cbiAgICAgICAgICAgIC5tYXBWYWx1ZXMoZnVuY3Rpb24gKGNvbnRyb2xNc2dPcHRpb25zLCBjb250cm9sTXNnTmFtZSkge1xuICAgICAgICAgICAgICB2YXIgZm9ybUNvbnRyb2wgPSBmb3JtW2NvbnRyb2xNc2dOYW1lXTtcbiAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyB0cnV0aHksIHRoZW4gd2UgaGF2ZSBlcnJvcnMgaW4gdGhlIGdpdmVuXG4gICAgICAgICAgICAgIC8vIGNvbnRyb2xcbiAgICAgICAgICAgICAgdmFyIGVycm9yID0gZm9ybUNvbnRyb2wgJiYgXy5zaXplKGZvcm1Db250cm9sLiRlcnJvcik7XG5cbiAgICAgICAgICAgICAgaWYgKGZvcm1Db250cm9sICYmIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBwcm9ibGVtIHRva2VucyBhbmQgZ3JhYiBhbnkgYWN0aW9uc1xuICAgICAgICAgICAgICAgIC8vIGlmIHByZXNlbnQuICBhY3Rpb25zIGFyZSBhc3NpZ25lZCBhdCB0aGUgY29udHJvbFxuICAgICAgICAgICAgICAgIC8vIGxldmVsLCBidXQgd2UgZG9uJ3QgaGF2ZSBncmFudWxhciBjb250cm9sIG92ZXJcbiAgICAgICAgICAgICAgICAvLyB3aGljaCB2YWxpZGF0aW9uIHRva2VuIHRyaWdnZXJzIHdoaWNoIGFjdGlvbi5cbiAgICAgICAgICAgICAgICAvLyBzbywgaWYgdGhlcmUgd2VyZSB0d28gcHJvYmxlbXMgd2l0aCBvbmUgY29udHJvbCxcbiAgICAgICAgICAgICAgICAvLyBib3RoIHRva2VucyB3b3VsZCByZWNlaXZlIHRoZSBhY3Rpb24gcHJvcC5cbiAgICAgICAgICAgICAgICByZXR1cm4gXyhjb250cm9sTXNnT3B0aW9ucylcbiAgICAgICAgICAgICAgICAgIC5waWNrKF8ua2V5cyhmb3JtQ29udHJvbC4kZXJyb3IpKVxuICAgICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHRva2VuSW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbkluZm8uYWN0aW9uID1cbiAgICAgICAgICAgICAgICAgICAgICAkZW52b3kuZ2V0QWN0aW9uKGZvcm0uJG5hbWUsIGNvbnRyb2xNc2dOYW1lKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAudmFsdWUoKTtcblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdID0gbWVzc2FnZXM7XG5cbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgICAgfSk7XG4gIH1cblxuICBwcm90b3R5cGUgPSB7XG5cbiAgICBfY2FjaGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgZnYuZW52b3kuJGVudm95I2xldmVsXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gY29udmVydCBhbiBlcnJvciBsZXZlbCBpbnRvIGEgbnVtYmVyIG9yXG4gICAgICogc3RyaW5nIG9yIHZpY2UgdmVyc2FcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8c3RyaW5nKT19IGVycm9yTGV2ZWwgRXJyb3IgbGV2ZWwuICBJZiBvbWl0dGVkLCB3aWxsXG4gICAgICogcmV0dXJuIHRoZSBkZWZhdWx0IGVycm9yIGxldmVsIGFzIGEgc3RyaW5nLlxuICAgICAqIEByZXR1cm5zIHsobnVtYmVyfHN0cmluZyl9IENvcnJlc3BvbmRpbmcgc3RyaW5nL251bWJlclxuICAgICAqL1xuICAgIGxldmVsOiBmdW5jdGlvbiBsZXZlbChlcnJvckxldmVsKSB7XG4gICAgICByZXR1cm4gXy5pc1N0cmluZyhlcnJvckxldmVsKSA/XG4gICAgICBMRVZFTFNbZXJyb3JMZXZlbF0gfHwgTEVWRUxTW29wdHMuZGVmYXVsdExldmVsXSA6XG4gICAgICBMRVZFTF9BUlJBWVtlcnJvckxldmVsXSB8fCBvcHRzLmRlZmF1bHRMZXZlbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBmb3JtIGFuZCBtZXNzYWdlcyBmb3IgaXQsIGFzIHJldHVybmVkIGJ5ICRlbnZveSgpLFxuICAgICAqIGNhbGN1bGF0ZSB0aGUgbWF4IGVycm9yIGxldmVsLlxuICAgICAqIEBwYXJhbSBmb3JtXG4gICAgICogQHBhcmFtIGZvcm1NZXNzYWdlc1xuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZm9ybUVycm9yTGV2ZWw6IGZ1bmN0aW9uIF9mb3JtRXJyb3JMZXZlbChmb3JtLCBmb3JtTWVzc2FnZXMpIHtcbiAgICAgIC8qKlxuICAgICAgICogSW5kZXggb2YgdGhlIGRlZmF1bHQgZXJyb3IgbGV2ZWxcbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKi9cbiAgICAgIHZhciBkZWZhdWx0TGV2ZWxOdW0gPSBMRVZFTFNbb3B0cy5kZWZhdWx0TGV2ZWxdO1xuXG4gICAgICAvKipcbiAgICAgICAqIE1heGltdW0gZXJyb3IgbGV2ZWwgb2YgYWxsIHZhbGlkYXRpb24gdG9rZW5zIHdpdGhpbiBhbGxcbiAgICAgICAqIGNvbnRyb2xzIG9mIHRoaXMgZm9ybVxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqL1xuICAgICAgdmFyIG1heExldmVsID0gXy5yZWR1Y2UoZm9ybU1lc3NhZ2VzLFxuICAgICAgICBmdW5jdGlvbiAocmVzdWx0LCBjb250cm9sTXNnT3B0cykge1xuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogTWF4aW11bSBlcnJvciBsZXZlbCBvZiBhbnkgdmFsaWRhdGlvbiB0b2tlbiB3aXRoaW5cbiAgICAgICAgICAgKiB0aGUgY29udHJvbCB3aGljaCBpcyBpbiBcImludmFsaWRcIiBzdGF0ZS5cbiAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAqL1xuICAgICAgICAgIHZhciBtYXhDb250cm9sTGV2ZWwgPSBfKGNvbnRyb2xNc2dPcHRzKVxuICAgICAgICAgICAgLnBpY2soZnVuY3Rpb24gKHRva2VuT3B0cywgdG9rZW5OYW1lKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmb3JtLiRlcnJvclt0b2tlbk5hbWVdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5wbHVjaygnbGV2ZWwnKVxuICAgICAgICAgICAgLm1hcCgkZW52b3kubGV2ZWwpXG4gICAgICAgICAgICAubWF4KCk7XG5cbiAgICAgICAgICByZXR1cm4gTWF0aC5tYXgocmVzdWx0LCBtYXhDb250cm9sTGV2ZWwpO1xuICAgICAgICB9LFxuICAgICAgICBkZWZhdWx0TGV2ZWxOdW0pO1xuXG4gICAgICB2YXIgZXJyb3JMZXZlbE5hbWUgPSAkZW52b3kubGV2ZWwobWF4TGV2ZWwpO1xuICAgICAgZGVidWcoJ0NvbXB1dGVkIGVycm9yTGV2ZWwgXCIlc1wiIGZvciBmb3JtIFwiJXNcIicsXG4gICAgICAgIGVycm9yTGV2ZWxOYW1lLFxuICAgICAgICBmb3JtLiRuYW1lKTtcbiAgICAgIHJldHVybiBtYXhMZXZlbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcGxhY2Vob2xkZXIgZm9yIHByb21pc2Ugd2hpbGUgd2UncmUgcnVubmluZyByZWZyZXNoKClcbiAgICAgKi9cbiAgICBfcmVmcmVzaGluZzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNiaW5kRm9ybVxuICAgICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBCaW5kIGEgY29udHJvbGxlciB0byBhIGZvcm0uICBDb3VsZCBiZSBhbnkgb2JqZWN0IGFzIGxvbmcgYXMgaXQgaGFzIGFuXG4gICAgICogYHVwZGF0ZSgpYCBtZXRob2QuICBXaGVuIHRoZSBmb3JtJ3MgdmFsaWRpdHkgY2hhbmdlcywgdGhlIHVwZGF0ZSgpXG4gICAgICogbWV0aG9kIHdpbGwgYmUgY2FsbGVkLCBpZiB0aGUgZm9ybSBoYXMgbWVzc2FnZXMgY29uZmlndXJlZC5cbiAgICAgKiBAcGFyYW0geyp9IGN0cmwgUHJlc3VtZWQgdG8gYmUgYSBgZW52b3lNZXNzYWdlc2AgY29udHJvbGxlciBpbnN0YW5jZSwgYnV0XG4gICAgICogY291bGQgYmUgYGVudm95UHJveHlgIGNvbnRyb2xsZXIgaW5zdGFuY2UgYXMgd2VsbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgTmFtZSBvZiBmb3JtXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBBIGZ1bmN0aW9uIHRoYXQgd2lsbCBicmVhayB0aGUgYmluZGluZ1xuICAgICAqL1xuICAgIGJpbmRGb3JtOiBmdW5jdGlvbiBiaW5kRm9ybShjdHJsLCBmb3JtTmFtZSkge1xuXG4gICAgICB2YXIgZm9ybUJpbmRpbmdzID0gYmluZGluZ3NbZm9ybU5hbWVdID0gYmluZGluZ3NbZm9ybU5hbWVdIHx8IHt9O1xuICAgICAgdmFyIGlkID0gXy51bmlxdWVJZCgnZW52b3ktYmluZGluZy0nKTtcblxuICAgICAgZm9ybUJpbmRpbmdzW2lkXSA9IGN0cmw7XG5cbiAgICAgIHJldHVybiBmdW5jdGlvbiB1bmJpbmRGb3JtKCkge1xuICAgICAgICBkZWxldGUgZm9ybUJpbmRpbmdzW2lkXTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIF9maW5kUGFyZW50czogZnVuY3Rpb24gZmluZFBhcmVudHMoY3RybCwgbGlzdCkge1xuICAgICAgbGlzdCA9IGxpc3QgfHwgW107XG4gICAgICBpZiAoY3RybC4kcGFyZW50KSB7XG4gICAgICAgIGxpc3QucHVzaChjdHJsLiRwYXJlbnQpO1xuICAgICAgICByZXR1cm4gZmluZFBhcmVudHMoY3RybC4kcGFyZW50LCBsaXN0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaXN0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3IgYSBNZXNzYWdlQ3RybCwgZmluZCBhbGwgY2hpbGRyZW4gKHJlY3Vyc2l2ZWx5KS5cbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VDdHJsfSBjdHJsIGVudm95TWVzc2FnZSBDb250cm9sbGVyXG4gICAgICogQHBhcmFtIHtBcnJheS48TWVzc2FnZUN0cmw+fSBbbGlzdD1bXV0gQXJyYXkgb2YgY2hpbGRyZW5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE1lc3NhZ2VDdHJsPn0gQXJyYXkgb2YgY2hpbGRyZW5cbiAgICAgKi9cbiAgICBfZmluZENoaWxkcmVuOiBmdW5jdGlvbiBmaW5kQ2hpbGRyZW4oY3RybCwgbGlzdCkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gY3RybC4kY2hpbGRyZW47XG4gICAgICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgICAgIGlmIChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgbGlzdC5wdXNoLmFwcGx5KGxpc3QsIGNoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIF8oY2hpbGRyZW4pXG4gICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBmaW5kQ2hpbGRyZW4oY2hpbGQsIGxpc3QpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZsYXR0ZW4oKVxuICAgICAgICAgIC51bmlxdWUoKVxuICAgICAgICAgIC52YWx1ZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfSxcblxuICAgIF9yZWZyZXNoOiBfLmRlYm91bmNlKGZ1bmN0aW9uIF9yZWZyZXNoKGZvcm0sIGNvbnRyb2wpIHtcblxuICAgICAgLyoqXG4gICAgICAgKiBBbGwgY29udHJvbGxlcnMgdGhhdCBjYXJlIGFib3V0IHRoaXMgZm9ybSwgYmUgaXQgZW52b3lNZXNzYWdlXG4gICAgICAgKiBjb250cm9sbGVycywgb3IgZW52b3lQcm94eSBjb250cm9sbGVycy5cbiAgICAgICAqIEB0eXBlIHtBcnJheS48KE1lc3NhZ2VDdHJsfFByb3h5Q3RybCk+fVxuICAgICAgICovXG4gICAgICB2YXIgYm91bmRDdHJscyA9IF8udG9BcnJheShiaW5kaW5nc1tmb3JtLiRuYW1lXSk7XG5cbiAgICAgIC8qKlxuICAgICAgICogVGhvc2Ugb2YgdGhlIGJvdW5kIGNvbnRyb2xzIHdoaWNoIGFyZSBlbnZveU1lc3NhZ2UgY29udHJvbGxlcnMuXG4gICAgICAgKiBUaGVzZSBoYXZlIGFjdHVhbCBmb3JtIG9iamVjdHMgd2l0aGluIHRoZW0sIHNvIHdlJ2xsIHVzZSB0aGVtXG4gICAgICAgKiB0byBkZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIGVycm9ybGV2ZWwocykuXG4gICAgICAgKiBAdHlwZSB7QXJyYXkuPE1lc3NhZ2VDdHJsPn1cbiAgICAgICAqL1xuICAgICAgdmFyIG1lc3NhZ2VDdHJscztcblxuICAgICAgLyoqXG4gICAgICAgKiBBbGwgcGFyZW50IGNvbnRyb2xsZXJzIG9mIHRoZSBtZXNzYWdlQ3RybHMuXG4gICAgICAgKiBAdHlwZSB7QXJyYXkuPE1lc3NhZ2VDdHJsPn1cbiAgICAgICAqL1xuICAgICAgdmFyIHBhcmVudEN0cmxzO1xuXG4gICAgICBpZiAoIWJvdW5kQ3RybHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIG5vYm9keSBjYXJlcy5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBtZXNzYWdlQ3RybHMgPSBfLmZpbHRlcihib3VuZEN0cmxzLCBmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICByZXR1cm4gY3RybC4kZm9ybTtcbiAgICAgIH0pO1xuXG4gICAgICBwYXJlbnRDdHJscyA9IF8obWVzc2FnZUN0cmxzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgIHJldHVybiAkZW52b3kuX2ZpbmRQYXJlbnRzKGNoaWxkKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZsYXR0ZW4oKVxuICAgICAgICAudmFsdWUoKTtcblxuICAgICAgJGVudm95Ll9yZWZyZXNoaW5nID0gJGVudm95KGZvcm0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMpIHtcbiAgICAgICAgICB2YXIgbGFzdEVycm9yTGV2ZWwgPSAkZW52b3kuX2Zvcm1FcnJvckxldmVsKGZvcm0sXG4gICAgICAgICAgICBmb3JtTWVzc2FnZXMpO1xuICAgICAgICAgIHZhciBtZXNzYWdlcyA9IF8ub2JqZWN0KFtmb3JtLiRuYW1lXSwgW2Zvcm1NZXNzYWdlc10pO1xuICAgICAgICAgIHZhciBpbmNyZWFzaW5nO1xuXG4gICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKGN0cmwpIHtcbiAgICAgICAgICAgIGN0cmwudXBkYXRlKHtcbiAgICAgICAgICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgICAgICAgICBlcnJvckxldmVsOiBsYXN0RXJyb3JMZXZlbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZvcm0uJGVycm9yTGV2ZWwgPCBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgaW5jcmVhc2luZyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChmb3JtLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgIGluY3JlYXNpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF8uZWFjaChmb3JtTWVzc2FnZXNbY29udHJvbC4kbmFtZV0sIGZ1bmN0aW9uICh0b2tlbkluZm8pIHtcbiAgICAgICAgICAgIHRva2VuSW5mby5hY3Rpb24gPSAkZW52b3kuZ2V0QWN0aW9uKGZvcm0uJG5hbWUsIGNvbnRyb2wuJG5hbWUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGluY3JlYXNpbmcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBsYXN0RXJyb3JMZXZlbCA9IE1hdGgubWF4KGxhc3RFcnJvckxldmVsLFxuICAgICAgICAgICAgICBfKG1lc3NhZ2VDdHJscylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gJGVudm95Ll9maW5kQ2hpbGRyZW4oY3RybCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGRDdHJsKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gXy5pc051bWJlcihjaGlsZEN0cmwuJGVycm9yTGV2ZWwpID9cbiAgICAgICAgICAgICAgICAgICAgY2hpbGRDdHJsLiRlcnJvckxldmVsIDpcbiAgICAgICAgICAgICAgICAgICAgJGVudm95LkRFRkFVTFRfRVJST1JMRVZFTDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5tYXgoKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgXy5lYWNoKGJvdW5kQ3RybHMsIHVwZGF0ZSk7XG5cbiAgICAgICAgICBfLmVhY2gocGFyZW50Q3RybHMsIGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgICBpZiAoaW5jcmVhc2luZykge1xuICAgICAgICAgICAgICBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPiBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gY3RybC4kZXJyb3JMZXZlbDtcbiAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChjdHJsLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgbGFzdEVycm9yTGV2ZWwgPSBjdHJsLiRlcnJvckxldmVsO1xuICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGRlYnVnKGVycik7XG4gICAgICAgIH0pO1xuICAgIH0sIERFQk9VTkNFX01TKSxcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGZ2LmVudm95LiRlbnZveSNyZWZyZXNoXG4gICAgICogQG1ldGhvZE9mIGZ2LmVudm95LiRlbnZveVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIENhbGxlZCBhdXRvbWF0aWNhbGx5IGJ5IGZvcm1zLCBidXQgY291bGQgY29uY2VpdmFibHkgYmUgY2FsbGVkIG1hbnVhbGx5XG4gICAgICogaWYgeW91IHdpc2ggdG8gZXh0ZW5kIEVudm95J3MgZnVuY3Rpb25hbGl0eS4gIFBhc3MgYSBmb3JtIGFuZCBhIGNvbnRyb2w7XG4gICAgICogaWYgdGhlIGNvbnRyb2wgaXMgaW52YWxpZCwgbWVzc2FnZXMgd2lsbCBiZSBwdWxsZWQgb3V0IG9mIHRoZSBkYXRhIGZpbGUsXG4gICAgICogYW5kIHRoZSBjb250cm9sbGVycyBib3VuZCB2aWEge0BsaW5rIGZ2LmVudm95LiRlbnZveSNiaW5kRm9ybSBiaW5kRm9ybX1cbiAgICAgKiB3aWxsIGJlIHVwZGF0ZWQuICBJbiB0dXJuLCB0aGlzIHdpbGwgdXBkYXRlIHRoZSB2aWV3LCBidXQgeW91IGNvdWxkXG4gICAgICogaGF2ZSBhIGN1c3RvbSBjb250cm9sbGVyIGRvIGp1c3QgYWJvdXQgYW55dGhpbmcgaW4gaXRzIGB1cGRhdGUoKWAgbWV0aG9kLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBhc3luY2hyb25vdXMsIGFuZCB0aGUgdW5kZXJseWluZyBtZXRob2QgaXMgZGVib3VuY2VkLS15b3UgbWF5XG4gICAgICogbG9zZSBhIGNhbGwgaWYgeW91J3JlIHRvbyBxdWljay0tYnV0IGlmIHlvdSBjYWxsIGl0IHR3aWNlIHN5bmNocm9ub3VzbHksXG4gICAgICogaWYgdGhlIGZpcnN0IGNhbGwgdGFrZXMgbGVzcyB0aGFuIDI1MG1zLCB0aGUgc2Vjb25kIGNhbGwgd2lsbCBub3RcbiAgICAgKiBleGVjdXRlLlxuICAgICAqXG4gICAgICogVE9ETzogbWFrZSB0aGUgZGVib3VuY2UgdGltZXIgY29uZmlndXJhYmxlLlxuICAgICAqIEBwYXJhbSB7TWVzc2FnZXNGb3JtQ29udHJvbGxlcn0gZm9ybSBUaGUgZm9ybSB3aG9zZSBjb250cm9sIGNoYW5nZWRcbiAgICAgKiBAcGFyYW0geyhuZ01vZGVsLk5nTW9kZWxDb250cm9sbGVyfE1lc3NhZ2VzRm9ybUNvbnRyb2xsZXIpfSBjb250cm9sIFRoZVxuICAgICAqIGNvbnRyb2wgd2hpY2ggY2hhbmdlZC5cbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gUmV0dXJucyBub3RoaW5nXG4gICAgICovXG4gICAgcmVmcmVzaDogZnVuY3Rpb24gcmVmcmVzaChmb3JtLCBjb250cm9sKSB7XG5cbiAgICAgIGRlbGV0ZSAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdO1xuXG4gICAgICBkZWJ1ZygnQ29udHJvbCBcIiVzXCIgaW4gZm9ybSBcIiVzXCIgY2hhbmdlZCB2YWxpZGl0eScsXG4gICAgICAgIGNvbnRyb2wuJG5hbWUsXG4gICAgICAgIGZvcm0uJG5hbWUpO1xuXG4gICAgICBpZiAoJGVudm95Ll9yZWZyZXNoaW5nKSB7XG4gICAgICAgIHJldHVybiAkZW52b3kuX3JlZnJlc2hpbmcudGhlbigkZW52b3kuX3JlZnJlc2guYmluZChudWxsLFxuICAgICAgICAgIGZvcm0sXG4gICAgICAgICAgY29udHJvbCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJHEud2hlbigkZW52b3kuX3JlZnJlc2goZm9ybSwgY29udHJvbCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYW4gYWN0aW9uIHRvIGJlIGV4ZWN1dGVkIGF0IHNvbWUgcG9pbnQuICBVc2VkIGJ5IHRoZVxuICAgICAqIGVudm95TGlzdCBkaXJlY3RpdmUncyB2aWV3LCBzbyB0aGF0IHlvdSBjYW4gY2xpY2sgb24gYW5cbiAgICAgKiBlcnJvciBhbmQgYmUgdGFrZW4gdG8gd2hlcmUgdGhlIGVycm9yIGlzLlxuICAgICAqIEB0b2RvIG1ha2UgY29udHJvbE5hbWUgb3B0aW9uYWw/XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sTmFtZSBOYW1lIG9mIGNvbnRyb2xcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIEFuZ3VsYXJKUyBleHByZXNzaW9uIHRvIGV2YWx1YXRlXG4gICAgICovXG4gICAgc2V0QWN0aW9uOiBmdW5jdGlvbiBzZXRBY3Rpb24oZm9ybU5hbWUsIGNvbnRyb2xOYW1lLCBhY3Rpb24pIHtcbiAgICAgIHZhciBmb3JtQWN0aW9ucyA9IGFjdGlvbnNbZm9ybU5hbWVdID0gYWN0aW9uc1tmb3JtTmFtZV0gfHwge307XG4gICAgICBmb3JtQWN0aW9uc1tjb250cm9sTmFtZV0gPSBhY3Rpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdG9yZWQgYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtTmFtZSBOYW1lIG9mIGZvcm0gZm9yIGFjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sTmFtZSBOYW1lIG9mIGNvbnRyb2wgZm9yIGFjdGlvblxuICAgICAqIEByZXR1cm5zIHsoc3RyaW5nfHVuZGVmaW5lZCl9IFRoZSBhY3Rpb24gKEFuZ3VsYXJKU1xuICAgICAqICAgICBleHByZXNzaW9uKSwgaWYgaXQgZXhpc3RzLlxuICAgICAqL1xuICAgIGdldEFjdGlvbjogZnVuY3Rpb24gZ2V0QWN0aW9uKGZvcm1OYW1lLCBjb250cm9sTmFtZSkge1xuICAgICAgcmV0dXJuIF8uZ2V0KGFjdGlvbnMsIF8uZm9ybWF0KCclcy4lcycsIGZvcm1OYW1lLCBjb250cm9sTmFtZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIGdldCBhIHBhcmVudCBlbnZveSBkaXJlY3RpdmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIEZpbmQgdGhlIG1lc3NhZ2VzRGlyZWN0aXZlQ3RybFxuICAgICAqICAgICBhdHRhY2hlZCB0byBmb3JtIHdpdGggdGhpcyBuYW1lXG4gICAgICogQHBhcmFtIHtNZXNzYWdlc0N0cmx9IGVudm95TWVzc2FnZXMgQ3VycmVudFxuICAgICAqICAgICBtZXNzYWdlc0RpcmVjdGl2ZUN0cmxcbiAgICAgKiBAcmV0dXJucyB7TWVzc2FnZXNDdHJsfVxuICAgICAqL1xuICAgIGZpbmRQYXJlbnRDdHJsOiBmdW5jdGlvbiBmaW5kUGFyZW50Q3RybChmb3JtTmFtZSwgZW52b3lNZXNzYWdlcykge1xuICAgICAgd2hpbGUgKGVudm95TWVzc2FnZXMuJG5hbWUgIT09IGZvcm1OYW1lKSB7XG4gICAgICAgIGVudm95TWVzc2FnZXMgPSBlbnZveU1lc3NhZ2VzLiRwYXJlbnQ7XG4gICAgICAgIGlmICghZW52b3lNZXNzYWdlcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGZpbmQgcGFyZW50IHdpdGggbmFtZSAnICsgZm9ybU5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZW52b3lNZXNzYWdlcztcbiAgICB9LFxuXG4gICAgbGV2ZWxEZXNjcmlwdGlvbjogZnVuY3Rpb24gbGV2ZWxEZXNjcmlwdGlvbihlcnJvckxldmVsKSB7XG4gICAgICByZXR1cm4gb3B0cy5sZXZlbHNbZXJyb3JMZXZlbF0uZGVzY3JpcHRpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cG9zZWQgZm9yIGhhbmRpbmVzc1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgREVGQVVMVF9MRVZFTDogb3B0cy5kZWZhdWx0TGV2ZWwsXG5cbiAgICBERUZBVUxUX0VSUk9STEVWRUw6IExFVkVMU1tvcHRzLmRlZmF1bHRMZXZlbF0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvc2VkIGZvciBoYW5kaW5lc3MuICBUaGUga2luZGVyLCBnZW50bGVyIHZlcnNpb24gb2ZcbiAgICAgKiBvcHRzLmxldmVsc1xuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fVxuICAgICAqL1xuICAgIEVSUk9STEVWRUxTOiBMRVZFTFMsXG5cbiAgICAvKipcbiAgICAgKiBFeHBvc2VkIGZvciBoYW5kaW5lc3NcbiAgICAgKiBAdHlwZSB7QXJyYXkuPE9iamVjdC48c3RyaW5nLHN0cmluZz4+fVxuICAgICAqL1xuICAgIExFVkVMUzogb3B0cy5sZXZlbHMsXG5cbiAgICBvcHRzOiBvcHRzXG5cbiAgfTtcblxuICBfLmV4dGVuZCgkZW52b3ksIHByb3RvdHlwZSk7XG5cbiAgcmV0dXJuICRlbnZveTtcbn1cbmVudm95RmFjdG9yeS4kaW5qZWN0ID0gWyckaHR0cCcsICckcSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95RmFjdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9wdHMgPSByZXF1aXJlKCcuL29wdHMnKTtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTokZW52b3k6cHJvdmlkZXInKTtcbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIGZ2LmVudm95LiRlbnZveVByb3ZpZGVyXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFsbG93cyBjb25maWd1cmF0aW9uIG9mIG9wdGlvbnMgZm9yIEVudm95OyBzZWUgdGhlXG4gKiB7QGxpbmsgZnYuZW52b3kuJGVudm95UHJvdmlkZXIjb3B0aW9ucyBgb3B0aW9ucygpYCBtZXRob2R9LlxuICpcbiAqICMgRGVmYXVsdCBPcHRpb25zXG4gKlxuICogLSBgbGV2ZWxzYDogVGhyZWUgKDMpIGRlZmF1bHQgbGV2ZWxzLiAgYG9rYCwgYHdhcm5pbmdgLCBhbmQgYGVycm9yYCwgaW5cbiAqICAgICBpbmNyZWFzaW5nIHNldmVyaXR5LCBoYXZpbmcgZGVzY3JpcHRpb25zIFwiRml4ZWQhXCIsIFwiV2FybmluZ1wiLCBhbmRcbiAqICAgICBcIkVycm9yXCIsIHJlc3BlY3RpdmVseS5cbiAqIC0gYGRlZmF1bHRMZXZlbDogYG9rYFxuICogLSBgZGF0YUZpbGVVcmxgOiBgbWVzc2FnZXMuanNvbmBcbiAqIC0gYHRlbXBsYXRlVXJsYDogYHBhcnRpYWxzL21lc3NhZ2VzLmh0bWxgXG4gKi9cbmZ1bmN0aW9uIGVudm95UHJvdmlkZXIoKSB7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBmdi5lbnZveS4kZW52b3lQcm92aWRlciNvcHRpb25zXG4gICAqIEBtZXRob2RPZiBmdi5lbnZveS4kZW52b3lQcm92aWRlclxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVXNpbmcgdGhpcyBtZXRob2QsIHNldCBvcHRpb25zIGR1cmluZyBgY29uZmlnKClgIHBoYXNlLlxuICAgKiBAcGFyYW0ge09iamVjdD19IG5ld09wdHMgTmV3IG9wdGlvbnMgdG8gYXNzaWduIG9udG8gZGVmYXVsdHNcbiAgICogQHBhcmFtIHtBcnJheS48T2JqZWN0LjxzdHJpbmcsc3RyaW5nPj49fSBuZXdPcHRzLmxldmVscyBVc2VyLWRlZmluZWRcbiAgICogICAgIGxldmVscy4gIEVhY2ggT2JqZWN0IGluIHRoZSBBcnJheSBzaG91bGQgaGF2ZSBhIGBuYW1lYCBhbmRcbiAgICogICAgIGBkZXNjcmlwdGlvbmAgcHJvcGVydHkuXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gbmV3T3B0cy5kYXRhRmlsZVVybCBUaGUgVVJMIHBhdGggdG8gdGhlIGAuanNvbmAgZmlsZVxuICAgKiAgICAgY29udGFpbmluZyB0aGUgbWVzc2FnZXNcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBuZXdPcHRzLnRlbXBsYXRlVXJsIFRoZSBVUkwgcGF0aCB0byB0aGUgcGFydGlhbFxuICAgKiAgICAgcmVwcmVzZW50aW5nIHRoZSBtZXNzYWdlIGxpc3RcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBuZXdPcHRzLmRlZmF1bHRMZXZlbCBUaGUgZGVmYXVsdCBsZXZlbDsgY29ycmVzcG9uZHMgdG9cbiAgICogICAgIHRoZSBgbmFtZWAgcHJvcGVydHkgb2YgZWFjaCBvYmplY3QgaW4gdGhlIGBsZXZlbHNgIGFycmF5XG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSByZXN1bHRpbmcgb3B0aW9uc1xuICAgKi9cbiAgdGhpcy5vcHRpb25zID0gZnVuY3Rpb24gb3B0aW9ucyhuZXdPcHRzKSB7XG4gICAgXy5leHRlbmQob3B0cywgbmV3T3B0cyk7XG4gICAgZGVidWcoJ05ldyBvcHRpb25zIHNldDonLCBvcHRzKTtcbiAgICByZXR1cm4gb3B0cztcbiAgfTtcblxuICB0aGlzLiRnZXQgPSByZXF1aXJlKCcuL2ZhY3RvcnknKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95UHJvdmlkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRGVmYXVsdCBsZXZlbCBhbmQgZGVzY3JpcHRpb25zXG4gKiBAdHlwZSB7QXJyYXkuPE9iamVjdC48c3RyaW5nLCBzdHJpbmc+Pn1cbiAqL1xudmFyIERFRkFVTFRfTEVWRUxTID0gW1xuICB7XG4gICAgbmFtZTogJ29rJyxcbiAgICBkZXNjcmlwdGlvbjogJ0ZpeGVkISdcbiAgfSxcbiAge1xuICAgIG5hbWU6ICd3YXJuaW5nJyxcbiAgICBkZXNjcmlwdGlvbjogJ1dhcm5pbmcnXG4gIH0sXG4gIHtcbiAgICBuYW1lOiAnZXJyb3InLFxuICAgIGRlc2NyaXB0aW9uOiAnRXJyb3InXG4gIH1cbl07XG5cbi8qKlxuICogRGVmYXVsdCB3ZWIgc2VydmVyIHBhdGggdG8gSlNPTiBtZXNzYWdlIGRlZmluaXRpb24gZmlsZVxuICogQHR5cGUge3N0cmluZ31cbiAqL1xudmFyIERFRkFVTFRfREFUQV9GSUxFID0gJ21lc3NhZ2VzLmpzb24nO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGxldmVsXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgREVGQVVMVF9MRVZFTCA9ICdvayc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBsZXZlbHM6IERFRkFVTFRfTEVWRUxTLFxuICBkZWZhdWx0TGV2ZWw6IERFRkFVTFRfTEVWRUwsXG4gIGRhdGFGaWxlVXJsOiBERUZBVUxUX0RBVEFfRklMRSxcbiAgdGVtcGxhdGVVcmw6ICdwYXJ0aWFscy9tZXNzYWdlcy5odG1sJ1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6Zm9ybURlY29yYXRvcicpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZXM6Zm9ybVxuICogQHJlc3RyaWN0IEVcbiAqIEBzY29wZVxuICogQHBhcmFtIHtzdHJpbmc9fSBuYW1lIE5hbWUgb2YgdGhpcyBmb3JtLiAgSWYgb21pdHRlZCwgdGhlIGZvcm0gaXMgKmlnbm9yZWQqXG4gKiBieSBFbnZveS5cbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqICMgQWxpYXM6IGBuZ0Zvcm1gXG4gKlxuICogVGhpcyBkaXJlY3RpdmUgcmVwbGFjZXMgQW5ndWxhckpTJ1xuICogICAgIFtgZm9ybWBdKGh0dHBzOi8vZG9jcy5hbmd1bGFyanMub3JnL2FwaS9uZy9kaXJlY3RpdmUvZm9ybSkgZGlyZWN0aXZlLlxuICpcbiAqIFR3byBkaWZmZXJlbmNlczpcbiAqXG4gKiAtIFRoZSBjb250cm9sbGVyIGlzIHJlcGxhY2VkIHdpdGggYSB7QGxpbmsgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlciBNZXNzYWdlc0Zvcm1Db250cm9sbGVyfS5cbiAqIC0gVGhlIGRpcmVjdGl2ZSBjcmVhdGVzIGEgbmV3IFNjb3BlLiAgU2VlIHRoZSB7QGxpbmsgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlciMkYWxpYXMgJGFsaWFzIHByb3BlcnR5fSBmb3JcbiAqICAgICBmdXJ0aGVyIGluZm9ybWF0aW9uLlxuICovXG5cbi8qKlxuICogVGhpcyBkZWNvcmF0b3IgbW9ua2V5cGF0Y2hlcyB0aGUgYGZvcm1gIGRpcmVjdGl2ZS5cbiAqIEZvciBzb21lIHJlYXNvbiB3aGVuIHlvdSBkZWNvcmF0ZSBhIGRpcmVjdGl2ZSwgJGRlbGVnYXRlIGlzIGFuIEFycmF5XG4gKiBhbmQgdGhlIGZpcnN0IGVsZW1lbnQgaXMgdGhlIGRpcmVjdGl2ZS5cbiAqIEBwYXJhbSB7QXJyYXl9ICRkZWxlZ2F0ZSBEaXJlY3RpdmUocykgYXNzb2NpYXRlZCB3aXRoIHRhZyBcImZvcm1cIiwgSSBndWVzc1xuICogQHJldHVybnMge0FycmF5fSBEZWNvcmF0ZWQgYXJyYXkgb2YgZGlyZWN0aXZlcz9cbiAqL1xuZnVuY3Rpb24gZm9ybURlY29yYXRvcigkZGVsZWdhdGUpIHtcblxuICAvKipcbiAgICogVGhlIHJlYWwgZm9ybSBkaXJlY3RpdmUuXG4gICAqIEB0eXBlIHtmb3JtfVxuICAgKi9cbiAgdmFyIGZvcm0gPSBfLmZpcnN0KCRkZWxlZ2F0ZSk7XG5cbiAgLyoqXG4gICAqIE9yaWdpbmFsIEZvcm1Db250cm9sbGVyLlxuICAgKiBAdHlwZSB7Zm9ybS5Gb3JtQ29udHJvbGxlcn1cbiAgICovXG4gIHZhciBmb3JtQ29udHJvbGxlciA9IGZvcm0uY29udHJvbGxlcjtcblxuICAvKipcbiAgICogQG5nZG9jIGNvbnRyb2xsZXJcbiAgICogQG5hbWUgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlclxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogYE1lc3NhZ2VzRm9ybUNvbnRyb2xsZXJgIHJlcGxhY2VzXG4gICAqICAgICBbYEZvcm1Db250cm9sbGVyYF0oaHR0cHM6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nL3R5cGUvZm9ybS5Gb3JtQ29udHJvbGxlciMhKVxuICAgKiAgICAgd2l0aCBpdHNlbGY7IGFueSB0aW1lIHlvdSB1c2UgdGhlXG4gICAqICAgICBbYGZvcm1gXShodHRwczovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcvZGlyZWN0aXZlL2Zvcm0pIGRpcmVjdGl2ZSxcbiAgICogICAgIHlvdXIgY29udHJvbGxlciB3aWxsIGJlIHRoaXMgaW5zdGVhZCwgKipleGNlcHQqKiBpZiB5b3VyIGBmb3JtYCBoYXMgbm9cbiAgICogICAgIGBuYW1lYCBhdHRyaWJ1dGUsIGF0IHdoaWNoIHBvaW50IGl0IGlzICppZ25vcmVkKiBieSBFbnZveS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBmdW5jdGlvbiBNZXNzYWdlc0Zvcm1Db250cm9sbGVyKCRlbGVtZW50LFxuICAgICRhdHRycyxcbiAgICAkc2NvcGUsXG4gICAgJGFuaW1hdGUsXG4gICAgJGludGVycG9sYXRlLFxuICAgICRpbmplY3RvcixcbiAgICAkZW52b3kpIHtcblxuICAgIC8vIG15IGtpbmdkb20gZm9yIFwibGV0XCJcbiAgICB2YXIgJHNldFZhbGlkaXR5O1xuXG4gICAgJGluamVjdG9yLmludm9rZShmb3JtQ29udHJvbGxlciwgdGhpcywge1xuICAgICAgJGVsZW1lbnQ6ICRlbGVtZW50LFxuICAgICAgJHNjb3BlOiAkc2NvcGUsXG4gICAgICAkYW5pbWF0ZTogJGFuaW1hdGUsXG4gICAgICAkaW50ZXJwb2xhdGU6ICRpbnRlcnBvbGF0ZSxcbiAgICAgICRhdHRyczogJGF0dHJzXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy4kbmFtZSkge1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAgICogQG5hbWUgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlciMkaXNGb3JtXG4gICAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpNZXNzYWdlc0Zvcm1Db250cm9sbGVyXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFRoaXMgd2lsbCBhbHdheXMgYmUgYHRydWVgIGZvciBhbnkgZm9ybSB0b3VjaGVkIGJ5IEVudm95LiAgVGhlIHJlYXNvblxuICAgICAgICogICAgIGZvciBpdHMgZXhpc3RlbmNlIGlzIHNpbXBseSB0aGF0IGl0IGNhbiBiZSBwcmFjdGljYWxseSBkaWZmaWN1bHRcbiAgICAgICAqICAgICB0byB0ZWxsIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gYSBgRm9ybUNvbnRyb2xsZXJgIGFuZCBhblxuICAgICAgICogICAgIFtgTmdNb2RlbENvbnRyb2xsZXJgXShodHRwczovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcvdHlwZS9uZ01vZGVsLk5nTW9kZWxDb250cm9sbGVyKS5cbiAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICovXG4gICAgICB0aGlzLiRpc0Zvcm0gPSB0cnVlO1xuXG4gICAgICAvKipcbiAgICAgICAqIFRoaXMgRm9ybUNvbnRyb2xsZXIncyBvcmlnaW5hbCAkc2V0VmFsaWRpdHkoKSBtZXRob2RcbiAgICAgICAqIEB0eXBlIHtmb3JtLkZvcm1Db250cm9sbGVyIyRzZXRWYWxpZGl0eX1cbiAgICAgICAqL1xuICAgICAgJHNldFZhbGlkaXR5ID0gdGhpcy4kc2V0VmFsaWRpdHk7XG5cbiAgICAgIGRlYnVnKCdJbnN0YW50aWF0aW5nIHBhdGNoZWQgY29udHJvbGxlciBmb3IgZm9ybSAlcycsIHRoaXMuJG5hbWUpO1xuXG4gICAgICBfLmV4dGVuZCh0aGlzLCB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBwcm9wZXJ0eVxuICAgICAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpNZXNzYWdlc0Zvcm1Db250cm9sbGVyIyRhbGlhc1xuICAgICAgICAgKiBAcHJvcGVydHlPZiBmdi5lbnZveS5jb250cm9sbGVyczpNZXNzYWdlc0Zvcm1Db250cm9sbGVyXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBJZiB0aGUgcGFyZW50IHtAbGluayBmdi5lbnZveS5kaXJlY3RpdmVzOmZvcm0gZm9ybSBkaXJlY3RpdmV9XG4gICAgICAgICAqIGNvbnRhaW5zIGFuIFwiYWxpYXNcIiBhdHRyaWJ1dGUsIHdlJ2xsIHVzZSBpdFxuICAgICAgICAgKiB0byBsb29rIHVwIG1lc3NhZ2VzLiAgVGhpcyBpcyB1c2VmdWwgaWYgeW91ciBmb3JtIG5hbWUgaXNcbiAgICAgICAgICogXCJkeW5hbWljXCIgKGludGVycG9sYXRlZCkuICAqTm90ZToqIGludGVycG9sYXRlZCBmb3JtIG5hbWVzIHdlcmVcbiAgICAgICAgICogbm90IGltcGxlbWVudGVkIGJlZm9yZSBBbmd1bGFySlMgMS4zLjAuXG4gICAgICAgICAqXG4gICAgICAgICAqIERlZmF1bHRzIHRvIHdoYXRldmVyIHRoZSBuYW1lIG9mIHRoZSBmb3JtIGlzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB0aGUgYWxpYXMgaXMgbm90IHByZXNlbnQgaW4gdGhpcyBmb3JtJ3MgU2NvcGUsIHRoZW4gaXQgaXMgcGxhY2VkXG4gICAgICAgICAqIHRoZXJlLS1tdWNoIGxpa2UgYEZvcm1Db250cm9sbGVyYCBwbGFjZXMgaXRzIGBuYW1lYCBhdHRyaWJ1dGUgb24gaXRzXG4gICAgICAgICAqIFNjb3BlLCBpZiBwcmVzZW50LiAgQmVjYXVzZSBjb2xsaXNpb25zIGNvdWxkIGV4aXN0IGluIHRoZSBjYXNlIG9mXG4gICAgICAgICAqIFwiZHluYW1pY1wiIGZvcm1zLCB0aGUge0BsaW5rIGZ2LmVudm95LmRpcmVjdGl2ZXM6Zm9ybSBmb3JtIGRpcmVjdGl2ZX1cbiAgICAgICAgICogbXVzdCBjcmVhdGUgYSBuZXcgU2NvcGUuXG4gICAgICAgICAqL1xuICAgICAgICAkYWxpYXM6ICRhdHRycy5hbGlhcyB8fCB0aGlzLiRuYW1lLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVc2VkIHRvIHRyYWNrIHRoaXMgZm9ybSdzIGVycm9yIHN0YXRlLiAgV2UnbGwgbmVlZCB0b1xuICAgICAgICAgKiBkbyBzdHVmZiBpZiB0aGUgc3RhdGUgY2hhbmdlcy5cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgICQkbGFzdEVycm9yU2l6ZTogMCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgKiBAbmFtZSBmdi5lbnZveS5jb250cm9sbGVyczpNZXNzYWdlc0Zvcm1Db250cm9sbGVyIyRzZXRWYWxpZGl0eVxuICAgICAgICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuY29udHJvbGxlcnM6TWVzc2FnZXNGb3JtQ29udHJvbGxlclxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICogSWYgdGhlIG51bWJlciBvZiBlcnJvcnMgaW4gdGhpcyBmb3JtIGhhcyBpbmNyZWFzZWQgb3IgZGVjcmVhc2VkXG4gICAgICAgICAqIGFuZCB0aGUgY29udHJvbCBiZWluZyBzZXQgdmFsaWQgb3IgaW52YWxpZCBpcyBhIG1lbWJlciBvZiB0aGlzXG4gICAgICAgICAqIGZvcm0gcHJvcGVyLCB0aGVuIHRlbGwge0BsaW5rIGZ2LmVudm95LmVudm95OiRlbnZveSAkZW52b3l9IGhhbmRsZVxuICAgICAgICAgKiAgICAgdGhlIGNoYW5nZS5cbiAgICAgICAgICpcbiAgICAgICAgICogKk5vdGUqOiB3ZSBvbmx5IHRlbGwgYCRlbnZveWAgdG8gdXBkYXRlIGlmIHRoZSBjb250cm9sIGlzIGEgZGlyZWN0XG4gICAgICAgICAqIGRlc2NlbmRhbnQgb2YgdGhpcyBmb3JtLlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9rZW4gVmFsaWRhdGlvbiB0b2tlblxuICAgICAgICAgKiBAcGFyYW0geyhib29sZWFufCopfSB2YWx1ZSBJZiB0cnV0aHksIHRoZW4gdGhlIHZhbGlkYXRpb24gdG9rZW4gaXNcbiAgICAgICAgICogaW4gYW4gZXJyb3Igc3RhdGUuXG4gICAgICAgICAqIEBwYXJhbSB7KG5nTW9kZWwuTmdNb2RlbENvbnRyb2xsZXJ8Zm9ybS5Gb3JtQ29udHJvbGxlcnxmdi5lbnZveS5jb250cm9sbGVycy5NZXNzYWdlc0Zvcm1Db250cm9sbGVyKX0gY29udHJvbFxuICAgICAgICAgKiBTb21lIGNvbnRyb2wgb24gdGhlIGZvcm07IG1heSBiZSBhIHN1YmZvcm0gb3IgYSBmaWVsZC5cbiAgICAgICAgICogQHRoaXMgRm9ybUNvbnRyb2xsZXJcbiAgICAgICAgICovXG4gICAgICAgICRzZXRWYWxpZGl0eTogZnVuY3Rpb24gJGVudm95U2V0VmFsaWRpdHkodG9rZW4sXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgY29udHJvbCkge1xuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogSWYgd2Ugc2V0ICRpc0Zvcm0gYWJvdmUsIHRoaXMgaXMgYSBzdWJmb3JtIG9mIHRoZSBwYXJlbnRcbiAgICAgICAgICAgKiBhbmQgd2UgZG9uJ3QgY2FyZS5cbiAgICAgICAgICAgKiBAdG9kbyBtYXliZSB3ZSBkbyBjYXJlP1xuICAgICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgICAqL1xuICAgICAgICAgIHZhciBpc05vdEZvcm0gPSAhY29udHJvbC4kaXNGb3JtO1xuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogV2Ugb25seSBjYXJlIGFib3V0IGNvbnRyb2xzIHRoYXQgd2VyZSBleHBsaWNpdGx5IGFkZGVkXG4gICAgICAgICAgICogdG8gdGhpcyBmb3JtLlxuICAgICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgICAqL1xuICAgICAgICAgIHZhciBmb3JtSGFzQ29udHJvbCA9IGlzTm90Rm9ybSAmJiBfLmhhcyh0aGlzLCBjb250cm9sLiRuYW1lKTtcblxuICAgICAgICAgICRzZXRWYWxpZGl0eS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgaWYgKGZvcm1IYXNDb250cm9sICYmXG4gICAgICAgICAgICBfLnNpemUodGhpcy4kZXJyb3IpICE9PSB0aGlzLiQkbGFzdEVycm9yU2l6ZSkge1xuICAgICAgICAgICAgJGVudm95LnJlZnJlc2godGhpcywgY29udHJvbCk7XG4gICAgICAgICAgICB0aGlzLiQkbGFzdEVycm9yU2l6ZSA9IF8uc2l6ZSh0aGlzLiRlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gc2VlIHRoZSBub3RlIGJlbG93IGF0IGZvcm1EaXJlY3RpdmUuJHNjb3BlXG4gICAgICBpZiAoIV8uaGFzKCRzY29wZSwgdGhpcy4kYWxpYXMpKSB7XG4gICAgICAgICRzY29wZVt0aGlzLiRhbGlhc10gPSB0aGlzO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIE1lc3NhZ2VzRm9ybUNvbnRyb2xsZXIuJGluamVjdCA9IFtcbiAgICAnJGVsZW1lbnQnLFxuICAgICckYXR0cnMnLFxuICAgICckc2NvcGUnLFxuICAgICckYW5pbWF0ZScsXG4gICAgJyRpbnRlcnBvbGF0ZScsXG4gICAgJyRpbmplY3RvcicsXG4gICAgJyRlbnZveSdcbiAgXTtcblxuICBmb3JtLmNvbnRyb2xsZXIgPSBNZXNzYWdlc0Zvcm1Db250cm9sbGVyO1xuXG4gIC8qKlxuICAgKiBTbyB0aGlzIGlzIGEgbGl0dGxlIGhhY2suICBJJ20gcHJldHR5IHN1cmUgdGhpcyBpcyBub3QgZGFuZ2Vyb3VzLCBidXRcbiAgICogaXQgY291bGQgYmUuICBUaGUgcmVhc29uIGZvciB0aGlzIGlzIHRoYXQgeW91IG1heSBoYXZlIGEgZHluYW1pYyBmb3JtXG4gICAqIG5hbWU7IHNvbWV0aGluZyBpbnRlcnBvbGF0ZWQuICBTYXksIFwibXlGb3JtLTI3ODk2MThcIi4gIEEgRm9ybUNvbnRyb2xsZXJcbiAgICogd2lsbCBhbHdheXMgcGxhY2UgaXRzZWxmIG9uIHRoZSBzY29wZSBpZiBpdCdzIGdpdmVuIGEgbmFtZS4gIEJ1dCBpdCdzXG4gICAqIGFsc28gaGFuZHkgdG8gYmUgYWJsZSB0byByZWZlcmVuY2UgXCJteUZvcm1cIi4gIElmIGZvcm0gXCJteUZvcm0tODczMjlcIlxuICAgKiBzaGFyZWQgdGhlIHNhbWUgc2NvcGUgd2l0aCBcIm15Rm9ybS0yNzg5NjE4XCIsIG9ubHkgb25lIFwibXlGb3JtXCIgY291bGRcbiAgICogZXhpc3Q7IHRodXMsIHdlIGp1c3QgbWFrZSBhIG5ldyBzY29wZS5cbiAgICogQHR5cGUge2Jvb2xlYW59XG4gICAqL1xuICBmb3JtLiRzY29wZSA9IHRydWU7XG5cbiAgcmV0dXJuICRkZWxlZ2F0ZTtcbn1cbmZvcm1EZWNvcmF0b3IuJGluamVjdCA9IFsnJGRlbGVnYXRlJ107XG5cbm1vZHVsZS5leHBvcnRzID0gZm9ybURlY29yYXRvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgb3ZlcnZpZXdcbiAqIEBuYW1lIGZ2LmVudm95XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZnYuZW52b3lcbiAqXG4gKiBUaGUgbWFpbiBtb2R1bGUgZm9yIEVudm95LiAgWW91IHdpbGwgbmVlZCB0byBpbmNsdWRlIHRoaXMgbW9kdWxlLlxuICpcbiAqIEVudm95IGhhcyBkZXBlbmRlbmNpZXMgb2YgW2xvZGFzaF0oaHR0cDovL2xvZGFzaC5vcmcpIGFuZCBvZiBjb3Vyc2VcbiAqIFtBbmd1bGFySlNdKGh0dHA6Ly9hbmd1bGFyanMub3JnKS5cbiAqXG4gKiBAZXhhbXBsZVxuICogPHByZT5cbiAqIDxodG1sIG5nLWFwcD1cIm15QXBwXCI+XG4gKiA8aGVhZD5cbiAqICAgPHNjcmlwdCBzcmM9XCJwYXRoL3RvL2FuZ3VsYXIuanNcIj48L3NjcmlwdD5cbiAqICAgPHNjcmlwdCBzcmM9XCJwYXRoL3RvL2xvZGFzaC5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0IHNyYz1cInBhdGgvdG8vZW52b3kuanNcIj48L3NjcmlwdD5cbiAqICAgPHNjcmlwdD5cbiAqICAgICB2YXIgbXlBcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbJ2Z2LmVudm95J10pO1xuICogICA8L3NjcmlwdD5cbiAqIDwvaGVhZD5cbiAqIDxib2R5PlxuICogPC9ib2R5PlxuICogPC9odG1sPlxuICogPC9wcmU+XG4gKi9cblxudmFyIGFuZ3VsYXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5hbmd1bGFyIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5hbmd1bGFyIDogbnVsbCk7XG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciBkaXJlY3RpdmVzID0gcmVxdWlyZSgnLi9kaXJlY3RpdmVzJyk7XG52YXIgcGtnID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG52YXIgZm9ybURlY29yYXRvciA9IHJlcXVpcmUoJy4vZm9ybS1kZWNvcmF0b3InKTtcbnZhciAkZW52b3kgPSByZXF1aXJlKCcuL2Vudm95Jyk7XG52YXIgTU9EVUxFX05BTUUgPSAnZnYuZW52b3knO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveScpO1xudmFyIGVudm95O1xuXG5mdW5jdGlvbiBjb25maWcoJHByb3ZpZGUpIHtcbiAgJHByb3ZpZGUuZGVjb3JhdG9yKCduZ0Zvcm1EaXJlY3RpdmUnLCBmb3JtRGVjb3JhdG9yKTtcbiAgZGVidWcoJyVzIHYlcyByZWFkeScsIHBrZy5uYW1lLCBwa2cudmVyc2lvbik7XG59XG5jb25maWcuJGluamVjdCA9IFsnJHByb3ZpZGUnXTtcblxuZW52b3kgPSBhbmd1bGFyLm1vZHVsZShNT0RVTEVfTkFNRSwgW10pXG4gIC5jb25maWcoY29uZmlnKVxuICAucHJvdmlkZXIoJyRlbnZveScsICRlbnZveSk7XG5cbl8uZWFjaChkaXJlY3RpdmVzLCBmdW5jdGlvbiAoZGlyZWN0aXZlLCBuYW1lKSB7XG4gIGVudm95LmRpcmVjdGl2ZShuYW1lLCBkaXJlY3RpdmUpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW52b3k7XG5cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJhbmd1bGFyLWVudm95XCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJIaWdobHkgZmxleGlibGUgZm9ybSB2YWxpZGF0aW9uIG1lc3NhZ2luZyBmb3IgQW5ndWxhckpTXCIsXG4gIFwibWFpblwiOiBcImluZGV4LmpzXCIsXG4gIFwiYXV0aG9yXCI6IFwiQ2hyaXN0b3BoZXIgSGlsbGVyIDxjaGlsbGVyQGZvY3VzdmlzaW9uLmNvbT5cIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vZGVjaXBoZXJpbmMvYW5ndWxhci1lbnZveS5naXRcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJhbmd1bGFyXCI6IFwiXjEuNC4xXCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjEwLjIuNFwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjAuMFwiLFxuICAgIFwiZXhwb3NpZnlcIjogXCJeMC40LjNcIixcbiAgICBcImdydW50XCI6IFwiXjAuNC41XCIsXG4gICAgXCJncnVudC1ib3dlci1pbnN0YWxsLXNpbXBsZVwiOiBcIl4xLjEuM1wiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcIl4zLjguMFwiLFxuICAgIFwiZ3J1bnQtYnVtcFwiOiBcIl4wLjMuMVwiLFxuICAgIFwiZ3J1bnQtY2xpXCI6IFwiXjAuMS4xM1wiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jbGVhblwiOiBcIl4wLjYuMFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jb3B5XCI6IFwiXjAuOC4wXCIsXG4gICAgXCJncnVudC1kZXYtdXBkYXRlXCI6IFwiXjEuMy4wXCIsXG4gICAgXCJncnVudC1lc2xpbnRcIjogXCJeMTUuMC4wXCIsXG4gICAgXCJncnVudC1naC1wYWdlc1wiOiBcIl4wLjEwLjBcIixcbiAgICBcImdydW50LW1vY2hhLWlzdGFuYnVsXCI6IFwiXjIuNC4wXCIsXG4gICAgXCJncnVudC1uZ2RvY3NcIjogXCJeMC4yLjdcIixcbiAgICBcImlzdGFuYnVsXCI6IFwiXjAuMy4xN1wiLFxuICAgIFwiaml0LWdydW50XCI6IFwiXjAuOS4xXCIsXG4gICAgXCJqc29ubWluaWZ5aWZ5XCI6IFwiXjAuMS4xXCIsXG4gICAgXCJsb2FkLWdydW50LWNvbmZpZ1wiOiBcIl4wLjE3LjFcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuMi41XCIsXG4gICAgXCJ0aW1lLWdydW50XCI6IFwiXjEuMi4xXCIsXG4gICAgXCJ1Z2xpZnlpZnlcIjogXCJeMy4wLjFcIlxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwidGVzdFwiOiBcImdydW50IHRlc3RcIlxuICB9LFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYW5ndWxhclwiOiBcIl4xLjQuMVwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImRlYnVnXCI6IFwiXjIuMi4wXCIsXG4gICAgXCJsb2Rhc2hcIjogXCJeMy45LjNcIlxuICB9XG59XG4iXX0=
