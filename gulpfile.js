var fs = require("fs");
var gulp = require("gulp");
var gutil = require("gulp-util");
var shell = require("gulp-shell");
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var concat = require('gulp-concat');
var runSequence = require('run-sequence');

var CHROME_CLI_COMMAND = "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome";

var APP_ROOT = require("execSync").exec("pwd").stdout.trim() + "/";

var paths = {
  source: {
    styles: "app/styles/**/*.{sass,scss}",
    scripts: {
      options: "app/scripts/options/**/*.js"
    }
  },
  destination: {
    styles: "dist/styles/",
    scripts: "dist/scripts/"
  }
};

var _ENV_GLOBALS = {
  "defaults": {
    // Call `gulp --platform=firefox` to change current browser destination.
    // Supported platforms: chrome|firefox|opera|safari
    PLATFORM: gutil.env.platform || "chrome",

    ROLLBAR_CLIENT_ACCESS_TOKEN: "cbd7cce4dc3e409eada424e7fb88d16d"
  },

  "development": {
    ENV: "development",
    ABC_BACKEND_ORIGIN: "http://localhost:3000",
    ROLLBAR_CLIENT_ACCESS_TOKEN: null
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
// 1) Take the defaults (GLOBALS.defaults)
// 2) Merge with current GLOBALS[env] (f.e. GLOBALS.production)
// 3) Replace existing GLOBALS with existing and matched ENV variables.
var GLOBALS = require('extend')(true, {}, _ENV_GLOBALS["defaults"], _ENV_GLOBALS[gutil.env.env || "development"] || {}, {
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
var PUBLIC_GLOBALS_KEYS = [
  "ENV",
  "ABC_BACKEND_ORIGIN",
  "CACHE_TAG",
  "ROLLBAR_CLIENT_ACCESS_TOKEN"
];
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
  return fs.writeFile(APP_ROOT + "adblockcash/lib/env.js", "exports.GLOBALS = " + JSON.stringify(PUBLIC_GLOBALS), done);
});

gulp.task("styles", function() {
  return gulp.src(paths.source.styles)
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sourcemaps.init())
      .pipe(sass({
        imagePath: "../../../shared/images"
      }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.destination.styles));
});

scriptTaskNames = Object.keys(paths.source.scripts).map(function(scriptName){
  var scriptTaskName = "scripts:" + scriptName;

  gulp.task(scriptTaskName, function() {
    return gulp.src(paths.source.scripts[scriptName])
      .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
      .pipe(sourcemaps.init())
        .pipe(concat(scriptName + ".js"))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(paths.destination.scripts));
  });

  return scriptTaskName;
});

gulp.task("scripts", scriptTaskNames);

gulp.task("build-dist", function(callback) {
  return runSequence(["bower:install", "scripts:generate-env"], ["styles", "scripts"], callback);
});

if (GLOBALS.PLATFORM == "gecko") {
  gulp.task("buildtools:autoinstall", shell.task("cd adblockcash && ./build.py -t "+ GLOBALS.PLATFORM +" autoinstall 8888"));
  gulp.task("buildtools:devenv", ["buildtools:autoinstall"]);
} else {
  gulp.task("buildtools:devenv", shell.task("rm -rf devenv/* && ./build.py -t "+ GLOBALS.PLATFORM +" devenv"));
}

gulp.task("buildtools:build", shell.task("./build.py -t "+ GLOBALS.PLATFORM +" build"));

gulp.task("buildtools:build-release", shell.task("./build.py -t "+ GLOBALS.PLATFORM +" build -r"));

if (GLOBALS.PLATFORM == "chrome") {
  gulp.task("build-package", ["buildtools:build-release"], shell.task("rm -rf /tmp/adblockcashchrome && unzip adblockcashchrome.zip -d /tmp/adblockcashchrome && " + CHROME_CLI_COMMAND + " --pack-extension=/tmp/adblockcashchrome --pack-extension-key=certificates/adblockcashchrome.pem"));
}

gulp.task("build-dev", function(callback) {
  return runSequence("build-dist", "buildtools:devenv", callback);
});

gulp.task("build-zip", function(callback) {
  return runSequence("build-dist", "buildtools:build", callback);
});

gulp.task("build-zip-release", function(callback) {
  return runSequence("build-dist", "buildtools:build-release", callback);
});

// GENERAL USE TASKS

gulp.task("watch", function(){
  gulp.watch([
    "_locales/**",
    "adblockcash/chrome/**",
    "adblockcash/defaults/**",
    "adblockcash/lib/**",
    "adblockcash/chrome.manifest",
    "adblockcash/metadata.*",
    "adblockcashtests/chrome/**/*.js",
    "buildtools/**",
    "chrome/**",
    "ext/**",
    "lib/**",
    "shared/**",
    "qunit/**",
    "*.{html,js}",
    "metadata.*",
    "!gulpfile.js",
    paths.destination.styles + "**/*.css",
    paths.destination.scripts + "**/*.js"
  ], ["buildtools:devenv"]);

  gulp.watch(paths.source.styles, ["styles"]);

  Object.keys(paths.source.scripts).forEach(function(scriptName){
    var scriptTaskName = "scripts:" + scriptName;
    gulp.watch(paths.source.scripts[scriptName], [scriptTaskName]);
  });
});


gulp.task("deploy-zip", ["build-zip-release"], shell.task("scp adblockcash"+ GLOBALS.PLATFORM +".zip jt:./public_html/tmp/abc/ && echo \"ABC "+ GLOBALS.PLATFORM +" extension has been built and deployed to http://jt/tmp/abc/adblockcash"+ GLOBALS.PLATFORM +".zip .\""));

gulp.task("deploy-package", ["build-package"], shell.task("scp /tmp/adblockcash"+ GLOBALS.PLATFORM +".crx jt:./public_html/tmp/abc/ && echo \"ABC "+ GLOBALS.PLATFORM +" extension has been built and deployed to http://jt/tmp/abc/adblockcash"+ GLOBALS.PLATFORM +".crx .\""));

gulp.task("deploy", ["deploy-zip", "deploy-package"]);

gulp.task("release", ["build-zip-release"]);

gulp.task("default", ["build-dev", "watch"]);
