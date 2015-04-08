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

let {FilterNotifier} = require("./filterNotifier");
let {platform} = require("./info");
let UriUtils = require("./utilsUri");
let {Page, getFrame, webRequest} = require("./pages");

let onFilterChangeTimeout = null;
function onFilterChange()
{
  onFilterChangeTimeout = null;
  webRequest.handlerBehaviorChanged();
}

let importantNotifications = {
  'filter.added': true,
  'filter.removed': true,
  'filter.disabled': true,
  'subscription.added': true,
  'subscription.removed': true,
  'subscription.disabled': true,
  'subscription.updated': true,
  'load': true
};

FilterNotifier.addListener(function(action)
{
  if (action in importantNotifications)
  {
    // Execute delayed to prevent multiple executions in a quick succession
    if (onFilterChangeTimeout != null)
      window.clearTimeout(onFilterChangeTimeout);
    onFilterChangeTimeout = window.setTimeout(onFilterChange, 2000);
  }
});

function onBeforeRequest(url, type, page, frame)
{
  let docDomain = UriUtils.extractHostFromFrame(frame);
  let key = getKey(page, frame);
  let filter = defaultMatcher.matchesAny(
    url,
    type == "sub_frame" ? "SUBDOCUMENT" : type.toUpperCase(),
    docDomain,
    UriUtils.isThirdParty(UriUtils.extractHostFromURL(url), docDomain),
    key
  );

  FilterNotifier.triggerListeners("filter.hitCount", filter, 0, 0, page);

  if (isFrameWhitelisted(page, frame))
    return true;

  // We can't listen to onHeadersReceived in Safari so we need to
  // check for notifications here
  if (platform != "chromium" && type == "sub_frame")
  {
    let notificationToShow = Notification.getNextToShow(url);
    if (notificationToShow)
      showNotification(notificationToShow);
  }

  return !(filter instanceof BlockingFilter);
}

webRequest.onBeforeRequest.addListener(onBeforeRequest);

if (platform == "chromium")
{
  function onHeadersReceived(details)
  {
    if (details.tabId == -1)
      return;

    if (details.type != "main_frame" && details.type != "sub_frame")
      return;

    let page = new Page({id: details.tabId});
    let frame = getFrame(details.tabId, details.frameId);

    if (!frame || frame.url != details.url)
      return;

    for (let i = 0; i < details.responseHeaders.length; i++)
    {
      let header = details.responseHeaders[i];
      if (header.name.toLowerCase() == "x-adblock-key" && header.value)
        processKey(header.value, page, frame);
    }

    let notificationToShow = Notification.getNextToShow(details.url);
    if (notificationToShow)
      showNotification(notificationToShow);
  }

  chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, {urls: ["http://*/*", "https://*/*"]}, ["responseHeaders"]);
}
