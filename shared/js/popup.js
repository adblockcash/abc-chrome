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

var {Filter} = require("./filterClasses");
var {FilterStorage} = require("./filterStorage");
var {Prefs} = require("./prefs");
var {isWhitelisted} = require("./whitelisting");
var {AdblockCash} = require("./adblockCash");
var {AdblockCashUtils} = require("./adblockCashUtils");
var {Pages} = require("./pages");
var {showOptions} = require("./browserUtils");
var {CommonUtils} = require("./commonUtils");
var UriUtils = require("./utilsUri");
var {Utils, onShutdown} = require("./utils");
var {UI} = require("./ui");

AdblockCash.setupErrorReporting(window, document);

var currentPage = null;

function init()
{
  // Attach event listeners
  document.getElementById("js-toggle-whitemode").addEventListener("change", toggleEnabled, false);
  document.getElementById("js-open-options").addEventListener("click", function() {
    showOptions();
    UI.popupPanel.hide();
  }, false);

  refresh();

  UI.addUpdateWindowStateCallback(refresh);
  window.addEventListener("unload", function() UI.removeUpdateWindowStateCallback(refresh), false);
  onShutdown.add(function() UI.removeUpdateWindowStateCallback(refresh), false);
}
window.addEventListener("DOMContentLoaded", init, false);

function refresh() {
  Pages.getCurrentPage(function(page)
  {
    currentPage = page;

    // Mark page as 'local' or 'nohtml' to hide non-relevant elements
    if (!currentPage || !/^https?:\/\//.test(currentPage.url))
      document.body.classList.add("local");
    // else if (!Utils.backgroundPage.htmlPages.has(currentPage))
    //   document.body.classList.add("nohtml");

    if (currentPage) {
      CommonUtils.setCheckboxValue(document.getElementById("js-toggle-whitemode"), isWhitelisted(currentPage.url));
    }

    rerender();
  });
}

function toggleEnabled()
{
  var toggleWhitemodeCheckbox = document.getElementById("js-toggle-whitemode");
  var domain = UriUtils.extractHostFromURL(currentPage.url).replace(/^www\./, "");

  if (toggleWhitemodeCheckbox.checked) {
    var filter = Filter.fromText("@@||" + domain + "^$document");
    if (filter.subscriptions.length && filter.disabled) {
      filter.disabled = false;
    } else {
      filter.disabled = false;
      FilterStorage.addFilter(filter);
    }

    AdblockCash.blockCashableDomain(domain);
  } else {
    // Remove any exception rules applying to this URL
    var filter = isWhitelisted(currentPage.url);
    while (filter) {
      FilterStorage.removeFilter(filter);
      if (filter.subscriptions.length) {
        filter.disabled = true;
      }
      filter = isWhitelisted(currentPage.url);
    }

    AdblockCash.unblockCashableDomain(domain);
  }

  rerender();
}

function rerender() {
  // Hide all and turn on only one of those divs, depending on adblockStatus
  var adblockStatus = AdblockCashUtils.getAdblockStatus(currentPage);
  $(".js-whitelisted, .js-nonwhitelisted, .js-adblocked, .js-nonadblocked").hide().removeClass("js-hide");
  $(".js-" + adblockStatus).show();

  // Disable / Fill in "x CC earned"
  var cashableWebsite = currentPage && AdblockCash.isDomainCashable(currentPage.domain);
  if (cashableWebsite && adblockStatus === "whitelisted") {
    $("#js-website-cc-stats").show();
    $("#js-website-cc-stats").html("<strong>" + (+cashableWebsite.cashcoins_per_visit) + "</strong> CC earned");
  } else {
    $("#js-website-cc-stats").hide();
  }

  if (cashableWebsite) {
    $(".js-website-cashcoins_per_visit").text(+cashableWebsite.cashcoins_per_visit);
  }

  $(".js-show-when-otheradblockdetected").each(function(){
    $(this).toggle(AdblockCash.isOtherAdblockEnabled);
  });
  $(".js-hide-when-otheradblockdetected").each(function(){
    if ($(this).is(":visible") && AdblockCash.isOtherAdblockEnabled) {
      $(this).hide();
    }
  });
}
