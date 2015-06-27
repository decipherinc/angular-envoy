'use strict';

var _ = require('lodash');
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
