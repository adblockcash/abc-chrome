var gulp = require("gulp");
var shell = require("gulp-shell");

gulp.task("build-devenv", shell.task("./build.py -t chrome devenv"));

gulp.task("watch", function(){
  gulp.watch([
    "assets/**",
    "chrome/**",
    "ext/**",
    "lib/**",
    "skin/**",
    "*.{html,js}",
  ], ["build-devenv"]);
})

gulp.task("default", ["build-devenv", "watch"]);
