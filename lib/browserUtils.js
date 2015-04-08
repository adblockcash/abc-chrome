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


/* ExtensionStorage */

exports.ExtensionStorage = localStorage;


/* Options */

exports.showOptions = function(callback)
{
  chrome.windows.getLastFocused(function(win)
  {
    var optionsUrl = chrome.extension.getURL("shared/options.html");
    var queryInfo = {url: optionsUrl};

    // extension pages can't be accessed in incognito windows. In order to
    // correctly mimic the way in which Chrome opens extension options,
    // we have to focus the options page in any other window.
    if (!win.incognito)
      queryInfo.windowId = win.id;

    chrome.tabs.query(queryInfo, function(tabs)
    {
      if (tabs.length > 0)
      {
        var tab = tabs[0];

        chrome.windows.update(tab.windowId, {focused: true});
        chrome.tabs.update(tab.id, {selected: true});

        if (callback)
          callback(new Page(tab));
      }
      else
      {
        Pages.open(optionsUrl, callback);
      }
    });
  });
};
