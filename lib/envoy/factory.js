'use strict';

var _ = require('lodash'),
  opts = require('./opts');

var BROADCAST_DEBOUNCE_MS = 250;

var envoyFactory = function envoyFactory($http, $q) {

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

    /**
     * Retrieves a collection of messages for a form and/or control
     * within that form.  If no parameters, returns the entirety of the
     * data file.
     * @param {FormController} form Form controller
     * @param {string} [controlName] Name of control, if any
     * @returns {*} Value, if any
     */
    $envoy = function $envoy(form) {
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
    },
    prototype;

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
          var hierarchy = [];

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
     * @param {messagesDirectiveCtrl} messagesCtrl Current
     *     messagesDirectiveCtrl
     * @returns {messagesDirectiveCtrl}
     */
    findParentCtrl: function findParentCtrl(formName, messagesCtrl) {
      while (messagesCtrl.$form.$name !== formName) {
        messagesCtrl = messagesCtrl.parent;
        if (!messagesCtrl) {
          throw new Error('cannot find parent with name ' + formName);
        }
      }
      return messagesCtrl;
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

    ViewData: require('./viewdata')
  };

  _.extend($envoy, prototype);

  return $envoy;
};
envoyFactory.$inject = ['$http', '$q'];

module.exports = envoyFactory;