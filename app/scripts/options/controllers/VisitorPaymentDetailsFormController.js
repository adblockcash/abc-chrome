angular.module("abc")

.controller("VisitorPaymentDetailsFormController", function($scope, AdblockCash){
  function updateVisitor(){
    if (!AdblockCash.visitor) {
      delete $scope.visitor;
      return;
    }

    $scope.visitor = angular.copy(AdblockCash.visitor);
    // if ($scope.visitor.paypal_email) {
      $scope.paymentMethod = "paypal";
    // } else {
    //   $scope.paymentMethod = "bank";
    // }
  }
  $scope.$on("visitor.updated", updateVisitor);
  updateVisitor();

  function updatePaymentDetails(){
    delete $scope.paymentDetails;

    if ($scope.visitor && $scope.visitor.country_code) {
      AdblockCash.getPaymentDetails($scope.visitor.country_code).then(function(data){
        $scope.$applyAsync(function(){
          $scope.paymentDetails = data;
        });
      });
    }
  }
  $scope.$watch("visitor.country_code", updatePaymentDetails);

  $scope.submit = function(){
    if ($scope.status == "loading") {
      return;
    }
    $scope.status = "loading";

    if ($scope.paymentMethod == "bank") {
      $scope.visitor.paypal_email = null;
    }

    AdblockCash.updateVisitorAccount($scope.visitor)
      .then(function(){
        $scope.$applyAsync(function(){
          $scope.status = "success";
        });
      })
      .catch(function(){
        $scope.$applyAsync(function(){
          $scope.status = "failure";
        });
      });
  };
});
