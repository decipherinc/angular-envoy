'use strict';

var minimatch = require('minimatch'),
  transformify = require('transformify'),
  through2 = require('through2');

var tx = transformify(stubber);

function stubber() {
  return 'module.exports = function() {};';
}

module.exports = function stub(file, opts) {
  var found;

  opts = opts || {};
  opts.files = opts.files && [].concat(opts.files);

  opts.files.forEach(function (glob) {
    if (minimatch(file, glob)) {
      return !(found = true);
    }
  });

  if (found) {
    return tx(file);
  }

  return through2();
};
