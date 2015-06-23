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
},{"./action":2,"./list":4,"./messages":5,"./proxy":9}],4:[function(require,module,exports){
"use strict";function list(e){return{restrict:"EA",scope:!0,require:["^envoyMessages"],templateUrl:opts.templateUrl,link:function(t,n,i,r){var o=e.findParentCtrl(i.envoyList||i["for"],r);o.bindView(t),t.$on("$destroy",function(){o.unbindView()})}}}var opts=require("../envoy/opts");list.$inject=["$envoy"],module.exports=list;
},{"../envoy/opts":12}],5:[function(require,module,exports){
"use strict";module.exports=require("./messages");
},{"./messages":7}],6:[function(require,module,exports){
(function (global){
"use strict";function MessagesCtrl(e,t,n,r,i){var a;this.bindView=function(e){if(a.scope)throw new Error("view already bound!");return a.scope=e,e.data=viewData(t.DEFAULT_LEVEL),this},this.unbindView=function(){return delete a.scope,this},function(){var o,s;Object.defineProperties(this,{$errorLevel:{get:function(){return s.$errorLevel},set:function(e){s.$errorLevel=e}},$name:{get:function(){return s.$name}},$viewData:{get:function(){var e;return(e=_.get(a,"scope.data"))?e:_.get(a,"scope")?a.scope.data=viewData(t.DEFAULT_LEVEL):void 0},set:function(e){a.scope.data=e}}}),s=this.$form=e.controller("form"),this.$parent=n.parent&&(o=i(n.parent)(r))?t.findParentCtrl(o,e.parent().controller("messages")):null,a=this.$parent?this.$view=this.$parent.$view:this.$view={}}.call(this)}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,viewData=require("./viewdata");MessagesCtrl.$inject=["$element","$envoy","$attrs","$scope","$interpolate"],module.exports=MessagesCtrl;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./viewdata":8}],7:[function(require,module,exports){
"use strict";function messages(e){return{restrict:"AE",require:"envoyMessages",controller:require("./messages-ctrl"),scope:!0,link:function(s,r,t,o){s.$on("$formStateChanged",function(s,r){var t=o.$viewData;t&&(t.messages=r.messages,t.error=!!r.errorLevel,t.className=r.errorLevelName,t.title=e.LEVELS[r.errorLevel].description)})}}}messages.$inject=["$envoy"],module.exports=messages;
},{"./messages-ctrl":6}],8:[function(require,module,exports){
(function (global){
"use strict";function viewData(e){var i={reset:function(){this.error=!1,this.messages={},this.title=null,this.className=null,this.errorLevel=e},id:_.uniqueId(ID_PREFIX)};return i.reset(),debug('Created viewdata object with id "%s"',i.id),i}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,ID_PREFIX="envoy-viewdata-",debug=require("debug")("envoy:directives:messages:viewdata");module.exports=viewData;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":15}],9:[function(require,module,exports){
(function (global){
"use strict";function proxy(e){var r="proxy";return{restrict:"A",require:"ngModel",link:function(o,n,a,l){var t;(t=a.formProxy)&&(n.addClass("errorlevel"),o.$on("$formStateChanged",function(o,a){var i;_.find(a.forms,{$name:t})&&(_.each(e.ERRORLEVELS,function(e,r){n.removeClass(r)}),i=a.errorLevel,l.$setValidity(r,i),i&&n.addClass(a.errorLevelName))}))}}}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null;proxy.$inject=["$envoy"],module.exports=proxy;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
(function (global){
"use strict";function envoyFactory(e,r){function t(n){var o;return(o=t._cache[n.$name])?r.when(o):e.get(opts.dataFile,{cache:!0}).then(function(e){var r=e.data;return n&&(r=_(r[n.$alias||n.$name]).mapValues(function(e,r){var o=n[r],a=o&&_.size(o.$error);return o&&a?_(e).pick(_.keys(o.$error)).each(function(e){e.action=t.getAction(n.$name,r)}).value():void 0}).pick(_.identity).value()),t._cache[n.$name]=r,r})}var n=_.pluck(opts.levels,"name"),o=_(n).invert().mapValues(_.parseInt).value(),a={},l={_cache:{},level:function(e){return _.isString(e)?o[e]||o[opts.defaultLevel]:n[e]||opts.defaultLevel},formErrorLevel:function(e){if(!e)throw new Error("parameter is required");return t(e).then(function(r){return t._formErrorLevel(e,r)})},_formErrorLevel:function(e,r){var a=o[opts.defaultLevel],l=_.reduce(r,function(r,n){var o=_(n).pick(function(r,t){return e.$error[t]}).pluck("level").map(t.level).max();return Math.max(r,o)},a);return n[l]},_lastControl:null,_lastControlError:null,$broadcast:function(e,a){var l=e,u=null,i=_.debounce(function(){var e=[];for(e.unshift(l);l.$$parentForm&&l.$$parentForm.$name;)l=l.$$parentForm,e.unshift(l);u=r.all(_.map(e,t)).then(function(r){var u=o[opts.defaultLevel],i={},c=_.reduce(r,function(r,n,a){var l=e[a],u=t._formErrorLevel(l,n),c=o[u];return l.$errorLevel=c,i[l.$name]=n,_.isNumber(c)?Math.max(r,c):r},u);l.$formScope.$broadcast("$formStateChanged",{errorLevel:c,errorLevelName:n[c],messages:_.omit(i,_.isEmpty),forms:e,control:a}),t._lastControl=a,t._lastControlError=_.keys(a.$error)})},BROADCAST_DEBOUNCE_MS);return delete t._cache[e.$name],u?u.then(t.$broadcast.bind(null,e,a)):r.when(i())},setAction:function(e,r,t){var n=a[e]=a[e]||{};n[r]=t},getAction:function(e,r){return _.get(a,_.format("%s.%s",e,r))},findParentCtrl:function(e,r){for(;r.$form.$name!==e;)if(r=r.parent,!r)throw new Error("cannot find parent with name "+e);return r},DEFAULT_LEVEL:opts.defaultLevel,ERRORLEVELS:o,LEVELS:opts.levels,opts:opts};return _.extend(t,l),t}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,opts=require("./opts"),BROADCAST_DEBOUNCE_MS=250;envoyFactory.$inject=["$http","$q"],module.exports=envoyFactory;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./opts":12}],11:[function(require,module,exports){
(function (global){
"use strict";var opts=require("./opts"),_="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,envoyProvider=function(){this.options=function(e){return _.extend(opts,e)},this.$get=require("./factory")};module.exports=envoyProvider;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./factory":10,"./opts":12}],12:[function(require,module,exports){
"use strict";var DEFAULT_HIDE_DELAY=900,DEFAULT_LEVELS=[{name:"ok",description:"Fixed!"},{name:"warning",description:"Warning"},{name:"error",description:"Error"}],DEFAULT_DATA_FILE="messages.json",DEFAULT_LEVEL="ok";module.exports={levels:DEFAULT_LEVELS,defaultLevel:DEFAULT_LEVEL,dataFile:DEFAULT_DATA_FILE,hideDelay:DEFAULT_HIDE_DELAY,templateUrl:"partials/messages.html"};
},{}],13:[function(require,module,exports){
(function (global){
"use strict";function formDecorator(e){function t(e,t,r,o,a,s,n){var $;s.invoke(i,this,{$element:e,$scope:r,$animate:o,$interpolate:a,$attrs:t}),this.$isForm=!0,this.$name&&($=this.$setValidity,debug("Instantiating patched controller for form %s",this.$name),_.extend(this,{$alias:t.alias||this.$name,$formScope:r,$$lastErrorSize:0,$setValidity:function(e,t,r){var i=!r.$isForm,o=i&&_.has(this,r.$name);$.apply(this,arguments),o&&_.size(this.$error)!==this.$$lastErrorSize&&(n.$broadcast(this,r),this.$$lastErrorSize=_.size(this.$error))}}),_.has(r,this.$alias)||(r[this.$alias]=this))}var r=_.first(e),i=r.controller;return t.$inject=["$element","$attrs","$scope","$animate","$interpolate","$injector","$envoy"],r.controller=t,r.$scope=!0,e}var _="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,debug=require("debug")("envoy:formDecorator");formDecorator.$inject=["$delegate"],module.exports=formDecorator;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"debug":15}],14:[function(require,module,exports){
(function (global){
"use strict";function config(e){e.decorator("ngFormDirective",require("./form-decorator")),debug("Configured envoy")}var angular="undefined"!=typeof window?window.angular:"undefined"!=typeof global?global.angular:null,_="undefined"!=typeof window?window._:"undefined"!=typeof global?global._:null,directives=require("./directives"),MODULE_NAME="fv.envoy",debug=require("debug")("envoy"),envoy;config.$inject=["$provide"],envoy=angular.module(MODULE_NAME,[]).config(config).provider("$envoy",require("./envoy")),_.each(directives,function(e,o){envoy.directive(o,e)}),module.exports=envoy;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./directives":3,"./envoy":11,"./form-decorator":13,"debug":15}],15:[function(require,module,exports){
module.exports=function(){};
},{}]},{},[1])


//# sourceMappingURL=envoy.js.map