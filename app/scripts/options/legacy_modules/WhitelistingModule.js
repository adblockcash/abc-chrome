angular.module("abc")

.service("WhitelistingModule", function(CommonUtils, AdblockCash, FilterNotifier, $log, refreshDOM, onShutdown) {
  return {
    _templates: {},
    elements: {},

    regionCategory: undefined,
    DEFAULT_REGION_CATEGORY: "global",
    DEFAULT_OTHER_REGION_CATEGORY_COUNTRY_CODE: "GB",

    init: function() {
      var _module = this;

      this._templates = {
        website: $("#js-cashable-website-template").remove()[0].outerHTML
      };

      this.elements = {
        $whitelistedWebsitesSection: $("#js-whitelisted-websites-section"),
        $nonWhitelistedWebsitesSection: $("#js-nonwhitelisted-websites-section"),
        $whitelistedWebsitesWrapper: $("#js-whitelisted-websites-wrapper"),
        $nonWhitelistedWebsitesWrapper: $("#js-nonwhitelisted-websites-wrapper")
      };

      var initialRender = this.initialRender.bind(this);
      AdblockCash.addListener("cashableWebsites.updated", initialRender);
      window.addEventListener("unload", function() {
        if (onShutdown.done) {
          return;
        }

        AdblockCash.removeListener("cashableWebsites.updated", initialRender);
      }.bind(this), false);

      $("#js-toggle-whitelisting-websites").change(function(){
        _module.toggleAll( $("#js-toggle-whitelisting-websites").prop("checked") );
      });

      $(".js-cashable-toggle-region-category").click(function(event){
        event.preventDefault();

        var regionCategory = $(this).data("regionCategory");
        _module.toggleRegionCategory(regionCategory);
      })

      $(".js-cashable-other_country_code-select").change(function() {
        this.otherRegionCountryCode = $(".js-cashable-other_country_code-select").val();

        this.render();
      }.bind(this));

      this.toggleRegionCategory(this.DEFAULT_REGION_CATEGORY, false)
      this.initialRender();
    },

    toggleRegionCategory: function(regionCategory, rerender) {
      if (rerender == null) {
        rerender = true;
      }

      if (this.regionCategory == regionCategory) {
        return;
      }

      this.regionCategory = regionCategory;
      $(".js-cashable-toggle-region-category").each(function(){
        $(this).parent().removeClass("active");
      });
      $(".js-cashable-toggle-region-category-" + regionCategory).parent().addClass("active");
      $(".js-cashable-toggle-region-category-when-active").hide();
      $(".js-cashable-toggle-region-category-"+ regionCategory + "-active").show();

      if (rerender) {
        this.render();
      }
    },

    initialRender: function() {
      AdblockCash.getCashableCountriesList().then(function(countries) {
        var optionsHtml = countries.map(function(country){
          return "<option value='" + $.escapeHtml(country.code) + "'>" + $.escapeHtml(country.name) + "</option>";
        });

        $(".js-cashable-other_country_code-select").html(optionsHtml)
          .val(this.DEFAULT_OTHER_REGION_CATEGORY_COUNTRY_CODE)
          .change();
      }.bind(this));

      this.render();
    },

    render: function() {
      this.elements.$whitelistedWebsitesWrapper.text("");
      this.elements.$nonWhitelistedWebsitesWrapper.text("");

      var whitelistedWebsites = this.getWhitelistedCashableWebsites(this.regionCategory);
      whitelistedWebsites.forEach(function(website){
        var $template = this.renderWebsite(website);
        this.elements.$whitelistedWebsitesWrapper.append($template);
      }.bind(this));
      this.elements.$whitelistedWebsitesSection.toggle( whitelistedWebsites.length > 0 );

      var nonWhitelistedWebsites = this.getNonWhitelistedCashableWebsites(this.regionCategory);
      nonWhitelistedWebsites.forEach(function(website){
        var $template = this.renderWebsite(website);
        this.elements.$nonWhitelistedWebsitesWrapper.append($template);
      }.bind(this));
      this.elements.$nonWhitelistedWebsitesSection.toggle( nonWhitelistedWebsites.length > 0 );

      fakeCheckboxChangeEvent++;
      CommonUtils.setCheckboxValue( $("#js-toggle-whitelisting-websites")[0], this.getWhitelistedCashableWebsites().length > 0 );
      fakeCheckboxChangeEvent--;

      $(".js-cashable-other_country_code-flag").removeClass().addClass("js-cashable-other_country_code-flag flag-icon flag-icon-" + (this.otherRegionCountryCode || "").toLowerCase());

      refreshDOM();
    },

    renderWebsite: function(website){
      var $template = $(this._templates.website);
      var isWhitelisted = AdblockCash.isDomainWhitelisted(website.domain);

      var $whitelistModeCheckbox = $template.find(".js-toggle-whitemode");

      if (website.icon_url) {
        $template.find(".js-website-image").attr("src", website.icon_url);
      } else {
        $template.find(".js-website-image").remove();
        $template.find(".js-website-image-fallback").removeClass("js-hide");
      }
      $template.find(".js-website-name").text(website.name).attr("href", "http://" + website.domain);
      $template.find(".js-website-cashcoins_per_visit").text(website.cashcoins_per_visit);
      $template.find(".js-whitelisted").toggle(isWhitelisted);
      $template.find(".js-nonwhitelisted").toggle(!isWhitelisted);
      $whitelistModeCheckbox.prop("checked", isWhitelisted);
      $whitelistModeCheckbox.change(function(){
        if ($(this).prop("checked")) {
          AdblockCash.addWhitelistedDomain(website.domain);
        } else {
          AdblockCash.removeWhitelistedDomain(website.domain);
        }
      });

      return $template;
    },

    // @param {String} type all|global|local|PL all/global/local or only for the given country (if you pass in country ISO2 code)
    getCashableWebsites: function(type) {
      if (type == null) {
        type = "all";
      }

      switch(type) {
        case "all":
          return AdblockCash.cashableWebsites;
        case "global":
          return AdblockCash.cashableWebsites.filter(function(website) {
            return !website.country_code;
          });
        case "local":
          var countryCode = AdblockCash.visitor && AdblockCash.visitor.country_code;
          return AdblockCash.cashableWebsites.filter(function(website) {
            return website.country_code == countryCode;
          });
        case "other":
          var countryCode = this.otherRegionCountryCode;
          return AdblockCash.cashableWebsites.filter(function(website) {
            return website.country_code == countryCode;
          });
        default:
          var countryCode = type;
          return AdblockCash.cashableWebsites.filter(function(website) {
            return website.country_code == countryCode;
          });
      }
    },

    getWhitelistedCashableWebsites: function(type) {
      return this.getCashableWebsites(type).filter(function(website) {
        return AdblockCash.isDomainWhitelisted(website.domain);
      }.bind(this));
    },

    getNonWhitelistedCashableWebsites: function(type) {
      return this.getCashableWebsites(type).filter(function(website) {
        return !AdblockCash.isDomainWhitelisted(website.domain);
      }.bind(this));
    },

    toggleAll: function(toggle){
      $log.debug("WhitelistingModule.toggleAll(" + toggle + ")")

      if (toggle) {
        this.getNonWhitelistedCashableWebsites()
          .filter(function(website){
            return !AdblockCash.isCashableDomainBlocked(website.domain);
          })
          .forEach(function(website){
            AdblockCash.addWhitelistedDomain(website.domain, false, true);
          });
      } else {
        this.getWhitelistedCashableWebsites()
          .forEach(function(website){
            AdblockCash.removeWhitelistedDomain(website.domain, false, true);
          });
      }

      FilterNotifier.triggerListeners("load");

      this.render();
    }
  };
})

.run(function(WhitelistingModule) {
  WhitelistingModule.init();
});
