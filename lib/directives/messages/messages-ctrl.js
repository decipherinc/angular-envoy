'use strict';

var _ = require('lodash');
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
