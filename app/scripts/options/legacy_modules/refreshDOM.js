angular.module("abc")

.service("refreshDOM", function() {

  function initializeTooltips() {
    $(".js-tooltip").tooltip();
  }

  function initializeSwitchery() {
    var switchElements = Array.prototype.slice.call(document.querySelectorAll('.js-switch:not(.js-hide)'));
    switchElements.forEach(function(element) {
      if ($(element).data("switchery")) {
        return;
      }

      var switchery = new Switchery(element, {
        'className': 'switchery switchery-small',
        // $main-color from styles/_vars.scss
        'color' : '#354b80'
      });

      // Synchronize 'checked' HTML attribute with .checked in JS - so we can style it in CSS
      $(element).change(function(){
        element.checked ? element.setAttribute("checked", "checked") : element.removeAttribute("checked");
      }).change();
    });
  }

  return function refreshDOM() {
    initializeTooltips();
    initializeSwitchery();
  };

});
