'use strict';

module.exports = function (grunt) {

  grunt.registerTask('release', 'Build & bump', function(target) {
    grunt.task.run('bump-only:' + target);
    grunt.task.run('build');
    grunt.task.run('bump-commit');
  });
};
