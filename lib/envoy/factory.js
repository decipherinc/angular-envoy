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
