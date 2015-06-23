'use strict';

var _ = require('lodash');

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

