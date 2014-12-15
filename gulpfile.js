var gulp = require("gulp");
var shell = require("gulp-shell");
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var runSequence = require('run-sequence');

var paths = {
  source: {
    styles: "app/styles/**/*.{sass,scss}"
  },
  destination: {
    styles: "dist/styles/"
  }
};

// USEFUL TASKS

gulp.task("generate-icons", shell.task("tasks/generate-icons.sh"));

// COMPILE TASKS
gulp.task("bower:install", shell.task("bower install"));

gulp.task("styles", function(){
  return gulp.src(paths.source.styles)
    .pipe(sourcemaps.init())
      .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.destination.styles));
});

gulp.task("compile:dist", runSequence(["bower:install", "styles"]));

gulp.task("compile:devenv", shell.task("./build.py -t chrome devenv"));

gulp.task("compile", runSequence(["compile:dist", "compile:devenv"]));

// GENERAL USE TASKS

gulp.task("watch", function(){
  gulp.watch([
    "assets/**",
    "chrome/**",
    "ext/**",
    "lib/**",
    "skin/**",
    "*.{html,js}",
    "metadata.*",
    paths.destination.styles + "**/*.css"
  ], ["compile:devenv"]);

  gulp.watch([
    paths.source.styles
  ], ["styles"]);
});

gulp.task("default", ["compile", "watch"]);
