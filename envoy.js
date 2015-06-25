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
 * Describes a directive wherein you can supply an action (AngularJS
 * expression) to be executed from the message list view, for a particular
 * control.  In practice, you use this to activate a control to correct
 * an error when the message list displays a problem w/ yr control.
 * @example
 * <input name="title"
 *        type="text"
 *        ng-model=segment.title"
 *        message-action="edit(segment)"/>
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
 * Defines a directive which will display a list of all messages
 * for a form.
 * The form does not have to be the direct parent of this directive.
 * @example
 * <div messages-list="configForm"></div>
 * <!-- or -->
 * <messages-list for="configForm"></messages-list>
 */
function list($envoy) {
  return {
    restrict: 'EA',
    scope: true,
    require: '^envoyMessages',
    templateUrl: opts.templateUrl,
    link: function (scope, element, attrs, envoyMessages) {
      var parent = $envoy.findParentCtrl(attrs.envoyList ||
        attrs.for, envoyMessages);

      parent.bindView(scope);

      scope.$on('$destroy', function () {
        parent.unbindView();
      });
    }
  };
}
list.$inject = ['$envoy'];

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
    var parentName;
    var form;

    this.$children = [];
    this.$parent = null;

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

    if ($attrs.parent && (parentName = $interpolate($attrs.parent)($scope))) {
      $envoy.findParentCtrl(parentName,
        $element.parent().controller('envoyMessages')).addChild(this);

      if (this.$parent.$form === form) {
        this.$parent.removeChild(this);
        debug('Attempted to initialize %s with its own parent', form.$name);
      }
    }

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
function messages() {
  return {
    restrict: 'AE',
    require: 'envoyMessages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, ctrl) {
      scope.$on('$formStateChanged', function (evt, data) {
        ctrl.update(data);
      });

      scope.$on('$destroy', function () {
        ctrl.$parent.removeChild(ctrl);
      });
    }
  };
}

messages.$inject = ['$envoy'];

module.exports = messages;

},{"./messages-ctrl":6}],8:[function(require,module,exports){
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
   * Retrieves a collection of messages for a form and/or control
   * within that form.  If no parameters, returns the entirety of the
   * data file.
   * @param {FormController} form Form controller
   * @returns {*} Value, if any
   */
  function $envoy(form) {
    var result;
    if ((result = $envoy._cache[form.$name])) {
      return $q.when(result);
    }
    return $http.get(opts.dataFile, {
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
     * Utility function to convert an error level into a number or
     * string
     * @param {(number|string)} [errorLevel] Error level, or default
     *     level
     * @returns {(number|string)} Corresponding string/number
     */
    level: function level(errorLevel) {
      return _.isString(errorLevel) ?
      LEVELS[errorLevel] || LEVELS[opts.defaultLevel] :
      LEVEL_ARRAY[errorLevel] || opts.defaultLevel;
    },

    /**
     * Given a `FormController`, calculate the maximum error level
     * for its controls which are invalid.
     * @param {FormController} form form to inspect
     * @returns {Promise.<string>} Level name
     * @throws if no FormController passed
     */
    formErrorLevel: function formErrorLevel(form) {
      if (!form) {
        throw new Error('parameter is required');
      }
      return $envoy(form)
        .then(function (formMessages) {
          return $envoy._formErrorLevel(form, formMessages);
        });
    },

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

    _emitting: null,
    bindForm: function bindForm(ctrl, formName) {

      var formBindings = bindings[formName] = bindings[formName] || {};
      var id = _.uniqueId('envoy-binding-');

      formBindings[id] = ctrl;

      return function unbindForm() {
        delete formBindings[id];
      };
    },
    emit: function emit(form, control) {
      var _emit;

      function findParents(ctrl, list) {
        list = list || [];
        if (ctrl.$parent) {
          list.push(ctrl.$parent);
          return findParents(ctrl.$parent, list);
        }
        return list;
      }

      /**
       * For a MessageCtrl, find all children (recursively).
       * @param {MessageCtrl} ctrl envoyMessage Controller
       * @param {Array.<MessageCtrl>} [list=[]] Array of children
       * @returns {Array.<MessageCtrl>} Array of children
       */
      function findChildren(ctrl, list) {
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
      }

      /**
       * Given some controllers, set the default errorLevel if it doesn't
       * exist.
       * @param {...Array.<(MessageCtrl|ProxyCtrl)>} [ctrls] Arrays of
       *     controllers
       */
      function setDefaultCtrlLevels() {
        _.each(_.toArray(arguments), function (ctrls) {
          _.each(ctrls, function (ctrl) {
            ctrl.$errorLevel = ctrl.$errorLevel || $envoy.DEFAULT_ERRORLEVEL;
          });
        });
      }

      _emit = _.debounce(function _emit(form, control) {

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
            return findParents(child);
          })
          .flatten()
          .value();

        // for those which don't have an $errorLevel prop set, set it.
        setDefaultCtrlLevels(parentCtrls, messageCtrls);

        $envoy._emitting = $envoy(form)
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
                    return findChildren(ctrl);
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
      });

      delete $envoy._cache[form.$name];

      debug('Control "%s" in form "%s" changed validity',
        control.$name,
        form.$name);

      if ($envoy._emitting) {
        return $envoy._emitting.then(_emit.bind(null,
          form,
          control));
      }

      return $q.when(_emit(form, control));
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

function envoyProvider() {

  /**
   * Set options during config phase
   * @param {Object} [newOpts] New options to assign onto defaults
   * @returns {Object}
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
 * This number (in ms) needs to be higher than however long it takes to
 * hide any display generated by the `messagesList` directive.
 * @type {number}
 */
var DEFAULT_HIDE_DELAY = 900;

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
  dataFile: DEFAULT_DATA_FILE,
  hideDelay: DEFAULT_HIDE_DELAY,
  templateUrl: 'partials/messages.html'
};


},{}],13:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

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
  var form = _.first($delegate);

  /**
   * Original FormController.
   * @type {form.FormController}
   */
  var formController = form.controller;

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
            $envoy.emit(this, control);
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

var angular = (typeof window !== "undefined" ? window.angular : typeof global !== "undefined" ? global.angular : null);
var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);
var directives = require('./directives');
var pkg = require('../package.json');

var MODULE_NAME = 'fv.envoy';
var debug = require('debug')('envoy');
var envoy;

function config($provide) {
  $provide.decorator('ngFormDirective', require('./form-decorator'));
  debug('%s v%s ready', pkg.name, pkg.version);
}
config.$inject = ['$provide'];

envoy = angular.module(MODULE_NAME, [])
  .config(config)
  .provider('$envoy', require('./envoy'));

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
    "grunt-browserify": "^3.8.0",
    "grunt-bump": "^0.3.1",
    "grunt-cli": "^0.1.13",
    "grunt-dev-update": "^1.3.0",
    "grunt-eslint": "^15.0.0",
    "grunt-mocha-cov": "^0.4.0",
    "grunt-ngdocs": "^0.2.7",
    "jit-grunt": "^0.9.1",
    "jsonminifyify": "^0.1.1",
    "load-grunt-config": "^0.17.1",
    "minimatch": "^2.0.8",
    "mocha": "^2.2.5",
    "mocha-lcov-reporter": "0.0.2",
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2FjdGlvbi5qcyIsImxpYi9kaXJlY3RpdmVzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbGlzdC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvbWVzc2FnZXMtY3RybC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL21lc3NhZ2VzLmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvdmlld2RhdGEuanMiLCJsaWIvZGlyZWN0aXZlcy9wcm94eS5qcyIsImxpYi9lbnZveS9mYWN0b3J5LmpzIiwibGliL2Vudm95L2luZGV4LmpzIiwibGliL2Vudm95L29wdHMuanMiLCJsaWIvZm9ybS1kZWNvcmF0b3IuanMiLCJsaWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVidWcvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9ub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWInKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZXNjcmliZXMgYSBkaXJlY3RpdmUgd2hlcmVpbiB5b3UgY2FuIHN1cHBseSBhbiBhY3Rpb24gKEFuZ3VsYXJKU1xuICogZXhwcmVzc2lvbikgdG8gYmUgZXhlY3V0ZWQgZnJvbSB0aGUgbWVzc2FnZSBsaXN0IHZpZXcsIGZvciBhIHBhcnRpY3VsYXJcbiAqIGNvbnRyb2wuICBJbiBwcmFjdGljZSwgeW91IHVzZSB0aGlzIHRvIGFjdGl2YXRlIGEgY29udHJvbCB0byBjb3JyZWN0XG4gKiBhbiBlcnJvciB3aGVuIHRoZSBtZXNzYWdlIGxpc3QgZGlzcGxheXMgYSBwcm9ibGVtIHcvIHlyIGNvbnRyb2wuXG4gKiBAZXhhbXBsZVxuICogPGlucHV0IG5hbWU9XCJ0aXRsZVwiXG4gKiAgICAgICAgdHlwZT1cInRleHRcIlxuICogICAgICAgIG5nLW1vZGVsPXNlZ21lbnQudGl0bGVcIlxuICogICAgICAgIG1lc3NhZ2UtYWN0aW9uPVwiZWRpdChzZWdtZW50KVwiLz5cbiAqL1xuZnVuY3Rpb24gYWN0aW9uKCRlbnZveSkge1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiBbJ25nTW9kZWwnLCAnXmZvcm0nXSxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJscykge1xuICAgICAgdmFyIG5nTW9kZWwgPSBjdHJsc1swXTtcbiAgICAgIHZhciBmb3JtID0gY3RybHNbMV07XG4gICAgICB2YXIgYWN0aW9uO1xuXG4gICAgICBpZiAoKGFjdGlvbiA9IGF0dHJzLmVudm95QWN0aW9uKSAmJiBuZ01vZGVsLiRuYW1lICYmIGZvcm0uJG5hbWUpIHtcbiAgICAgICAgJGVudm95LnNldEFjdGlvbihmb3JtLiRuYW1lLCBuZ01vZGVsLiRuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2NvcGUuJGV2YWwoYWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuYWN0aW9uLiRpbmplY3QgPSBbJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICdlbnZveUFjdGlvbic6IHJlcXVpcmUoJy4vYWN0aW9uJyksXG4gICdlbnZveU1lc3NhZ2VzJzogcmVxdWlyZSgnLi9tZXNzYWdlcycpLFxuICAnZW52b3lMaXN0JzogcmVxdWlyZSgnLi9saXN0JyksXG4gICdlbnZveVByb3h5JzogcmVxdWlyZSgnLi9wcm94eScpXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgb3B0cyA9IHJlcXVpcmUoJy4uL2Vudm95L29wdHMnKTtcblxuLyoqXG4gKiBEZWZpbmVzIGEgZGlyZWN0aXZlIHdoaWNoIHdpbGwgZGlzcGxheSBhIGxpc3Qgb2YgYWxsIG1lc3NhZ2VzXG4gKiBmb3IgYSBmb3JtLlxuICogVGhlIGZvcm0gZG9lcyBub3QgaGF2ZSB0byBiZSB0aGUgZGlyZWN0IHBhcmVudCBvZiB0aGlzIGRpcmVjdGl2ZS5cbiAqIEBleGFtcGxlXG4gKiA8ZGl2IG1lc3NhZ2VzLWxpc3Q9XCJjb25maWdGb3JtXCI+PC9kaXY+XG4gKiA8IS0tIG9yIC0tPlxuICogPG1lc3NhZ2VzLWxpc3QgZm9yPVwiY29uZmlnRm9ybVwiPjwvbWVzc2FnZXMtbGlzdD5cbiAqL1xuZnVuY3Rpb24gbGlzdCgkZW52b3kpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICByZXF1aXJlOiAnXmVudm95TWVzc2FnZXMnLFxuICAgIHRlbXBsYXRlVXJsOiBvcHRzLnRlbXBsYXRlVXJsLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIGVudm95TWVzc2FnZXMpIHtcbiAgICAgIHZhciBwYXJlbnQgPSAkZW52b3kuZmluZFBhcmVudEN0cmwoYXR0cnMuZW52b3lMaXN0IHx8XG4gICAgICAgIGF0dHJzLmZvciwgZW52b3lNZXNzYWdlcyk7XG5cbiAgICAgIHBhcmVudC5iaW5kVmlldyhzY29wZSk7XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHBhcmVudC51bmJpbmRWaWV3KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5saXN0LiRpbmplY3QgPSBbJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9tZXNzYWdlcycpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciB2aWV3RGF0YSA9IHJlcXVpcmUoJy4vdmlld2RhdGEnKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlczpjb250cm9sbGVyJyk7XG5cbmZ1bmN0aW9uIE1lc3NhZ2VzQ3RybCgkZWxlbWVudCxcbiAgJGVudm95LFxuICAkYXR0cnMsXG4gICRzY29wZSxcbiAgJGludGVycG9sYXRlKSB7XG5cbiAgdmFyIHZpZXc7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSB2aWV3IFNjb3BlIHRvIHRoaXMgZGlyZWN0aXZlIGZvciBkaXNwbGF5LiAgVXNlZCBieVxuICAgKiBgbWVzc2FnZXNMaXN0YCBkaXJlY3RpdmUuXG4gICAqIEBwYXJhbSB7bmcuJHJvb3RTY29wZS5TY29wZX0gc2NvcGVcbiAgICogQHJldHVybnMge01lc3NhZ2VzQ3RybH0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICB0aGlzLmJpbmRWaWV3ID0gZnVuY3Rpb24gYmluZFZpZXcoc2NvcGUpIHtcbiAgICBpZiAodmlldy5zY29wZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd2aWV3IGFscmVhZHkgYm91bmQhJyk7XG4gICAgfVxuICAgIHZpZXcuc2NvcGUgPSBzY29wZTtcbiAgICBzY29wZS5kYXRhID0gdmlld0RhdGEoJGVudm95LkRFRkFVTFRfTEVWRUwpO1xuICAgIGRlYnVnKCdWaWV3IGJvdW5kJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIHZhciB2aWV3RGF0YSA9IHRoaXMuJHZpZXdEYXRhO1xuICAgIHZhciBlcnJvckxldmVsO1xuXG4gICAgaWYgKHZpZXdEYXRhKSB7XG5cbiAgICAgIGRlYnVnKCdcIiVzXCIgdXBkYXRpbmcgd2l0aCBuZXcgZGF0YTonLCB0aGlzLiRuYW1lLCBkYXRhKTtcblxuICAgICAgdGhpcy4kZXJyb3JMZXZlbCA9XG4gICAgICAgIGVycm9yTGV2ZWwgPVxuICAgICAgICAgIF8uaXNOdW1iZXIoZGF0YS5lcnJvckxldmVsKSA/IGRhdGEuZXJyb3JMZXZlbCA6IHRoaXMuJGVycm9yTGV2ZWw7XG5cbiAgICAgIC8vIHRoaXMgYmVhc3QgaXMga2luZCBvZiBhIGN1c3RvbSBtZXJnZVxuICAgICAgXy5lYWNoKGRhdGEubWVzc2FnZXMsIGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMsIGZvcm1OYW1lKSB7XG4gICAgICAgIGlmICh2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV0pIHtcbiAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzLCBmdW5jdGlvbiAoY29udHJvbE1lc3NhZ2VzLCBjb250cm9sTmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QoY29udHJvbE1lc3NhZ2VzKSkge1xuICAgICAgICAgICAgICBpZiAodmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSkge1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0sXG4gICAgICAgICAgICAgICAgICBjb250cm9sTWVzc2FnZXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0gPSBjb250cm9sTWVzc2FnZXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV1bY29udHJvbE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXSA9IGZvcm1NZXNzYWdlcztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3RGF0YS5lcnJvciA9ICEhZXJyb3JMZXZlbDtcbiAgICAgIHZpZXdEYXRhLmNsYXNzTmFtZSA9ICRlbnZveS5sZXZlbChlcnJvckxldmVsKTtcbiAgICAgIHZpZXdEYXRhLnRpdGxlID0gdGhpcy50aXRsZShlcnJvckxldmVsKTtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGVkOyB2aWV3IGRhdGE6JywgdGhpcy4kbmFtZSwgdmlld0RhdGEpO1xuXG4gICAgICByZXR1cm4gdmlld0RhdGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbmJpbmQgdGhlIGJvdW5kIFNjb3BlIG9mIHRoaXMgY29udHJvbGxlci5cbiAgICogQHJldHVybnMge01lc3NhZ2VzQ3RybH0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICB0aGlzLnVuYmluZFZpZXcgPSBmdW5jdGlvbiB1bmJpbmRWaWV3KCkge1xuICAgIGRlbGV0ZSB2aWV3LnNjb3BlO1xuICAgIHZpZXcgPSBudWxsO1xuICAgIGRlYnVnKCdWaWV3IHVuYm91bmQnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICB0aGlzLmFkZENoaWxkID0gZnVuY3Rpb24gYWRkQ2hpbGQoY2hpbGQpIHtcbiAgICBkZWJ1ZygnQWRkaW5nIGNoaWxkIFwiJXNcIiB0byBcIiVzXCInLCBjaGlsZC4kbmFtZSwgdGhpcy4kbmFtZSk7XG4gICAgdGhpcy4kY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgY2hpbGQuJHBhcmVudCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy5yZW1vdmVDaGlsZCA9IGZ1bmN0aW9uIHJlbW92ZUNoaWxkKGNoaWxkKSB7XG4gICAgZGVidWcoJ1JlbW92aW5nIGNoaWxkIFwiJXNcIiBmcm9tIFwiJXNcIicsIGNoaWxkLiRuYW1lLCB0aGlzLiRuYW1lKTtcbiAgICB0aGlzLiRjaGlsZHJlbi5zcGxpY2UodGhpcy4kY2hpbGRyZW4uaW5kZXhPZihjaGlsZCksIDEpO1xuICAgIGRlbGV0ZSBjaGlsZC4kcGFyZW50O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMudGl0bGUgPSBmdW5jdGlvbiB0aXRsZShlcnJvckxldmVsKSB7XG4gICAgcmV0dXJuICRlbnZveS5sZXZlbERlc2NyaXB0aW9uKGVycm9yTGV2ZWwpO1xuICB9O1xuXG4gIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy4kbmFtZTtcbiAgfTtcblxuICB0aGlzLmJyb2FkY2FzdCA9ICRzY29wZS4kYnJvYWRjYXN0LmJpbmQoJHNjb3BlKTtcbiAgdGhpcy5lbWl0ID0gJHNjb3BlLiRwYXJlbnQuJGVtaXQuYmluZCgkc2NvcGUuJHBhcmVudCk7XG5cbiAgLyoqXG4gICAqIEB0aGlzIE1lc3NhZ2VzQ3RybFxuICAgKi9cbiAgKGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdmFyIHBhcmVudE5hbWU7XG4gICAgdmFyIGZvcm07XG5cbiAgICB0aGlzLiRjaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMuJHBhcmVudCA9IG51bGw7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAkZXJyb3JMZXZlbDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldEVycm9yTGV2ZWwoKSB7XG4gICAgICAgICAgcmV0dXJuIGZvcm0uJGVycm9yTGV2ZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0RXJyb3JMZXZlbCh2YWx1ZSkge1xuICAgICAgICAgIGZvcm0uJGVycm9yTGV2ZWwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICRuYW1lOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0TmFtZSgpIHtcbiAgICAgICAgICByZXR1cm4gZm9ybS4kbmFtZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICR2aWV3RGF0YToge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldFZpZXdEYXRhKCkge1xuICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgIGlmICgoZGF0YSA9IF8uZ2V0KHZpZXcsICdzY29wZS5kYXRhJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZpZXcuc2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiAodmlldy5zY29wZS5kYXRhID0gdmlld0RhdGEoJGVudm95LkRFRkFVTFRfTEVWRUwpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0Vmlld0RhdGEoZGF0YSkge1xuICAgICAgICAgIHZpZXcuc2NvcGUuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGZvcm0gPSB0aGlzLiRmb3JtID0gJGVsZW1lbnQuY29udHJvbGxlcignZm9ybScpO1xuXG4gICAgaWYgKCRhdHRycy5wYXJlbnQgJiYgKHBhcmVudE5hbWUgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLnBhcmVudCkoJHNjb3BlKSkpIHtcbiAgICAgICRlbnZveS5maW5kUGFyZW50Q3RybChwYXJlbnROYW1lLFxuICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5jb250cm9sbGVyKCdlbnZveU1lc3NhZ2VzJykpLmFkZENoaWxkKHRoaXMpO1xuXG4gICAgICBpZiAodGhpcy4kcGFyZW50LiRmb3JtID09PSBmb3JtKSB7XG4gICAgICAgIHRoaXMuJHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgICAgICAgZGVidWcoJ0F0dGVtcHRlZCB0byBpbml0aWFsaXplICVzIHdpdGggaXRzIG93biBwYXJlbnQnLCBmb3JtLiRuYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLiRjaGlsZHJlbiA9IFtdO1xuXG4gICAgdmlldyA9XG4gICAgICB0aGlzLiRwYXJlbnQgPyAodGhpcy4kdmlldyA9IHRoaXMuJHBhcmVudC4kdmlldykgOiAodGhpcy4kdmlldyA9IHt9KTtcblxuICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgJGVudm95LmJpbmRGb3JtKHRoaXMsIHRoaXMuJG5hbWUpKTtcblxuICB9LmNhbGwodGhpcykpO1xufVxuXG5NZXNzYWdlc0N0cmwuJGluamVjdCA9IFtcbiAgJyRlbGVtZW50JyxcbiAgJyRlbnZveScsXG4gICckYXR0cnMnLFxuICAnJHNjb3BlJyxcbiAgJyRpbnRlcnBvbGF0ZSdcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZXNDdHJsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveU1lc3NhZ2VzXG4gKiBAcmVxdWlyZXMgZnYuZW52b3kuc2VydmljZTokZW52b3lcbiAqIEByZXN0cmljdCBBRVxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXJlbnRdIElmIHRoaXMgZGlyZWN0aXZlIGlzIGluIGEgc3ViZm9ybSBvZiBzb21lIG90aGVyXG4gKiBmb3JtIHdoaWNoIGlzICphbHNvKiB1c2luZyB0aGUgYG1lc3NhZ2VzYCBkaXJlY3RpdmUsIGFuZCB5b3Ugd2lzaCB0b1xuICogZGlzcGxheSBtZXNzYWdlcyB3aXRoaW4gaXRzIHZpZXcsIHNwZWNpZnkgaXRzIGZvcm0gaGVyZS5cbiAqIEBkZXNjcmlwdGlvblxuICogRW5hYmxlcyBkaXNwbGF5IG9mIG1lc3NhZ2VzIGZvciBhIGZvcm0uXG4gKi9cblxuLyoqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gbWVzc2FnZXMoKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgcmVxdWlyZTogJ2Vudm95TWVzc2FnZXMnLFxuICAgIGNvbnRyb2xsZXI6IHJlcXVpcmUoJy4vbWVzc2FnZXMtY3RybCcpLFxuICAgIHNjb3BlOiB0cnVlLFxuICAgIGxpbms6IGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICBzY29wZS4kb24oJyRmb3JtU3RhdGVDaGFuZ2VkJywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICBjdHJsLnVwZGF0ZShkYXRhKTtcbiAgICAgIH0pO1xuXG4gICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjdHJsLiRwYXJlbnQucmVtb3ZlQ2hpbGQoY3RybCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5cbm1lc3NhZ2VzLiRpbmplY3QgPSBbJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1lc3NhZ2VzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIElEX1BSRUZJWCA9ICdlbnZveS12aWV3ZGF0YS0nO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlczp2aWV3ZGF0YScpO1xuXG5mdW5jdGlvbiB2aWV3RGF0YShkZWZhdWx0TGV2ZWwpIHtcbiAgdmFyIGRhdGEgPSB7XG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgdGhpcy5lcnJvciA9IGZhbHNlO1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IHt9O1xuICAgICAgdGhpcy50aXRsZSA9IG51bGw7XG4gICAgICB0aGlzLmNsYXNzTmFtZSA9IG51bGw7XG4gICAgICB0aGlzLmVycm9yTGV2ZWwgPSBkZWZhdWx0TGV2ZWw7XG4gICAgfSxcbiAgICBpZDogXy51bmlxdWVJZChJRF9QUkVGSVgpXG4gIH07XG4gIGRhdGEucmVzZXQoKTtcbiAgZGVidWcoJ0NyZWF0ZWQgdmlld2RhdGEgb2JqZWN0IHdpdGggaWQgXCIlc1wiJywgZGF0YS5pZCk7XG4gIHJldHVybiBkYXRhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXdEYXRhO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIGZ2LmVudm95LmRpcmVjdGl2ZTplbnZveVByb3h5XG4gKiBAcmVzdHJpY3QgQVxuICogQGRlc2NyaXB0aW9uXG4gKiBEZWZpbmVzIGEgZGlyZWN0aXZlIHdoaWNoLCB3aGVuIHVzZWQgd2l0aCBuZ01vZGVsLCB3aWxsIHNldCB0aGUgdmFsaWRpdHlcbiAqIG9mIHRoZSBhc3NvY2lhdGVkIE5nTW9kZWxDb250cm9sbGVyLCBiYXNlZCBvbiB0aGUgdmFsaWRpdHkgb2YgdGhlIHRhcmdldFxuICogZm9ybS5cbiAqL1xuZnVuY3Rpb24gcHJveHkoKSB7XG5cbiAgLyoqXG4gICAqIEFueXRoaW5nIHRoYXQgbmVlZHMgdmFsaWRhdGluZyBuZWVkcyBhIHRva2VuLCBzbywgaGVyZSdzIG9uZS5cbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHZhciBUT0tFTiA9ICdwcm94eSc7XG5cbiAgLyoqXG4gICAqIFRoZSBjbGFzcyB0byBiZSBhcHBsaWVkIGlmIHRoZSBkaXJlY3RpdmUncyB2YWx1ZSBpcyBwcmVzZW50XG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICB2YXIgQ0xBU1NOQU1FID0gJ2Vycm9ybGV2ZWwnO1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgY29udHJvbGxlcjogW1xuICAgICAgJyRzY29wZScsXG4gICAgICAnJGVsZW1lbnQnLFxuICAgICAgJyRhdHRycycsXG4gICAgICAnJGVudm95JyxcbiAgICAgICckaW50ZXJwb2xhdGUnLFxuICAgICAgZnVuY3Rpb24gUHJveHlDdHJsKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycywgJGVudm95LCAkaW50ZXJwb2xhdGUpIHtcblxuICAgICAgICB2YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTpkaXJlY3RpdmVzOnByb3h5OmNvbnRyb2xsZXInKTtcbiAgICAgICAgdmFyIHRhcmdldCA9ICRpbnRlcnBvbGF0ZSgkYXR0cnMuZW52b3lQcm94eSB8fCAnJykoJHNjb3BlKTtcbiAgICAgICAgdmFyIG5nTW9kZWwgPSAkZWxlbWVudC5jb250cm9sbGVyKCduZ01vZGVsJyk7XG5cbiAgICAgICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgICAgICAgIHZhciBpc1ZhbGlkID0gIWRhdGEuZXJyb3JMZXZlbDtcbiAgICAgICAgICB2YXIgZXJyb3JMZXZlbE5hbWUgPSAkZW52b3kubGV2ZWwoZGF0YS5lcnJvckxldmVsKTtcbiAgICAgICAgICBkZWJ1ZygnUHJveHkgXCIlc1wiIHVwZGF0ZWQgdy8gZXJyb3JMZXZlbCAlcycsIHRhcmdldCwgZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIF8uZWFjaCgkZW52b3kuRVJST1JMRVZFTFMsIGZ1bmN0aW9uIChlcnJvcmxldmVsLCBlcnJvckxldmVsTmFtZSkge1xuICAgICAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoZXJyb3JMZXZlbE5hbWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIG5nTW9kZWwuJHNldFZhbGlkaXR5KFRPS0VOLCBpc1ZhbGlkKTtcbiAgICAgICAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKGVycm9yTGV2ZWxOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLiRuYW1lICsgJy1wcm94eSc7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy4kbmFtZSA9IHRhcmdldDtcblxuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgJGVsZW1lbnQuYWRkQ2xhc3MoQ0xBU1NOQU1FKTtcbiAgICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICRlbnZveS5iaW5kRm9ybSh0aGlzLCB0YXJnZXQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Vudm95UHJveHkgZGlyZWN0aXZlIG5lZWRzIGEgdmFsdWUhJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBdXG4gIH07XG59XG5tb2R1bGUuZXhwb3J0cyA9IHByb3h5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciBvcHRzID0gcmVxdWlyZSgnLi9vcHRzJyk7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OiRlbnZveTpmYWN0b3J5Jyk7XG5cbmZ1bmN0aW9uIGVudm95RmFjdG9yeSgkaHR0cCwgJHEpIHtcblxuICAvKipcbiAgICogRXJyb3IgbGV2ZWxzIGFzIGNvbmZpZ3VyZWQgaW4gb3B0cyBpbiBvcmRlciwgYnkgbmFtZVxuICAgKiBAdHlwZSB7QXJyYXkuPHN0cmluZz59XG4gICAqL1xuICB2YXIgTEVWRUxfQVJSQVkgPSBfLnBsdWNrKG9wdHMubGV2ZWxzLCAnbmFtZScpO1xuXG4gIC8qKlxuICAgKiBNYXBwaW5nIG9mIGVycm9yIGxldmVsIG5hbWVzIHRvIGluZGljZXMgaW4ge0BsaW5rIExFVkVMX0FSUkFZfVxuICAgKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsbnVtYmVyPn1cbiAgICovXG4gIHZhciBMRVZFTFMgPSBfKExFVkVMX0FSUkFZKVxuICAgIC5pbnZlcnQoKVxuICAgIC5tYXBWYWx1ZXMoXy5wYXJzZUludClcbiAgICAudmFsdWUoKTtcblxuICAvKipcbiAgICogTG9va3VwIG9mIGZvcm1zIGFuZCBjb250cm9scyB0byBhbnkgYWN0aW9ucyBib3VuZCB2aWEgdGhlXG4gICAqIG1lc3NhZ2VBY3Rpb24gZGlyZWN0aXZlLiAgQW4gYWN0aW9uIGlzIHNpbXBseSBhbiBBbmd1bGFySlNcbiAgICogZXhwcmVzc2lvbiB3aGljaCB3aWxsIGJlIGV2YWx1YXRlZC5cbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLE9iamVjdC48c3RyaW5nLHN0cmluZz4+fVxuICAgKi9cbiAgdmFyIGFjdGlvbnMgPSB7fTtcblxuICAvKipcbiAgICogTWFwIG9mIGZvcm0gbmFtZSB0byBNZXNzYWdlc0N0cmwgYmluZGluZ3NcbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLE1lc3NhZ2VzQ3RybD59XG4gICAqL1xuICB2YXIgYmluZGluZ3MgPSB7fTtcblxuICB2YXIgcHJvdG90eXBlO1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBjb2xsZWN0aW9uIG9mIG1lc3NhZ2VzIGZvciBhIGZvcm0gYW5kL29yIGNvbnRyb2xcbiAgICogd2l0aGluIHRoYXQgZm9ybS4gIElmIG5vIHBhcmFtZXRlcnMsIHJldHVybnMgdGhlIGVudGlyZXR5IG9mIHRoZVxuICAgKiBkYXRhIGZpbGUuXG4gICAqIEBwYXJhbSB7Rm9ybUNvbnRyb2xsZXJ9IGZvcm0gRm9ybSBjb250cm9sbGVyXG4gICAqIEByZXR1cm5zIHsqfSBWYWx1ZSwgaWYgYW55XG4gICAqL1xuICBmdW5jdGlvbiAkZW52b3koZm9ybSkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdKSkge1xuICAgICAgcmV0dXJuICRxLndoZW4ocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuICRodHRwLmdldChvcHRzLmRhdGFGaWxlLCB7XG4gICAgICBjYWNoZTogdHJ1ZVxuICAgIH0pXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVudGlyZXR5IG9mIHRoZSBkYXRhIGZpbGVcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBtZXNzYWdlcyA9IHJlcy5kYXRhO1xuXG4gICAgICAgIGlmIChmb3JtKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIGZvcm0gaGFzIGFuIGFsaWFzICh1c2UgdGhlIFwiYWxpYXNcIiBkaXJlY3RpdmUpLFxuICAgICAgICAgIC8vIHRoaXMgbmFtZSB0YWtlcyBwcmVjZWRlbmNlLlxuICAgICAgICAgIG1lc3NhZ2VzID0gXyhtZXNzYWdlc1tmb3JtLiRhbGlhcyB8fCBmb3JtLiRuYW1lXSlcbiAgICAgICAgICAgIC8vIGhlcmUgd2UgcGljayBvbmx5IHRoZSBjb250cm9scyB0aGF0IGFyZSBpbnZhbGlkLlxuICAgICAgICAgICAgLm1hcFZhbHVlcyhmdW5jdGlvbiAoY29udHJvbE1zZ09wdGlvbnMsIGNvbnRyb2xNc2dOYW1lKSB7XG4gICAgICAgICAgICAgIHZhciBmb3JtQ29udHJvbCA9IGZvcm1bY29udHJvbE1zZ05hbWVdO1xuICAgICAgICAgICAgICAvLyBpZiB0aGlzIGlzIHRydXRoeSwgdGhlbiB3ZSBoYXZlIGVycm9ycyBpbiB0aGUgZ2l2ZW5cbiAgICAgICAgICAgICAgLy8gY29udHJvbFxuICAgICAgICAgICAgICB2YXIgZXJyb3IgPSBmb3JtQ29udHJvbCAmJiBfLnNpemUoZm9ybUNvbnRyb2wuJGVycm9yKTtcblxuICAgICAgICAgICAgICBpZiAoZm9ybUNvbnRyb2wgJiYgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIHByb2JsZW0gdG9rZW5zIGFuZCBncmFiIGFueSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgLy8gaWYgcHJlc2VudC4gIGFjdGlvbnMgYXJlIGFzc2lnbmVkIGF0IHRoZSBjb250cm9sXG4gICAgICAgICAgICAgICAgLy8gbGV2ZWwsIGJ1dCB3ZSBkb24ndCBoYXZlIGdyYW51bGFyIGNvbnRyb2wgb3ZlclxuICAgICAgICAgICAgICAgIC8vIHdoaWNoIHZhbGlkYXRpb24gdG9rZW4gdHJpZ2dlcnMgd2hpY2ggYWN0aW9uLlxuICAgICAgICAgICAgICAgIC8vIHNvLCBpZiB0aGVyZSB3ZXJlIHR3byBwcm9ibGVtcyB3aXRoIG9uZSBjb250cm9sLFxuICAgICAgICAgICAgICAgIC8vIGJvdGggdG9rZW5zIHdvdWxkIHJlY2VpdmUgdGhlIGFjdGlvbiBwcm9wLlxuICAgICAgICAgICAgICAgIHJldHVybiBfKGNvbnRyb2xNc2dPcHRpb25zKVxuICAgICAgICAgICAgICAgICAgLnBpY2soXy5rZXlzKGZvcm1Db250cm9sLiRlcnJvcikpXG4gICAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAodG9rZW5JbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuSW5mby5hY3Rpb24gPVxuICAgICAgICAgICAgICAgICAgICAgICRlbnZveS5nZXRBY3Rpb24oZm9ybS4kbmFtZSwgY29udHJvbE1zZ05hbWUpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC52YWx1ZSgpO1xuXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRlbnZveS5fY2FjaGVbZm9ybS4kbmFtZV0gPSBtZXNzYWdlcztcblxuICAgICAgICByZXR1cm4gbWVzc2FnZXM7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByb3RvdHlwZSA9IHtcblxuICAgIF9jYWNoZToge30sXG5cbiAgICAvKipcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIGNvbnZlcnQgYW4gZXJyb3IgbGV2ZWwgaW50byBhIG51bWJlciBvclxuICAgICAqIHN0cmluZ1xuICAgICAqIEBwYXJhbSB7KG51bWJlcnxzdHJpbmcpfSBbZXJyb3JMZXZlbF0gRXJyb3IgbGV2ZWwsIG9yIGRlZmF1bHRcbiAgICAgKiAgICAgbGV2ZWxcbiAgICAgKiBAcmV0dXJucyB7KG51bWJlcnxzdHJpbmcpfSBDb3JyZXNwb25kaW5nIHN0cmluZy9udW1iZXJcbiAgICAgKi9cbiAgICBsZXZlbDogZnVuY3Rpb24gbGV2ZWwoZXJyb3JMZXZlbCkge1xuICAgICAgcmV0dXJuIF8uaXNTdHJpbmcoZXJyb3JMZXZlbCkgP1xuICAgICAgTEVWRUxTW2Vycm9yTGV2ZWxdIHx8IExFVkVMU1tvcHRzLmRlZmF1bHRMZXZlbF0gOlxuICAgICAgTEVWRUxfQVJSQVlbZXJyb3JMZXZlbF0gfHwgb3B0cy5kZWZhdWx0TGV2ZWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgYEZvcm1Db250cm9sbGVyYCwgY2FsY3VsYXRlIHRoZSBtYXhpbXVtIGVycm9yIGxldmVsXG4gICAgICogZm9yIGl0cyBjb250cm9scyB3aGljaCBhcmUgaW52YWxpZC5cbiAgICAgKiBAcGFyYW0ge0Zvcm1Db250cm9sbGVyfSBmb3JtIGZvcm0gdG8gaW5zcGVjdFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlLjxzdHJpbmc+fSBMZXZlbCBuYW1lXG4gICAgICogQHRocm93cyBpZiBubyBGb3JtQ29udHJvbGxlciBwYXNzZWRcbiAgICAgKi9cbiAgICBmb3JtRXJyb3JMZXZlbDogZnVuY3Rpb24gZm9ybUVycm9yTGV2ZWwoZm9ybSkge1xuICAgICAgaWYgKCFmb3JtKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGVudm95KGZvcm0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMpIHtcbiAgICAgICAgICByZXR1cm4gJGVudm95Ll9mb3JtRXJyb3JMZXZlbChmb3JtLCBmb3JtTWVzc2FnZXMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgX2Zvcm1FcnJvckxldmVsOiBmdW5jdGlvbiBfZm9ybUVycm9yTGV2ZWwoZm9ybSwgZm9ybU1lc3NhZ2VzKSB7XG4gICAgICAvKipcbiAgICAgICAqIEluZGV4IG9mIHRoZSBkZWZhdWx0IGVycm9yIGxldmVsXG4gICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICovXG4gICAgICB2YXIgZGVmYXVsdExldmVsTnVtID0gTEVWRUxTW29wdHMuZGVmYXVsdExldmVsXTtcblxuICAgICAgLyoqXG4gICAgICAgKiBNYXhpbXVtIGVycm9yIGxldmVsIG9mIGFsbCB2YWxpZGF0aW9uIHRva2VucyB3aXRoaW4gYWxsXG4gICAgICAgKiBjb250cm9scyBvZiB0aGlzIGZvcm1cbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKi9cbiAgICAgIHZhciBtYXhMZXZlbCA9IF8ucmVkdWNlKGZvcm1NZXNzYWdlcyxcbiAgICAgICAgZnVuY3Rpb24gKHJlc3VsdCwgY29udHJvbE1zZ09wdHMpIHtcblxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIE1heGltdW0gZXJyb3IgbGV2ZWwgb2YgYW55IHZhbGlkYXRpb24gdG9rZW4gd2l0aGluXG4gICAgICAgICAgICogdGhlIGNvbnRyb2wgd2hpY2ggaXMgaW4gXCJpbnZhbGlkXCIgc3RhdGUuXG4gICAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICAgKi9cbiAgICAgICAgICB2YXIgbWF4Q29udHJvbExldmVsID0gXyhjb250cm9sTXNnT3B0cylcbiAgICAgICAgICAgIC5waWNrKGZ1bmN0aW9uICh0b2tlbk9wdHMsIHRva2VuTmFtZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZm9ybS4kZXJyb3JbdG9rZW5OYW1lXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAucGx1Y2soJ2xldmVsJylcbiAgICAgICAgICAgIC5tYXAoJGVudm95LmxldmVsKVxuICAgICAgICAgICAgLm1heCgpO1xuXG4gICAgICAgICAgcmV0dXJuIE1hdGgubWF4KHJlc3VsdCwgbWF4Q29udHJvbExldmVsKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVmYXVsdExldmVsTnVtKTtcblxuICAgICAgdmFyIGVycm9yTGV2ZWxOYW1lID0gJGVudm95LmxldmVsKG1heExldmVsKTtcbiAgICAgIGRlYnVnKCdDb21wdXRlZCBlcnJvckxldmVsIFwiJXNcIiBmb3IgZm9ybSBcIiVzXCInLFxuICAgICAgICBlcnJvckxldmVsTmFtZSxcbiAgICAgICAgZm9ybS4kbmFtZSk7XG4gICAgICByZXR1cm4gbWF4TGV2ZWw7XG4gICAgfSxcblxuICAgIF9lbWl0dGluZzogbnVsbCxcbiAgICBiaW5kRm9ybTogZnVuY3Rpb24gYmluZEZvcm0oY3RybCwgZm9ybU5hbWUpIHtcblxuICAgICAgdmFyIGZvcm1CaW5kaW5ncyA9IGJpbmRpbmdzW2Zvcm1OYW1lXSA9IGJpbmRpbmdzW2Zvcm1OYW1lXSB8fCB7fTtcbiAgICAgIHZhciBpZCA9IF8udW5pcXVlSWQoJ2Vudm95LWJpbmRpbmctJyk7XG5cbiAgICAgIGZvcm1CaW5kaW5nc1tpZF0gPSBjdHJsO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24gdW5iaW5kRm9ybSgpIHtcbiAgICAgICAgZGVsZXRlIGZvcm1CaW5kaW5nc1tpZF07XG4gICAgICB9O1xuICAgIH0sXG4gICAgZW1pdDogZnVuY3Rpb24gZW1pdChmb3JtLCBjb250cm9sKSB7XG4gICAgICB2YXIgX2VtaXQ7XG5cbiAgICAgIGZ1bmN0aW9uIGZpbmRQYXJlbnRzKGN0cmwsIGxpc3QpIHtcbiAgICAgICAgbGlzdCA9IGxpc3QgfHwgW107XG4gICAgICAgIGlmIChjdHJsLiRwYXJlbnQpIHtcbiAgICAgICAgICBsaXN0LnB1c2goY3RybC4kcGFyZW50KTtcbiAgICAgICAgICByZXR1cm4gZmluZFBhcmVudHMoY3RybC4kcGFyZW50LCBsaXN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBGb3IgYSBNZXNzYWdlQ3RybCwgZmluZCBhbGwgY2hpbGRyZW4gKHJlY3Vyc2l2ZWx5KS5cbiAgICAgICAqIEBwYXJhbSB7TWVzc2FnZUN0cmx9IGN0cmwgZW52b3lNZXNzYWdlIENvbnRyb2xsZXJcbiAgICAgICAqIEBwYXJhbSB7QXJyYXkuPE1lc3NhZ2VDdHJsPn0gW2xpc3Q9W11dIEFycmF5IG9mIGNoaWxkcmVuXG4gICAgICAgKiBAcmV0dXJucyB7QXJyYXkuPE1lc3NhZ2VDdHJsPn0gQXJyYXkgb2YgY2hpbGRyZW5cbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gZmluZENoaWxkcmVuKGN0cmwsIGxpc3QpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gY3RybC4kY2hpbGRyZW47XG4gICAgICAgIGxpc3QgPSBsaXN0IHx8IFtdO1xuICAgICAgICBpZiAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgbGlzdC5wdXNoLmFwcGx5KGxpc3QsIGNoaWxkcmVuKTtcbiAgICAgICAgICByZXR1cm4gXyhjaGlsZHJlbilcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmaW5kQ2hpbGRyZW4oY2hpbGQsIGxpc3QpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5mbGF0dGVuKClcbiAgICAgICAgICAgIC51bmlxdWUoKVxuICAgICAgICAgICAgLnZhbHVlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogR2l2ZW4gc29tZSBjb250cm9sbGVycywgc2V0IHRoZSBkZWZhdWx0IGVycm9yTGV2ZWwgaWYgaXQgZG9lc24ndFxuICAgICAgICogZXhpc3QuXG4gICAgICAgKiBAcGFyYW0gey4uLkFycmF5LjwoTWVzc2FnZUN0cmx8UHJveHlDdHJsKT59IFtjdHJsc10gQXJyYXlzIG9mXG4gICAgICAgKiAgICAgY29udHJvbGxlcnNcbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gc2V0RGVmYXVsdEN0cmxMZXZlbHMoKSB7XG4gICAgICAgIF8uZWFjaChfLnRvQXJyYXkoYXJndW1lbnRzKSwgZnVuY3Rpb24gKGN0cmxzKSB7XG4gICAgICAgICAgXy5lYWNoKGN0cmxzLCBmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgICAgY3RybC4kZXJyb3JMZXZlbCA9IGN0cmwuJGVycm9yTGV2ZWwgfHwgJGVudm95LkRFRkFVTFRfRVJST1JMRVZFTDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIF9lbWl0ID0gXy5kZWJvdW5jZShmdW5jdGlvbiBfZW1pdChmb3JtLCBjb250cm9sKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsbCBjb250cm9sbGVycyB0aGF0IGNhcmUgYWJvdXQgdGhpcyBmb3JtLCBiZSBpdCBlbnZveU1lc3NhZ2VcbiAgICAgICAgICogY29udHJvbGxlcnMsIG9yIGVudm95UHJveHkgY29udHJvbGxlcnMuXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48KE1lc3NhZ2VDdHJsfFByb3h5Q3RybCk+fVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGJvdW5kQ3RybHMgPSBfLnRvQXJyYXkoYmluZGluZ3NbZm9ybS4kbmFtZV0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaG9zZSBvZiB0aGUgYm91bmQgY29udHJvbHMgd2hpY2ggYXJlIGVudm95TWVzc2FnZSBjb250cm9sbGVycy5cbiAgICAgICAgICogVGhlc2UgaGF2ZSBhY3R1YWwgZm9ybSBvYmplY3RzIHdpdGhpbiB0aGVtLCBzbyB3ZSdsbCB1c2UgdGhlbVxuICAgICAgICAgKiB0byBkZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIGVycm9ybGV2ZWwocykuXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48TWVzc2FnZUN0cmw+fVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIG1lc3NhZ2VDdHJscztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWxsIHBhcmVudCBjb250cm9sbGVycyBvZiB0aGUgbWVzc2FnZUN0cmxzLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPE1lc3NhZ2VDdHJsPn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBwYXJlbnRDdHJscztcblxuICAgICAgICBpZiAoIWJvdW5kQ3RybHMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gbm9ib2R5IGNhcmVzLlxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2VDdHJscyA9IF8uZmlsdGVyKGJvdW5kQ3RybHMsIGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgcmV0dXJuIGN0cmwuJGZvcm07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHBhcmVudEN0cmxzID0gXyhtZXNzYWdlQ3RybHMpXG4gICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBmaW5kUGFyZW50cyhjaGlsZCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgLnZhbHVlKCk7XG5cbiAgICAgICAgLy8gZm9yIHRob3NlIHdoaWNoIGRvbid0IGhhdmUgYW4gJGVycm9yTGV2ZWwgcHJvcCBzZXQsIHNldCBpdC5cbiAgICAgICAgc2V0RGVmYXVsdEN0cmxMZXZlbHMocGFyZW50Q3RybHMsIG1lc3NhZ2VDdHJscyk7XG5cbiAgICAgICAgJGVudm95Ll9lbWl0dGluZyA9ICRlbnZveShmb3JtKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHZhciBsYXN0RXJyb3JMZXZlbCA9ICRlbnZveS5fZm9ybUVycm9yTGV2ZWwoZm9ybSxcbiAgICAgICAgICAgICAgZm9ybU1lc3NhZ2VzKTtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlcyA9IF8ub2JqZWN0KFtmb3JtLiRuYW1lXSwgW2Zvcm1NZXNzYWdlc10pO1xuICAgICAgICAgICAgdmFyIGluY3JlYXNpbmc7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZShjdHJsKSB7XG4gICAgICAgICAgICAgIGN0cmwudXBkYXRlKHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogbWVzc2FnZXMsXG4gICAgICAgICAgICAgICAgZXJyb3JMZXZlbDogbGFzdEVycm9yTGV2ZWxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3JtLiRlcnJvckxldmVsIDwgbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgaW5jcmVhc2luZyA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcm0uJGVycm9yTGV2ZWwgPiBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICBpbmNyZWFzaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uZWFjaChmb3JtTWVzc2FnZXNbY29udHJvbC4kbmFtZV0sIGZ1bmN0aW9uICh0b2tlbkluZm8pIHtcbiAgICAgICAgICAgICAgdG9rZW5JbmZvLmFjdGlvbiA9ICRlbnZveS5nZXRBY3Rpb24oZm9ybS4kbmFtZSwgY29udHJvbC4kbmFtZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGluY3JlYXNpbmcgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gTWF0aC5tYXgobGFzdEVycm9yTGV2ZWwsXG4gICAgICAgICAgICAgICAgXyhtZXNzYWdlQ3RybHMpXG4gICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjdHJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaW5kQ2hpbGRyZW4oY3RybCk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLmZsYXR0ZW4oKVxuICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGRDdHJsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmlzTnVtYmVyKGNoaWxkQ3RybC4kZXJyb3JMZXZlbCkgP1xuICAgICAgICAgICAgICAgICAgICAgIGNoaWxkQ3RybC4kZXJyb3JMZXZlbCA6XG4gICAgICAgICAgICAgICAgICAgICAgJGVudm95LkRFRkFVTFRfRVJST1JMRVZFTDtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAubWF4KCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLmVhY2goYm91bmRDdHJscywgdXBkYXRlKTtcblxuICAgICAgICAgICAgXy5lYWNoKHBhcmVudEN0cmxzLCBmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgICAgICBpZiAoaW5jcmVhc2luZykge1xuICAgICAgICAgICAgICAgIGlmIChjdHJsLiRlcnJvckxldmVsIDwgbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPiBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgICAgbGFzdEVycm9yTGV2ZWwgPSBjdHJsLiRlcnJvckxldmVsO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoY3RybC4kZXJyb3JMZXZlbCA+IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdHJsLiRlcnJvckxldmVsIDwgbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gY3RybC4kZXJyb3JMZXZlbDtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGRlYnVnKGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgZGVsZXRlICRlbnZveS5fY2FjaGVbZm9ybS4kbmFtZV07XG5cbiAgICAgIGRlYnVnKCdDb250cm9sIFwiJXNcIiBpbiBmb3JtIFwiJXNcIiBjaGFuZ2VkIHZhbGlkaXR5JyxcbiAgICAgICAgY29udHJvbC4kbmFtZSxcbiAgICAgICAgZm9ybS4kbmFtZSk7XG5cbiAgICAgIGlmICgkZW52b3kuX2VtaXR0aW5nKSB7XG4gICAgICAgIHJldHVybiAkZW52b3kuX2VtaXR0aW5nLnRoZW4oX2VtaXQuYmluZChudWxsLFxuICAgICAgICAgIGZvcm0sXG4gICAgICAgICAgY29udHJvbCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJHEud2hlbihfZW1pdChmb3JtLCBjb250cm9sKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhbiBhY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYXQgc29tZSBwb2ludC4gIFVzZWQgYnkgdGhlXG4gICAgICogZW52b3lMaXN0IGRpcmVjdGl2ZSdzIHZpZXcsIHNvIHRoYXQgeW91IGNhbiBjbGljayBvbiBhblxuICAgICAqIGVycm9yIGFuZCBiZSB0YWtlbiB0byB3aGVyZSB0aGUgZXJyb3IgaXMuXG4gICAgICogQHRvZG8gbWFrZSBjb250cm9sTmFtZSBvcHRpb25hbD9cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgTmFtZSBvZiBmb3JtXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRyb2xOYW1lIE5hbWUgb2YgY29udHJvbFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gQW5ndWxhckpTIGV4cHJlc3Npb24gdG8gZXZhbHVhdGVcbiAgICAgKi9cbiAgICBzZXRBY3Rpb246IGZ1bmN0aW9uIHNldEFjdGlvbihmb3JtTmFtZSwgY29udHJvbE5hbWUsIGFjdGlvbikge1xuICAgICAgdmFyIGZvcm1BY3Rpb25zID0gYWN0aW9uc1tmb3JtTmFtZV0gPSBhY3Rpb25zW2Zvcm1OYW1lXSB8fCB7fTtcbiAgICAgIGZvcm1BY3Rpb25zW2NvbnRyb2xOYW1lXSA9IGFjdGlvbjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhIHN0b3JlZCBhY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybSBmb3IgYWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRyb2xOYW1lIE5hbWUgb2YgY29udHJvbCBmb3IgYWN0aW9uXG4gICAgICogQHJldHVybnMgeyhzdHJpbmd8dW5kZWZpbmVkKX0gVGhlIGFjdGlvbiAoQW5ndWxhckpTXG4gICAgICogICAgIGV4cHJlc3Npb24pLCBpZiBpdCBleGlzdHMuXG4gICAgICovXG4gICAgZ2V0QWN0aW9uOiBmdW5jdGlvbiBnZXRBY3Rpb24oZm9ybU5hbWUsIGNvbnRyb2xOYW1lKSB7XG4gICAgICByZXR1cm4gXy5nZXQoYWN0aW9ucywgXy5mb3JtYXQoJyVzLiVzJywgZm9ybU5hbWUsIGNvbnRyb2xOYW1lKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gZ2V0IGEgcGFyZW50IGVudm95IGRpcmVjdGl2ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybU5hbWUgRmluZCB0aGUgbWVzc2FnZXNEaXJlY3RpdmVDdHJsXG4gICAgICogICAgIGF0dGFjaGVkIHRvIGZvcm0gd2l0aCB0aGlzIG5hbWVcbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VzQ3RybH0gZW52b3lNZXNzYWdlcyBDdXJyZW50XG4gICAgICogICAgIG1lc3NhZ2VzRGlyZWN0aXZlQ3RybFxuICAgICAqIEByZXR1cm5zIHtNZXNzYWdlc0N0cmx9XG4gICAgICovXG4gICAgZmluZFBhcmVudEN0cmw6IGZ1bmN0aW9uIGZpbmRQYXJlbnRDdHJsKGZvcm1OYW1lLCBlbnZveU1lc3NhZ2VzKSB7XG4gICAgICB3aGlsZSAoZW52b3lNZXNzYWdlcy4kbmFtZSAhPT0gZm9ybU5hbWUpIHtcbiAgICAgICAgZW52b3lNZXNzYWdlcyA9IGVudm95TWVzc2FnZXMuJHBhcmVudDtcbiAgICAgICAgaWYgKCFlbnZveU1lc3NhZ2VzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZmluZCBwYXJlbnQgd2l0aCBuYW1lICcgKyBmb3JtTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBlbnZveU1lc3NhZ2VzO1xuICAgIH0sXG5cbiAgICBsZXZlbERlc2NyaXB0aW9uOiBmdW5jdGlvbiBsZXZlbERlc2NyaXB0aW9uKGVycm9yTGV2ZWwpIHtcbiAgICAgIHJldHVybiBvcHRzLmxldmVsc1tlcnJvckxldmVsXS5kZXNjcmlwdGlvbjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhwb3NlZCBmb3IgaGFuZGluZXNzXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBERUZBVUxUX0xFVkVMOiBvcHRzLmRlZmF1bHRMZXZlbCxcblxuICAgIERFRkFVTFRfRVJST1JMRVZFTDogTEVWRUxTW29wdHMuZGVmYXVsdExldmVsXSxcblxuICAgIC8qKlxuICAgICAqIEV4cG9zZWQgZm9yIGhhbmRpbmVzcy4gIFRoZSBraW5kZXIsIGdlbnRsZXIgdmVyc2lvbiBvZlxuICAgICAqIG9wdHMubGV2ZWxzXG4gICAgICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XG4gICAgICovXG4gICAgRVJST1JMRVZFTFM6IExFVkVMUyxcblxuICAgIC8qKlxuICAgICAqIEV4cG9zZWQgZm9yIGhhbmRpbmVzc1xuICAgICAqIEB0eXBlIHtBcnJheS48T2JqZWN0LjxzdHJpbmcsc3RyaW5nPj59XG4gICAgICovXG4gICAgTEVWRUxTOiBvcHRzLmxldmVscyxcblxuICAgIG9wdHM6IG9wdHNcblxuICB9O1xuXG4gIF8uZXh0ZW5kKCRlbnZveSwgcHJvdG90eXBlKTtcblxuICByZXR1cm4gJGVudm95O1xufVxuZW52b3lGYWN0b3J5LiRpbmplY3QgPSBbJyRodHRwJywgJyRxJ107XG5cbm1vZHVsZS5leHBvcnRzID0gZW52b3lGYWN0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgb3B0cyA9IHJlcXVpcmUoJy4vb3B0cycpO1xudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5fIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5fIDogbnVsbCk7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OiRlbnZveTpwcm92aWRlcicpO1xuXG5mdW5jdGlvbiBlbnZveVByb3ZpZGVyKCkge1xuXG4gIC8qKlxuICAgKiBTZXQgb3B0aW9ucyBkdXJpbmcgY29uZmlnIHBoYXNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbbmV3T3B0c10gTmV3IG9wdGlvbnMgdG8gYXNzaWduIG9udG8gZGVmYXVsdHNcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IGZ1bmN0aW9uIG9wdGlvbnMobmV3T3B0cykge1xuICAgIF8uZXh0ZW5kKG9wdHMsIG5ld09wdHMpO1xuICAgIGRlYnVnKCdOZXcgb3B0aW9ucyBzZXQ6Jywgb3B0cyk7XG4gICAgcmV0dXJuIG9wdHM7XG4gIH07XG5cbiAgdGhpcy4kZ2V0ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlbnZveVByb3ZpZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoaXMgbnVtYmVyIChpbiBtcykgbmVlZHMgdG8gYmUgaGlnaGVyIHRoYW4gaG93ZXZlciBsb25nIGl0IHRha2VzIHRvXG4gKiBoaWRlIGFueSBkaXNwbGF5IGdlbmVyYXRlZCBieSB0aGUgYG1lc3NhZ2VzTGlzdGAgZGlyZWN0aXZlLlxuICogQHR5cGUge251bWJlcn1cbiAqL1xudmFyIERFRkFVTFRfSElERV9ERUxBWSA9IDkwMDtcblxuLyoqXG4gKiBEZWZhdWx0IGxldmVsIGFuZCBkZXNjcmlwdGlvbnNcbiAqIEB0eXBlIHtBcnJheS48T2JqZWN0LjxzdHJpbmcsIHN0cmluZz4+fVxuICovXG52YXIgREVGQVVMVF9MRVZFTFMgPSBbXG4gIHtcbiAgICBuYW1lOiAnb2snLFxuICAgIGRlc2NyaXB0aW9uOiAnRml4ZWQhJ1xuICB9LFxuICB7XG4gICAgbmFtZTogJ3dhcm5pbmcnLFxuICAgIGRlc2NyaXB0aW9uOiAnV2FybmluZydcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdlcnJvcicsXG4gICAgZGVzY3JpcHRpb246ICdFcnJvcidcbiAgfVxuXTtcblxuLyoqXG4gKiBEZWZhdWx0IHdlYiBzZXJ2ZXIgcGF0aCB0byBKU09OIG1lc3NhZ2UgZGVmaW5pdGlvbiBmaWxlXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgREVGQVVMVF9EQVRBX0ZJTEUgPSAnbWVzc2FnZXMuanNvbic7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgbGV2ZWxcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBERUZBVUxUX0xFVkVMID0gJ29rJztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxldmVsczogREVGQVVMVF9MRVZFTFMsXG4gIGRlZmF1bHRMZXZlbDogREVGQVVMVF9MRVZFTCxcbiAgZGF0YUZpbGU6IERFRkFVTFRfREFUQV9GSUxFLFxuICBoaWRlRGVsYXk6IERFRkFVTFRfSElERV9ERUxBWSxcbiAgdGVtcGxhdGVVcmw6ICdwYXJ0aWFscy9tZXNzYWdlcy5odG1sJ1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6Zm9ybURlY29yYXRvcicpO1xuXG4vKipcbiAqIFRoaXMgZGVjb3JhdG9yIG1vbmtleXBhdGNoZXMgdGhlIGNvbnRyb2xsZXIgcHJvcGVydHkgb2YgdGhlIG5nRm9ybVxuICogZGlyZWN0aXZlLlxuICogRm9yIHNvbWUgcmVhc29uIHdoZW4geW91IGRlY29yYXRlIGEgZGlyZWN0aXZlLCAkZGVsZWdhdGUgaXMgYW4gQXJyYXlcbiAqIGFuZCB0aGUgZmlyc3QgZWxlbWVudCBpcyB0aGUgZGlyZWN0aXZlLlxuICogQHBhcmFtIHtBcnJheX0gJGRlbGVnYXRlIERpcmVjdGl2ZShzKSBhc3NvY2lhdGVkIHdpdGggdGFnIFwiZm9ybVwiLCBJIGd1ZXNzXG4gKiBAcmV0dXJucyB7QXJyYXl9IERlY29yYXRlZCBhcnJheSBvZiBkaXJlY3RpdmVzP1xuICovXG5mdW5jdGlvbiBmb3JtRGVjb3JhdG9yKCRkZWxlZ2F0ZSkge1xuXG4gIC8qKlxuICAgKiBUaGUgcmVhbCBmb3JtIGRpcmVjdGl2ZS5cbiAgICogQHR5cGUge2Zvcm19XG4gICAqL1xuICB2YXIgZm9ybSA9IF8uZmlyc3QoJGRlbGVnYXRlKTtcblxuICAvKipcbiAgICogT3JpZ2luYWwgRm9ybUNvbnRyb2xsZXIuXG4gICAqIEB0eXBlIHtmb3JtLkZvcm1Db250cm9sbGVyfVxuICAgKi9cbiAgdmFyIGZvcm1Db250cm9sbGVyID0gZm9ybS5jb250cm9sbGVyO1xuXG4gIC8qKlxuICAgKiBXZSdyZSBtb25rZXlwYXRjaGluZyBGb3JtQ29udHJvbGxlciB3aXRoIHRoaXMsIGlmIGFuZCBvbmx5IGlmXG4gICAqIHRoZSBmb3JtIGhhcyBhIG5hbWUuXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gTWVzc2FnZXNGb3JtQ29udHJvbGxlcigkZWxlbWVudCxcbiAgICAkYXR0cnMsXG4gICAgJHNjb3BlLFxuICAgICRhbmltYXRlLFxuICAgICRpbnRlcnBvbGF0ZSxcbiAgICAkaW5qZWN0b3IsXG4gICAgJGVudm95KSB7XG5cbiAgICAvLyBteSBraW5nZG9tIGZvciBcImxldFwiXG4gICAgdmFyICRzZXRWYWxpZGl0eTtcblxuICAgICRpbmplY3Rvci5pbnZva2UoZm9ybUNvbnRyb2xsZXIsIHRoaXMsIHtcbiAgICAgICRlbGVtZW50OiAkZWxlbWVudCxcbiAgICAgICRzY29wZTogJHNjb3BlLFxuICAgICAgJGFuaW1hdGU6ICRhbmltYXRlLFxuICAgICAgJGludGVycG9sYXRlOiAkaW50ZXJwb2xhdGUsXG4gICAgICAkYXR0cnM6ICRhdHRyc1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVGhpcyBpcyBhIGZvcm0uICBUaGlzIGNvbWVzIGluIGhhbmR5LCBiZWNhdXNlIE5nTW9kZWxDb250cm9sbGVyXG4gICAgICogYW5kIEZvcm1Db250cm9sbGVyIGFyZSB2ZXJ5IHNpbWlsYXIuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy4kaXNGb3JtID0gdHJ1ZTtcblxuICAgIGlmICh0aGlzLiRuYW1lKSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogVGhpcyBGb3JtQ29udHJvbGxlcidzIG9yaWdpbmFsICRzZXRWYWxpZGl0eSgpIG1ldGhvZFxuICAgICAgICogQHR5cGUge2Zvcm0uRm9ybUNvbnRyb2xsZXIjJHNldFZhbGlkaXR5fVxuICAgICAgICovXG4gICAgICAkc2V0VmFsaWRpdHkgPSB0aGlzLiRzZXRWYWxpZGl0eTtcblxuICAgICAgZGVidWcoJ0luc3RhbnRpYXRpbmcgcGF0Y2hlZCBjb250cm9sbGVyIGZvciBmb3JtICVzJyxcbiAgICAgICAgdGhpcy4kbmFtZSk7XG5cbiAgICAgIF8uZXh0ZW5kKHRoaXMsIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgdGhpcyBmb3JtIGNvbnRhaW5zIGFuIFwiYWxpYXNcIiBhdHRyaWJ1dGUsIHdlJ2xsIHVzZSBpdFxuICAgICAgICAgKiB0byBsb29rIHVwIG1lc3NhZ2VzLiAgVGhpcyBpcyB1c2VmdWwgaWYgeW91ciBmb3JtIG5hbWUgaXNcbiAgICAgICAgICogZHluYW1pYyAoaW50ZXJwb2xhdGVkKS4gIE5vdGUgaW50ZXJwb2xhdGVkIGZvcm0gbmFtZXMgd2VyZVxuICAgICAgICAgKiBub3QgaW1wbGVtZW50ZWQgYmVmb3JlIEFuZ3VsYXJKUyAxLjMuMC5cbiAgICAgICAgICogRGVmYXVsdHMgdG8gd2hhdGV2ZXIgdGhlIG5hbWUgb2YgdGhlIGZvcm0gaXMuXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICAkYWxpYXM6ICRhdHRycy5hbGlhcyB8fCB0aGlzLiRuYW1lLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZvcm0ncyBTY29wZS4gIFRoaXMgd2lsbCBhbGxvdyB1cyB0byBlYXNpbHkgYnJvYWRjYXN0XG4gICAgICAgICAqIGV2ZW50cyB3aXRoaW4gaXQuXG4gICAgICAgICAqIEB0eXBlIHtuZy4kcm9vdFNjb3BlLlNjb3BlfVxuICAgICAgICAgKi9cbiAgICAgICAgJGZvcm1TY29wZTogJHNjb3BlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVc2VkIHRvIHRyYWNrIHRoaXMgZm9ybSdzIGVycm9yIHN0YXRlLiAgV2UnbGwgbmVlZCB0b1xuICAgICAgICAgKiBkbyBzdHVmZiBpZiB0aGUgc3RhdGUgY2hhbmdlcy5cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgICQkbGFzdEVycm9yU2l6ZTogMCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgdGhlIG51bWJlciBvZiBlcnJvcnMgaW4gdGhpcyBmb3JtIGhhcyBpbmNyZWFzZWQgb3IgZGVjcmVhc2VkXG4gICAgICAgICAqIGFuZCB0aGUgY29udHJvbCBiZWluZyBzZXQgdmFsaWQgb3IgaW52YWxpZCBpcyBhIG1lbWJlciBvZiB0aGlzXG4gICAgICAgICAqIGZvcm0gcHJvcGVyLCB0aGVuIHRlbGwgJGVudm95IHRvIGJyb2FkY2FzdCBhbiBldmVudCB0aGF0XG4gICAgICAgICAqIHRoZSBmb3JtJ3MgdmFsaWRpdHkgY2hhbmdlZCAoc29tZXdoYXQpLlxuICAgICAgICAgKiBAdGhpcyBGb3JtQ29udHJvbGxlclxuICAgICAgICAgKi9cbiAgICAgICAgJHNldFZhbGlkaXR5OiBmdW5jdGlvbiAkZW52b3lTZXRWYWxpZGl0eSh0b2tlbixcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBjb250cm9sKSB7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBJZiB3ZSBzZXQgJGlzRm9ybSBhYm92ZSwgdGhpcyBpcyBhIHN1YmZvcm0gb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAqIGFuZCB3ZSBkb24ndCBjYXJlLlxuICAgICAgICAgICAqIEB0b2RvIG1heWJlIHdlIGRvIGNhcmU/XG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGlzTm90Rm9ybSA9ICFjb250cm9sLiRpc0Zvcm07XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBXZSBvbmx5IGNhcmUgYWJvdXQgY29udHJvbHMgdGhhdCB3ZXJlIGV4cGxpY2l0bHkgYWRkZWRcbiAgICAgICAgICAgKiB0byB0aGlzIGZvcm0uXG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGZvcm1IYXNDb250cm9sID0gaXNOb3RGb3JtICYmIF8uaGFzKHRoaXMsIGNvbnRyb2wuJG5hbWUpO1xuXG4gICAgICAgICAgJHNldFZhbGlkaXR5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICBpZiAoZm9ybUhhc0NvbnRyb2wgJiZcbiAgICAgICAgICAgIF8uc2l6ZSh0aGlzLiRlcnJvcikgIT09IHRoaXMuJCRsYXN0RXJyb3JTaXplKSB7XG4gICAgICAgICAgICAkZW52b3kuZW1pdCh0aGlzLCBjb250cm9sKTtcbiAgICAgICAgICAgIHRoaXMuJCRsYXN0RXJyb3JTaXplID0gXy5zaXplKHRoaXMuJGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZWUgdGhlIG5vdGUgYmVsb3cgYXQgZm9ybURpcmVjdGl2ZS4kc2NvcGVcbiAgICAgIGlmICghXy5oYXMoJHNjb3BlLCB0aGlzLiRhbGlhcykpIHtcbiAgICAgICAgJHNjb3BlW3RoaXMuJGFsaWFzXSA9IHRoaXM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgTWVzc2FnZXNGb3JtQ29udHJvbGxlci4kaW5qZWN0ID0gW1xuICAgICckZWxlbWVudCcsXG4gICAgJyRhdHRycycsXG4gICAgJyRzY29wZScsXG4gICAgJyRhbmltYXRlJyxcbiAgICAnJGludGVycG9sYXRlJyxcbiAgICAnJGluamVjdG9yJyxcbiAgICAnJGVudm95J1xuICBdO1xuXG4gIGZvcm0uY29udHJvbGxlciA9IE1lc3NhZ2VzRm9ybUNvbnRyb2xsZXI7XG5cbiAgLyoqXG4gICAqIFNvIHRoaXMgaXMgYSBsaXR0bGUgaGFjay4gIEknbSBwcmV0dHkgc3VyZSB0aGlzIGlzIG5vdCBkYW5nZXJvdXMsIGJ1dFxuICAgKiBpdCBjb3VsZCBiZS4gIFRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCB5b3UgbWF5IGhhdmUgYSBkeW5hbWljIGZvcm1cbiAgICogbmFtZTsgc29tZXRoaW5nIGludGVycG9sYXRlZC4gIFNheSwgXCJteUZvcm0tMjc4OTYxOFwiLiAgQSBGb3JtQ29udHJvbGxlclxuICAgKiB3aWxsIGFsd2F5cyBwbGFjZSBpdHNlbGYgb24gdGhlIHNjb3BlIGlmIGl0J3MgZ2l2ZW4gYSBuYW1lLiAgQnV0IGl0J3NcbiAgICogYWxzbyBoYW5keSB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSBcIm15Rm9ybVwiLiAgSWYgZm9ybSBcIm15Rm9ybS04NzMyOVwiXG4gICAqIHNoYXJlZCB0aGUgc2FtZSBzY29wZSB3aXRoIFwibXlGb3JtLTI3ODk2MThcIiwgb25seSBvbmUgXCJteUZvcm1cIiBjb3VsZFxuICAgKiBleGlzdDsgdGh1cywgd2UganVzdCBtYWtlIGEgbmV3IHNjb3BlLlxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICovXG4gIGZvcm0uJHNjb3BlID0gdHJ1ZTtcblxuICByZXR1cm4gJGRlbGVnYXRlO1xufVxuZm9ybURlY29yYXRvci4kaW5qZWN0ID0gWyckZGVsZWdhdGUnXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtRGVjb3JhdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYW5ndWxhciA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmFuZ3VsYXIgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmFuZ3VsYXIgOiBudWxsKTtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xudmFyIGRpcmVjdGl2ZXMgPSByZXF1aXJlKCcuL2RpcmVjdGl2ZXMnKTtcbnZhciBwa2cgPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKTtcblxudmFyIE1PRFVMRV9OQU1FID0gJ2Z2LmVudm95JztcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95Jyk7XG52YXIgZW52b3k7XG5cbmZ1bmN0aW9uIGNvbmZpZygkcHJvdmlkZSkge1xuICAkcHJvdmlkZS5kZWNvcmF0b3IoJ25nRm9ybURpcmVjdGl2ZScsIHJlcXVpcmUoJy4vZm9ybS1kZWNvcmF0b3InKSk7XG4gIGRlYnVnKCclcyB2JXMgcmVhZHknLCBwa2cubmFtZSwgcGtnLnZlcnNpb24pO1xufVxuY29uZmlnLiRpbmplY3QgPSBbJyRwcm92aWRlJ107XG5cbmVudm95ID0gYW5ndWxhci5tb2R1bGUoTU9EVUxFX05BTUUsIFtdKVxuICAuY29uZmlnKGNvbmZpZylcbiAgLnByb3ZpZGVyKCckZW52b3knLCByZXF1aXJlKCcuL2Vudm95JykpO1xuXG5fLmVhY2goZGlyZWN0aXZlcywgZnVuY3Rpb24gKGRpcmVjdGl2ZSwgbmFtZSkge1xuICBlbnZveS5kaXJlY3RpdmUobmFtZSwgZGlyZWN0aXZlKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95O1xuXG4iLCJcbi8qKlxuICogVGhpcyBpcyB0aGUgd2ViIGJyb3dzZXIgaW1wbGVtZW50YXRpb24gb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2RlYnVnJyk7XG5leHBvcnRzLmxvZyA9IGxvZztcbmV4cG9ydHMuZm9ybWF0QXJncyA9IGZvcm1hdEFyZ3M7XG5leHBvcnRzLnNhdmUgPSBzYXZlO1xuZXhwb3J0cy5sb2FkID0gbG9hZDtcbmV4cG9ydHMudXNlQ29sb3JzID0gdXNlQ29sb3JzO1xuZXhwb3J0cy5zdG9yYWdlID0gJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZVxuICAgICAgICAgICAgICAgJiYgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZS5zdG9yYWdlXG4gICAgICAgICAgICAgICAgICA/IGNocm9tZS5zdG9yYWdlLmxvY2FsXG4gICAgICAgICAgICAgICAgICA6IGxvY2Fsc3RvcmFnZSgpO1xuXG4vKipcbiAqIENvbG9ycy5cbiAqL1xuXG5leHBvcnRzLmNvbG9ycyA9IFtcbiAgJ2xpZ2h0c2VhZ3JlZW4nLFxuICAnZm9yZXN0Z3JlZW4nLFxuICAnZ29sZGVucm9kJyxcbiAgJ2RvZGdlcmJsdWUnLFxuICAnZGFya29yY2hpZCcsXG4gICdjcmltc29uJ1xuXTtcblxuLyoqXG4gKiBDdXJyZW50bHkgb25seSBXZWJLaXQtYmFzZWQgV2ViIEluc3BlY3RvcnMsIEZpcmVmb3ggPj0gdjMxLFxuICogYW5kIHRoZSBGaXJlYnVnIGV4dGVuc2lvbiAoYW55IEZpcmVmb3ggdmVyc2lvbikgYXJlIGtub3duXG4gKiB0byBzdXBwb3J0IFwiJWNcIiBDU1MgY3VzdG9taXphdGlvbnMuXG4gKlxuICogVE9ETzogYWRkIGEgYGxvY2FsU3RvcmFnZWAgdmFyaWFibGUgdG8gZXhwbGljaXRseSBlbmFibGUvZGlzYWJsZSBjb2xvcnNcbiAqL1xuXG5mdW5jdGlvbiB1c2VDb2xvcnMoKSB7XG4gIC8vIGlzIHdlYmtpdD8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTY0NTk2MDYvMzc2NzczXG4gIHJldHVybiAoJ1dlYmtpdEFwcGVhcmFuY2UnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZSkgfHxcbiAgICAvLyBpcyBmaXJlYnVnPyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zOTgxMjAvMzc2NzczXG4gICAgKHdpbmRvdy5jb25zb2xlICYmIChjb25zb2xlLmZpcmVidWcgfHwgKGNvbnNvbGUuZXhjZXB0aW9uICYmIGNvbnNvbGUudGFibGUpKSkgfHxcbiAgICAvLyBpcyBmaXJlZm94ID49IHYzMT9cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1Rvb2xzL1dlYl9Db25zb2xlI1N0eWxpbmdfbWVzc2FnZXNcbiAgICAobmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLm1hdGNoKC9maXJlZm94XFwvKFxcZCspLykgJiYgcGFyc2VJbnQoUmVnRXhwLiQxLCAxMCkgPj0gMzEpO1xufVxuXG4vKipcbiAqIE1hcCAlaiB0byBgSlNPTi5zdHJpbmdpZnkoKWAsIHNpbmNlIG5vIFdlYiBJbnNwZWN0b3JzIGRvIHRoYXQgYnkgZGVmYXVsdC5cbiAqL1xuXG5leHBvcnRzLmZvcm1hdHRlcnMuaiA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHYpO1xufTtcblxuXG4vKipcbiAqIENvbG9yaXplIGxvZyBhcmd1bWVudHMgaWYgZW5hYmxlZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGZvcm1hdEFyZ3MoKSB7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgdXNlQ29sb3JzID0gdGhpcy51c2VDb2xvcnM7XG5cbiAgYXJnc1swXSA9ICh1c2VDb2xvcnMgPyAnJWMnIDogJycpXG4gICAgKyB0aGlzLm5hbWVzcGFjZVxuICAgICsgKHVzZUNvbG9ycyA/ICcgJWMnIDogJyAnKVxuICAgICsgYXJnc1swXVxuICAgICsgKHVzZUNvbG9ycyA/ICclYyAnIDogJyAnKVxuICAgICsgJysnICsgZXhwb3J0cy5odW1hbml6ZSh0aGlzLmRpZmYpO1xuXG4gIGlmICghdXNlQ29sb3JzKSByZXR1cm4gYXJncztcblxuICB2YXIgYyA9ICdjb2xvcjogJyArIHRoaXMuY29sb3I7XG4gIGFyZ3MgPSBbYXJnc1swXSwgYywgJ2NvbG9yOiBpbmhlcml0J10uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDEpKTtcblxuICAvLyB0aGUgZmluYWwgXCIlY1wiIGlzIHNvbWV3aGF0IHRyaWNreSwgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBvdGhlclxuICAvLyBhcmd1bWVudHMgcGFzc2VkIGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlICVjLCBzbyB3ZSBuZWVkIHRvXG4gIC8vIGZpZ3VyZSBvdXQgdGhlIGNvcnJlY3QgaW5kZXggdG8gaW5zZXJ0IHRoZSBDU1MgaW50b1xuICB2YXIgaW5kZXggPSAwO1xuICB2YXIgbGFzdEMgPSAwO1xuICBhcmdzWzBdLnJlcGxhY2UoLyVbYS16JV0vZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICBpZiAoJyUlJyA9PT0gbWF0Y2gpIHJldHVybjtcbiAgICBpbmRleCsrO1xuICAgIGlmICgnJWMnID09PSBtYXRjaCkge1xuICAgICAgLy8gd2Ugb25seSBhcmUgaW50ZXJlc3RlZCBpbiB0aGUgKmxhc3QqICVjXG4gICAgICAvLyAodGhlIHVzZXIgbWF5IGhhdmUgcHJvdmlkZWQgdGhlaXIgb3duKVxuICAgICAgbGFzdEMgPSBpbmRleDtcbiAgICB9XG4gIH0pO1xuXG4gIGFyZ3Muc3BsaWNlKGxhc3RDLCAwLCBjKTtcbiAgcmV0dXJuIGFyZ3M7XG59XG5cbi8qKlxuICogSW52b2tlcyBgY29uc29sZS5sb2coKWAgd2hlbiBhdmFpbGFibGUuXG4gKiBOby1vcCB3aGVuIGBjb25zb2xlLmxvZ2AgaXMgbm90IGEgXCJmdW5jdGlvblwiLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gbG9nKCkge1xuICAvLyB0aGlzIGhhY2tlcnkgaXMgcmVxdWlyZWQgZm9yIElFOC85LCB3aGVyZVxuICAvLyB0aGUgYGNvbnNvbGUubG9nYCBmdW5jdGlvbiBkb2Vzbid0IGhhdmUgJ2FwcGx5J1xuICByZXR1cm4gJ29iamVjdCcgPT09IHR5cGVvZiBjb25zb2xlXG4gICAgJiYgY29uc29sZS5sb2dcbiAgICAmJiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbChjb25zb2xlLmxvZywgY29uc29sZSwgYXJndW1lbnRzKTtcbn1cblxuLyoqXG4gKiBTYXZlIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2F2ZShuYW1lc3BhY2VzKSB7XG4gIHRyeSB7XG4gICAgaWYgKG51bGwgPT0gbmFtZXNwYWNlcykge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLnJlbW92ZUl0ZW0oJ2RlYnVnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZyA9IG5hbWVzcGFjZXM7XG4gICAgfVxuICB9IGNhdGNoKGUpIHt9XG59XG5cbi8qKlxuICogTG9hZCBgbmFtZXNwYWNlc2AuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm5zIHRoZSBwcmV2aW91c2x5IHBlcnNpc3RlZCBkZWJ1ZyBtb2Rlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9hZCgpIHtcbiAgdmFyIHI7XG4gIHRyeSB7XG4gICAgciA9IGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZztcbiAgfSBjYXRjaChlKSB7fVxuICByZXR1cm4gcjtcbn1cblxuLyoqXG4gKiBFbmFibGUgbmFtZXNwYWNlcyBsaXN0ZWQgaW4gYGxvY2FsU3RvcmFnZS5kZWJ1Z2AgaW5pdGlhbGx5LlxuICovXG5cbmV4cG9ydHMuZW5hYmxlKGxvYWQoKSk7XG5cbi8qKlxuICogTG9jYWxzdG9yYWdlIGF0dGVtcHRzIHRvIHJldHVybiB0aGUgbG9jYWxzdG9yYWdlLlxuICpcbiAqIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2Ugc2FmYXJpIHRocm93c1xuICogd2hlbiBhIHVzZXIgZGlzYWJsZXMgY29va2llcy9sb2NhbHN0b3JhZ2VcbiAqIGFuZCB5b3UgYXR0ZW1wdCB0byBhY2Nlc3MgaXQuXG4gKlxuICogQHJldHVybiB7TG9jYWxTdG9yYWdlfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9jYWxzdG9yYWdlKCl7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG59XG4iLCJcbi8qKlxuICogVGhpcyBpcyB0aGUgY29tbW9uIGxvZ2ljIGZvciBib3RoIHRoZSBOb2RlLmpzIGFuZCB3ZWIgYnJvd3NlclxuICogaW1wbGVtZW50YXRpb25zIG9mIGBkZWJ1ZygpYC5cbiAqXG4gKiBFeHBvc2UgYGRlYnVnKClgIGFzIHRoZSBtb2R1bGUuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZGVidWc7XG5leHBvcnRzLmNvZXJjZSA9IGNvZXJjZTtcbmV4cG9ydHMuZGlzYWJsZSA9IGRpc2FibGU7XG5leHBvcnRzLmVuYWJsZSA9IGVuYWJsZTtcbmV4cG9ydHMuZW5hYmxlZCA9IGVuYWJsZWQ7XG5leHBvcnRzLmh1bWFuaXplID0gcmVxdWlyZSgnbXMnKTtcblxuLyoqXG4gKiBUaGUgY3VycmVudGx5IGFjdGl2ZSBkZWJ1ZyBtb2RlIG5hbWVzLCBhbmQgbmFtZXMgdG8gc2tpcC5cbiAqL1xuXG5leHBvcnRzLm5hbWVzID0gW107XG5leHBvcnRzLnNraXBzID0gW107XG5cbi8qKlxuICogTWFwIG9mIHNwZWNpYWwgXCIlblwiIGhhbmRsaW5nIGZ1bmN0aW9ucywgZm9yIHRoZSBkZWJ1ZyBcImZvcm1hdFwiIGFyZ3VtZW50LlxuICpcbiAqIFZhbGlkIGtleSBuYW1lcyBhcmUgYSBzaW5nbGUsIGxvd2VyY2FzZWQgbGV0dGVyLCBpLmUuIFwiblwiLlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycyA9IHt9O1xuXG4vKipcbiAqIFByZXZpb3VzbHkgYXNzaWduZWQgY29sb3IuXG4gKi9cblxudmFyIHByZXZDb2xvciA9IDA7XG5cbi8qKlxuICogUHJldmlvdXMgbG9nIHRpbWVzdGFtcC5cbiAqL1xuXG52YXIgcHJldlRpbWU7XG5cbi8qKlxuICogU2VsZWN0IGEgY29sb3IuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VsZWN0Q29sb3IoKSB7XG4gIHJldHVybiBleHBvcnRzLmNvbG9yc1twcmV2Q29sb3IrKyAlIGV4cG9ydHMuY29sb3JzLmxlbmd0aF07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgZGVidWdnZXIgd2l0aCB0aGUgZ2l2ZW4gYG5hbWVzcGFjZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRlYnVnKG5hbWVzcGFjZSkge1xuXG4gIC8vIGRlZmluZSB0aGUgYGRpc2FibGVkYCB2ZXJzaW9uXG4gIGZ1bmN0aW9uIGRpc2FibGVkKCkge1xuICB9XG4gIGRpc2FibGVkLmVuYWJsZWQgPSBmYWxzZTtcblxuICAvLyBkZWZpbmUgdGhlIGBlbmFibGVkYCB2ZXJzaW9uXG4gIGZ1bmN0aW9uIGVuYWJsZWQoKSB7XG5cbiAgICB2YXIgc2VsZiA9IGVuYWJsZWQ7XG5cbiAgICAvLyBzZXQgYGRpZmZgIHRpbWVzdGFtcFxuICAgIHZhciBjdXJyID0gK25ldyBEYXRlKCk7XG4gICAgdmFyIG1zID0gY3VyciAtIChwcmV2VGltZSB8fCBjdXJyKTtcbiAgICBzZWxmLmRpZmYgPSBtcztcbiAgICBzZWxmLnByZXYgPSBwcmV2VGltZTtcbiAgICBzZWxmLmN1cnIgPSBjdXJyO1xuICAgIHByZXZUaW1lID0gY3VycjtcblxuICAgIC8vIGFkZCB0aGUgYGNvbG9yYCBpZiBub3Qgc2V0XG4gICAgaWYgKG51bGwgPT0gc2VsZi51c2VDb2xvcnMpIHNlbGYudXNlQ29sb3JzID0gZXhwb3J0cy51c2VDb2xvcnMoKTtcbiAgICBpZiAobnVsbCA9PSBzZWxmLmNvbG9yICYmIHNlbGYudXNlQ29sb3JzKSBzZWxmLmNvbG9yID0gc2VsZWN0Q29sb3IoKTtcblxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIGFyZ3NbMF0gPSBleHBvcnRzLmNvZXJjZShhcmdzWzBdKTtcblxuICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIGFyZ3NbMF0pIHtcbiAgICAgIC8vIGFueXRoaW5nIGVsc2UgbGV0J3MgaW5zcGVjdCB3aXRoICVvXG4gICAgICBhcmdzID0gWyclbyddLmNvbmNhdChhcmdzKTtcbiAgICB9XG5cbiAgICAvLyBhcHBseSBhbnkgYGZvcm1hdHRlcnNgIHRyYW5zZm9ybWF0aW9uc1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgYXJnc1swXSA9IGFyZ3NbMF0ucmVwbGFjZSgvJShbYS16JV0pL2csIGZ1bmN0aW9uKG1hdGNoLCBmb3JtYXQpIHtcbiAgICAgIC8vIGlmIHdlIGVuY291bnRlciBhbiBlc2NhcGVkICUgdGhlbiBkb24ndCBpbmNyZWFzZSB0aGUgYXJyYXkgaW5kZXhcbiAgICAgIGlmIChtYXRjaCA9PT0gJyUlJykgcmV0dXJuIG1hdGNoO1xuICAgICAgaW5kZXgrKztcbiAgICAgIHZhciBmb3JtYXR0ZXIgPSBleHBvcnRzLmZvcm1hdHRlcnNbZm9ybWF0XTtcbiAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZm9ybWF0dGVyKSB7XG4gICAgICAgIHZhciB2YWwgPSBhcmdzW2luZGV4XTtcbiAgICAgICAgbWF0Y2ggPSBmb3JtYXR0ZXIuY2FsbChzZWxmLCB2YWwpO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBuZWVkIHRvIHJlbW92ZSBgYXJnc1tpbmRleF1gIHNpbmNlIGl0J3MgaW5saW5lZCBpbiB0aGUgYGZvcm1hdGBcbiAgICAgICAgYXJncy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpbmRleC0tO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuXG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBleHBvcnRzLmZvcm1hdEFyZ3MpIHtcbiAgICAgIGFyZ3MgPSBleHBvcnRzLmZvcm1hdEFyZ3MuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgfVxuICAgIHZhciBsb2dGbiA9IGVuYWJsZWQubG9nIHx8IGV4cG9ydHMubG9nIHx8IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG4gICAgbG9nRm4uYXBwbHkoc2VsZiwgYXJncyk7XG4gIH1cbiAgZW5hYmxlZC5lbmFibGVkID0gdHJ1ZTtcblxuICB2YXIgZm4gPSBleHBvcnRzLmVuYWJsZWQobmFtZXNwYWNlKSA/IGVuYWJsZWQgOiBkaXNhYmxlZDtcblxuICBmbi5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG5cbiAgcmV0dXJuIGZuO1xufVxuXG4vKipcbiAqIEVuYWJsZXMgYSBkZWJ1ZyBtb2RlIGJ5IG5hbWVzcGFjZXMuIFRoaXMgY2FuIGluY2x1ZGUgbW9kZXNcbiAqIHNlcGFyYXRlZCBieSBhIGNvbG9uIGFuZCB3aWxkY2FyZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZXNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZW5hYmxlKG5hbWVzcGFjZXMpIHtcbiAgZXhwb3J0cy5zYXZlKG5hbWVzcGFjZXMpO1xuXG4gIHZhciBzcGxpdCA9IChuYW1lc3BhY2VzIHx8ICcnKS5zcGxpdCgvW1xccyxdKy8pO1xuICB2YXIgbGVuID0gc3BsaXQubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoIXNwbGl0W2ldKSBjb250aW51ZTsgLy8gaWdub3JlIGVtcHR5IHN0cmluZ3NcbiAgICBuYW1lc3BhY2VzID0gc3BsaXRbaV0ucmVwbGFjZSgvXFwqL2csICcuKj8nKTtcbiAgICBpZiAobmFtZXNwYWNlc1swXSA9PT0gJy0nKSB7XG4gICAgICBleHBvcnRzLnNraXBzLnB1c2gobmV3IFJlZ0V4cCgnXicgKyBuYW1lc3BhY2VzLnN1YnN0cigxKSArICckJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBleHBvcnRzLm5hbWVzLnB1c2gobmV3IFJlZ0V4cCgnXicgKyBuYW1lc3BhY2VzICsgJyQnKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRGlzYWJsZSBkZWJ1ZyBvdXRwdXQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBkaXNhYmxlKCkge1xuICBleHBvcnRzLmVuYWJsZSgnJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBtb2RlIG5hbWUgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGVkKG5hbWUpIHtcbiAgdmFyIGksIGxlbjtcbiAgZm9yIChpID0gMCwgbGVuID0gZXhwb3J0cy5za2lwcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChleHBvcnRzLnNraXBzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gZXhwb3J0cy5uYW1lcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChleHBvcnRzLm5hbWVzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ29lcmNlIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7TWl4ZWR9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBjb2VyY2UodmFsKSB7XG4gIGlmICh2YWwgaW5zdGFuY2VvZiBFcnJvcikgcmV0dXJuIHZhbC5zdGFjayB8fCB2YWwubWVzc2FnZTtcbiAgcmV0dXJuIHZhbDtcbn1cbiIsIi8qKlxuICogSGVscGVycy5cbiAqL1xuXG52YXIgcyA9IDEwMDA7XG52YXIgbSA9IHMgKiA2MDtcbnZhciBoID0gbSAqIDYwO1xudmFyIGQgPSBoICogMjQ7XG52YXIgeSA9IGQgKiAzNjUuMjU7XG5cbi8qKlxuICogUGFyc2Ugb3IgZm9ybWF0IHRoZSBnaXZlbiBgdmFsYC5cbiAqXG4gKiBPcHRpb25zOlxuICpcbiAqICAtIGBsb25nYCB2ZXJib3NlIGZvcm1hdHRpbmcgW2ZhbHNlXVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7U3RyaW5nfE51bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWwsIG9wdGlvbnMpe1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2YWwpIHJldHVybiBwYXJzZSh2YWwpO1xuICByZXR1cm4gb3B0aW9ucy5sb25nXG4gICAgPyBsb25nKHZhbClcbiAgICA6IHNob3J0KHZhbCk7XG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBgc3RyYCBhbmQgcmV0dXJuIG1pbGxpc2Vjb25kcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZShzdHIpIHtcbiAgc3RyID0gJycgKyBzdHI7XG4gIGlmIChzdHIubGVuZ3RoID4gMTAwMDApIHJldHVybjtcbiAgdmFyIG1hdGNoID0gL14oKD86XFxkKyk/XFwuP1xcZCspICoobWlsbGlzZWNvbmRzP3xtc2Vjcz98bXN8c2Vjb25kcz98c2Vjcz98c3xtaW51dGVzP3xtaW5zP3xtfGhvdXJzP3xocnM/fGh8ZGF5cz98ZHx5ZWFycz98eXJzP3x5KT8kL2kuZXhlYyhzdHIpO1xuICBpZiAoIW1hdGNoKSByZXR1cm47XG4gIHZhciBuID0gcGFyc2VGbG9hdChtYXRjaFsxXSk7XG4gIHZhciB0eXBlID0gKG1hdGNoWzJdIHx8ICdtcycpLnRvTG93ZXJDYXNlKCk7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ3llYXJzJzpcbiAgICBjYXNlICd5ZWFyJzpcbiAgICBjYXNlICd5cnMnOlxuICAgIGNhc2UgJ3lyJzpcbiAgICBjYXNlICd5JzpcbiAgICAgIHJldHVybiBuICogeTtcbiAgICBjYXNlICdkYXlzJzpcbiAgICBjYXNlICdkYXknOlxuICAgIGNhc2UgJ2QnOlxuICAgICAgcmV0dXJuIG4gKiBkO1xuICAgIGNhc2UgJ2hvdXJzJzpcbiAgICBjYXNlICdob3VyJzpcbiAgICBjYXNlICdocnMnOlxuICAgIGNhc2UgJ2hyJzpcbiAgICBjYXNlICdoJzpcbiAgICAgIHJldHVybiBuICogaDtcbiAgICBjYXNlICdtaW51dGVzJzpcbiAgICBjYXNlICdtaW51dGUnOlxuICAgIGNhc2UgJ21pbnMnOlxuICAgIGNhc2UgJ21pbic6XG4gICAgY2FzZSAnbSc6XG4gICAgICByZXR1cm4gbiAqIG07XG4gICAgY2FzZSAnc2Vjb25kcyc6XG4gICAgY2FzZSAnc2Vjb25kJzpcbiAgICBjYXNlICdzZWNzJzpcbiAgICBjYXNlICdzZWMnOlxuICAgIGNhc2UgJ3MnOlxuICAgICAgcmV0dXJuIG4gKiBzO1xuICAgIGNhc2UgJ21pbGxpc2Vjb25kcyc6XG4gICAgY2FzZSAnbWlsbGlzZWNvbmQnOlxuICAgIGNhc2UgJ21zZWNzJzpcbiAgICBjYXNlICdtc2VjJzpcbiAgICBjYXNlICdtcyc6XG4gICAgICByZXR1cm4gbjtcbiAgfVxufVxuXG4vKipcbiAqIFNob3J0IGZvcm1hdCBmb3IgYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNob3J0KG1zKSB7XG4gIGlmIChtcyA+PSBkKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGQpICsgJ2QnO1xuICBpZiAobXMgPj0gaCkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBoKSArICdoJztcbiAgaWYgKG1zID49IG0pIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gbSkgKyAnbSc7XG4gIGlmIChtcyA+PSBzKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIHMpICsgJ3MnO1xuICByZXR1cm4gbXMgKyAnbXMnO1xufVxuXG4vKipcbiAqIExvbmcgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9uZyhtcykge1xuICByZXR1cm4gcGx1cmFsKG1zLCBkLCAnZGF5JylcbiAgICB8fCBwbHVyYWwobXMsIGgsICdob3VyJylcbiAgICB8fCBwbHVyYWwobXMsIG0sICdtaW51dGUnKVxuICAgIHx8IHBsdXJhbChtcywgcywgJ3NlY29uZCcpXG4gICAgfHwgbXMgKyAnIG1zJztcbn1cblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIGhlbHBlci5cbiAqL1xuXG5mdW5jdGlvbiBwbHVyYWwobXMsIG4sIG5hbWUpIHtcbiAgaWYgKG1zIDwgbikgcmV0dXJuO1xuICBpZiAobXMgPCBuICogMS41KSByZXR1cm4gTWF0aC5mbG9vcihtcyAvIG4pICsgJyAnICsgbmFtZTtcbiAgcmV0dXJuIE1hdGguY2VpbChtcyAvIG4pICsgJyAnICsgbmFtZSArICdzJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJuYW1lXCI6IFwiYW5ndWxhci1lbnZveVwiLFxuICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiSGlnaGx5IGZsZXhpYmxlIGZvcm0gdmFsaWRhdGlvbiBtZXNzYWdpbmcgZm9yIEFuZ3VsYXJKU1wiLFxuICBcIm1haW5cIjogXCJpbmRleC5qc1wiLFxuICBcImF1dGhvclwiOiBcIkNocmlzdG9waGVyIEhpbGxlciA8Y2hpbGxlckBmb2N1c3Zpc2lvbi5jb20+XCIsXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2RlY2lwaGVyaW5jL2FuZ3VsYXItZW52b3kuZ2l0XCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYW5ndWxhclwiOiBcIl4xLjQuMVwiLFxuICAgIFwiYnJvd3NlcmlmeVwiOiBcIl4xMC4yLjRcIixcbiAgICBcImNoYWlcIjogXCJeMy4wLjBcIixcbiAgICBcImV4cG9zaWZ5XCI6IFwiXjAuNC4zXCIsXG4gICAgXCJncnVudFwiOiBcIl4wLjQuNVwiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcIl4zLjguMFwiLFxuICAgIFwiZ3J1bnQtYnVtcFwiOiBcIl4wLjMuMVwiLFxuICAgIFwiZ3J1bnQtY2xpXCI6IFwiXjAuMS4xM1wiLFxuICAgIFwiZ3J1bnQtZGV2LXVwZGF0ZVwiOiBcIl4xLjMuMFwiLFxuICAgIFwiZ3J1bnQtZXNsaW50XCI6IFwiXjE1LjAuMFwiLFxuICAgIFwiZ3J1bnQtbW9jaGEtY292XCI6IFwiXjAuNC4wXCIsXG4gICAgXCJncnVudC1uZ2RvY3NcIjogXCJeMC4yLjdcIixcbiAgICBcImppdC1ncnVudFwiOiBcIl4wLjkuMVwiLFxuICAgIFwianNvbm1pbmlmeWlmeVwiOiBcIl4wLjEuMVwiLFxuICAgIFwibG9hZC1ncnVudC1jb25maWdcIjogXCJeMC4xNy4xXCIsXG4gICAgXCJtaW5pbWF0Y2hcIjogXCJeMi4wLjhcIixcbiAgICBcIm1vY2hhXCI6IFwiXjIuMi41XCIsXG4gICAgXCJtb2NoYS1sY292LXJlcG9ydGVyXCI6IFwiMC4wLjJcIixcbiAgICBcInRpbWUtZ3J1bnRcIjogXCJeMS4yLjFcIixcbiAgICBcInVnbGlmeWlmeVwiOiBcIl4zLjAuMVwiXG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJ0ZXN0XCI6IFwiZ3J1bnQgdGVzdFwiXG4gIH0sXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJhbmd1bGFyXCI6IFwiXjEuNC4xXCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiZGVidWdcIjogXCJeMi4yLjBcIixcbiAgICBcImxvZGFzaFwiOiBcIl4zLjkuM1wiXG4gIH1cbn1cbiJdfQ==
