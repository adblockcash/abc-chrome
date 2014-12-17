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
      Utils.checkElement(document.getElementById("js-toggle-whitemode"), isWhitelisted(page.url));
    }
  });

  // Attach event listeners
  document.getElementById("js-toggle-whitemode").addEventListener("change", toggleEnabled, false);
  document.getElementById("js-open-options").addEventListener("click", function()
  {
    ext.showOptions();
  }, false);
}
window.addEventListener("DOMContentLoaded", init, false);

function getAdblockStatus() {
  var toggleWhitemodeCheckbox = document.getElementById("js-toggle-whitemode");
  var isWhitelistMode = toggleWhitemodeCheckbox.checked;
  var isWhitelistModeAvailable = page.url.indexOf("facebook.com") !== -1;

  switch(true) {
    case (isWhitelistMode && isWhitelistModeAvailable):
      return "whitelisted";
    case (!isWhitelistMode && isWhitelistModeAvailable):
      return "nonwhitelisted";
    case (isWhitelistMode && !isWhitelistModeAvailable):
      return "adblocked";
    case (!isWhitelistMode && !isWhitelistModeAvailable):
      return "nonadblocked";
  }
}

function toggleEnabled()
{
  $(".js-whitelisted, .js-nonwhitelisted, .js-adblocked, .js-nonadblocked").hide();

  var adblockStatus = getAdblockStatus();
  if (adblockStatus === "whitelisted" || adblockStatus === "nonadblocked")
  {
    var host = extractHostFromURL(page.url).replace(/^www\./, "");
    var filter = Filter.fromText("@@||" + host + "^$document");
    if (filter.subscriptions.length && filter.disabled)
      filter.disabled = false;
    else
    {
      filter.disabled = false;
      FilterStorage.addFilter(filter);
    }

    $(".js-" + adblockStatus).show();
  }
  else
  {
    // Remove any exception rules applying to this URL
    var filter = isWhitelisted(page.url);
    while (filter)
    {
      FilterStorage.removeFilter(filter);
      if (filter.subscriptions.length)
        filter.disabled = true;
      filter = isWhitelisted(page.url);
    }

    $(".js-" + adblockStatus).show();
  }
}



function initializeSwitchery() {
  var switchElements = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
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

function refreshDOM() {
  initializeSwitchery();
}
document.addEventListener("DOMContentLoaded", refreshDOM, false);
