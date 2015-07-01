'use strict';

module.exports = function () {

  var HEADER = '@ngdoc overview\n' +
    '@name Overview\n' +
    '@description\n\n';

  function prePrettify(content) {
    var block = false;
    return content.split('\n')
      .map(function (line) {
        if (line.match(/^```\w*$/)) {
          if (block) {
            line = '</pre>';
            block = false;
          } else {
            line = '<pre class="prettyprint linenums">';
            block = true;
          }
        }
        return line;
      })
      .join('\n');
  }

  return {
    readme: {
      src: 'README.md',
      dest: 'docs/home/index.ngdoc',
      options: {
        process: function process(content) {
          return HEADER + prePrettify(content);
        }
      }
    }
  };

};
