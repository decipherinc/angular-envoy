'use strict';

var _ = require('lodash'),
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

  this.addChild = function addChild(child) {
    this.$children = (this.$children || []).push(child);
    child.$parent = this;
    return this;
  };

  this.removeChild = function removeChild(child) {
    this.$children.splice(this.$children.indexOf(child), 1);
    delete child.$parent;
    return this;
  };

  this.title = function title(errorLevel) {
    return $envoy.levelDescription(errorLevel);
  };

  /**
   * @this MessagesCtrl
   */
  (function init() {
    var parentName, form;

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

    if ($attrs.parent && (parentName = $interpolate($attrs.parent)($scope))) {
      $envoy.findParentCtrl(parentName,
        $element.parent().controller('envoyMessages')).addChild(this);

      if (this.$parent.$form === form) {
        this.$parent.removeChild(this);
      }
    }

    view =
      this.$parent ? (this.$view = this.$parent.$view) : (this.$view = {});

    this.$scope = $scope;

    $envoy.bindForm(this, this.$form);

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
