angular.module("abc")

.service("refreshDOM", function() {

  function initializeTooltips() {
    $(".js-tooltip").tooltip();
  }

  return function refreshDOM() {
    initializeTooltips();
  };

});
