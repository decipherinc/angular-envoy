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
/**
 * @ngdoc object
 * @name fv.envoy.envoy:$envoyProvider
 * @description
 * Allows configuration of options for **envoy**.
 */
function envoyProvider() {

  /**
   * @ngdoc function
   * @name fv.envoy.envoy:$envoyProvider#options
   * @methodOf fv.envoy.envoy:$envoyProvider
   * @description
   * Set options during config phase
   * @param {Object} [newOpts] New options to assign onto defaults
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
  dataFileUrl: DEFAULT_DATA_FILE,
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

/**
 * @ngdoc overview
 * @name fv.envoy
 * @description
 *
 *
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kaXJlY3RpdmVzL2FjdGlvbi5qcyIsImxpYi9kaXJlY3RpdmVzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbGlzdC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL2luZGV4LmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvbWVzc2FnZXMtY3RybC5qcyIsImxpYi9kaXJlY3RpdmVzL21lc3NhZ2VzL21lc3NhZ2VzLmpzIiwibGliL2RpcmVjdGl2ZXMvbWVzc2FnZXMvdmlld2RhdGEuanMiLCJsaWIvZGlyZWN0aXZlcy9wcm94eS5qcyIsImxpYi9lbnZveS9mYWN0b3J5LmpzIiwibGliL2Vudm95L2luZGV4LmpzIiwibGliL2Vudm95L29wdHMuanMiLCJsaWIvZm9ybS1kZWNvcmF0b3IuanMiLCJsaWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVidWcvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9ub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBOzs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNuYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgZnYuZW52b3kuZGlyZWN0aXZlOmVudm95QWN0aW9uXG4gKiBAcmVzdHJpY3QgQVxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXNjcmliZXMgYSBkaXJlY3RpdmUgd2hlcmVpbiB5b3UgY2FuIHN1cHBseSBhbiBhY3Rpb24gKEFuZ3VsYXJKU1xuICogZXhwcmVzc2lvbikgdG8gYmUgZXhlY3V0ZWQgZnJvbSB0aGUgbWVzc2FnZSBsaXN0IGZvciBhIHBhcnRpY3VsYXJcbiAqIGNvbnRyb2wuXG4gKlxuICogSW4gc2hvcnQsIHlvdSB3YW50IHRvIHVzZSB0aGlzIHRvIGFjdGl2YXRlIGEgZm9ybSBmaWVsZCB3aGVuIHRoZSB1c2VyXG4gKiBjbGlja3Mgb24gdGhlIGVycm9yIG1lc3NhZ2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGh0bWxcbiAqIDxpbnB1dCBuYW1lPVwidGl0bGVcIlxuICogICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAqICAgICAgICBuZy1tb2RlbD1cIm15TW9kZWwudGl0bGVcIlxuICogICAgICAgIGVudm95LWFjdGlvbj1cImRvU29tZXRoaW5nKClcIi8+XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gYWN0aW9uKCRlbnZveSkge1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiBbJ25nTW9kZWwnLCAnXmZvcm0nXSxcbiAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJscykge1xuICAgICAgdmFyIG5nTW9kZWwgPSBjdHJsc1swXTtcbiAgICAgIHZhciBmb3JtID0gY3RybHNbMV07XG4gICAgICB2YXIgYWN0aW9uO1xuXG4gICAgICBpZiAoKGFjdGlvbiA9IGF0dHJzLmVudm95QWN0aW9uKSAmJiBuZ01vZGVsLiRuYW1lICYmIGZvcm0uJG5hbWUpIHtcbiAgICAgICAgJGVudm95LnNldEFjdGlvbihmb3JtLiRuYW1lLCBuZ01vZGVsLiRuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2NvcGUuJGV2YWwoYWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuYWN0aW9uLiRpbmplY3QgPSBbJyRlbnZveSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICdlbnZveUFjdGlvbic6IHJlcXVpcmUoJy4vYWN0aW9uJyksXG4gICdlbnZveU1lc3NhZ2VzJzogcmVxdWlyZSgnLi9tZXNzYWdlcycpLFxuICAnZW52b3lMaXN0JzogcmVxdWlyZSgnLi9saXN0JyksXG4gICdlbnZveVByb3h5JzogcmVxdWlyZSgnLi9wcm94eScpXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgb3B0cyA9IHJlcXVpcmUoJy4uL2Vudm95L29wdHMnKTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqIERlZmluZXMgYSBkaXJlY3RpdmUgd2hpY2ggd2lsbCBkaXNwbGF5IGEgbGlzdCBvZiBhbGwgbWVzc2FnZXNcbiAqIGZvciBhIGZvcm0uXG4gKlxuICogVGhlIHRlbXBsYXRlIGZvciB0aGUgbGlzdCBpcyB0aGUgcHJvcGVydHkgYHRlbXBsYXRlVXJsYCBvZlxuICogJGVudm95UHJvdmlkZXIuXG4gKlxuICogVGhlIHRhcmdldCBmb3JtIGNhbiBiZSBzcGVjaWZpZWQsIGJ5IG5hbWUgKHdpdGggaW50ZXJwb2xhdGlvbiBhdmFpbGFibGUpLFxuICogaW4gdGhlIGBlbnZveUxpc3RgIGF0dHJpYnV0ZSBvciB0aGUgYGZvcmAgYXR0cmlidXRlLiAgVGhpcyBhdHRyaWJ1dGUgbWF5XG4gKiBiZSBvbWl0dGVkIGlmIHRoZSBgZW52b3lMaXN0YCBkaXJlY3RpdmUgaGFzIGFuIGBlbnZveU1lc3NhZ2VzYCBhbmNlc3Rvci5cbiAqIEBleGFtcGxlXG4gKiBgYGBodG1sXG4gKiA8ZGl2IGVudm95LWxpc3Q9XCJjb25maWdGb3JtXCI+PC9kaXY+XG4gKiA8IS0tIG9yIC0tPlxuICogPGVudm95LWxpc3QgZm9yPVwiY29uZmlnRm9ybVwiPjwvZW52b3ktbGlzdD5cbiAqIGBgYFxuICovXG5mdW5jdGlvbiBsaXN0KCRlbnZveSwgJGludGVycG9sYXRlKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgc2NvcGU6IHRydWUsXG4gICAgcmVxdWlyZTogJz9eZW52b3lNZXNzYWdlcycsXG4gICAgdGVtcGxhdGVVcmw6IG9wdHMudGVtcGxhdGVVcmwsXG4gICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgZW52b3lNZXNzYWdlcykge1xuICAgICAgdmFyIHBhcmVudE5hbWUgPSBhdHRycy5lbnZveUxpc3QgfHwgYXR0cnMuZm9yO1xuICAgICAgdmFyIHBhcmVudDtcblxuICAgICAgaWYgKHBhcmVudE5hbWUpIHtcbiAgICAgICAgcGFyZW50ID0gJGVudm95LmZpbmRQYXJlbnRDdHJsKCRpbnRlcnBvbGF0ZShwYXJlbnROYW1lKShzY29wZSkpO1xuICAgICAgfSBlbHNlIGlmIChlbnZveU1lc3NhZ2VzKSB7XG4gICAgICAgIHBhcmVudCA9IGVudm95TWVzc2FnZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Vudm95TGlzdCByZXF1aXJlcyBhbiBhbmNlc3RvciBlbnZveU1lc3NhZ2VzICcgK1xuICAgICAgICAgICdkaXJlY3RpdmUgb3IgYSBmb3JtIG5hbWUnKTtcbiAgICAgIH1cblxuICAgICAgcGFyZW50LmJpbmRWaWV3KHNjb3BlKTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGFyZW50LnVuYmluZFZpZXcoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cbmxpc3QuJGluamVjdCA9IFsnJGVudm95JywgJyRpbnRlcnBvbGF0ZSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9tZXNzYWdlcycpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciB2aWV3RGF0YSA9IHJlcXVpcmUoJy4vdmlld2RhdGEnKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlczpjb250cm9sbGVyJyk7XG5cbmZ1bmN0aW9uIE1lc3NhZ2VzQ3RybCgkZWxlbWVudCxcbiAgJGVudm95LFxuICAkYXR0cnMsXG4gICRzY29wZSxcbiAgJGludGVycG9sYXRlKSB7XG5cbiAgdmFyIHZpZXc7XG5cbiAgLyoqXG4gICAqIEJpbmQgYSB2aWV3IFNjb3BlIHRvIHRoaXMgZGlyZWN0aXZlIGZvciBkaXNwbGF5LiAgVXNlZCBieVxuICAgKiBgbWVzc2FnZXNMaXN0YCBkaXJlY3RpdmUuXG4gICAqIEBwYXJhbSB7bmcuJHJvb3RTY29wZS5TY29wZX0gc2NvcGVcbiAgICogQHJldHVybnMge01lc3NhZ2VzQ3RybH0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICB0aGlzLmJpbmRWaWV3ID0gZnVuY3Rpb24gYmluZFZpZXcoc2NvcGUpIHtcbiAgICBpZiAodmlldy5zY29wZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd2aWV3IGFscmVhZHkgYm91bmQhJyk7XG4gICAgfVxuICAgIHZpZXcuc2NvcGUgPSBzY29wZTtcbiAgICBzY29wZS5kYXRhID0gdmlld0RhdGEoJGVudm95LkRFRkFVTFRfTEVWRUwpO1xuICAgIGRlYnVnKCdWaWV3IGJvdW5kJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIHZhciB2aWV3RGF0YSA9IHRoaXMuJHZpZXdEYXRhO1xuICAgIHZhciBlcnJvckxldmVsO1xuXG4gICAgaWYgKHZpZXdEYXRhKSB7XG5cbiAgICAgIGRlYnVnKCdcIiVzXCIgdXBkYXRpbmcgd2l0aCBuZXcgZGF0YTonLCB0aGlzLiRuYW1lLCBkYXRhKTtcblxuICAgICAgdGhpcy4kZXJyb3JMZXZlbCA9XG4gICAgICAgIGVycm9yTGV2ZWwgPVxuICAgICAgICAgIF8uaXNOdW1iZXIoZGF0YS5lcnJvckxldmVsKSA/IGRhdGEuZXJyb3JMZXZlbCA6IHRoaXMuJGVycm9yTGV2ZWw7XG5cbiAgICAgIC8vIHRoaXMgYmVhc3QgaXMga2luZCBvZiBhIGN1c3RvbSBtZXJnZVxuICAgICAgXy5lYWNoKGRhdGEubWVzc2FnZXMsIGZ1bmN0aW9uIChmb3JtTWVzc2FnZXMsIGZvcm1OYW1lKSB7XG4gICAgICAgIGlmICh2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV0pIHtcbiAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzLCBmdW5jdGlvbiAoY29udHJvbE1lc3NhZ2VzLCBjb250cm9sTmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QoY29udHJvbE1lc3NhZ2VzKSkge1xuICAgICAgICAgICAgICBpZiAodmlld0RhdGEubWVzc2FnZXNbZm9ybU5hbWVdW2NvbnRyb2xOYW1lXSkge1xuICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0sXG4gICAgICAgICAgICAgICAgICBjb250cm9sTWVzc2FnZXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXVtjb250cm9sTmFtZV0gPSBjb250cm9sTWVzc2FnZXM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB2aWV3RGF0YS5tZXNzYWdlc1tmb3JtTmFtZV1bY29udHJvbE5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZpZXdEYXRhLm1lc3NhZ2VzW2Zvcm1OYW1lXSA9IGZvcm1NZXNzYWdlcztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2aWV3RGF0YS5lcnJvciA9ICEhZXJyb3JMZXZlbDtcbiAgICAgIHZpZXdEYXRhLmNsYXNzTmFtZSA9ICRlbnZveS5sZXZlbChlcnJvckxldmVsKTtcbiAgICAgIHZpZXdEYXRhLnRpdGxlID0gdGhpcy50aXRsZShlcnJvckxldmVsKTtcblxuICAgICAgZGVidWcoJ1wiJXNcIiB1cGRhdGVkOyB2aWV3IGRhdGE6JywgdGhpcy4kbmFtZSwgdmlld0RhdGEpO1xuXG4gICAgICByZXR1cm4gdmlld0RhdGE7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbmJpbmQgdGhlIGJvdW5kIFNjb3BlIG9mIHRoaXMgY29udHJvbGxlci5cbiAgICogQHJldHVybnMge01lc3NhZ2VzQ3RybH0gVGhpcyBjb250cm9sbGVyXG4gICAqL1xuICB0aGlzLnVuYmluZFZpZXcgPSBmdW5jdGlvbiB1bmJpbmRWaWV3KCkge1xuICAgIGRlbGV0ZSB2aWV3LnNjb3BlO1xuICAgIHZpZXcgPSBudWxsO1xuICAgIGRlYnVnKCdWaWV3IHVuYm91bmQnKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICB0aGlzLmFkZENoaWxkID0gZnVuY3Rpb24gYWRkQ2hpbGQoY2hpbGQpIHtcbiAgICBkZWJ1ZygnQWRkaW5nIGNoaWxkIFwiJXNcIiB0byBcIiVzXCInLCBjaGlsZC4kbmFtZSwgdGhpcy4kbmFtZSk7XG4gICAgdGhpcy4kY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgY2hpbGQuJHBhcmVudCA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy5yZW1vdmVDaGlsZCA9IGZ1bmN0aW9uIHJlbW92ZUNoaWxkKGNoaWxkKSB7XG4gICAgZGVidWcoJ1JlbW92aW5nIGNoaWxkIFwiJXNcIiBmcm9tIFwiJXNcIicsIGNoaWxkLiRuYW1lLCB0aGlzLiRuYW1lKTtcbiAgICB0aGlzLiRjaGlsZHJlbi5zcGxpY2UodGhpcy4kY2hpbGRyZW4uaW5kZXhPZihjaGlsZCksIDEpO1xuICAgIGRlbGV0ZSBjaGlsZC4kcGFyZW50O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMudGl0bGUgPSBmdW5jdGlvbiB0aXRsZShlcnJvckxldmVsKSB7XG4gICAgcmV0dXJuICRlbnZveS5sZXZlbERlc2NyaXB0aW9uKGVycm9yTGV2ZWwpO1xuICB9O1xuXG4gIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy4kbmFtZTtcbiAgfTtcblxuICB0aGlzLmJyb2FkY2FzdCA9ICRzY29wZS4kYnJvYWRjYXN0LmJpbmQoJHNjb3BlKTtcbiAgdGhpcy5lbWl0ID0gJHNjb3BlLiRwYXJlbnQuJGVtaXQuYmluZCgkc2NvcGUuJHBhcmVudCk7XG5cbiAgLyoqXG4gICAqIEB0aGlzIE1lc3NhZ2VzQ3RybFxuICAgKi9cbiAgKGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdmFyIHBhcmVudE5hbWU7XG4gICAgdmFyIGZvcm07XG5cbiAgICB0aGlzLiRjaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMuJHBhcmVudCA9IG51bGw7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAkZXJyb3JMZXZlbDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldEVycm9yTGV2ZWwoKSB7XG4gICAgICAgICAgcmV0dXJuIGZvcm0uJGVycm9yTGV2ZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0RXJyb3JMZXZlbCh2YWx1ZSkge1xuICAgICAgICAgIGZvcm0uJGVycm9yTGV2ZWwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICRuYW1lOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0TmFtZSgpIHtcbiAgICAgICAgICByZXR1cm4gZm9ybS4kbmFtZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICR2aWV3RGF0YToge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldFZpZXdEYXRhKCkge1xuICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgIGlmICgoZGF0YSA9IF8uZ2V0KHZpZXcsICdzY29wZS5kYXRhJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZpZXcuc2NvcGUpIHtcbiAgICAgICAgICAgIHJldHVybiAodmlldy5zY29wZS5kYXRhID0gdmlld0RhdGEoJGVudm95LkRFRkFVTFRfTEVWRUwpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0Vmlld0RhdGEoZGF0YSkge1xuICAgICAgICAgIHZpZXcuc2NvcGUuZGF0YSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGZvcm0gPSB0aGlzLiRmb3JtID0gJGVsZW1lbnQuY29udHJvbGxlcignZm9ybScpO1xuXG4gICAgdGhpcy4kY2hpbGRyZW4gPSBbXTtcblxuICAgIHZpZXcgPVxuICAgICAgdGhpcy4kcGFyZW50ID8gKHRoaXMuJHZpZXcgPSB0aGlzLiRwYXJlbnQuJHZpZXcpIDogKHRoaXMuJHZpZXcgPSB7fSk7XG5cbiAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsICRlbnZveS5iaW5kRm9ybSh0aGlzLCB0aGlzLiRuYW1lKSk7XG5cbiAgfS5jYWxsKHRoaXMpKTtcbn1cblxuTWVzc2FnZXNDdHJsLiRpbmplY3QgPSBbXG4gICckZWxlbWVudCcsXG4gICckZW52b3knLFxuICAnJGF0dHJzJyxcbiAgJyRzY29wZScsXG4gICckaW50ZXJwb2xhdGUnXG5dO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lc3NhZ2VzQ3RybDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lNZXNzYWdlc1xuICogQHJlc3RyaWN0IEFFXG4gKiBAcGFyYW0ge3N0cmluZ30gW3BhcmVudF0gSWYgdGhpcyBkaXJlY3RpdmUgaXMgaW4gYSBzdWJmb3JtIG9mIHNvbWUgb3RoZXJcbiAqIGZvcm0gd2hpY2ggaXMgKmFsc28qIHVzaW5nIHRoZSBgZW52b3lNZXNzYWdlc2AgZGlyZWN0aXZlLCBhbmQgeW91IHdpc2ggdG9cbiAqIGRpc3BsYXkgbWVzc2FnZXMgd2l0aGluIGl0cyBsaXN0LCBzcGVjaWZ5IGl0cyBmb3JtIG5hbWUgaGVyZS5cbiAqIEBkZXNjcmlwdGlvblxuICogRW5hYmxlcyBkaXNwbGF5IG9mIG1lc3NhZ2VzIGZvciBhIGZvcm0uXG4gKi9cblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczptZXNzYWdlcycpO1xuXG5mdW5jdGlvbiBtZXNzYWdlcygkaW50ZXJwb2xhdGUsICRlbnZveSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQUUnLFxuICAgIC8vIGlzIGl0IGR1bWIgdG8gcmVxdWlyZSB5b3VyIG93biBjb250cm9sbGVyP1xuICAgIHJlcXVpcmU6ICdlbnZveU1lc3NhZ2VzJyxcbiAgICBjb250cm9sbGVyOiByZXF1aXJlKCcuL21lc3NhZ2VzLWN0cmwnKSxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICBsaW5rOiBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuICAgICAgdmFyIHBhcmVudE5hbWU7XG5cbiAgICAgIGlmIChhdHRycy5wYXJlbnQgJiYgKHBhcmVudE5hbWUgPSAkaW50ZXJwb2xhdGUoYXR0cnMucGFyZW50KShzY29wZSkpKSB7XG4gICAgICAgICRlbnZveS5maW5kUGFyZW50Q3RybChwYXJlbnROYW1lLFxuICAgICAgICAgIGVsZW1lbnQucGFyZW50KCkuY29udHJvbGxlcignZW52b3lNZXNzYWdlcycpKS5hZGRDaGlsZChjdHJsKTtcblxuICAgICAgICBpZiAoY3RybC4kcGFyZW50LiRmb3JtID09PSBjdHJsLiRmb3JtKSB7XG4gICAgICAgICAgY3RybC4kcGFyZW50LnJlbW92ZUNoaWxkKGN0cmwpO1xuICAgICAgICAgIGRlYnVnKCdBdHRlbXB0ZWQgdG8gaW5pdGlhbGl6ZSAlcyB3aXRoIGl0cyBvd24gcGFyZW50JyxcbiAgICAgICAgICAgIGN0cmwuJGZvcm0uJG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjdHJsLiRwYXJlbnQpIHtcbiAgICAgICAgICBjdHJsLiRwYXJlbnQucmVtb3ZlQ2hpbGQoY3RybCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cbm1lc3NhZ2VzLiRpbmplY3QgPSBbJyRpbnRlcnBvbGF0ZScsICckZW52b3knXTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXNzYWdlcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5fIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5fIDogbnVsbCk7XG5cbnZhciBJRF9QUkVGSVggPSAnZW52b3ktdmlld2RhdGEtJztcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2Vudm95OmRpcmVjdGl2ZXM6bWVzc2FnZXM6dmlld2RhdGEnKTtcblxuZnVuY3Rpb24gdmlld0RhdGEoZGVmYXVsdExldmVsKSB7XG4gIHZhciBkYXRhID0ge1xuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgIHRoaXMuZXJyb3IgPSBmYWxzZTtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSB7fTtcbiAgICAgIHRoaXMudGl0bGUgPSBudWxsO1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBudWxsO1xuICAgICAgdGhpcy5lcnJvckxldmVsID0gZGVmYXVsdExldmVsO1xuICAgIH0sXG4gICAgaWQ6IF8udW5pcXVlSWQoSURfUFJFRklYKVxuICB9O1xuICBkYXRhLnJlc2V0KCk7XG4gIGRlYnVnKCdDcmVhdGVkIHZpZXdkYXRhIG9iamVjdCB3aXRoIGlkIFwiJXNcIicsIGRhdGEuaWQpO1xuICByZXR1cm4gZGF0YTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3RGF0YTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBmdi5lbnZveS5kaXJlY3RpdmU6ZW52b3lQcm94eVxuICogQHJlc3RyaWN0IEFcbiAqIEBkZXNjcmlwdGlvblxuICogRGVmaW5lcyBhIGRpcmVjdGl2ZSB3aGljaCwgd2hlbiB1c2VkIHdpdGggbmdNb2RlbCwgd2lsbCBzZXQgdGhlIHZhbGlkaXR5XG4gKiBvZiB0aGUgYXNzb2NpYXRlZCBOZ01vZGVsQ29udHJvbGxlciwgYmFzZWQgb24gdGhlIHZhbGlkaXR5IG9mIHRoZSB0YXJnZXRcbiAqIGZvcm0uXG4gKi9cbmZ1bmN0aW9uIHByb3h5KCkge1xuXG4gIC8qKlxuICAgKiBBbnl0aGluZyB0aGF0IG5lZWRzIHZhbGlkYXRpbmcgbmVlZHMgYSB0b2tlbiwgc28sIGhlcmUncyBvbmUuXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICB2YXIgVE9LRU4gPSAncHJveHknO1xuXG4gIC8qKlxuICAgKiBUaGUgY2xhc3MgdG8gYmUgYXBwbGllZCBpZiB0aGUgZGlyZWN0aXZlJ3MgdmFsdWUgaXMgcHJlc2VudFxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgdmFyIENMQVNTTkFNRSA9ICdlcnJvcmxldmVsJztcblxuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnQScsXG4gICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICckc2NvcGUnLFxuICAgICAgJyRlbGVtZW50JyxcbiAgICAgICckYXR0cnMnLFxuICAgICAgJyRlbnZveScsXG4gICAgICAnJGludGVycG9sYXRlJyxcbiAgICAgIGZ1bmN0aW9uIFByb3h5Q3RybCgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRlbnZveSwgJGludGVycG9sYXRlKSB7XG5cbiAgICAgICAgdmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6ZGlyZWN0aXZlczpwcm94eTpjb250cm9sbGVyJyk7XG4gICAgICAgIHZhciB0YXJnZXQgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLmVudm95UHJveHkgfHwgJycpKCRzY29wZSk7XG4gICAgICAgIHZhciBuZ01vZGVsID0gJGVsZW1lbnQuY29udHJvbGxlcignbmdNb2RlbCcpO1xuXG4gICAgICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGRhdGEpIHtcbiAgICAgICAgICB2YXIgaXNWYWxpZCA9ICFkYXRhLmVycm9yTGV2ZWw7XG4gICAgICAgICAgdmFyIGVycm9yTGV2ZWxOYW1lID0gJGVudm95LmxldmVsKGRhdGEuZXJyb3JMZXZlbCk7XG4gICAgICAgICAgZGVidWcoJ1Byb3h5IFwiJXNcIiB1cGRhdGVkIHcvIGVycm9yTGV2ZWwgJXMnLCB0YXJnZXQsIGVycm9yTGV2ZWxOYW1lKTtcbiAgICAgICAgICBfLmVhY2goJGVudm95LkVSUk9STEVWRUxTLCBmdW5jdGlvbiAoZXJyb3JsZXZlbCwgZXJyb3JMZXZlbE5hbWUpIHtcbiAgICAgICAgICAgICRlbGVtZW50LnJlbW92ZUNsYXNzKGVycm9yTGV2ZWxOYW1lKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBuZ01vZGVsLiRzZXRWYWxpZGl0eShUT0tFTiwgaXNWYWxpZCk7XG4gICAgICAgICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICAgICAgICAkZWxlbWVudC5hZGRDbGFzcyhlcnJvckxldmVsTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy4kbmFtZSArICctcHJveHknO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuJG5hbWUgPSB0YXJnZXQ7XG5cbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKENMQVNTTkFNRSk7XG4gICAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCAkZW52b3kuYmluZEZvcm0odGhpcywgdGFyZ2V0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdlbnZveVByb3h5IGRpcmVjdGl2ZSBuZWVkcyBhIHZhbHVlIScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgXVxuICB9O1xufVxubW9kdWxlLmV4cG9ydHMgPSBwcm94eTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5fIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5fIDogbnVsbCk7XG52YXIgb3B0cyA9IHJlcXVpcmUoJy4vb3B0cycpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTokZW52b3k6ZmFjdG9yeScpO1xuXG5mdW5jdGlvbiBlbnZveUZhY3RvcnkoJGh0dHAsICRxKSB7XG5cbiAgLyoqXG4gICAqIEVycm9yIGxldmVscyBhcyBjb25maWd1cmVkIGluIG9wdHMgaW4gb3JkZXIsIGJ5IG5hbWVcbiAgICogQHR5cGUge0FycmF5LjxzdHJpbmc+fVxuICAgKi9cbiAgdmFyIExFVkVMX0FSUkFZID0gXy5wbHVjayhvcHRzLmxldmVscywgJ25hbWUnKTtcblxuICAvKipcbiAgICogTWFwcGluZyBvZiBlcnJvciBsZXZlbCBuYW1lcyB0byBpbmRpY2VzIGluIHtAbGluayBMRVZFTF9BUlJBWX1cbiAgICogQHR5cGUge09iamVjdC48c3RyaW5nLG51bWJlcj59XG4gICAqL1xuICB2YXIgTEVWRUxTID0gXyhMRVZFTF9BUlJBWSlcbiAgICAuaW52ZXJ0KClcbiAgICAubWFwVmFsdWVzKF8ucGFyc2VJbnQpXG4gICAgLnZhbHVlKCk7XG5cbiAgLyoqXG4gICAqIExvb2t1cCBvZiBmb3JtcyBhbmQgY29udHJvbHMgdG8gYW55IGFjdGlvbnMgYm91bmQgdmlhIHRoZVxuICAgKiBtZXNzYWdlQWN0aW9uIGRpcmVjdGl2ZS4gIEFuIGFjdGlvbiBpcyBzaW1wbHkgYW4gQW5ndWxhckpTXG4gICAqIGV4cHJlc3Npb24gd2hpY2ggd2lsbCBiZSBldmFsdWF0ZWQuXG4gICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxPYmplY3QuPHN0cmluZyxzdHJpbmc+Pn1cbiAgICovXG4gIHZhciBhY3Rpb25zID0ge307XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBmb3JtIG5hbWUgdG8gTWVzc2FnZXNDdHJsIGJpbmRpbmdzXG4gICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxNZXNzYWdlc0N0cmw+fVxuICAgKi9cbiAgdmFyIGJpbmRpbmdzID0ge307XG5cbiAgdmFyIHByb3RvdHlwZTtcblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgY29sbGVjdGlvbiBvZiBtZXNzYWdlcyBmb3IgYSBmb3JtIGFuZC9vciBjb250cm9sXG4gICAqIHdpdGhpbiB0aGF0IGZvcm0uICBJZiBubyBwYXJhbWV0ZXJzLCByZXR1cm5zIHRoZSBlbnRpcmV0eSBvZiB0aGVcbiAgICogZGF0YSBmaWxlLlxuICAgKiBAcGFyYW0ge0Zvcm1Db250cm9sbGVyfSBmb3JtIEZvcm0gY29udHJvbGxlclxuICAgKiBAcmV0dXJucyB7Kn0gVmFsdWUsIGlmIGFueVxuICAgKi9cbiAgZnVuY3Rpb24gJGVudm95KGZvcm0pIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gJGVudm95Ll9jYWNoZVtmb3JtLiRuYW1lXSkpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiAkaHR0cC5nZXQob3B0cy5kYXRhRmlsZVVybCwge1xuICAgICAgY2FjaGU6IHRydWVcbiAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbnRpcmV0eSBvZiB0aGUgZGF0YSBmaWxlXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbWVzc2FnZXMgPSByZXMuZGF0YTtcblxuICAgICAgICBpZiAoZm9ybSkge1xuICAgICAgICAgIC8vIElmIHRoZSBmb3JtIGhhcyBhbiBhbGlhcyAodXNlIHRoZSBcImFsaWFzXCIgZGlyZWN0aXZlKSxcbiAgICAgICAgICAvLyB0aGlzIG5hbWUgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICAgICAgICBtZXNzYWdlcyA9IF8obWVzc2FnZXNbZm9ybS4kYWxpYXMgfHwgZm9ybS4kbmFtZV0pXG4gICAgICAgICAgICAvLyBoZXJlIHdlIHBpY2sgb25seSB0aGUgY29udHJvbHMgdGhhdCBhcmUgaW52YWxpZC5cbiAgICAgICAgICAgIC5tYXBWYWx1ZXMoZnVuY3Rpb24gKGNvbnRyb2xNc2dPcHRpb25zLCBjb250cm9sTXNnTmFtZSkge1xuICAgICAgICAgICAgICB2YXIgZm9ybUNvbnRyb2wgPSBmb3JtW2NvbnRyb2xNc2dOYW1lXTtcbiAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyB0cnV0aHksIHRoZW4gd2UgaGF2ZSBlcnJvcnMgaW4gdGhlIGdpdmVuXG4gICAgICAgICAgICAgIC8vIGNvbnRyb2xcbiAgICAgICAgICAgICAgdmFyIGVycm9yID0gZm9ybUNvbnRyb2wgJiYgXy5zaXplKGZvcm1Db250cm9sLiRlcnJvcik7XG5cbiAgICAgICAgICAgICAgaWYgKGZvcm1Db250cm9sICYmIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBwcm9ibGVtIHRva2VucyBhbmQgZ3JhYiBhbnkgYWN0aW9uc1xuICAgICAgICAgICAgICAgIC8vIGlmIHByZXNlbnQuICBhY3Rpb25zIGFyZSBhc3NpZ25lZCBhdCB0aGUgY29udHJvbFxuICAgICAgICAgICAgICAgIC8vIGxldmVsLCBidXQgd2UgZG9uJ3QgaGF2ZSBncmFudWxhciBjb250cm9sIG92ZXJcbiAgICAgICAgICAgICAgICAvLyB3aGljaCB2YWxpZGF0aW9uIHRva2VuIHRyaWdnZXJzIHdoaWNoIGFjdGlvbi5cbiAgICAgICAgICAgICAgICAvLyBzbywgaWYgdGhlcmUgd2VyZSB0d28gcHJvYmxlbXMgd2l0aCBvbmUgY29udHJvbCxcbiAgICAgICAgICAgICAgICAvLyBib3RoIHRva2VucyB3b3VsZCByZWNlaXZlIHRoZSBhY3Rpb24gcHJvcC5cbiAgICAgICAgICAgICAgICByZXR1cm4gXyhjb250cm9sTXNnT3B0aW9ucylcbiAgICAgICAgICAgICAgICAgIC5waWNrKF8ua2V5cyhmb3JtQ29udHJvbC4kZXJyb3IpKVxuICAgICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHRva2VuSW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbkluZm8uYWN0aW9uID1cbiAgICAgICAgICAgICAgICAgICAgICAkZW52b3kuZ2V0QWN0aW9uKGZvcm0uJG5hbWUsIGNvbnRyb2xNc2dOYW1lKTtcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAudmFsdWUoKTtcblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdID0gbWVzc2FnZXM7XG5cbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgICAgfSk7XG4gIH1cblxuICBwcm90b3R5cGUgPSB7XG5cbiAgICBfY2FjaGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogVXRpbGl0eSBmdW5jdGlvbiB0byBjb252ZXJ0IGFuIGVycm9yIGxldmVsIGludG8gYSBudW1iZXIgb3JcbiAgICAgKiBzdHJpbmdcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8c3RyaW5nKX0gW2Vycm9yTGV2ZWxdIEVycm9yIGxldmVsLCBvciBkZWZhdWx0XG4gICAgICogICAgIGxldmVsXG4gICAgICogQHJldHVybnMgeyhudW1iZXJ8c3RyaW5nKX0gQ29ycmVzcG9uZGluZyBzdHJpbmcvbnVtYmVyXG4gICAgICovXG4gICAgbGV2ZWw6IGZ1bmN0aW9uIGxldmVsKGVycm9yTGV2ZWwpIHtcbiAgICAgIHJldHVybiBfLmlzU3RyaW5nKGVycm9yTGV2ZWwpID9cbiAgICAgIExFVkVMU1tlcnJvckxldmVsXSB8fCBMRVZFTFNbb3B0cy5kZWZhdWx0TGV2ZWxdIDpcbiAgICAgIExFVkVMX0FSUkFZW2Vycm9yTGV2ZWxdIHx8IG9wdHMuZGVmYXVsdExldmVsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIGBGb3JtQ29udHJvbGxlcmAsIGNhbGN1bGF0ZSB0aGUgbWF4aW11bSBlcnJvciBsZXZlbFxuICAgICAqIGZvciBpdHMgY29udHJvbHMgd2hpY2ggYXJlIGludmFsaWQuXG4gICAgICogQHBhcmFtIHtGb3JtQ29udHJvbGxlcn0gZm9ybSBmb3JtIHRvIGluc3BlY3RcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZS48c3RyaW5nPn0gTGV2ZWwgbmFtZVxuICAgICAqIEB0aHJvd3MgaWYgbm8gRm9ybUNvbnRyb2xsZXIgcGFzc2VkXG4gICAgICovXG4gICAgZm9ybUVycm9yTGV2ZWw6IGZ1bmN0aW9uIGZvcm1FcnJvckxldmVsKGZvcm0pIHtcbiAgICAgIGlmICghZm9ybSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuICRlbnZveShmb3JtKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAoZm9ybU1lc3NhZ2VzKSB7XG4gICAgICAgICAgcmV0dXJuICRlbnZveS5fZm9ybUVycm9yTGV2ZWwoZm9ybSwgZm9ybU1lc3NhZ2VzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9mb3JtRXJyb3JMZXZlbDogZnVuY3Rpb24gX2Zvcm1FcnJvckxldmVsKGZvcm0sIGZvcm1NZXNzYWdlcykge1xuICAgICAgLyoqXG4gICAgICAgKiBJbmRleCBvZiB0aGUgZGVmYXVsdCBlcnJvciBsZXZlbFxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqL1xuICAgICAgdmFyIGRlZmF1bHRMZXZlbE51bSA9IExFVkVMU1tvcHRzLmRlZmF1bHRMZXZlbF07XG5cbiAgICAgIC8qKlxuICAgICAgICogTWF4aW11bSBlcnJvciBsZXZlbCBvZiBhbGwgdmFsaWRhdGlvbiB0b2tlbnMgd2l0aGluIGFsbFxuICAgICAgICogY29udHJvbHMgb2YgdGhpcyBmb3JtXG4gICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICovXG4gICAgICB2YXIgbWF4TGV2ZWwgPSBfLnJlZHVjZShmb3JtTWVzc2FnZXMsXG4gICAgICAgIGZ1bmN0aW9uIChyZXN1bHQsIGNvbnRyb2xNc2dPcHRzKSB7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBNYXhpbXVtIGVycm9yIGxldmVsIG9mIGFueSB2YWxpZGF0aW9uIHRva2VuIHdpdGhpblxuICAgICAgICAgICAqIHRoZSBjb250cm9sIHdoaWNoIGlzIGluIFwiaW52YWxpZFwiIHN0YXRlLlxuICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIG1heENvbnRyb2xMZXZlbCA9IF8oY29udHJvbE1zZ09wdHMpXG4gICAgICAgICAgICAucGljayhmdW5jdGlvbiAodG9rZW5PcHRzLCB0b2tlbk5hbWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZvcm0uJGVycm9yW3Rva2VuTmFtZV07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnBsdWNrKCdsZXZlbCcpXG4gICAgICAgICAgICAubWFwKCRlbnZveS5sZXZlbClcbiAgICAgICAgICAgIC5tYXgoKTtcblxuICAgICAgICAgIHJldHVybiBNYXRoLm1heChyZXN1bHQsIG1heENvbnRyb2xMZXZlbCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlZmF1bHRMZXZlbE51bSk7XG5cbiAgICAgIHZhciBlcnJvckxldmVsTmFtZSA9ICRlbnZveS5sZXZlbChtYXhMZXZlbCk7XG4gICAgICBkZWJ1ZygnQ29tcHV0ZWQgZXJyb3JMZXZlbCBcIiVzXCIgZm9yIGZvcm0gXCIlc1wiJyxcbiAgICAgICAgZXJyb3JMZXZlbE5hbWUsXG4gICAgICAgIGZvcm0uJG5hbWUpO1xuICAgICAgcmV0dXJuIG1heExldmVsO1xuICAgIH0sXG5cbiAgICBfZW1pdHRpbmc6IG51bGwsXG4gICAgYmluZEZvcm06IGZ1bmN0aW9uIGJpbmRGb3JtKGN0cmwsIGZvcm1OYW1lKSB7XG5cbiAgICAgIHZhciBmb3JtQmluZGluZ3MgPSBiaW5kaW5nc1tmb3JtTmFtZV0gPSBiaW5kaW5nc1tmb3JtTmFtZV0gfHwge307XG4gICAgICB2YXIgaWQgPSBfLnVuaXF1ZUlkKCdlbnZveS1iaW5kaW5nLScpO1xuXG4gICAgICBmb3JtQmluZGluZ3NbaWRdID0gY3RybDtcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIHVuYmluZEZvcm0oKSB7XG4gICAgICAgIGRlbGV0ZSBmb3JtQmluZGluZ3NbaWRdO1xuICAgICAgfTtcbiAgICB9LFxuICAgIGVtaXQ6IGZ1bmN0aW9uIGVtaXQoZm9ybSwgY29udHJvbCkge1xuICAgICAgdmFyIF9lbWl0O1xuXG4gICAgICBmdW5jdGlvbiBmaW5kUGFyZW50cyhjdHJsLCBsaXN0KSB7XG4gICAgICAgIGxpc3QgPSBsaXN0IHx8IFtdO1xuICAgICAgICBpZiAoY3RybC4kcGFyZW50KSB7XG4gICAgICAgICAgbGlzdC5wdXNoKGN0cmwuJHBhcmVudCk7XG4gICAgICAgICAgcmV0dXJuIGZpbmRQYXJlbnRzKGN0cmwuJHBhcmVudCwgbGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogRm9yIGEgTWVzc2FnZUN0cmwsIGZpbmQgYWxsIGNoaWxkcmVuIChyZWN1cnNpdmVseSkuXG4gICAgICAgKiBAcGFyYW0ge01lc3NhZ2VDdHJsfSBjdHJsIGVudm95TWVzc2FnZSBDb250cm9sbGVyXG4gICAgICAgKiBAcGFyYW0ge0FycmF5LjxNZXNzYWdlQ3RybD59IFtsaXN0PVtdXSBBcnJheSBvZiBjaGlsZHJlblxuICAgICAgICogQHJldHVybnMge0FycmF5LjxNZXNzYWdlQ3RybD59IEFycmF5IG9mIGNoaWxkcmVuXG4gICAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIGZpbmRDaGlsZHJlbihjdHJsLCBsaXN0KSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IGN0cmwuJGNoaWxkcmVuO1xuICAgICAgICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgICAgICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgIGxpc3QucHVzaC5hcHBseShsaXN0LCBjaGlsZHJlbik7XG4gICAgICAgICAgcmV0dXJuIF8oY2hpbGRyZW4pXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZmluZENoaWxkcmVuKGNoaWxkLCBsaXN0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmxhdHRlbigpXG4gICAgICAgICAgICAudW5pcXVlKClcbiAgICAgICAgICAgIC52YWx1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIEdpdmVuIHNvbWUgY29udHJvbGxlcnMsIHNldCB0aGUgZGVmYXVsdCBlcnJvckxldmVsIGlmIGl0IGRvZXNuJ3RcbiAgICAgICAqIGV4aXN0LlxuICAgICAgICogQHBhcmFtIHsuLi5BcnJheS48KE1lc3NhZ2VDdHJsfFByb3h5Q3RybCk+fSBbY3RybHNdIEFycmF5cyBvZlxuICAgICAgICogICAgIGNvbnRyb2xsZXJzXG4gICAgICAgKi9cbiAgICAgIGZ1bmN0aW9uIHNldERlZmF1bHRDdHJsTGV2ZWxzKCkge1xuICAgICAgICBfLmVhY2goXy50b0FycmF5KGFyZ3VtZW50cyksIGZ1bmN0aW9uIChjdHJscykge1xuICAgICAgICAgIF8uZWFjaChjdHJscywgZnVuY3Rpb24gKGN0cmwpIHtcbiAgICAgICAgICAgIGN0cmwuJGVycm9yTGV2ZWwgPSBjdHJsLiRlcnJvckxldmVsIHx8ICRlbnZveS5ERUZBVUxUX0VSUk9STEVWRUw7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBfZW1pdCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gX2VtaXQoZm9ybSwgY29udHJvbCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGwgY29udHJvbGxlcnMgdGhhdCBjYXJlIGFib3V0IHRoaXMgZm9ybSwgYmUgaXQgZW52b3lNZXNzYWdlXG4gICAgICAgICAqIGNvbnRyb2xsZXJzLCBvciBlbnZveVByb3h5IGNvbnRyb2xsZXJzLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPChNZXNzYWdlQ3RybHxQcm94eUN0cmwpPn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBib3VuZEN0cmxzID0gXy50b0FycmF5KGJpbmRpbmdzW2Zvcm0uJG5hbWVdKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhvc2Ugb2YgdGhlIGJvdW5kIGNvbnRyb2xzIHdoaWNoIGFyZSBlbnZveU1lc3NhZ2UgY29udHJvbGxlcnMuXG4gICAgICAgICAqIFRoZXNlIGhhdmUgYWN0dWFsIGZvcm0gb2JqZWN0cyB3aXRoaW4gdGhlbSwgc28gd2UnbGwgdXNlIHRoZW1cbiAgICAgICAgICogdG8gZGV0ZXJtaW5lIHRoZSBhcHByb3ByaWF0ZSBlcnJvcmxldmVsKHMpLlxuICAgICAgICAgKiBAdHlwZSB7QXJyYXkuPE1lc3NhZ2VDdHJsPn1cbiAgICAgICAgICovXG4gICAgICAgIHZhciBtZXNzYWdlQ3RybHM7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFsbCBwYXJlbnQgY29udHJvbGxlcnMgb2YgdGhlIG1lc3NhZ2VDdHJscy5cbiAgICAgICAgICogQHR5cGUge0FycmF5LjxNZXNzYWdlQ3RybD59XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgcGFyZW50Q3RybHM7XG5cbiAgICAgICAgaWYgKCFib3VuZEN0cmxzLmxlbmd0aCkge1xuICAgICAgICAgIC8vIG5vYm9keSBjYXJlcy5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBtZXNzYWdlQ3RybHMgPSBfLmZpbHRlcihib3VuZEN0cmxzLCBmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgIHJldHVybiBjdHJsLiRmb3JtO1xuICAgICAgICB9KTtcblxuICAgICAgICBwYXJlbnRDdHJscyA9IF8obWVzc2FnZUN0cmxzKVxuICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmluZFBhcmVudHMoY2hpbGQpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZsYXR0ZW4oKVxuICAgICAgICAgIC52YWx1ZSgpO1xuXG4gICAgICAgIC8vIGZvciB0aG9zZSB3aGljaCBkb24ndCBoYXZlIGFuICRlcnJvckxldmVsIHByb3Agc2V0LCBzZXQgaXQuXG4gICAgICAgIHNldERlZmF1bHRDdHJsTGV2ZWxzKHBhcmVudEN0cmxzLCBtZXNzYWdlQ3RybHMpO1xuXG4gICAgICAgICRlbnZveS5fZW1pdHRpbmcgPSAkZW52b3koZm9ybSlcbiAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZm9ybU1lc3NhZ2VzKSB7XG4gICAgICAgICAgICB2YXIgbGFzdEVycm9yTGV2ZWwgPSAkZW52b3kuX2Zvcm1FcnJvckxldmVsKGZvcm0sXG4gICAgICAgICAgICAgIGZvcm1NZXNzYWdlcyk7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZXMgPSBfLm9iamVjdChbZm9ybS4kbmFtZV0sIFtmb3JtTWVzc2FnZXNdKTtcbiAgICAgICAgICAgIHZhciBpbmNyZWFzaW5nO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGUoY3RybCkge1xuICAgICAgICAgICAgICBjdHJsLnVwZGF0ZSh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzLFxuICAgICAgICAgICAgICAgIGVycm9yTGV2ZWw6IGxhc3RFcnJvckxldmVsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZm9ybS4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgIGluY3JlYXNpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmb3JtLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgaW5jcmVhc2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLmVhY2goZm9ybU1lc3NhZ2VzW2NvbnRyb2wuJG5hbWVdLCBmdW5jdGlvbiAodG9rZW5JbmZvKSB7XG4gICAgICAgICAgICAgIHRva2VuSW5mby5hY3Rpb24gPSAkZW52b3kuZ2V0QWN0aW9uKGZvcm0uJG5hbWUsIGNvbnRyb2wuJG5hbWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChpbmNyZWFzaW5nID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBsYXN0RXJyb3JMZXZlbCA9IE1hdGgubWF4KGxhc3RFcnJvckxldmVsLFxuICAgICAgICAgICAgICAgIF8obWVzc2FnZUN0cmxzKVxuICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY3RybCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmluZENoaWxkcmVuKGN0cmwpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5mbGF0dGVuKClcbiAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKGNoaWxkQ3RybCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXy5pc051bWJlcihjaGlsZEN0cmwuJGVycm9yTGV2ZWwpID9cbiAgICAgICAgICAgICAgICAgICAgICBjaGlsZEN0cmwuJGVycm9yTGV2ZWwgOlxuICAgICAgICAgICAgICAgICAgICAgICRlbnZveS5ERUZBVUxUX0VSUk9STEVWRUw7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgLm1heCgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5lYWNoKGJvdW5kQ3RybHMsIHVwZGF0ZSk7XG5cbiAgICAgICAgICAgIF8uZWFjaChwYXJlbnRDdHJscywgZnVuY3Rpb24gKGN0cmwpIHtcbiAgICAgICAgICAgICAgaWYgKGluY3JlYXNpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdHJsLiRlcnJvckxldmVsID4gbGFzdEVycm9yTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgIGxhc3RFcnJvckxldmVsID0gY3RybC4kZXJyb3JMZXZlbDtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZShjdHJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGN0cmwuJGVycm9yTGV2ZWwgPiBsYXN0RXJyb3JMZXZlbCkge1xuICAgICAgICAgICAgICAgICAgdXBkYXRlKGN0cmwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3RybC4kZXJyb3JMZXZlbCA8IGxhc3RFcnJvckxldmVsKSB7XG4gICAgICAgICAgICAgICAgICBsYXN0RXJyb3JMZXZlbCA9IGN0cmwuJGVycm9yTGV2ZWw7XG4gICAgICAgICAgICAgICAgICB1cGRhdGUoY3RybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBkZWJ1ZyhlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSAkZW52b3kuX2NhY2hlW2Zvcm0uJG5hbWVdO1xuXG4gICAgICBkZWJ1ZygnQ29udHJvbCBcIiVzXCIgaW4gZm9ybSBcIiVzXCIgY2hhbmdlZCB2YWxpZGl0eScsXG4gICAgICAgIGNvbnRyb2wuJG5hbWUsXG4gICAgICAgIGZvcm0uJG5hbWUpO1xuXG4gICAgICBpZiAoJGVudm95Ll9lbWl0dGluZykge1xuICAgICAgICByZXR1cm4gJGVudm95Ll9lbWl0dGluZy50aGVuKF9lbWl0LmJpbmQobnVsbCxcbiAgICAgICAgICBmb3JtLFxuICAgICAgICAgIGNvbnRyb2wpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICRxLndoZW4oX2VtaXQoZm9ybSwgY29udHJvbCkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYW4gYWN0aW9uIHRvIGJlIGV4ZWN1dGVkIGF0IHNvbWUgcG9pbnQuICBVc2VkIGJ5IHRoZVxuICAgICAqIGVudm95TGlzdCBkaXJlY3RpdmUncyB2aWV3LCBzbyB0aGF0IHlvdSBjYW4gY2xpY2sgb24gYW5cbiAgICAgKiBlcnJvciBhbmQgYmUgdGFrZW4gdG8gd2hlcmUgdGhlIGVycm9yIGlzLlxuICAgICAqIEB0b2RvIG1ha2UgY29udHJvbE5hbWUgb3B0aW9uYWw/XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIE5hbWUgb2YgZm9ybVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sTmFtZSBOYW1lIG9mIGNvbnRyb2xcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIEFuZ3VsYXJKUyBleHByZXNzaW9uIHRvIGV2YWx1YXRlXG4gICAgICovXG4gICAgc2V0QWN0aW9uOiBmdW5jdGlvbiBzZXRBY3Rpb24oZm9ybU5hbWUsIGNvbnRyb2xOYW1lLCBhY3Rpb24pIHtcbiAgICAgIHZhciBmb3JtQWN0aW9ucyA9IGFjdGlvbnNbZm9ybU5hbWVdID0gYWN0aW9uc1tmb3JtTmFtZV0gfHwge307XG4gICAgICBmb3JtQWN0aW9uc1tjb250cm9sTmFtZV0gPSBhY3Rpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYSBzdG9yZWQgYWN0aW9uLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtTmFtZSBOYW1lIG9mIGZvcm0gZm9yIGFjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb250cm9sTmFtZSBOYW1lIG9mIGNvbnRyb2wgZm9yIGFjdGlvblxuICAgICAqIEByZXR1cm5zIHsoc3RyaW5nfHVuZGVmaW5lZCl9IFRoZSBhY3Rpb24gKEFuZ3VsYXJKU1xuICAgICAqICAgICBleHByZXNzaW9uKSwgaWYgaXQgZXhpc3RzLlxuICAgICAqL1xuICAgIGdldEFjdGlvbjogZnVuY3Rpb24gZ2V0QWN0aW9uKGZvcm1OYW1lLCBjb250cm9sTmFtZSkge1xuICAgICAgcmV0dXJuIF8uZ2V0KGFjdGlvbnMsIF8uZm9ybWF0KCclcy4lcycsIGZvcm1OYW1lLCBjb250cm9sTmFtZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIGdldCBhIHBhcmVudCBlbnZveSBkaXJlY3RpdmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1OYW1lIEZpbmQgdGhlIG1lc3NhZ2VzRGlyZWN0aXZlQ3RybFxuICAgICAqICAgICBhdHRhY2hlZCB0byBmb3JtIHdpdGggdGhpcyBuYW1lXG4gICAgICogQHBhcmFtIHtNZXNzYWdlc0N0cmx9IGVudm95TWVzc2FnZXMgQ3VycmVudFxuICAgICAqICAgICBtZXNzYWdlc0RpcmVjdGl2ZUN0cmxcbiAgICAgKiBAcmV0dXJucyB7TWVzc2FnZXNDdHJsfVxuICAgICAqL1xuICAgIGZpbmRQYXJlbnRDdHJsOiBmdW5jdGlvbiBmaW5kUGFyZW50Q3RybChmb3JtTmFtZSwgZW52b3lNZXNzYWdlcykge1xuICAgICAgd2hpbGUgKGVudm95TWVzc2FnZXMuJG5hbWUgIT09IGZvcm1OYW1lKSB7XG4gICAgICAgIGVudm95TWVzc2FnZXMgPSBlbnZveU1lc3NhZ2VzLiRwYXJlbnQ7XG4gICAgICAgIGlmICghZW52b3lNZXNzYWdlcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGZpbmQgcGFyZW50IHdpdGggbmFtZSAnICsgZm9ybU5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZW52b3lNZXNzYWdlcztcbiAgICB9LFxuXG4gICAgbGV2ZWxEZXNjcmlwdGlvbjogZnVuY3Rpb24gbGV2ZWxEZXNjcmlwdGlvbihlcnJvckxldmVsKSB7XG4gICAgICByZXR1cm4gb3B0cy5sZXZlbHNbZXJyb3JMZXZlbF0uZGVzY3JpcHRpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cG9zZWQgZm9yIGhhbmRpbmVzc1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgREVGQVVMVF9MRVZFTDogb3B0cy5kZWZhdWx0TGV2ZWwsXG5cbiAgICBERUZBVUxUX0VSUk9STEVWRUw6IExFVkVMU1tvcHRzLmRlZmF1bHRMZXZlbF0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBvc2VkIGZvciBoYW5kaW5lc3MuICBUaGUga2luZGVyLCBnZW50bGVyIHZlcnNpb24gb2ZcbiAgICAgKiBvcHRzLmxldmVsc1xuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxudW1iZXI+fVxuICAgICAqL1xuICAgIEVSUk9STEVWRUxTOiBMRVZFTFMsXG5cbiAgICAvKipcbiAgICAgKiBFeHBvc2VkIGZvciBoYW5kaW5lc3NcbiAgICAgKiBAdHlwZSB7QXJyYXkuPE9iamVjdC48c3RyaW5nLHN0cmluZz4+fVxuICAgICAqL1xuICAgIExFVkVMUzogb3B0cy5sZXZlbHMsXG5cbiAgICBvcHRzOiBvcHRzXG5cbiAgfTtcblxuICBfLmV4dGVuZCgkZW52b3ksIHByb3RvdHlwZSk7XG5cbiAgcmV0dXJuICRlbnZveTtcbn1cbmVudm95RmFjdG9yeS4kaW5qZWN0ID0gWyckaHR0cCcsICckcSddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVudm95RmFjdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG9wdHMgPSByZXF1aXJlKCcuL29wdHMnKTtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuXyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuXyA6IG51bGwpO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveTokZW52b3k6cHJvdmlkZXInKTtcbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgZnYuZW52b3kuZW52b3k6JGVudm95UHJvdmlkZXJcbiAqIEBkZXNjcmlwdGlvblxuICogQWxsb3dzIGNvbmZpZ3VyYXRpb24gb2Ygb3B0aW9ucyBmb3IgKiplbnZveSoqLlxuICovXG5mdW5jdGlvbiBlbnZveVByb3ZpZGVyKCkge1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgZnYuZW52b3kuZW52b3k6JGVudm95UHJvdmlkZXIjb3B0aW9uc1xuICAgKiBAbWV0aG9kT2YgZnYuZW52b3kuZW52b3k6JGVudm95UHJvdmlkZXJcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldCBvcHRpb25zIGR1cmluZyBjb25maWcgcGhhc2VcbiAgICogQHBhcmFtIHtPYmplY3R9IFtuZXdPcHRzXSBOZXcgb3B0aW9ucyB0byBhc3NpZ24gb250byBkZWZhdWx0c1xuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIG9wdGlvbnNcbiAgICovXG4gIHRoaXMub3B0aW9ucyA9IGZ1bmN0aW9uIG9wdGlvbnMobmV3T3B0cykge1xuICAgIF8uZXh0ZW5kKG9wdHMsIG5ld09wdHMpO1xuICAgIGRlYnVnKCdOZXcgb3B0aW9ucyBzZXQ6Jywgb3B0cyk7XG4gICAgcmV0dXJuIG9wdHM7XG4gIH07XG5cbiAgdGhpcy4kZ2V0ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlbnZveVByb3ZpZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoaXMgbnVtYmVyIChpbiBtcykgbmVlZHMgdG8gYmUgaGlnaGVyIHRoYW4gaG93ZXZlciBsb25nIGl0IHRha2VzIHRvXG4gKiBoaWRlIGFueSBkaXNwbGF5IGdlbmVyYXRlZCBieSB0aGUgYG1lc3NhZ2VzTGlzdGAgZGlyZWN0aXZlLlxuICogQHR5cGUge251bWJlcn1cbiAqL1xudmFyIERFRkFVTFRfSElERV9ERUxBWSA9IDkwMDtcblxuLyoqXG4gKiBEZWZhdWx0IGxldmVsIGFuZCBkZXNjcmlwdGlvbnNcbiAqIEB0eXBlIHtBcnJheS48T2JqZWN0LjxzdHJpbmcsIHN0cmluZz4+fVxuICovXG52YXIgREVGQVVMVF9MRVZFTFMgPSBbXG4gIHtcbiAgICBuYW1lOiAnb2snLFxuICAgIGRlc2NyaXB0aW9uOiAnRml4ZWQhJ1xuICB9LFxuICB7XG4gICAgbmFtZTogJ3dhcm5pbmcnLFxuICAgIGRlc2NyaXB0aW9uOiAnV2FybmluZydcbiAgfSxcbiAge1xuICAgIG5hbWU6ICdlcnJvcicsXG4gICAgZGVzY3JpcHRpb246ICdFcnJvcidcbiAgfVxuXTtcblxuLyoqXG4gKiBEZWZhdWx0IHdlYiBzZXJ2ZXIgcGF0aCB0byBKU09OIG1lc3NhZ2UgZGVmaW5pdGlvbiBmaWxlXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgREVGQVVMVF9EQVRBX0ZJTEUgPSAnbWVzc2FnZXMuanNvbic7XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgbGV2ZWxcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBERUZBVUxUX0xFVkVMID0gJ29rJztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxldmVsczogREVGQVVMVF9MRVZFTFMsXG4gIGRlZmF1bHRMZXZlbDogREVGQVVMVF9MRVZFTCxcbiAgZGF0YUZpbGVVcmw6IERFRkFVTFRfREFUQV9GSUxFLFxuICBoaWRlRGVsYXk6IERFRkFVTFRfSElERV9ERUxBWSxcbiAgdGVtcGxhdGVVcmw6ICdwYXJ0aWFscy9tZXNzYWdlcy5odG1sJ1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZW52b3k6Zm9ybURlY29yYXRvcicpO1xuXG4vKipcbiAqIFRoaXMgZGVjb3JhdG9yIG1vbmtleXBhdGNoZXMgdGhlIGNvbnRyb2xsZXIgcHJvcGVydHkgb2YgdGhlIG5nRm9ybVxuICogZGlyZWN0aXZlLlxuICogRm9yIHNvbWUgcmVhc29uIHdoZW4geW91IGRlY29yYXRlIGEgZGlyZWN0aXZlLCAkZGVsZWdhdGUgaXMgYW4gQXJyYXlcbiAqIGFuZCB0aGUgZmlyc3QgZWxlbWVudCBpcyB0aGUgZGlyZWN0aXZlLlxuICogQHBhcmFtIHtBcnJheX0gJGRlbGVnYXRlIERpcmVjdGl2ZShzKSBhc3NvY2lhdGVkIHdpdGggdGFnIFwiZm9ybVwiLCBJIGd1ZXNzXG4gKiBAcmV0dXJucyB7QXJyYXl9IERlY29yYXRlZCBhcnJheSBvZiBkaXJlY3RpdmVzP1xuICovXG5mdW5jdGlvbiBmb3JtRGVjb3JhdG9yKCRkZWxlZ2F0ZSkge1xuXG4gIC8qKlxuICAgKiBUaGUgcmVhbCBmb3JtIGRpcmVjdGl2ZS5cbiAgICogQHR5cGUge2Zvcm19XG4gICAqL1xuICB2YXIgZm9ybSA9IF8uZmlyc3QoJGRlbGVnYXRlKTtcblxuICAvKipcbiAgICogT3JpZ2luYWwgRm9ybUNvbnRyb2xsZXIuXG4gICAqIEB0eXBlIHtmb3JtLkZvcm1Db250cm9sbGVyfVxuICAgKi9cbiAgdmFyIGZvcm1Db250cm9sbGVyID0gZm9ybS5jb250cm9sbGVyO1xuXG4gIC8qKlxuICAgKiBXZSdyZSBtb25rZXlwYXRjaGluZyBGb3JtQ29udHJvbGxlciB3aXRoIHRoaXMsIGlmIGFuZCBvbmx5IGlmXG4gICAqIHRoZSBmb3JtIGhhcyBhIG5hbWUuXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gTWVzc2FnZXNGb3JtQ29udHJvbGxlcigkZWxlbWVudCxcbiAgICAkYXR0cnMsXG4gICAgJHNjb3BlLFxuICAgICRhbmltYXRlLFxuICAgICRpbnRlcnBvbGF0ZSxcbiAgICAkaW5qZWN0b3IsXG4gICAgJGVudm95KSB7XG5cbiAgICAvLyBteSBraW5nZG9tIGZvciBcImxldFwiXG4gICAgdmFyICRzZXRWYWxpZGl0eTtcblxuICAgICRpbmplY3Rvci5pbnZva2UoZm9ybUNvbnRyb2xsZXIsIHRoaXMsIHtcbiAgICAgICRlbGVtZW50OiAkZWxlbWVudCxcbiAgICAgICRzY29wZTogJHNjb3BlLFxuICAgICAgJGFuaW1hdGU6ICRhbmltYXRlLFxuICAgICAgJGludGVycG9sYXRlOiAkaW50ZXJwb2xhdGUsXG4gICAgICAkYXR0cnM6ICRhdHRyc1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVGhpcyBpcyBhIGZvcm0uICBUaGlzIGNvbWVzIGluIGhhbmR5LCBiZWNhdXNlIE5nTW9kZWxDb250cm9sbGVyXG4gICAgICogYW5kIEZvcm1Db250cm9sbGVyIGFyZSB2ZXJ5IHNpbWlsYXIuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy4kaXNGb3JtID0gdHJ1ZTtcblxuICAgIGlmICh0aGlzLiRuYW1lKSB7XG5cbiAgICAgIC8qKlxuICAgICAgICogVGhpcyBGb3JtQ29udHJvbGxlcidzIG9yaWdpbmFsICRzZXRWYWxpZGl0eSgpIG1ldGhvZFxuICAgICAgICogQHR5cGUge2Zvcm0uRm9ybUNvbnRyb2xsZXIjJHNldFZhbGlkaXR5fVxuICAgICAgICovXG4gICAgICAkc2V0VmFsaWRpdHkgPSB0aGlzLiRzZXRWYWxpZGl0eTtcblxuICAgICAgZGVidWcoJ0luc3RhbnRpYXRpbmcgcGF0Y2hlZCBjb250cm9sbGVyIGZvciBmb3JtICVzJyxcbiAgICAgICAgdGhpcy4kbmFtZSk7XG5cbiAgICAgIF8uZXh0ZW5kKHRoaXMsIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgdGhpcyBmb3JtIGNvbnRhaW5zIGFuIFwiYWxpYXNcIiBhdHRyaWJ1dGUsIHdlJ2xsIHVzZSBpdFxuICAgICAgICAgKiB0byBsb29rIHVwIG1lc3NhZ2VzLiAgVGhpcyBpcyB1c2VmdWwgaWYgeW91ciBmb3JtIG5hbWUgaXNcbiAgICAgICAgICogZHluYW1pYyAoaW50ZXJwb2xhdGVkKS4gIE5vdGUgaW50ZXJwb2xhdGVkIGZvcm0gbmFtZXMgd2VyZVxuICAgICAgICAgKiBub3QgaW1wbGVtZW50ZWQgYmVmb3JlIEFuZ3VsYXJKUyAxLjMuMC5cbiAgICAgICAgICogRGVmYXVsdHMgdG8gd2hhdGV2ZXIgdGhlIG5hbWUgb2YgdGhlIGZvcm0gaXMuXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICAkYWxpYXM6ICRhdHRycy5hbGlhcyB8fCB0aGlzLiRuYW1lLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGlzIGZvcm0ncyBTY29wZS4gIFRoaXMgd2lsbCBhbGxvdyB1cyB0byBlYXNpbHkgYnJvYWRjYXN0XG4gICAgICAgICAqIGV2ZW50cyB3aXRoaW4gaXQuXG4gICAgICAgICAqIEB0eXBlIHtuZy4kcm9vdFNjb3BlLlNjb3BlfVxuICAgICAgICAgKi9cbiAgICAgICAgJGZvcm1TY29wZTogJHNjb3BlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVc2VkIHRvIHRyYWNrIHRoaXMgZm9ybSdzIGVycm9yIHN0YXRlLiAgV2UnbGwgbmVlZCB0b1xuICAgICAgICAgKiBkbyBzdHVmZiBpZiB0aGUgc3RhdGUgY2hhbmdlcy5cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgICQkbGFzdEVycm9yU2l6ZTogMCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgdGhlIG51bWJlciBvZiBlcnJvcnMgaW4gdGhpcyBmb3JtIGhhcyBpbmNyZWFzZWQgb3IgZGVjcmVhc2VkXG4gICAgICAgICAqIGFuZCB0aGUgY29udHJvbCBiZWluZyBzZXQgdmFsaWQgb3IgaW52YWxpZCBpcyBhIG1lbWJlciBvZiB0aGlzXG4gICAgICAgICAqIGZvcm0gcHJvcGVyLCB0aGVuIHRlbGwgJGVudm95IHRvIGJyb2FkY2FzdCBhbiBldmVudCB0aGF0XG4gICAgICAgICAqIHRoZSBmb3JtJ3MgdmFsaWRpdHkgY2hhbmdlZCAoc29tZXdoYXQpLlxuICAgICAgICAgKiBAdGhpcyBGb3JtQ29udHJvbGxlclxuICAgICAgICAgKi9cbiAgICAgICAgJHNldFZhbGlkaXR5OiBmdW5jdGlvbiAkZW52b3lTZXRWYWxpZGl0eSh0b2tlbixcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBjb250cm9sKSB7XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBJZiB3ZSBzZXQgJGlzRm9ybSBhYm92ZSwgdGhpcyBpcyBhIHN1YmZvcm0gb2YgdGhlIHBhcmVudFxuICAgICAgICAgICAqIGFuZCB3ZSBkb24ndCBjYXJlLlxuICAgICAgICAgICAqIEB0b2RvIG1heWJlIHdlIGRvIGNhcmU/XG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGlzTm90Rm9ybSA9ICFjb250cm9sLiRpc0Zvcm07XG5cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBXZSBvbmx5IGNhcmUgYWJvdXQgY29udHJvbHMgdGhhdCB3ZXJlIGV4cGxpY2l0bHkgYWRkZWRcbiAgICAgICAgICAgKiB0byB0aGlzIGZvcm0uXG4gICAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAgICovXG4gICAgICAgICAgdmFyIGZvcm1IYXNDb250cm9sID0gaXNOb3RGb3JtICYmIF8uaGFzKHRoaXMsIGNvbnRyb2wuJG5hbWUpO1xuXG4gICAgICAgICAgJHNldFZhbGlkaXR5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICBpZiAoZm9ybUhhc0NvbnRyb2wgJiZcbiAgICAgICAgICAgIF8uc2l6ZSh0aGlzLiRlcnJvcikgIT09IHRoaXMuJCRsYXN0RXJyb3JTaXplKSB7XG4gICAgICAgICAgICAkZW52b3kuZW1pdCh0aGlzLCBjb250cm9sKTtcbiAgICAgICAgICAgIHRoaXMuJCRsYXN0RXJyb3JTaXplID0gXy5zaXplKHRoaXMuJGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBzZWUgdGhlIG5vdGUgYmVsb3cgYXQgZm9ybURpcmVjdGl2ZS4kc2NvcGVcbiAgICAgIGlmICghXy5oYXMoJHNjb3BlLCB0aGlzLiRhbGlhcykpIHtcbiAgICAgICAgJHNjb3BlW3RoaXMuJGFsaWFzXSA9IHRoaXM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgTWVzc2FnZXNGb3JtQ29udHJvbGxlci4kaW5qZWN0ID0gW1xuICAgICckZWxlbWVudCcsXG4gICAgJyRhdHRycycsXG4gICAgJyRzY29wZScsXG4gICAgJyRhbmltYXRlJyxcbiAgICAnJGludGVycG9sYXRlJyxcbiAgICAnJGluamVjdG9yJyxcbiAgICAnJGVudm95J1xuICBdO1xuXG4gIGZvcm0uY29udHJvbGxlciA9IE1lc3NhZ2VzRm9ybUNvbnRyb2xsZXI7XG5cbiAgLyoqXG4gICAqIFNvIHRoaXMgaXMgYSBsaXR0bGUgaGFjay4gIEknbSBwcmV0dHkgc3VyZSB0aGlzIGlzIG5vdCBkYW5nZXJvdXMsIGJ1dFxuICAgKiBpdCBjb3VsZCBiZS4gIFRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCB5b3UgbWF5IGhhdmUgYSBkeW5hbWljIGZvcm1cbiAgICogbmFtZTsgc29tZXRoaW5nIGludGVycG9sYXRlZC4gIFNheSwgXCJteUZvcm0tMjc4OTYxOFwiLiAgQSBGb3JtQ29udHJvbGxlclxuICAgKiB3aWxsIGFsd2F5cyBwbGFjZSBpdHNlbGYgb24gdGhlIHNjb3BlIGlmIGl0J3MgZ2l2ZW4gYSBuYW1lLiAgQnV0IGl0J3NcbiAgICogYWxzbyBoYW5keSB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSBcIm15Rm9ybVwiLiAgSWYgZm9ybSBcIm15Rm9ybS04NzMyOVwiXG4gICAqIHNoYXJlZCB0aGUgc2FtZSBzY29wZSB3aXRoIFwibXlGb3JtLTI3ODk2MThcIiwgb25seSBvbmUgXCJteUZvcm1cIiBjb3VsZFxuICAgKiBleGlzdDsgdGh1cywgd2UganVzdCBtYWtlIGEgbmV3IHNjb3BlLlxuICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICovXG4gIGZvcm0uJHNjb3BlID0gdHJ1ZTtcblxuICByZXR1cm4gJGRlbGVnYXRlO1xufVxuZm9ybURlY29yYXRvci4kaW5qZWN0ID0gWyckZGVsZWdhdGUnXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtRGVjb3JhdG9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgZnYuZW52b3lcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqXG4gKi9cblxudmFyIGFuZ3VsYXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5hbmd1bGFyIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5hbmd1bGFyIDogbnVsbCk7XG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Ll8gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLl8gOiBudWxsKTtcbnZhciBkaXJlY3RpdmVzID0gcmVxdWlyZSgnLi9kaXJlY3RpdmVzJyk7XG52YXIgcGtnID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG52YXIgZm9ybURlY29yYXRvciA9IHJlcXVpcmUoJy4vZm9ybS1kZWNvcmF0b3InKTtcbnZhciAkZW52b3kgPSByZXF1aXJlKCcuL2Vudm95Jyk7XG52YXIgTU9EVUxFX05BTUUgPSAnZnYuZW52b3knO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbnZveScpO1xudmFyIGVudm95O1xuXG5mdW5jdGlvbiBjb25maWcoJHByb3ZpZGUpIHtcbiAgJHByb3ZpZGUuZGVjb3JhdG9yKCduZ0Zvcm1EaXJlY3RpdmUnLCBmb3JtRGVjb3JhdG9yKTtcbiAgZGVidWcoJyVzIHYlcyByZWFkeScsIHBrZy5uYW1lLCBwa2cudmVyc2lvbik7XG59XG5jb25maWcuJGluamVjdCA9IFsnJHByb3ZpZGUnXTtcblxuZW52b3kgPSBhbmd1bGFyLm1vZHVsZShNT0RVTEVfTkFNRSwgW10pXG4gIC5jb25maWcoY29uZmlnKVxuICAucHJvdmlkZXIoJyRlbnZveScsICRlbnZveSk7XG5cbl8uZWFjaChkaXJlY3RpdmVzLCBmdW5jdGlvbiAoZGlyZWN0aXZlLCBuYW1lKSB7XG4gIGVudm95LmRpcmVjdGl2ZShuYW1lLCBkaXJlY3RpdmUpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZW52b3k7XG5cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJhbmd1bGFyLWVudm95XCIsXG4gIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJIaWdobHkgZmxleGlibGUgZm9ybSB2YWxpZGF0aW9uIG1lc3NhZ2luZyBmb3IgQW5ndWxhckpTXCIsXG4gIFwibWFpblwiOiBcImluZGV4LmpzXCIsXG4gIFwiYXV0aG9yXCI6IFwiQ2hyaXN0b3BoZXIgSGlsbGVyIDxjaGlsbGVyQGZvY3VzdmlzaW9uLmNvbT5cIixcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vZGVjaXBoZXJpbmMvYW5ndWxhci1lbnZveS5naXRcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJhbmd1bGFyXCI6IFwiXjEuNC4xXCIsXG4gICAgXCJicm93c2VyaWZ5XCI6IFwiXjEwLjIuNFwiLFxuICAgIFwiY2hhaVwiOiBcIl4zLjAuMFwiLFxuICAgIFwiZXhwb3NpZnlcIjogXCJeMC40LjNcIixcbiAgICBcImdydW50XCI6IFwiXjAuNC41XCIsXG4gICAgXCJncnVudC1ib3dlci1pbnN0YWxsLXNpbXBsZVwiOiBcIl4xLjEuM1wiLFxuICAgIFwiZ3J1bnQtYnJvd3NlcmlmeVwiOiBcIl4zLjguMFwiLFxuICAgIFwiZ3J1bnQtYnVtcFwiOiBcIl4wLjMuMVwiLFxuICAgIFwiZ3J1bnQtY2xpXCI6IFwiXjAuMS4xM1wiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jbGVhblwiOiBcIl4wLjYuMFwiLFxuICAgIFwiZ3J1bnQtY29udHJpYi1jb3B5XCI6IFwiXjAuOC4wXCIsXG4gICAgXCJncnVudC1kZXYtdXBkYXRlXCI6IFwiXjEuMy4wXCIsXG4gICAgXCJncnVudC1lc2xpbnRcIjogXCJeMTUuMC4wXCIsXG4gICAgXCJncnVudC1naC1wYWdlc1wiOiBcIl4wLjEwLjBcIixcbiAgICBcImdydW50LW1vY2hhLWNvdlwiOiBcIl4wLjQuMFwiLFxuICAgIFwiZ3J1bnQtbmdkb2NzXCI6IFwiXjAuMi43XCIsXG4gICAgXCJqaXQtZ3J1bnRcIjogXCJeMC45LjFcIixcbiAgICBcImpzb25taW5pZnlpZnlcIjogXCJeMC4xLjFcIixcbiAgICBcImxvYWQtZ3J1bnQtY29uZmlnXCI6IFwiXjAuMTcuMVwiLFxuICAgIFwibWluaW1hdGNoXCI6IFwiXjIuMC44XCIsXG4gICAgXCJtb2NoYVwiOiBcIl4yLjIuNVwiLFxuICAgIFwibW9jaGEtbGNvdi1yZXBvcnRlclwiOiBcIjAuMC4yXCIsXG4gICAgXCJ0aW1lLWdydW50XCI6IFwiXjEuMi4xXCIsXG4gICAgXCJ1Z2xpZnlpZnlcIjogXCJeMy4wLjFcIlxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwidGVzdFwiOiBcImdydW50IHRlc3RcIlxuICB9LFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYW5ndWxhclwiOiBcIl4xLjQuMVwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImRlYnVnXCI6IFwiXjIuMi4wXCIsXG4gICAgXCJsb2Rhc2hcIjogXCJeMy45LjNcIlxuICB9XG59XG4iXX0=
