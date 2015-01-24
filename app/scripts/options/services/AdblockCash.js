angular.module("abc")

.service("AdblockCash", function(){              return require("adblockcash").AdblockCash; })

// Set & automatically update $rootScope.currentVisitor
.run(function(AdblockCash, $window, $rootScope){
  function updateCurrentVisitor(){
    $rootScope.$applyAsync(function(){
      $rootScope.currentVisitor = angular.copy(AdblockCash.visitor);
      $rootScope.$broadcast("visitor.updated");
    });
  }

  AdblockCash.addListener("visitor.updated", updateCurrentVisitor);
  $window.addEventListener("unload", function() {
    AdblockCash.removeListener("visitor.updated", updateCurrentVisitor);
  }, false);
});
