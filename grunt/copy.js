'use strict';

module.exports = function () {

  var HEADER = '@ngdoc overview\n' +
    '@name Overview\n' +
    '@description\n\n';

  return {
    readme: {
      src: 'README.md',
      dest: 'docs/index.ngdoc',
      options: {
        process: function process(content) {
          return HEADER + content;
        }
      }
    }
  };

};
