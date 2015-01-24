var app = angular.module("abc");

// For debugging purposes.
// Usage: f.e. run `$a("$timeout")` in the browser's console.
app.run(function($injector, $window) {
  $window.$a = $injector.get;
});
