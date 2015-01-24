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
 var imports = ["require", "extractHostFromURL"];
 for (var i = 0; i < imports.length; i++)
  window[imports[i]] = backgroundPage[imports[i]];

var Filter = require("filterClasses").Filter;
var FilterStorage = require("filterStorage").FilterStorage;
var Prefs = require("prefs").Prefs;
var isWhitelisted = require("whitelisting").isWhitelisted;
var AdblockCash = require("adblockcash").AdblockCash;

var page = null;

function init()
{
  ext.pages.query({active: true, lastFocusedWindow: true}, function(pages)
  {
    page = pages[0];

    // Mark page as 'local' or 'nohtml' to hide non-relevant elements
    if (!page || !/^https?:\/\//.test(page.url))
      document.body.classList.add("local");
    else if (!backgroundPage.htmlPages.has(page))
      document.body.classList.add("nohtml");

    if (page)
    {
      Utils.setCheckboxValue(document.getElementById("js-toggle-whitemode"), isWhitelisted(page.url));
    }
  });

  // Attach event listeners
  document.getElementById("js-toggle-whitemode").addEventListener("change", toggleEnabled, false);
  document.getElementById("js-open-options").addEventListener("click", function()
  {
    ext.showOptions();
  }, false);

  rerender();
}
window.addEventListener("DOMContentLoaded", init, false);

function toggleEnabled()
{
  var toggleWhitemodeCheckbox = document.getElementById("js-toggle-whitemode");
  var domain = extractHostFromURL(page.url).replace(/^www\./, "");

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
  var adblockStatus = Utils.getAdblockStatus(page);
  $(".js-whitelisted, .js-nonwhitelisted, .js-adblocked, .js-nonadblocked").hide();
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
}
