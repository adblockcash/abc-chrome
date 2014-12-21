var gulp = require("gulp");
var shell = require("gulp-shell");
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var runSequence = require('run-sequence');

var CHROME_COMMAND = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome";

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

gulp.task("styles", function() {
  return gulp.src(paths.source.styles)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sourcemaps.init())
      .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.destination.styles));
});

gulp.task("build-dist", function(callback) {
  return runSequence("bower:install", "styles", callback);
});

gulp.task("buildtools:build-devenv", shell.task("./build.py -t chrome devenv"));

gulp.task("build-zip", ["build-dist"], shell.task("./build.py -t chrome build adblockcashchrome.zip"));

gulp.task("build-zip-release", ["build-dist"], shell.task("./build.py -t chrome build -r adblockcashchrome.zip"));

gulp.task("build-package", ["build-zip-release"], shell.task("rm -rf /tmp/adblockcashchrome && unzip adblockcashchrome.zip -d /tmp/adblockcashchrome && " + CHROME_COMMAND + " --pack-extension=/tmp/adblockcashchrome --pack-extension-key=certificates/adblockcashchrome.pem"));

gulp.task("build-devenv", function(callback) {
  return runSequence("build-dist", "buildtools:build-devenv", callback);
});

// GENERAL USE TASKS

gulp.task("watch", function(){
  gulp.watch([
    "_locales/**",
    "assets/**",
    "adblockplustests/chrome/**/*.js",
    "adblockplus/chrome/**",
    "adblockplus/defaults/**",
    "adblockplus/lib/**",
    "chrome/**",
    "ext/**",
    "lib/**",
    "skin/**",
    "*.{html,js}",
    "metadata.*",
    paths.destination.styles + "**/*.css"
  ], ["buildtools:build-devenv"]);

  gulp.watch([
    paths.source.styles
  ], ["styles"]);
});


gulp.task("deploy-zip", ["build-zip-release"], shell.task("scp adblockcashchrome.zip jt:./public_html/tmp/abc/ && echo \"ABC Chrome extension has been built and deployed to http://jt/tmp/abc/adblockcashchrome.zip .\""));

gulp.task("deploy-package", ["build-package"], shell.task("scp /tmp/adblockcashchrome.crx jt:./public_html/tmp/abc/ && echo \"ABC Chrome extension has been built and deployed to http://jt/tmp/abc/adblockcashchrome.crx .\""));

gulp.task("deploy", ["deploy-zip", "deploy-package"]);

gulp.task("default", ["build-devenv", "watch"]);
