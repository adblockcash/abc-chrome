angular.module("abc")

.service("VisitorModule", function(CommonUtils, AdblockCash, $log, $rootScope) {
  return {
    init: function() {
      var _this = this;

      $rootScope.logout = function(){
        AdblockCash.logout();
      };

      $rootScope.loginWithFacebook = function(){
        AdblockCash.loginWithProvider(window, "facebook").catch(function(error){
          alert("An error occured while logging in with Facebook: " + error);
        });
      };

      $rootScope.loginWithGoogle = function(){
        AdblockCash.loginWithProvider(window, "google").catch(function(error){
          alert("An error occured while logging in with Google: " + error);
        });
      };

      debounced_updateVisitorNotificationSettings = CommonUtils.debounce(this.updateVisitorNotificationSettings, 1000);

      AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
        var checkbox = $(".js-visitor-notification-settings-" + settingName)[0];
        checkbox.addEventListener("change", debounced_updateVisitorNotificationSettings);
      });

      $rootScope.$on("visitor.updated", function(){
        _this.updateVisitorDependantViews();
      });
      this.updateVisitorDependantViews();

      AdblockCash.refreshCurrentVisitor();

      this.setupCountriesList();
    },

    setupCountriesList: function() {
      AdblockCash.getCountriesList().then(function(countries){
        var optionsHtml = "<option value=''>--- select ---</option>" + countries.map(function(country){
          return "<option value='" + $.escapeHtml(country.code) + "'>" + $.escapeHtml(country.name) + "</option>";
        });

        $(".js-visitor-country_code-select").html(optionsHtml);
        this.setCurrentCountry(AdblockCash.visitor && AdblockCash.visitor.country_code);
      }.bind(this));

      $(".js-visitor-country_code-select").change(function(){
        if (AdblockCash.visitor && $(".js-visitor-country_code-select").val() != AdblockCash.visitor.country_code) {
          this.setCurrentCountry(AdblockCash.visitor.country_code, false);

          AdblockCash.updateVisitorAccount({
            country_code: $(".js-visitor-country_code-select").val()
          }).catch(function(error) {
            alert("An error occured while updating account settings: " + error);
          });
        }
      }.bind(this))
    },

    setCurrentCountry: function(countryCode, changeSelect) {
      if (changeSelect == null) {
        changeSelect = true;
      }

      if (changeSelect) {
        $(".js-visitor-country_code-select").val(countryCode);
      }
      $(".js-visitor-country_code-flag").removeClass().addClass("js-visitor-country_code-flag flag-icon flag-icon-" + (countryCode || "").toLowerCase());
    },

    // Enable all handlers that should be called when the user will log in / log out.
    updateVisitorDependantViews: function () {
      if (AdblockCash.visitor) {
        this.setCurrentCountry(AdblockCash.visitor.country_code);

        AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
          $(".js-visitor-notification-settings-" + settingName).prop("checked", (AdblockCash.visitor.notification_settings && !!AdblockCash.visitor.notification_settings[settingName]));
        });
      }
    },

    updateVisitorNotificationSettings: function() {
      if (!AdblockCash.visitor) {
        return;
      }

      var notification_settings = {};

      AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
        var checkbox = $(".js-visitor-notification-settings-" + settingName)[0];
        if (AdblockCash.visitor.notification_settings[settingName] != checkbox.checked) {
          notification_settings[settingName] = checkbox.checked;
        }
      });

      // If nothing has changed, skip the update.
      if (Object.keys(notification_settings).length == 0) {
        return;
      }

      $log.debug("Calling AdblockCash.updateNotificationSettings with ", notification_settings);

      AdblockCash.updateNotificationSettings(notification_settings);
    }
  };
})

.run(function(VisitorModule) {
  VisitorModule.init();
});
