angular.module("abc")

.service("RewardsModule", function(AdblockCash, onShutdown) {
  return {
    init: function(){
      this._templates = {
        topEarnedCashcoinsRow: $("#js-top-earned-cc-row-template").remove()[0].outerHTML
      };

      this.elements = {
        $topEarnedCashcoinsTableContainer: $("#js-top-earned-cc"),
        $topEarnedCashcoinsTableRowsContainer: $("#js-top-earned-cc-rows"),
        $statCurrentRow: $(".js-rewards-current-row"),
        $statCurrentRewardCategory: $(".js-rewards-current-reward_category"),
        $statCurrentCashcoins: $(".js-rewards-current-cashcoins"),
        $statCurrentPriceMoney: $(".js-rewards-current-price_money"),
        $statCurrentPayoutDate: $(".js-rewards-current-payout_date"),
        $statNextRow: $(".js-rewards-next-row"),
        $statNextRewardCategory: $(".js-rewards-next-reward_category"),
        $statNextCashcoins: $(".js-rewards-next-cashcoins"),
        $statNextPriceMoney: $(".js-rewards-next-price_money")
      };

      var render = this.render.bind(this);
      AdblockCash.addListener("visitor.updated", render);
      window.addEventListener("unload", function() {
        if (onShutdown.done) {
          return;
        }

        AdblockCash.removeListener("visitor.updated", render);
      }, false);

      this.render();
    },

    render: function(){
      this.elements.$statCurrentRow.toggle(!!(AdblockCash.visitor && AdblockCash.visitor.current_reward_category));
      if (AdblockCash.visitor && AdblockCash.visitor.current_reward_category) {
        this.elements.$statCurrentRewardCategory.text(AdblockCash.visitor.current_reward_category.rank);
        this.elements.$statCurrentCashcoins.text(AdblockCash.visitor.cashcoins);
        this.elements.$statCurrentPriceMoney.text(AdblockCash.visitor.current_reward_category.price_money + " $");
        this.elements.$statCurrentPayoutDate.text(AdblockCash.visitor.current_reward_category.payout_date);
      }
      this.elements.$statNextRow.toggle(!!(AdblockCash.visitor && AdblockCash.visitor.next_reward_category));
      if (AdblockCash.visitor && AdblockCash.visitor.next_reward_category) {
        this.elements.$statNextRewardCategory.text(AdblockCash.visitor.next_reward_category.rank);
        this.elements.$statNextCashcoins.text(AdblockCash.visitor.next_reward_category.required_cashcoins);
        this.elements.$statNextPriceMoney.text(AdblockCash.visitor.next_reward_category.price_money + " $");
      }

      this.elements.$topEarnedCashcoinsTableRowsContainer.text("");
      this.elements.$topEarnedCashcoinsTableContainer.hide();

      if (AdblockCash.visitor
        && AdblockCash.visitor.top_5_websites_by_earned_cc
        && AdblockCash.visitor.top_5_websites_by_earned_cc.length > 0) {
        this.elements.$topEarnedCashcoinsTableContainer.show();
        AdblockCash.visitor.top_5_websites_by_earned_cc.forEach(function(website){
          var rowTemplate = $(this._templates.topEarnedCashcoinsRow);

          rowTemplate.find(".js-website-name").text(website.domain);
          rowTemplate.find(".js-website-earned_cc").text((website.earned_cashcoins || 0) + " CC");

          this.elements.$topEarnedCashcoinsTableRowsContainer.append(rowTemplate);
        }.bind(this));
      }
    }
  };
})

.run(function(RewardsModule) {
  RewardsModule.init();
});
