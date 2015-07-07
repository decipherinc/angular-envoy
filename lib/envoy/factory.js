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
