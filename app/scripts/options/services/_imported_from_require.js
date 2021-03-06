angular.module("abc")

.service("FilterStorage", function(){            return require("./filterStorage").FilterStorage; })
.service("FilterNotifier", function(){           return require("./filterNotifier").FilterNotifier; })
.service("Prefs", function(){                    return require("./prefs").Prefs; })
.service("Synchronizer", function(){             return require("./synchronizer").Synchronizer; })
.service("Utils", function(){                    return require("./utils").Utils; })
.service("onShutdown", function(){               return require("./utils").onShutdown; })
.service("CommonUtils", function(){              return require("./commonUtils").CommonUtils; })
.service("Prefs", function(){                    return require("./prefs").Prefs; })

.service("Filter", function(){                   return require("./filterClasses").Filter; })
.service("WhitelistFilter", function(){          return require("./filterClasses").WhitelistFilter; })

.service("Subscription", function(){             return require("./subscriptionClasses").Subscription; })
.service("SpecialSubscription", function(){      return require("./subscriptionClasses").SpecialSubscription; })
.service("DownloadableSubscription", function(){ return require("./subscriptionClasses").DownloadableSubscription; })

.service("AdblockCash", function(){              return require("./adblockCash").AdblockCash; })


// TODO Utils.onShutdown reload this window.
