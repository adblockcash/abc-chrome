/*
 * This file is part of Adblock Cash <http://adblockcash.org/>,
 * (based on Adblock Plus <http://adblockplus.org/> by Eyeo GmbH)
 * Copyright (C) Adblock Cash
 *
 * Adblock Cash is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Cash is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Cash.  If not, see <http://www.gnu.org/licenses/>.
 */

with(require("./filterClasses"))
{
  this.Filter = Filter;
  this.RegExpFilter = RegExpFilter;
  this.BlockingFilter = BlockingFilter;
  this.WhitelistFilter = WhitelistFilter;
}
with(require("./subscriptionClasses"))
{
  this.Subscription = Subscription;
  this.DownloadableSubscription = DownloadableSubscription;
  this.SpecialSubscription = SpecialSubscription;
}
with(require("./whitelisting"))
{
  this.isWhitelisted = isWhitelisted;
  this.isFrameWhitelisted = isFrameWhitelisted;
  this.processKey = processKey;
  this.getKey = getKey;
}
var AdblockCash = require("./adblockCash").AdblockCash;
var AdblockCashUtils = require("./adblockCashUtils").AdblockCashUtils;
var FilterStorage = require("./filterStorage").FilterStorage;
var ElemHide = require("./elemHide").ElemHide;
var defaultMatcher = require("./matcher").defaultMatcher;
var Prefs = require("./prefs").Prefs;
var Synchronizer = require("./synchronizer").Synchronizer;
var CommonUtils = require("./commonUtils").CommonUtils;
var Utils = require("./utils").Utils;
var Notification = require("./notification").Notification;
var initAntiAdblockNotification = require("./antiadblockInit").initAntiAdblockNotification;
var UriUtils = require("./utilsUri");
let {ExtensionStorage, showOptions} = require("./browserUtils");
let {PageMap, Pages} = require("./pages");

// AdblockCash.setupErrorReporting(window, document);

// Some types cannot be distinguished
RegExpFilter.typeMap.OBJECT_SUBREQUEST = RegExpFilter.typeMap.OBJECT;
RegExpFilter.typeMap.MEDIA = RegExpFilter.typeMap.FONT = RegExpFilter.typeMap.OTHER;

// Chrome on Linux does not fully support chrome.notifications until version 35
// https://code.google.com/p/chromium/issues/detail?id=291485
var canUseChromeNotifications = require("./info").platform == "chromium"
  && "notifications" in chrome
  && (navigator.platform.indexOf("Linux") == -1 || parseInt(require("./info").applicationVersion, 10) > 34);

var seenDataCorruption = false;
var filterlistsReinitialized = false;
require("./filterNotifier").FilterNotifier.addListener(function(action)
{
  if (action == "load")
  {
    var addonVersion = require("./info").addon.version;
    var prevVersion = ExtensionStorage.currentVersion;

    // There are no filters stored so we need to reinitialize all filterlists
    if (!FilterStorage.firstRun && FilterStorage.subscriptions.length === 0)
    {
      filterlistsReinitialized = true;
      prevVersion = null;
    }

    if (prevVersion != addonVersion || FilterStorage.firstRun)
    {
      seenDataCorruption = prevVersion && FilterStorage.firstRun;
      ExtensionStorage.currentVersion = addonVersion;
      addSubscription(prevVersion);
    }

    if (canUseChromeNotifications)
      initChromeNotifications();
    initAntiAdblockNotification();
  }

  // update browser actions when whitelisting might have changed,
  // due to loading filters or saving filter changes
  if (action == "load" || action == "save")
    refreshIconAndContextMenuForAllPages();
});

var AdblockExtensionsDetector = {
  _notificationId: "adblock_extension_detected",

  init: function() {
    var updateStatus = CommonUtils.debounce(this.checkStatus.bind(this), 1000 * 5);

    // Check for status 15s after starting up the chrome/abc extension
    window.setTimeout(updateStatus, 1000 * 15);

    // Check for status periodically once per hour
    window.setInterval(updateStatus, 1000 * 60 * 60);

    chrome.management.onEnabled.addListener(updateStatus);
    chrome.management.onDisabled.addListener(updateStatus);

    chrome.notifications.onClicked.addListener(function(notificationId){
      if (notificationId == this._notificationId) {
        Pages.open("chrome://extensions");
      }
    }.bind(this));
  },

  _getNotification: function() {
    var notification = {
      type: "basic",
      // title: Utils.getString("notification_antiadblock_title"),
      // message: Utils.getString("notification_antiadblock_message"),
      title: "CC collection disabled",
      message: "To collect CC on whitelisted websites, please make sure that Adblock Cash is the only enabled adblocking extension in your browser.",
      priority: 2,
      iconUrl: Utils.getURL("shared/images/logo-icon-whitebg.png")
    };

    return notification;
  },

  sendNotification: function() {
    var notification = this._getNotification();

    chrome.notifications.clear(this._notificationId, function(){
      return chrome.notifications.create(this._notificationId, notification, function(notificationId) {
        this._notificationId = notificationId;
      }.bind(this));
    }.bind(this));
  },

  checkStatus: function(){
    return AdblockCash.detectOtherAdblockExtensions().then(function(extensionDetected){
      if (extensionDetected) {
        this.sendNotification();
      }
    }.bind(this));
  }
};
AdblockExtensionsDetector.init();

// Special-case domains for which we cannot use style-based hiding rules.
// See http://crbug.com/68705.
var noStyleRulesHosts = ["mail.google.com", "mail.yahoo.com", "www.google.com"];

var htmlPages = new PageMap();

function removeDeprecatedOptions()
{
  var deprecatedOptions = ["specialCaseYouTube", "experimental", "disableInlineTextAds"];
  deprecatedOptions.forEach(function(option)
  {
    if (option in ExtensionStorage)
      delete ExtensionStorage[option];
  });
}

// Remove deprecated options before we do anything else.
removeDeprecatedOptions();

var activeNotification = null;

var contextMenuItem = {
  title: Utils.i18n.getMessage("block_element"),
  contexts: ["image", "video", "audio"],
  onclick: function(srcUrl, page)
  {
    if (srcUrl)
      page.sendMessage({type: "clickhide-new-filter", filter: srcUrl});
  }
};

function getIconFilename(page) {
  if (require("./info").platform == "safari") {
    // There is no grayscale version of the icon for whitelisted pages
    // when using Safari, because icons are grayscale already and icons
    // aren't per page in Safari.
    return "shared/images/logo-icon-gray.svg";
  }

  switch(AdblockCashUtils.getAdblockStatus(page)) {
    case "whitelisted":
      return "shared/images/logo-icon-green.svg";
    case "nonwhitelisted":
      return "shared/images/logo-icon-yellow.svg";
    case "nonadblocked":
      return "shared/images/logo-icon-gray.svg";
    case "adblocked":
    default:
      return "shared/images/logo-icon-red.svg";
  }
}

// Adds or removes browser action icon according to options.
function refreshIconAndContextMenu(page)
{
  var whitelisted = isWhitelisted(page.url);
  var iconFilename = getIconFilename(page);

  page.browserAction.setIcon(iconFilename);
  iconAnimation.registerPage(page, iconFilename);

  // show or hide the context menu entry dependent on whether
  // adblocking is active on that page
  page.contextMenus.removeAll();

  if (Prefs.shouldShowBlockElementMenu && !whitelisted && htmlPages.has(page))
    page.contextMenus.create(contextMenuItem);
}

function refreshIconAndContextMenuForAllPages()
{
  Pages.query({}, function(pages)
  {
    pages.forEach(refreshIconAndContextMenu);
  });
}

/**
 * This function is called on an extension update. It will add the default
 * filter subscription if necessary.
 */
function addSubscription(prevVersion)
{
  // Make sure to remove "Recommended filters", no longer necessary
  var toRemove = "https://easylist-downloads.adblockplus.org/chrome_supplement.txt";
  if (toRemove in FilterStorage.knownSubscriptions)
    FilterStorage.removeSubscription(FilterStorage.knownSubscriptions[toRemove]);

  // Don't add subscription if the user has a subscription already
  var addSubscription = !FilterStorage.subscriptions.some(function(subscription)
  {
    return subscription instanceof DownloadableSubscription;
  });

  // If this isn't the first run, only add subscription if the user has no custom filters
  if (addSubscription && prevVersion)
  {
    addSubscription = !FilterStorage.subscriptions.some(function(subscription)
    {
      return subscription.filters.length;
    });
  }

  // Add "anti-adblock messages" subscription for new users and users updating from old ABP versions
  if (!prevVersion || Services.vc.compare(prevVersion, "1.8") < 0)
  {
    var subscription = Subscription.fromURL(Prefs.subscriptions_antiadblockurl);
    if (subscription && !(subscription.url in FilterStorage.knownSubscriptions))
    {
      subscription.disabled = true;
      FilterStorage.addSubscription(subscription);
      if (subscription instanceof DownloadableSubscription && !subscription.lastDownload)
        Synchronizer.execute(subscription);
    }
  }

  if (!addSubscription)
    return;

  function notifyUser()
  {
    Pages.open(Utils.getURL("shared/firstRun.html"));
  }

  if (addSubscription)
  {
    // Add tracking filter list by default
    var subscription = Subscription.fromURL(Prefs.subscriptions_tracking_url);
    if (subscription) {
      subscription.title = Prefs.subscriptions_tracking_title;
      FilterStorage.addSubscription(subscription);
      if (subscription instanceof DownloadableSubscription && !subscription.lastDownload)
        Synchronizer.execute(subscription);
    }

    // Load subscriptions data,
    // and add a preferred filter subscription for the current locale
    var request = new XMLHttpRequest();
    request.open("GET", Utils.getURL("shared/data/subscriptions.xml"));
    request.addEventListener("load", function()
    {
      var node = Utils.chooseFilterSubscription(request.responseXML.getElementsByTagName("subscription"));
      var subscription = (node ? Subscription.fromURL(node.getAttribute("url")) : null);
      if (subscription)
      {
        FilterStorage.addSubscription(subscription);
        subscription.disabled = false;
        subscription.title = node.getAttribute("title");
        subscription.homepage = node.getAttribute("homepage");
        if (subscription instanceof DownloadableSubscription && !subscription.lastDownload)
          Synchronizer.execute(subscription);

          notifyUser();
      }
    }, false);
    request.send(null);
  }
  else
    notifyUser();
}

Prefs.addListener(function(name)
{
  if (name == "shouldShowBlockElementMenu")
    refreshIconAndContextMenuForAllPages();
});

// TODO: This hack should be removed, however currently
// the firstRun page still calls backgroundPage.openOptions()
openOptions = showOptions;

function prepareNotificationIconAndPopup()
{
  var animateIcon = (activeNotification.type !== "question");
  activeNotification.onClicked = function()
  {
    if (animateIcon)
      iconAnimation.stop();
    notificationClosed();
  };
  if (animateIcon)
    iconAnimation.update(activeNotification.type);
}

function openNotificationLinks()
{
  if (activeNotification.links)
  {
    activeNotification.links.forEach(function(link)
    {
      ext.windows.getLastFocused(function(win)
      {
        win.openTab(Utils.getDocLink(link));
      });
    });
  }
}

function notificationButtonClick(buttonIndex)
{
  if (activeNotification.type === "question")
  {
    Notification.triggerQuestionListeners(activeNotification.id, buttonIndex === 0);
    Notification.markAsShown(activeNotification.id);
    activeNotification.onClicked();
  }
  else if (activeNotification.links && activeNotification.links[buttonIndex])
  {
    ext.windows.getLastFocused(function(win)
    {
      win.openTab(Utils.getDocLink(activeNotification.links[buttonIndex]));
    });
  }
}

function notificationClosed()
{
  activeNotification = null;
}

function imgToBase64(url, callback)
{
  var canvas = document.createElement("canvas"),
  ctx = canvas.getContext("2d"),
  img = new Image;
  img.src = url;
  img.onload = function()
  {
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);
    callback(canvas.toDataURL("image/png"));
    canvas = null;
  };
}

function initChromeNotifications()
{
  // Chrome hides notifications in notification center when clicked so we need to clear them
  function clearActiveNotification(notificationId)
  {
    if (activeNotification && activeNotification.type != "question" && !("links" in activeNotification))
      return;

    chrome.notifications.clear(notificationId, function(wasCleared)
    {
      if (wasCleared)
        notificationClosed();
    });
  }

  chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex)
  {
    notificationButtonClick(buttonIndex);
    clearActiveNotification(notificationId);
  });
  chrome.notifications.onClicked.addListener(clearActiveNotification);
  chrome.notifications.onClosed.addListener(notificationClosed);
}

function showNotification(notification)
{
  if (activeNotification && activeNotification.id === notification.id)
    return;

  activeNotification = notification;
  if (activeNotification.type === "critical" || activeNotification.type === "question")
  {
    var hasWebkitNotifications = typeof webkitNotifications !== "undefined";
    if (hasWebkitNotifications && "createHTMLNotification" in webkitNotifications)
    {
      var notification = webkitNotifications.createHTMLNotification("notification.html");
      notification.show();
      prepareNotificationIconAndPopup();
      return;
    }

    var texts = Notification.getLocalizedTexts(notification);
    var title = texts.title || "";
    var message = texts.message ? texts.message.replace(/<\/?(a|strong)>/g, "") : "";
    var iconUrl = Utils.getURL("icons/abc-128.png");
    var hasLinks = activeNotification.links && activeNotification.links.length > 0;

    if (canUseChromeNotifications)
    {
      var opts = {
        type: "basic",
        title: title,
        message: message,
        buttons: [],
        priority: 2 // We use the highest priority to prevent the notification from closing automatically
      };
      if (activeNotification.type === "question")
      {
        opts.buttons.push({title: Utils.i18n.getMessage("overlay_notification_button_yes")});
        opts.buttons.push({title: Utils.i18n.getMessage("overlay_notification_button_no")});
      }
      else
      {
        var regex = /<a>(.*?)<\/a>/g;
        var plainMessage = texts.message || "";
        var match;
        while (match = regex.exec(plainMessage))
          opts.buttons.push({title: match[1]});
      }

      imgToBase64(iconUrl, function(iconData)
      {
        opts["iconUrl"] = iconData;
        chrome.notifications.create("", opts, function() {});
      });
    }
    else if (hasWebkitNotifications && "createNotification" in webkitNotifications && activeNotification.type !== "question")
    {
      if (hasLinks)
        message += " " + Utils.i18n.getMessage("notification_without_buttons");

      imgToBase64(iconUrl, function(iconData)
      {
        var notification = webkitNotifications.createNotification(iconData, title, message);
        notification.show();
        notification.addEventListener("click", openNotificationLinks, false);
        notification.addEventListener("close", notificationClosed, false);
      });
    }
    else
    {
      var message = title + "\n" + message;
      if (hasLinks)
        message += "\n\n" + Utils.i18n.getMessage("notification_with_buttons");

      var approved = confirm(message);
      if (activeNotification.type === "question")
        notificationButtonClick(approved ? 0 : 1);
      else if (approved)
        openNotificationLinks();
    }
  }
  prepareNotificationIconAndPopup();
}

Utils.onMessage.addListener(function (msg, sender, sendResponse)
{
  switch (msg.type)
  {
    case "get-selectors":
      var selectors = [];

      if (!isFrameWhitelisted(sender.page, sender.frame, "DOCUMENT") &&
          !isFrameWhitelisted(sender.page, sender.frame, "ELEMHIDE"))
      {
        var noStyleRules = false;
        var host = extractHostFromFrame(sender.frame);
        for (var i = 0; i < noStyleRulesHosts.length; i++)
        {
          var noStyleHost = noStyleRulesHosts[i];
          if (host == noStyleHost || (host.length > noStyleHost.length &&
                                      host.substr(host.length - noStyleHost.length - 1) == "." + noStyleHost))
          {
            noStyleRules = true;
          }
        }
        selectors = ElemHide.getSelectorsForDomain(host, false);
        if (noStyleRules)
        {
          selectors = selectors.filter(function(s)
          {
            return !/\[style[\^\$]?=/.test(s);
          });
        }
      }

      sendResponse(selectors);
      break;
    case "should-collapse":
      if (isFrameWhitelisted(sender.page, sender.frame, "DOCUMENT"))
      {
        sendResponse(false);
        break;
      }

      var requestHost = UriUtils.extractHostFromURL(msg.url);
      var documentHost = UriUtils.extractHostFromFrame(sender.frame);
      var thirdParty = UriUtils.isThirdParty(requestHost, documentHost);
      var filter = defaultMatcher.matchesAny(msg.url, msg.mediatype, documentHost, thirdParty);
      if (filter instanceof BlockingFilter)
      {
        var collapse = filter.collapse;
        if (collapse == null)
          collapse = Prefs.hidePlaceholders;
        sendResponse(collapse);
      }
      else
        sendResponse(false);
      break;
    case "get-domain-enabled-state":
      // Returns whether this domain is in the exclusion list.
      // The browser action popup asks us this.
      if(sender.page)
      {
        sendResponse({enabled: !isWhitelisted(sender.page.url)});
        return;
      }
      break;
    case "add-filters":
      if (msg.filters && msg.filters.length)
      {
        for (var i = 0; i < msg.filters.length; i++)
          FilterStorage.addFilter(Filter.fromText(msg.filters[i]));
      }
      break;
    case "add-subscription":
      showOptions(function(page)
      {
        page.sendMessage(msg);
      });
      break;
    case "add-sitekey":
      processKey(msg.token, sender.page, sender.frame);
      break;
    case "report-html-page":
      htmlPages.set(sender.page, null);
      refreshIconAndContextMenu(sender.page);
      break;
    case "forward":
      if (sender.page)
      {
        sender.page.sendMessage(msg.payload, sendResponse);
        // Return true to indicate that we want to call
        // sendResponse asynchronously
        return true;
      }
      break;
    default:
      sendResponse({});
      break;
  }
});

// update icon when page changes location
Pages.onLoading.addListener(function(page)
{
  page.sendMessage({type: "clickhide-deactivate"});
  refreshIconAndContextMenu(page);
});

setTimeout(function()
{
  var notificationToShow = Notification.getNextToShow();
  if (notificationToShow)
    showNotification(notificationToShow);
}, 3 * 60 * 1000);
