angular.module("abc")

.service("AdblockingModule", function(Utils, FilterStorage, FilterNotifier, Subscription) {
  return {
    init: function() {
      // Load subscriptions for features
      var featureSubscriptions = [
        {
          feature: "malware",
          homepage: "http://malwaredomains.com/",
          title: "Malware Domains",
          url: "https://easylist-downloads.adblockplus.org/malwaredomains_full.txt"
        },
        {
          feature: "social",
          homepage: "https://www.fanboy.co.nz/",
          title: "Fanboy's Social Blocking List",
          url: "https://easylist-downloads.adblockplus.org/fanboy-social.txt"
        },
        {
          feature: "tracking",
          homepage: "https://easylist.adblockplus.org/",
          title: "EasyPrivacy",
          url: "https://easylist-downloads.adblockplus.org/easyprivacy.txt"
        }
      ];

      function isSubscriptionEnabled(featureSubscription)
      {
        return featureSubscription.url in FilterStorage.knownSubscriptions
          && !Subscription.fromURL(featureSubscription.url).disabled;
      }

      // Set up feature buttons linked to subscriptions
      featureSubscriptions.forEach(function setToggleSubscriptionButton(featureSubscription)
      {
        var feature = featureSubscription.feature;

        var checkboxElement = document.querySelector("#js-toggle-" + feature);
        Utils.setCheckboxValue(checkboxElement, isSubscriptionEnabled(featureSubscription));

        checkboxElement.addEventListener("change", function(event) {
          var subscription = Subscription.fromURL(featureSubscription.url);

          if (isSubscriptionEnabled(featureSubscription) && !checkboxElement.checked) {
            FilterStorage.removeSubscription(subscription);
          } else if (!isSubscriptionEnabled(featureSubscription) && checkboxElement.checked) {
            subscription.disabled = false;
            subscription.title = featureSubscription.title;
            subscription.homepage = featureSubscription.homepage;
            FilterStorage.addSubscription(subscription);
            if (!subscription.lastDownload) {
              Synchronizer.execute(subscription);
            }
          }
        }, false);
      });

      function filterListener(action, item) {
        if (/^subscription\.(added|removed|disabled)$/.test(action)) {
          for (var i = 0; i < featureSubscriptions.length; i++) {
            var featureSubscription = featureSubscriptions[i];
            if (featureSubscription.url === item.url) {
              var checkboxElement = document.querySelector("#js-toggle-" + featureSubscription.feature);
              Utils.setCheckboxValue(checkboxElement, isSubscriptionEnabled(featureSubscription));
            }
          }
        }
      }

      FilterNotifier.addListener(filterListener);
      window.addEventListener("unload", function() {
        FilterNotifier.removeListener(filterListener);
      }, false);
    }
  };
})

.run(function(AdblockingModule) {
  AdblockingModule.init();
});
