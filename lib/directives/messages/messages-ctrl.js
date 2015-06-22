'use strict';

var _ = require('lodash');

function MessagesCtrl($element,
  $envoy,
  $timeout,
  $attrs,
  $scope,
  $interpolate) {
  var form, view, parent,
    ViewData = $envoy.ViewData;

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
    //noinspection JSUndefinedPropertyAssignment
    scope.data = new ViewData();

    console.debug('View bound to controller with form %s',
      this.$form.$name);
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
    var parentName;

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
            return (view.scope.data = new ViewData());
          }
        },
        set: function setViewData(data) {
          view.scope.data = data;
        }
      }
    });

    form = this.$form = $element.controller('form');
    parent =
      this.$parent =
        $attrs.parent &&
        (parentName = $interpolate($attrs.parent)($scope)) ?
          $envoy.findParentCtrl(parentName,
            $element.parent().controller('messages')) :
          null;
    view =
      this.$parent ? (this.$view = this.$parent.$view) : (this.$view = {});

  }.call(this));
}

MessagesCtrl.$inject = [
  '$element',
  '$envoy',
  '$timeout',
  '$attrs',
  '$scope',
  '$interpolate'
];

module.exports = MessagesCtrl;