/*! angular-envoy - v0.1.0
 * 
 * Copyright (c) 2015 Focusvision Worldwide; Licensed MIT
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";module.exports=require("./lib");
},{"./lib":14}],2:[function(require,module,exports){
"use strict";function action(n){return{restrict:"A",require:["ngModel","^form"],link:function(e,t,i,o){var c,a=o[0],r=o[1];(c=i.messageAction)&&a.$name&&r.$name&&n.setAction(r.$name,a.$name,function(){e.$eval(c)})}}}action.$inject=["$envoy"],module.exports=action;
},{}],3:[function(require,module,exports){
"use strict";module.exports={envoyAction:require("./action"),envoyMessages:require("./messages"),envoyList:require("./list"),envoyProxy:require("./proxy")};
},{"./action":2,"./list":4,"./messages":5,"./proxy":8}],4:[function(require,module,exports){
"use strict";function list(t){return{restrict:"EA",scope:!0,require:["^envoy"],templateUrl:opts.templateUrl,link:function(e,n,i,r){var o=t.findParentCtrl(i.envoyList||i["for"],r);o.bindView(e),e.$on("$destroy",function(){o.unbindView()})}}}var opts=require("../envoy/opts");list.$inject=["$envoy"],module.exports=list;
},{"../envoy/opts":11}],5:[function(require,module,exports){
"use strict";module.exports=require("./messages");
},{"./messages":7}],6:[function(require,module,exports){
(function (global){
"use strict";function MessagesCtrl(e,t,n,r,o,i){var s,a,l,c=t.ViewData;this.bindView=function(e){if(a.scope)throw new Error("view already bound!");return a.scope=e,e.data=new c,console.debug("View bound to controller with form %s",this.$form.$name),this},this.unbindView=function(){return delete a.scope,this},function(){var n;Object.defineProperties(this,{$errorLevel:{get:function(){return s.$errorLevel},set:function(e){s.$errorLevel=e}},$name:{get:function(){return s.$name}},$viewData:{get:function(){var e;return(e=_.get(a,"scope.data"))?e:_.get(a,"scope")?a.scope.data=new c:void 0},set:function(e){a.scope.data=e}}}),s=this.$form=e.controller("form"),l=this.$parent=r.parent&&(n=i(r.parent)(o))?t.findParentCtrl(n,e.parent().controller("messages")):null,a=this.$parent?this.$view=this.$parent.$view:this.$view={}}.call(this)}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null;MessagesCtrl.$inject=["$element","$envoy","$timeout","$attrs","$scope","$interpolate"],module.exports=MessagesCtrl;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
"use strict";var messages=function(e){return{restrict:"AE",require:"messages",controller:require("./messages-ctrl"),scope:!0,link:function(r,s,t,a){r.$on("$formStateChanged",function(r,s){var t=a.$viewData;t&&(t.messages=s.messages,t.error=!!s.errorLevel,t.className=s.errorLevelName,t.title=e.LEVELS[s.errorLevel].description)})}}};messages.$inject=["$envoy"],module.exports=messages;
},{"./messages-ctrl":6}],8:[function(require,module,exports){
(function (global){
"use strict";function proxy(e){var r="proxy";return{restrict:"A",require:"ngModel",link:function(o,n,a,l){var t;(t=a.formProxy)&&(n.addClass("errorlevel"),o.$on("$formStateChanged",function(o,a){var i;_.find(a.forms,{$name:t})&&(_.each(e.ERRORLEVELS,function(e,r){n.removeClass(r)}),i=a.errorLevel,l.$setValidity(r,i),i&&n.addClass(a.errorLevelName))}))}}}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null;proxy.$inject=["$envoy"],module.exports=proxy;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
(function (global){
"use strict";var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,opts=require("./opts"),BROADCAST_DEBOUNCE_MS=250,envoyFactory=function(e,r){var t,n=_.pluck(opts.levels,"name"),o=_(n).invert().mapValues(_.parseInt).value(),a={},l=function u(t){var n;return(n=u._cache[t.$name])?r.when(n):e.get(opts.dataFile,{cache:!0}).then(function(e){var r=e.data;return t&&(r=_(r[t.$alias||t.$name]).mapValues(function(e,r){var n=t[r],o=n&&_.size(n.$error);return n&&o?_(e).pick(_.keys(n.$error)).each(function(e){e.action=u.getAction(t.$name,r)}).value():void 0}).pick(_.identity).value()),u._cache[t.$name]=r,r})};return t={_cache:{},level:function(e){return _.isString(e)?o[e]||o[opts.defaultLevel]:n[e]||opts.defaultLevel},formErrorLevel:function(e){if(!e)throw new Error("parameter is required");return l(e).then(function(r){return l._formErrorLevel(e,r)})},_formErrorLevel:function(e,r){var t=o[opts.defaultLevel],a=_.reduce(r,function(r,t){var n=_(t).pick(function(r,t){return e.$error[t]}).pluck("level").map(l.level).max();return Math.max(r,n)},t);return n[a]},_lastControl:null,_lastControlError:null,$broadcast:function(e,t){var a=e,u=null,i=_.debounce(function(){var e=[];for(e.unshift(a);a.$$parentForm&&a.$$parentForm.$name;)a=a.$$parentForm,e.unshift(a);u=r.all(_.map(e,l)).then(function(r){var u=o[opts.defaultLevel],i={},c=_.reduce(r,function(r,t,n){var a=e[n],u=l._formErrorLevel(a,t),c=o[u];return a.$errorLevel=c,i[a.$name]=t,_.isNumber(c)?Math.max(r,c):r},u);a.$formScope.$broadcast("$formStateChanged",{errorLevel:c,errorLevelName:n[c],messages:_.omit(i,_.isEmpty),forms:e,control:t}),l._lastControl=t,l._lastControlError=_.keys(t.$error)})},BROADCAST_DEBOUNCE_MS);return delete l._cache[e.$name],u?u.then(l.$broadcast.bind(null,e,t)):r.when(i())},setAction:function(e,r,t){var n=a[e]=a[e]||{};n[r]=t},getAction:function(e,r){return _.get(a,_.format("%s.%s",e,r))},findParentCtrl:function(e,r){for(;r.$form.$name!==e;)if(r=r.parent,!r)throw new Error("cannot find parent with name "+e);return r},DEFAULT_LEVEL:opts.defaultLevel,ERRORLEVELS:o,LEVELS:opts.levels,ViewData:require("./viewdata")},_.extend(l,t),l};envoyFactory.$inject=["$http","$q"],module.exports=envoyFactory;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./opts":11,"./viewdata":12}],10:[function(require,module,exports){
(function (global){
"use strict";var opts=require("./opts"),_="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,envoyProvider=function(){this.options=function(e){return _.extend(opts,e)},this.$get=require("./factory")};module.exports=envoyProvider;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./factory":9,"./opts":11}],11:[function(require,module,exports){
"use strict";var DEFAULT_HIDE_DELAY=900,DEFAULT_LEVELS=[{name:"ok",description:"Fixed!"},{name:"warning",description:"Warning"},{name:"error",description:"Error"}],DEFAULT_DATA_FILE="messages.json",DEFAULT_LEVEL="ok";module.exports={levels:DEFAULT_LEVELS,defaultLevel:DEFAULT_LEVEL,dataFile:DEFAULT_DATA_FILE,hideDelay:DEFAULT_HIDE_DELAY,templateUrl:"partials/messages.html"};
},{}],12:[function(require,module,exports){
"use strict";function ViewData(){this.reset()}var opts=require("./opts");ViewData.prototype.reset=function(){this.error=!1,this.messages={},this.title=null,this.className=null,this.errorLevel=opts.DEFAULT_LEVEL},module.exports=ViewData;
},{"./opts":11}],13:[function(require,module,exports){
(function (global){
"use strict";function formDecorator(t){function e(t,e,i,r,o,a,n){var $;a.invoke(s,this,{$element:t,$scope:i,$animate:r,$interpolate:o,$attrs:e}),this.$isForm=!0,this.$name&&($=this.$setValidity,console.debug("Instantiating patched controller for form %s",this.$name),_.extend(this,{$alias:e.alias||this.$name,$formScope:i,$$lastErrorSize:0,$setValidity:function(t,e,i){var s=!i.$isForm,r=s&&_.has(this,i.$name);$.apply(this,arguments),r&&_.size(this.$error)!==this.$$lastErrorSize&&(n.$broadcast(this,i),this.$$lastErrorSize=_.size(this.$error))}}),_.has(i,this.$alias)||(i[this.$alias]=this))}var i=_.first(t),s=i.controller;return e.$inject=["$element","$attrs","$scope","$animate","$interpolate","$injector","$messages"],i.controller=e,i.$scope=!0,t}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null;module.exports=formDecorator;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],14:[function(require,module,exports){
(function (global){
"use strict";var angular="undefined"!=typeof window?window.angular:"undefined"!=typeof global?global.angular:null,_="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,directives=require("./directives"),MODULE_NAME="fv.envoy",envoy,config=function(e){e.decorator("ngFormDirective",require("./form-decorator"))};config.$inject=["$provide"],envoy=angular.module(MODULE_NAME,[]).config(config).provider("$envoy",require("./envoy")),_.each(directives,function(e,o){envoy.directive(o,e)}),module.exports=envoy;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./directives":3,"./envoy":10,"./form-decorator":13}]},{},[1])


//# sourceMappingURL=envoy.js.map