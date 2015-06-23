/*! angular-envoy - v0.1.0
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
      var ngModel = ctrls[0],
        form = ctrls[1],
        action;

      if ((action = attrs.messageAction) && ngModel.$name && form.$name) {
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

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null),
  viewData = require('./viewdata');

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

    return this;
  };

  /**
   * Unbind the bound Scope of this controller.
   * @returns {MessagesCtrl} This controller
   */
  this.unbindView = function unbindView() {
    delete view.scope;
    return this;
  };

  /**
   * @this MessagesCtrl
   */
  (function init() {
    var parentName, form;

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
          if (_.get(view, 'scope')) {
            return (view.scope.data = viewData($envoy.DEFAULT_LEVEL));
          }
        },
        set: function setViewData(data) {
          view.scope.data = data;
        }
      }
    });

    form = this.$form = $element.controller('form');

    this.$parent =
        $attrs.parent &&
        (parentName = $interpolate($attrs.parent)($scope)) ?
          $envoy.findParentCtrl(parentName,
            $element.parent().controller('envoyMessages')) :
          null;

    view =
      this.$parent ? (this.$view = this.$parent.$view) : (this.$view = {});

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

},{"./viewdata":8}],7:[function(require,module,exports){
'use strict';

var debug = require('debug')('envoy:directives:messages');

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
function messages($envoy) {
  return {
    restrict: 'AE',
    require: 'envoyMessages',
    controller: require('./messages-ctrl'),
    scope: true,
    link: function link(scope, element, attrs, messages) {
      scope.$on('$formStateChanged', function (evt, data) {
        var viewData = messages.$viewData,
          errorLevel;
        if (!viewData) {
          return;
        }

        errorLevel = data.errorLevel;
        viewData.messages = data.messages;
        viewData.error = !!errorLevel;
        viewData.className = data.errorLevelName;
        viewData.title = $envoy.levelDescription(errorLevel);

        debug('envoyMessages directive for form "%s" received ' +
          '$formStateChanged event; view data:',
          messages.$name,
          viewData);
      });
    }
  };
}

messages.$inject = ['$envoy'];

module.exports = messages;

},{"./messages-ctrl":6,"debug":15}],8:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

var ID_PREFIX = 'envoy-viewdata-',
  debug = require('debug')('envoy:directives:messages:viewdata');

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
 * @description
 * Defines a directive which, when used with ngModel, will set the validity
 * of the associated NgModelController, based on the validity of the target
 * form.
 */
function proxy($envoy) {

  /**
   * Anything that needs validating needs a token, so, here's one.
   * @type {string}
   */
  var TOKEN = 'proxy';

  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      var target;
      if ((target = attrs.envoyProxy)) {
        element.addClass('errorlevel');

        scope.$on('$formStateChanged', function (evt, data) {
          var isInvalid;
          if (_.find(data.forms, { $name: target })) {
            _.each($envoy.ERRORLEVELS,
              function (errorlevel, errorLevelName) {
                element.removeClass(errorLevelName);
              });
            isInvalid = data.errorLevel;
            ngModel.$setValidity(TOKEN, isInvalid);
            if (isInvalid) {
              element.addClass(data.errorLevelName);
            }
          }
        });
      }
    }
  };
}
proxy.$inject = ['$envoy'];

module.exports = proxy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
(function (global){
'use strict';

var _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null),
  opts = require('./opts');

var BROADCAST_DEBOUNCE_MS = 250,
  debug = require('debug')('envoy:envoy:factory');

function envoyFactory($http, $q) {

  /**
   * Error levels as configured in opts in order, by name
   * @type {Array.<string>}
   */
  var LEVEL_ARRAY = _.pluck(opts.levels, 'name'),

    /**
     * Mapping of error level names to indices in {@link LEVEL_ARRAY}
     * @type {Object.<string,number>}
     */
    LEVELS = _(LEVEL_ARRAY)
      .invert()
      .mapValues(_.parseInt)
      .value(),

    /**
     * Lookup of forms and controls to any actions bound via the
     * messageAction directive.  An action is simply an AngularJS
     * expression which will be evaluated.
     * @type {Object.<string,Object.<string,string>>}
     */
    actions = {},

    prototype;

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
              var formControl = form[controlMsgName],
              // if this is truthy, then we have errors in the given
              // control
                error = formControl && _.size(formControl.$error);

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
            .pick(_.identity)
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
      var defaultLevelNum = LEVELS[opts.defaultLevel],

        /**
         * Maximum error level of all validation tokens within all
         * controls of this form
         * @type {number}
         */
        maxLevel = _.reduce(formMessages,
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

      return LEVEL_ARRAY[maxLevel];
    },

    _lastControl: null,
    _lastControlError: null,
    $broadcast: function $broadcast(form, control) {
      var parentForm = form,
        broadcasting = null,
        broadcast = _.debounce(function broadcast() {
          var hierarchy = [parentForm];

          debug('Broadcasting from form "%s"; "%s" changed',
            form.$name,
            control.$name);

          hierarchy.unshift(parentForm);
          while (parentForm.$$parentForm &&
          parentForm.$$parentForm.$name) {
            parentForm = parentForm.$$parentForm;
            hierarchy.unshift(parentForm);
          }

          broadcasting = $q.all(_.map(hierarchy, $envoy))
            .then(function (pileOfMessages) {
              var defaultLevel = LEVELS[opts.defaultLevel],
                messages = {},
                maxErrorLevel = _.reduce(pileOfMessages,
                  function (result, formMessages, idx) {
                    var form = hierarchy[idx],
                      errorLevelName = $envoy._formErrorLevel(form,
                        formMessages),
                      errorLevel = LEVELS[errorLevelName];

                    form.$errorLevel = errorLevel;
                    messages[form.$name] = formMessages;
                    return _.isNumber(errorLevel) ?
                      Math.max(result,
                        errorLevel) :
                      result;
                  },
                  defaultLevel);

              parentForm.$formScope.$broadcast('$formStateChanged',
                {
                  errorLevel: maxErrorLevel,
                  errorLevelName: LEVEL_ARRAY[maxErrorLevel],
                  messages: _.omit(messages, _.isEmpty),
                  forms: hierarchy,
                  control: control
                });

              $envoy._lastControl = control;
              $envoy._lastControlError = _.keys(control.$error);
            });

        }, BROADCAST_DEBOUNCE_MS);

      delete $envoy._cache[form.$name];

      if (broadcasting) {
        return broadcasting.then($envoy.$broadcast.bind(null,
          form,
          control));
      }

      return $q.when(broadcast());

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
      var level;
      return ((level = $envoy.LEVELS[errorLevel]) && level.description);
    },

    /**
     * Exposed for handiness
     * @type {string}
     */
    DEFAULT_LEVEL: opts.defaultLevel,

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

var opts = require('./opts'),
  _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

var debug = require('debug')('envoy:envoy:provider');

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
var DEFAULT_HIDE_DELAY = 900,

  /**
   * Default level and descriptions
   * @type {Array.<Object.<string, string>>}
   */
  DEFAULT_LEVELS = [
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
  ],

  /**
   * Default web server path to JSON message definition file
   * @type {string}
   */
  DEFAULT_DATA_FILE = 'messages.json',

  /**
   * The default level
   * @type {string}
   */
  DEFAULT_LEVEL = 'ok';

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":15}],14:[function(require,module,exports){
(function (global){
'use strict';

var angular = (typeof window !== "undefined" ? window.angular : typeof global !== "undefined" ? global.angular : null),
  _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null),
  directives = require('./directives'),
  pkg = require('../package.json');

var MODULE_NAME = 'fv.envoy',
  debug = require('debug')('envoy'),
  envoy;

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
  "version": "0.1.0",
  "description": "Highly flexible form validation messaging for AngularJS",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Christopher Hiller <chiller@focusvision.com>",
  "license": "MIT",
  "devDependencies": {
    "angular": "^1.4.1",
    "browserify": "^10.2.4",
    "chai": "^3.0.0",
    "eslint": "^0.23.0",
    "exorcist": "^0.4.0",
    "exposify": "^0.4.3",
    "grunt": "^0.4.5",
    "grunt-browserify": "^3.8.0",
    "grunt-bump": "^0.3.1",
    "grunt-cli": "^0.1.13",
    "grunt-contrib-clean": "^0.6.0",
    "grunt-dev-update": "^1.3.0",
    "grunt-eslint": "^15.0.0",
    "grunt-exorcise": "^2.0.0",
    "grunt-mocha-cov": "^0.4.0",
    "grunt-ngdocs": "^0.2.7",
    "jit-grunt": "^0.9.1",
    "load-grunt-config": "^0.17.1",
    "minifyify": "^7.0.1",
    "minimatch": "^2.0.8",
    "mocha": "^2.2.5",
    "mocha-lcov-reporter": "0.0.2",
    "through2": "^2.0.0",
    "time-grunt": "^1.2.1",
    "transformify": "^0.1.2"
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
//# sourceMappingURL=envoy.js.map
