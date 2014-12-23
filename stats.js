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

(function()
{
  var backgroundPage = ext.backgroundPage.getWindow();
  var require = backgroundPage.require;
  var getStats = require("stats").getStats;
  var FilterNotifier = require("filterNotifier").FilterNotifier;
  var Prefs = require("prefs").Prefs;

  var currentPage;

  function onLoad()
  {
    // Update stats
    ext.pages.query({active: true, lastFocusedWindow: true}, function(pages)
    {
      currentPage = pages[0];
      updateStats();

      FilterNotifier.addListener(onNotify);

      document.getElementById("js-stats-container").classList.remove("js-hide");
    });
  }

  function onUnload()
  {
    FilterNotifier.removeListener(onNotify);
  }

  function onNotify(action, item)
  {
    if (action == "filter.hitCount")
      updateStats();
  }

  function updateStats()
  {
    var statsPage = document.getElementById("js-stats-page");
    var blockedPage = getStats("blocked", currentPage).toLocaleString();
    i18n.setElementText(statsPage, "stats_label_page", [blockedPage]);
  }

  document.addEventListener("DOMContentLoaded", onLoad, false);
  window.addEventListener("unload", onUnload, false);
})();
