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
  let {getStats} = require("./stats");
  let {FilterNotifier} = require("./filterNotifier");
  let {Prefs} = require("./prefs");
  let {Pages} = require("./pages");
  let {Utils, onShutdown} = require("./utils");

  let currentPage;

  function onLoad()
  {
    // Update stats
    Pages.query({active: true, lastFocusedWindow: true}, function(pages)
    {
      currentPage = pages[0];
      updateStats();

      FilterNotifier.addListener(onNotify);

      document.getElementById("js-stats-container").classList.remove("js-hide");
    });
  }

  function onUnload()
  {
    if (onShutdown.done) {
      return;
    }

    FilterNotifier.removeListener(onNotify);
  }

  function onNotify(action, item)
  {
    if (action == "filter.hitCount")
      updateStats();
  }

  function updateStats()
  {
    let statsPage = document.getElementById("js-stats-page");
    let blockedPage = getStats("blocked", currentPage).toLocaleString();
    i18n.setElementText(statsPage, "stats_label_page", [blockedPage]);
  }

  document.addEventListener("DOMContentLoaded", onLoad, false);
  window.addEventListener("unload", onUnload, false);
})();
