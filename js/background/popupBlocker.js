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

var UriUtils = require("./utilsUri");
let {Page, getFrame} = require("./pages");

if (require("./info").platform == "chromium")
{
  var tabsLoading = {};

  chrome.webNavigation.onCreatedNavigationTarget.addListener(function(details)
  {
    var sourcePage = new Page({id: details.sourceTabId});
    var sourceFrame = getFrame(details.sourceTabId, details.sourceFrameId);

    if (!sourceFrame || isFrameWhitelisted(sourcePage, sourceFrame))
      return;

    var openerUrl = sourceFrame.url;
    if (!openerUrl)
    {
      // We don't know the opener tab
      return;
    }
    tabsLoading[details.tabId] = openerUrl;

    checkPotentialPopup(details.tabId, details.url, openerUrl);
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab)
  {
    if (!(tabId in tabsLoading))
    {
      // Not a pop-up we've previously seen
      return;
    }

    if ("url" in changeInfo)
      checkPotentialPopup(tabId, tab.url, tabsLoading[tabId]);

    if ("status" in changeInfo && changeInfo.status == "complete" && tab.url != "about:blank")
      delete tabsLoading[tabId];
  });
}

function checkPotentialPopup(tabId, url, opener)
{
  var requestHost = UriUtils.extractHostFromURL(url);
  var documentHost = UriUtils.extractHostFromURL(opener);
  var thirdParty = UriUtils.isThirdParty(requestHost, documentHost);
  var filter = defaultMatcher.matchesAny(url || "about:blank", "POPUP", documentHost, thirdParty);
  if (filter instanceof BlockingFilter)
    chrome.tabs.remove(tabId);
}
