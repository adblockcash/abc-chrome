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

let {Filter} = require("./filterClasses");
let {FilterStorage} = require("./filterStorage");
let {Prefs} = require("./prefs");
let {isWhitelisted} = require("./whitelisting");
let {AdblockCash} = require("./adblockCash");
let {AdblockCashUtils} = require("./adblockCashUtils");
let {Pages} = require("./pages");
let {showOptions} = require("./browserUtils");
let {CommonUtils} = require("./commonUtils");
let UriUtils = require("./utilsUri");

AdblockCash.setupErrorReporting(window, document);

var page = null;

function init()
{
  Pages.query({active: true, lastFocusedWindow: true}, function(pages)
  {
    page = pages[0];

    // Mark page as 'local' or 'nohtml' to hide non-relevant elements
    if (!page || !/^https?:\/\//.test(page.url))
      document.body.classList.add("local");
    else if (!backgroundPage.htmlPages.has(page))
      document.body.classList.add("nohtml");

    if (page) {
      CommonUtils.setCheckboxValue(document.getElementById("js-toggle-whitemode"), isWhitelisted(page.url));
    }

    rerender();
  });

  // Attach event listeners
  document.getElementById("js-toggle-whitemode").addEventListener("change", toggleEnabled, false);
  document.getElementById("js-open-options").addEventListener("click", function() {
    showOptions();
  }, false);
}
window.addEventListener("DOMContentLoaded", init, false);

function toggleEnabled()
{
  var toggleWhitemodeCheckbox = document.getElementById("js-toggle-whitemode");
  var domain = UriUtils.extractHostFromURL(page.url).replace(/^www\./, "");

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
    var filter = isWhitelisted(page.url);
    while (filter) {
      FilterStorage.removeFilter(filter);
      if (filter.subscriptions.length) {
        filter.disabled = true;
      }
      filter = isWhitelisted(page.url);
    }

    AdblockCash.unblockCashableDomain(domain);
  }

  rerender();
}

function rerender() {
  // Hide all and turn on only one of those divs, depending on adblockStatus
  var adblockStatus = AdblockCashUtils.getAdblockStatus(page);
  $(".js-whitelisted, .js-nonwhitelisted, .js-adblocked, .js-nonadblocked").hide().removeClass("js-hide");
  $(".js-" + adblockStatus).show();

  // Disable / Fill in "x CC earned"
  var cashableWebsite = page && AdblockCash.isDomainCashable(page.domain);
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
