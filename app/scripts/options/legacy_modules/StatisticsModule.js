angular.module("abc")

.service("StatisticsModule", function(AdblockCash) {
  return {
    init: function(){
      this._templates = {
        topBlockedAdsRow: $("#js-top-blocked-ads-row-template").remove()[0].outerHTML
      };

      this.elements = {
        $topBlockedAdsContainer: $("#js-top-blocked-ads-container"),
        $topBlockedAdsRowsContainer: $("#js-top-blocked-ads-rows")
      };

      var render = this.render.bind(this);
      AdblockCash.addListener("visitor.updated", render);
      window.addEventListener("unload", function() {
        AdblockCash.removeListener("visitor.updated", render);
      }, false);

      this.render();
    },

    render: function(){
      $("#js-stat-total_blocked_ads").text(Prefs.stats_total.blocked || 0);
      $("#js-stat-total_whitelisted_ads").text(Prefs.stats_total.earned || 0);
      $("#js-stat-total_missed_ads").text(Prefs.stats_total.missed || 0);
      $("#js-stat-earned_cc").text(((AdblockCash.visitor && AdblockCash.visitor.total_earned_cashcoins) || 0) + " CC");
      $("#js-stat-missed_cc").text(((AdblockCash.visitor && AdblockCash.visitor.total_missed_cashcoins) || 0) + " CC");

      this.elements.$topBlockedAdsRowsContainer.text("");
      var domains = Object.keys(Prefs.stats_by_domain);
      domains.sort(function(domainA, domainB){
        return (Prefs.stats_by_domain[domainB].blocked || 0) - (Prefs.stats_by_domain[domainA].blocked || 0);
      });
      domains.slice(0, 10).forEach(function(domain){
        var rowTemplate = $(this._templates.topBlockedAdsRow);

        rowTemplate.find(".js-website-name").text(domain);
        rowTemplate.find(".js-website-blocked_ads").text(Prefs.stats_by_domain[domain].blocked);

        this.elements.$topBlockedAdsRowsContainer.append(rowTemplate);
      }.bind(this));

      this.elements.$topBlockedAdsContainer.toggle(domains.length > 0);
    }
  };
})

.run(function(StatisticsModule) {
  StatisticsModule.init();
});
