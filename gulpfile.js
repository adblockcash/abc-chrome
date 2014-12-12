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
    "metadata.*"
  ], ["build-devenv"]);
});

gulp.task("generate-icons", shell.task("tasks/generate-icons.sh"));

gulp.task("default", ["build-devenv", "watch"]);
