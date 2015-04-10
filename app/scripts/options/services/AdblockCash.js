angular.module("abc")

// Set & automatically update $rootScope.currentVisitor
.run(function(AdblockCash, $rootScope, onShutdown){
  function updateCurrentVisitor(){
    $rootScope.$applyAsync(function(){
      $rootScope.currentVisitor = angular.copy(AdblockCash.visitor);
      $rootScope.$broadcast("visitor.updated");
    });
  }

  AdblockCash.addListener("visitor.updated", updateCurrentVisitor);
  window.addEventListener("unload", function() {
    if (onShutdown.done) {
      return;
    }

    AdblockCash.removeListener("visitor.updated", updateCurrentVisitor);
  }, false);
});
