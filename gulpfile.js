var fs = require("fs");
var gulp = require("gulp");
var gutil = require("gulp-util");
var shell = require("gulp-shell");
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var runSequence = require('run-sequence');

var CHROME_COMMAND = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome";

var APP_ROOT = require("execSync").exec("pwd").stdout.trim() + "/";

var PATHS = {
  source: {
    styles: "app/styles/**/*.{sass,scss}"
  },
  destination: {
    styles: "dist/styles/"
  }
};

var _ENV_GLOBALS = {
  "default": {
  },
  "development": {
    ENV: "development",
    ABC_BACKEND_ORIGIN: "http://localhost:3000"
  },
  "production": {
    ENV: "production",
    ABC_BACKEND_ORIGIN: "http://backend.adblockcash.org"
  }
};

// GLOBALS is a hash of options for the current environment.
// You change it like this: `gulp --env=production build`
//
// In summary, GLOBALS are build in this way:
// 1) Take the defaults (GLOBALS.default)
// 2) Merge with current GLOBALS[env] (f.e. GLOBALS.production)
// 3) Replace existing GLOBALS with existing and matched ENV variables.
var GLOBALS = require('extend')(true, {}, _ENV_GLOBALS["default"], _ENV_GLOBALS[gutil.env.env || "development"] || {}, {
  CACHE_TAG: Date.now()
});

// You can replace any of GLOBALS by defining ENV variable in your command line,
// f.e. `BACKEND_URL="http://192.168.0.666:1337" gulp`
for (var k in GLOBALS) {
  if ((process.env[k] != null) && (GLOBALS[k] != null)) {
    GLOBALS[k] = process.env[k];
  }
}

// GLOBALS are also passed to .jade views.
// We don't pass all of them, though - we'll filter them by PUBLIC_GLOBALS_KEYS.
//
// Only those will be actually passed into the frontend's application
// (the rest of globals are used only during the compilation in gulp and shell scripts)
var PUBLIC_GLOBALS_KEYS = ["ENV", "ABC_BACKEND_ORIGIN", "CACHE_TAG"];
var PUBLIC_GLOBALS = {};
for (var _i = 0, _len = PUBLIC_GLOBALS_KEYS.length; _i < _len; _i++) {
  var key = PUBLIC_GLOBALS_KEYS[_i];
  if (GLOBALS[key] != null) {
    PUBLIC_GLOBALS[key] = GLOBALS[key];
  }
}

// USEFUL TASKS

gulp.task("generate-icons", shell.task("tasks/generate-icons.sh"));

// COMPILE TASKS

gulp.task("bower:install", shell.task("bower install"));

gulp.task("scripts:generate-env", function(done) {
  return fs.writeFile(APP_ROOT + "adblockplus/lib/env.js", "exports.GLOBALS = " + JSON.stringify(PUBLIC_GLOBALS), done);
});

gulp.task("styles", function() {
  return gulp.src(PATHS.source.styles)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sourcemaps.init())
      .pipe(sass())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(PATHS.destination.styles));
});

gulp.task("build-dist", function(callback) {
  return runSequence(["bower:install", "scripts:generate-env"], "styles", callback);
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
    "*.{html,js}",
    "metadata.*",
    "!gulpfile.js",
    PATHS.destination.styles + "**/*.css"
  ], ["buildtools:build-devenv"]);

  gulp.watch([
    PATHS.source.styles
  ], ["styles"]);
});


gulp.task("deploy-zip", ["build-zip-release"], shell.task("scp adblockcashchrome.zip jt:./public_html/tmp/abc/ && echo \"ABC Chrome extension has been built and deployed to http://jt/tmp/abc/adblockcashchrome.zip .\""));

gulp.task("deploy-package", ["build-package"], shell.task("scp /tmp/adblockcashchrome.crx jt:./public_html/tmp/abc/ && echo \"ABC Chrome extension has been built and deployed to http://jt/tmp/abc/adblockcashchrome.crx .\""));

gulp.task("deploy", ["deploy-zip", "deploy-package"]);

gulp.task("default", ["build-devenv", "watch"]);
