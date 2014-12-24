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

var backgroundPage = ext.backgroundPage.getWindow();
var require = backgroundPage.require;

with(require("filterClasses"))
{
  this.Filter = Filter;
  this.WhitelistFilter = WhitelistFilter;
}
with(require("subscriptionClasses"))
{
  this.Subscription = Subscription;
  this.SpecialSubscription = SpecialSubscription;
  this.DownloadableSubscription = DownloadableSubscription;
}
var FilterStorage = require("filterStorage").FilterStorage;
var FilterNotifier = require("filterNotifier").FilterNotifier;
var Prefs = require("prefs").Prefs;
var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var AdblockCash = require("adblockcash").AdblockCash;
var isWhitelisted = require("whitelisting").isWhitelisted;
var subscriptionTemplate;
var fakeCheckboxChangeEvent = 0;

// Loads options from localStorage and sets UI elements accordingly
function loadOptions()
{
  // Set page title to i18n version of "Adblock Cash Options"
  document.title = i18n.getMessage("options");

  // Add event listeners
  window.addEventListener("unload", unloadOptions, false);
  $(".js-updateFilterLists").click(updateFilterLists);
  $("#startSubscriptionSelection").click(startSubscriptionSelection);
  $("#js-subscriptionSelector").change(updateSubscriptionSelection);
  $("#js-addSubscription").click(addSubscription);
  $("#js-toggle-whitelisting-websites").parent().click(function(event){
    event.preventDefault();

    WhitelistableWebsitesModule.toggleAll( $("#js-toggle-whitelisting-websites").prop("checked") );
  });
  $("#js-whitelistForm").submit(addWhitelistedDomainFormSubmitHandler);
  $("#js-removeWhitelist").click(removeSelectedExcludedDomain);
  $("#js-customFilterForm").submit(addTypedFilter);
  $("#js-removeCustomFilter").click(removeSelectedFilters);
  $("#js-rawFiltersButton").click(toggleFiltersInRawFormat);
  $("#js-importRawFilters").click(importRawFiltersText);
  FilterNotifier.addListener(onFilterChange);

  subscriptionTemplate = document.getElementById("js-subscriptionTemplate");
  subscriptionTemplate.parentNode.removeChild(subscriptionTemplate);

  // Popuplate option checkboxes
  // initCheckbox("shouldShowBlockElementMenu");
  // initCheckbox("hidePlaceholders");

  ext.onMessage.addListener(onMessage);

  // Load recommended subscriptions
  loadRecommendations();

  // Show user's filters
  reloadFilters();

  initializeFeatureSubscriptionsCheckboxes();

  initializeUserAccountView();

  initializeQuestionCollapses();

  WhitelistableWebsitesModule.init();
  StatisticsModule.init();

  refreshDOM();
}
$(loadOptions);

function onMessage(msg)
{
  switch (msg.type)
  {
    case "add-subscription":
      startSubscriptionSelection(msg.title, msg.url);
      break;
    default:
      console.log("got unexpected message: " + msg.type);
  }
};

// Reloads the displayed subscriptions and filters
function reloadFilters()
{
  // Load user filter URLs
  var container = document.getElementById("js-filterLists");
  while (container.lastChild)
    container.removeChild(container.lastChild);

  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (subscription instanceof SpecialSubscription)
      continue;

    addSubscriptionEntry(subscription);
  }

  // User-entered filters
  var userFilters = backgroundPage.getUserFilters();
  populateList("js-userFiltersBox", userFilters.filters);
  populateList("js-excludedDomainsBox", userFilters.exceptions.filter(function(domain){
    return !AdblockCash.isDomainWhitelistable(domain);
  }));
}

// Cleans up when the options window is closed
function unloadOptions()
{
  FilterNotifier.removeListener(onFilterChange);
}

function initCheckbox(id)
{
  var checkbox = document.getElementById(id);
  Utils.setCheckboxValue(checkbox, Prefs[id]);
  checkbox.addEventListener("click", function()
  {
    Prefs[id] = checkbox.checked;
  }, false);
}

var delayedSubscriptionSelection = null;

function loadRecommendations()
{
  var request = new XMLHttpRequest();
  request.open("GET", "subscriptions.xml");
  request.onload = function()
  {
    var selectedIndex = 0;
    var selectedPrefix = null;
    var matchCount = 0;

    var list = document.getElementById("js-subscriptionSelector");
    var elements = request.responseXML.documentElement.getElementsByTagName("subscription");
    for (var i = 0; i < elements.length; i++)
    {
      var element = elements[i];
      var option = new Option();
      option.text = element.getAttribute("title") + " (" + element.getAttribute("specialization") + ")";
      option._data = {
        title: element.getAttribute("title"),
        url: element.getAttribute("url"),
        homepage: element.getAttribute("homepage")
      };

      var prefix = Utils.checkLocalePrefixMatch(element.getAttribute("prefixes"));
      if (prefix)
      {
        option.style.fontWeight = "bold";
        option.style.backgroundColor = "#E0FFE0";
        option.style.color = "#000000";
        if (!selectedPrefix || selectedPrefix.length < prefix.length)
        {
          selectedIndex = i;
          selectedPrefix = prefix;
          matchCount = 1;
        }
        else if (selectedPrefix && selectedPrefix.length == prefix.length)
        {
          matchCount++;

          // If multiple items have a matching prefix of the same length:
          // Select one of the items randomly, probability should be the same
          // for all items. So we replace the previous match here with
          // probability 1/N (N being the number of matches).
          if (Math.random() * matchCount < 1)
          {
            selectedIndex = i;
            selectedPrefix = prefix;
          }
        }
      }
      list.appendChild(option);
    }

    var option = new Option();
    option.text = i18n.getMessage("filters_addSubscriptionOther_label") + "\u2026";
    option._data = null;
    list.appendChild(option);

    list.selectedIndex = selectedIndex;

    if (delayedSubscriptionSelection)
      startSubscriptionSelection.apply(null, delayedSubscriptionSelection);
  };
  request.send(null);
}

function startSubscriptionSelection(title, url)
{
  var list = document.getElementById("js-subscriptionSelector");
  if (list.length == 0)
  {
    delayedSubscriptionSelection = [title, url];
    return;
  }

  $("#tabs").tabs("select", 0);
  $("#addSubscriptionContainer").show();
  $("#addSubscriptionButton").hide();
  $("#js-subscriptionSelector").focus();
  if (typeof url != "undefined")
  {
    list.selectedIndex = list.length - 1;
    document.getElementById("customSubscriptionTitle").value = title;
    document.getElementById("customSubscriptionLocation").value = url;
  }
  updateSubscriptionSelection();
  document.getElementById("addSubscriptionContainer").scrollIntoView(true);
}

function updateSubscriptionSelection()
{
  var list = document.getElementById("js-subscriptionSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    $("#customSubscriptionContainer").hide();
  else
  {
    $("#customSubscriptionContainer").show();
    $("#customSubscriptionTitle").focus();
  }
}

function addSubscription()
{
  var list = document.getElementById("js-subscriptionSelector");
  var data = list.options[list.selectedIndex]._data;
  if (data)
    doAddSubscription(data.url, data.title, data.homepage);
  else
  {
    var url = document.getElementById("customSubscriptionLocation").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!/^https?:/i.test(url))
    {
      alert(i18n.getMessage("global_subscription_invalid_location"));
      $("#customSubscriptionLocation").focus();
      return;
    }

    var title = document.getElementById("customSubscriptionTitle").value.replace(/^\s+/, "").replace(/\s+$/, "");
    if (!title)
      title = url;

    doAddSubscription(url, title, null);
  }

  $("#addSubscriptionContainer").hide();
  $("#customSubscriptionContainer").hide();
  $("#addSubscriptionButton").show();
}

function doAddSubscription(url, title, homepage)
{
  if (url in FilterStorage.knownSubscriptions)
    return;

  var subscription = Subscription.fromURL(url);
  if (!subscription)
    return;

  subscription.title = title;
  if (homepage)
    subscription.homepage = homepage;
  FilterStorage.addSubscription(subscription);

  if (subscription instanceof DownloadableSubscription && !subscription.lastDownload)
    Synchronizer.execute(subscription);
}

function findSubscriptionElement(subscription)
{
  var children = document.getElementById("js-filterLists").childNodes;
  for (var i = 0; i < children.length; i++)
    if (children[i]._subscription == subscription)
      return children[i];
  return null;
}

function updateSubscriptionInfo(element)
{
  var subscription = element._subscription;

  var title = element.getElementsByClassName("js-subscriptionTitle")[0];
  title.textContent = subscription.title;
  title.setAttribute("title", subscription.url);
  if (subscription.homepage)
    title.href = subscription.homepage;
  else
    title.href = subscription.url;

  var enabled = element.getElementsByClassName("js-subscriptionEnabled")[0];
  Utils.setCheckboxValue(enabled, !subscription.disabled);

  var lastUpdate = element.getElementsByClassName("js-subscriptionUpdate")[0];
  lastUpdate.classList.remove("error");
  if (Synchronizer.isExecuting(subscription.url))
    lastUpdate.textContent = i18n.getMessage("filters_subscription_lastDownload_inProgress");
  else if (subscription.downloadStatus && subscription.downloadStatus != "synchronize_ok")
  {
    var map =
    {
      "synchronize_invalid_url": "filters_subscription_lastDownload_invalidURL",
      "synchronize_connection_error": "filters_subscription_lastDownload_connectionError",
      "synchronize_invalid_data": "filters_subscription_lastDownload_invalidData",
      "synchronize_checksum_mismatch": "filters_subscription_lastDownload_checksumMismatch"
    };
    if (subscription.downloadStatus in map)
      lastUpdate.textContent = i18n.getMessage(map[subscription.downloadStatus]);
    else
      lastUpdate.textContent = subscription.downloadStatus;
    lastUpdate.classList.add("error");
  }
  else if (subscription.lastDownload > 0)
  {
    var timeDate = i18n_timeDateStrings(subscription.lastDownload * 1000);
    var messageID = (timeDate[1] ? "last_updated_at" : "last_updated_at_today");
    lastUpdate.textContent = i18n.getMessage(messageID, timeDate);
  }
}

function onFilterChange(action, item, param1, param2)
{
  switch (action)
  {
    case "load":
      reloadFilters();
      break;
    case "subscription.title":
    case "subscription.disabled":
    case "subscription.homepage":
    case "subscription.lastDownload":
    case "subscription.downloadStatus":
      var element = findSubscriptionElement(item);
      if (element)
        updateSubscriptionInfo(element);
      break;
    case "subscription.added":
      if (item instanceof SpecialSubscription)
      {
        for (var i = 0; i < item.filters.length; i++)
          onFilterChange("filter.added", item.filters[i]);
      }
      else if (!findSubscriptionElement(item))
        addSubscriptionEntry(item);
      break;
    case "subscription.removed":
      if (item instanceof SpecialSubscription)
      {
        for (var i = 0; i < item.filters.length; i++)
          onFilterChange("filter.removed", item.filters[i]);
      }
      else
      {
        var element = findSubscriptionElement(item);
        if (element)
          element.parentNode.removeChild(element);
      }
      break;
    case "filter.added":
      if (item instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(item.text)) {
        var domain = RegExp.$1;
        if (!AdblockCash.isDomainWhitelistable(domain)) {
          appendToListBox("js-excludedDomainsBox", domain);
        }
        WhitelistableWebsitesModule.render();
      } else {
        appendToListBox("js-userFiltersBox", item.text);
      }
      break;
    case "filter.removed":
      if (item instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(item.text)) {
        var domain = RegExp.$1;
        if (!AdblockCash.isDomainWhitelistable(domain)) {
          removeFromListBox("js-excludedDomainsBox", domain);
        }
        WhitelistableWebsitesModule.render();
      } else {
        removeFromListBox("js-userFiltersBox", item.text);
      }
      break;
  }
}

// Populates a list box with a number of entries
function populateList(id, entries)
{
  var list = document.getElementById(id);
  while (list.lastChild)
    list.removeChild(list.lastChild);

  entries.sort();
  for (var i = 0; i < entries.length; i++)
  {
    var option = new Option();
    option.text = entries[i];
    option.value = entries[i];
    list.appendChild(option);
  }
}

// Add a filter string to the list box.
function appendToListBox(boxId, text)
{
  var elt = new Option();  /* Note: document.createElement("option") is unreliable in Opera */
  elt.text = text;
  elt.value = text;
  document.getElementById(boxId).appendChild(elt);
}

// Remove a filter string from a list box.
function removeFromListBox(boxId, text)
{
  var list = document.getElementById(boxId);
  for (var i = 0; i < list.length; i++)
    if (list.options[i].value == text)
      list.remove(i--);
}

function addWhitelistedDomainFormSubmitHandler(event)
{
  event.preventDefault();

  var domain = document.getElementById("newWhitelistDomain").value.replace(/\s/g, "");
  document.getElementById("newWhitelistDomain").value = "";
  if (!domain)
    return;

  addWhitelistedDomain(domain);
}

function addWhitelistedDomain(domain)
{
  var filterText = "@@||" + domain + "^$document";
  return FilterStorage.addFilter(Filter.fromText(filterText));
}

function removeWhitelistedDomain(domain) {
  FilterStorage.removeFilter(Filter.fromText("@@||" + domain + "^$document"));
}

// Adds filter text that user typed to the selection box
function addTypedFilter(event)
{
  event.preventDefault();

  var filterText = Filter.normalize(document.getElementById("newFilter").value);
  document.getElementById("newFilter").value = "";
  if (!filterText)
    return;

  FilterStorage.addFilter(Filter.fromText(filterText));
}

// Removes currently selected whitelisted domains
function removeSelectedExcludedDomain()
{
  var excludedDomainsBox = document.getElementById("js-excludedDomainsBox");
  var remove = [];
  for (var i = 0; i < excludedDomainsBox.length; i++)
    if (excludedDomainsBox.options[i].selected)
      remove.push(excludedDomainsBox.options[i].value);
  if (!remove.length)
    return;

  for (var i = 0; i < remove.length; i++)
    removeWhitelistedDomain(remove[i]);
}

// Removes all currently selected filters
function removeSelectedFilters()
{
  var userFiltersBox = document.getElementById("js-userFiltersBox");
  var remove = [];
  for (var i = 0; i < userFiltersBox.length; i++)
    if (userFiltersBox.options[i].selected)
      remove.push(userFiltersBox.options[i].value);
  if (!remove.length)
    return;

  for (var i = 0; i < remove.length; i++)
    FilterStorage.removeFilter(Filter.fromText(remove[i]));
}

// Shows raw filters box and fills it with the current user filters
function toggleFiltersInRawFormat(event)
{
  event.preventDefault();

  $("#rawFilters").toggle();
  if ($("#rawFilters").is(":visible"))
  {
    var userFiltersBox = document.getElementById("js-userFiltersBox");
    var text = "";
    for (var i = 0; i < userFiltersBox.length; i++)
      text += userFiltersBox.options[i].value + "\n";
    document.getElementById("rawFiltersText").value = text;
  }
}

// Imports filters in the raw text box
function importRawFiltersText()
{
  $("#rawFilters").hide();
  var filters = document.getElementById("rawFiltersText").value.split("\n");
  var seenFilter = {__proto__: null};
  for (var i = 0; i < filters.length; i++)
  {
    var text = Filter.normalize(filters[i]);
    if (!text)
      continue;

    // Don't import filter list header
    if (/^\[/.test(text))
      continue;

    FilterStorage.addFilter(Filter.fromText(text));
    seenFilter[text] = true;
  }

  var remove = [];
  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (!(subscription instanceof SpecialSubscription))
      continue;

    for (var j = 0; j < subscription.filters.length; j++)
    {
      var filter = subscription.filters[j];
      if (filter instanceof WhitelistFilter && /^@@\|\|([^\/:]+)\^\$document$/.test(filter.text))
        continue;

      if (!(filter.text in seenFilter))
        remove.push(filter);
    }
  }
  for (var i = 0; i < remove.length; i++)
    FilterStorage.removeFilter(remove[i]);
}

// Called when user explicitly requests filter list updates
function updateFilterLists()
{
  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (subscription instanceof DownloadableSubscription)
      Synchronizer.execute(subscription, true, true);
  }
}

// Adds a subscription entry to the UI.
function addSubscriptionEntry(subscription)
{
  var element = subscriptionTemplate.cloneNode(true);
  element.removeAttribute("id");
  element._subscription = subscription;

  var removeButton = element.getElementsByClassName("js-subscriptionRemoveButton")[0];
  removeButton.setAttribute("title", removeButton.textContent);
  removeButton.addEventListener("click", function() {
    FilterStorage.removeSubscription(subscription);
  }, false);

  var enabled = element.getElementsByClassName("js-subscriptionEnabled")[0];
  enabled.addEventListener("change", function() {
    if (subscription.disabled == !enabled.checked)
      return;

    subscription.disabled = !enabled.checked;
  }, false);

  updateSubscriptionInfo(element);

  document.getElementById("js-filterLists").appendChild(element);

  refreshDOM();
}

function setLinks(id)
{
  var element = document.getElementById(id);
  if (!element)
    return;

  var links = element.getElementsByTagName("a");
  for (var i = 0; i < links.length; i++)
  {
    if (typeof arguments[i + 1] == "string")
    {
      links[i].href = arguments[i + 1];
      links[i].setAttribute("target", "_blank");
    }
    else if (typeof arguments[i + 1] == "function")
    {
      links[i].href = "javascript:void(0);";
      links[i].addEventListener("click", arguments[i + 1], false);
    }
  }
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

function initializeTooltips() {
  $(".js-tooltip").tooltip();
}

function initializeQuestionCollapses() {
  $(".question-body").addClass("collapse").removeClass("js-hide");

  $(document).on("click", ".single-question .question-title", function(event){
    event.preventDefault();

    console.log($(this).closest(".single-question"));
    $(this).closest(".single-question").find(".question-body").collapse("toggle");
  });
}

function refreshDOM() {
  initializeTooltips();
  initializeSwitchery();
}

function initializeFeatureSubscriptionsCheckboxes() {
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


// Enable all handlers that should be called when the user will log in / log out.
function updateVisitorDependantViews() {
  $(".js-visitor-available").toggle(!!AdblockCash.visitor);
  $(".js-visitor-unavailable").toggle(!AdblockCash.visitor);

  if (AdblockCash.visitor) {
    $(".js-visitorEmail").html(AdblockCash.visitor.email);
    $(".js-visitor-paypal-available").toggle( !!AdblockCash.visitor.paypal_email );
    $(".js-visitor-paypal-unavailable").toggle( !AdblockCash.visitor.paypal_email );
    $(".js-visitor-paypal_email").html(AdblockCash.visitor.paypal_email);
    $(".js-visitor-paypal_email-input").val(AdblockCash.visitor.paypal_email);

    AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
      var checkbox = $(".js-visitor-notification-settings-" + settingName)[0];
      Utils.setCheckboxValue(checkbox, (AdblockCash.visitor.notification_settings && !!AdblockCash.visitor.notification_settings[settingName]));
    });
  }
}

function updateVisitorNotificationSettings() {
  var notification_settings = {};

  AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
    var checkbox = $(".js-visitor-notification-settings-" + settingName)[0];
    notification_settings[settingName] = checkbox.checked;
  });

  console.debug("Calling AdblockCash.updateNotificationSettings with ", notification_settings);

  AdblockCash.updateNotificationSettings(window, notification_settings);
}

function initializeUserAccountView() {
  document.querySelector(".js-visitor-logout").addEventListener("click", function(){
    AdblockCash.logout();
  });

  document.querySelector(".js-login-with-facebook").addEventListener("click", function(){
    AdblockCash.loginWithProvider(window, "facebook").catch(function(error){
      alert("An error occured while logging in with Facebook: " + error);
    });
  });

  document.querySelector(".js-login-with-google").addEventListener("click", function(){
    AdblockCash.loginWithProvider(window, "google").catch(function(error){
      alert("An error occured while logging in with Google: " + error);
    });
  });

  document.querySelector(".js-visitor-disconnect-paypal").addEventListener("click", function(){
    AdblockCash.updateVisitorAccount(window, {
      paypal_email: null
    }).catch(function(error) {
      alert("An error occured while updating account settings: " + error);
    });
  });

  $(".js-visitor-settings-form").submit(function(event){
    event.preventDefault();

    AdblockCash.updateVisitorAccount(window, {
      paypal_email: $(".js-visitor-paypal_email-input").val()
    }).catch(function(error) {
      alert("An error occured while updating account settings: " + error);
    });
  });

  debounced_updateVisitorNotificationSettings = Utils.debounce(updateVisitorNotificationSettings, 1000);

  AdblockCash.VISITOR_NOTIFICATION_TYPES.forEach(function(settingName){
    var checkbox = $(".js-visitor-notification-settings-" + settingName)[0];
    checkbox.addEventListener("change", debounced_updateVisitorNotificationSettings);
  });

  updateVisitorDependantViews();

  AdblockCash.addListener("visitor.updated", updateVisitorDependantViews);
  window.addEventListener("unload", function() {
    AdblockCash.removeListener("visitor.updated", updateVisitorDependantViews);
  }, false);
}


var WhitelistableWebsitesModule = {
  _templates: {},
  elements: {},

  init: function() {
    this._templates = {
      website: $("#js-whitelistable-website-template").remove()[0].outerHTML
    };

    this.elements = {
      $whitelistedWebsitesSection: $("#js-whitelisted-websites-section"),
      $nonWhitelistedWebsitesSection: $("#js-nonwhitelisted-websites-section"),
      $whitelistedWebsitesWrapper: $("#js-whitelisted-websites-wrapper"),
      $nonWhitelistedWebsitesWrapper: $("#js-nonwhitelisted-websites-wrapper")
    };

    var render = this.render.bind(this);
    AdblockCash.addListener("whitelistableWebsites.updated", render);
    window.addEventListener("unload", function() {
      AdblockCash.removeListener("whitelistableWebsites.updated", render);
    }.bind(this), false);

    this.render();
  },

  render: function() {
    this.elements.$whitelistedWebsitesWrapper.html("");
    this.elements.$nonWhitelistedWebsitesWrapper.html("");

    var whitelistedWebsites = this.getWhitelistedWebsites();
    whitelistedWebsites.forEach(function(website){
      var $template = this.renderWebsite(website);
      this.elements.$whitelistedWebsitesWrapper.append($template);
    }.bind(this));
    this.elements.$whitelistedWebsitesSection.toggle( whitelistedWebsites.length > 0 );

    var nonWhitelistedWebsites = this.getNonWhitelistedWebsites();
    nonWhitelistedWebsites.forEach(function(website){
      var $template = this.renderWebsite(website);
      this.elements.$nonWhitelistedWebsitesWrapper.append($template);
    }.bind(this));
    this.elements.$nonWhitelistedWebsitesSection.toggle( nonWhitelistedWebsites.length > 0 );

    fakeCheckboxChangeEvent++;
    Utils.setCheckboxValue( $("#js-toggle-whitelisting-websites")[0], whitelistedWebsites.length > 0 );
    fakeCheckboxChangeEvent--;

    refreshDOM();
  },

  renderWebsite: function(website){
    var $template = $(this._templates.website);
    var whitelisted = this.isWhitelisted(website);

    var $whitelistModeCheckbox = $template.find(".js-toggle-whitemode");

    $template.find(".js-website-image").attr("src", website.icon_url);
    $template.find(".js-website-name").html(website.name);
    $template.find(".js-website-cashcoins_per_visit").html(website.cashcoins_per_visit);
    $template.find(".js-whitelisted").toggle(whitelisted);
    $template.find(".js-nonwhitelisted").toggle(!whitelisted);
    $whitelistModeCheckbox.prop("checked", whitelisted);
    $whitelistModeCheckbox.removeClass("js-hide");
    $whitelistModeCheckbox[0].addEventListener("change", function(){
      if ($whitelistModeCheckbox[0].checked) {
        removeWhitelistedDomain(website.domain);
      } else {
        addWhitelistedDomain(website.domain);
      }
    });

    return $template;
  },

  getWebsites: function() {
    return AdblockCash.whitelistableWebsites;
  },

  getWhitelistedWebsites: function() {
    return this.getWebsites().filter(function(website) {
      return this.isWhitelisted(website);
    }.bind(this));
  },

  getNonWhitelistedWebsites: function() {
    return this.getWebsites().filter(function(website) {
      return !this.isWhitelisted(website);
    }.bind(this));
  },

  isWhitelisted: function(website) {
    return !!isWhitelisted("http://" + website.domain);
  },

  toggleAll: function(toggle){
    console.debug("WhitelistableWebsitesModule.toggleAll(" + toggle + ")")

    if (toggle) {
      this.getNonWhitelistedWebsites().forEach(function(website){
        addWhitelistedDomain(website.domain);
      }.bind(this));
    } else {
      this.getWhitelistedWebsites().forEach(function(website){
        removeWhitelistedDomain(website.domain);
      }.bind(this));
    }
  }
};


var StatisticsModule = {
  init: function(){
    this._templates = {
      topBlockedAdsRow: $("#js-top-blocked-ads-row-template").remove()[0].outerHTML
    };

    this.elements = {
      $topBlockedAdsRowsContainer: $("#js-top-blocked-ads-rows")
    };

    this.render();
  },

  render: function(){
    $("#js-stat-total_blocked_ads").html(Prefs.stats_total.blocked);
    $("#js-stat-total_whitelisted_ads").html(Prefs.stats_total.earned);
    $("#js-stat-total_missed_ads").html(Prefs.stats_total.missed);
    $("#js-stat-earned_cc").html("0 CC");
    $("#js-stat-missed_cc").html("0 CC");

    this.elements.$topBlockedAdsRowsContainer.html("");
    var domains = Object.keys(Prefs.stats_by_domain);
    domains.sort(function(domainA, domainB){
      return (Prefs.stats_by_domain[domainB].blocked || 0) - (Prefs.stats_by_domain[domainA].blocked || 0);
    });
    domains.slice(0, 10).forEach(function(domain){
      var rowTemplate = $(this._templates.topBlockedAdsRow);

      rowTemplate.find(".js-website-name").html(domain);
      rowTemplate.find(".js-website-blocked_ads").html(Prefs.stats_by_domain[domain].blocked);

      this.elements.$topBlockedAdsRowsContainer.append(rowTemplate);
    }.bind(this));
  }
};
