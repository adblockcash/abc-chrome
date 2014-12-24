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

/**
 * @fileOverview Provides usage stats
 */

let {Prefs} = require("prefs");
let {BlockingFilter} = require("filterClasses");
let {FilterNotifier} = require("filterNotifier");

let badgeColor = "#646464";
let statsPerPage = new ext.PageMap();

/**
 * Get statistics for specified page
 * @param  {String} key   field key
 * @param  {Page}   page  field page
 * @return {Number}       field value
 */
let getStats = exports.getStats = function getStats(key, page)
{
  if (!page)
    return Prefs.stats_total[key] || 0;

  let pageStats = statsPerPage.get(page);
  return pageStats ? (pageStats[key] || 0) : 0;
};

FilterNotifier.addListener(function(action, item, newValue, oldValue, page)
{
  if (action != "filter.hitCount" || !page)
    return;

  let isPageWhitelisted = require("whitelisting").isWhitelisted(page.url);
  let status;
  if (item instanceof BlockingFilter && !isPageWhitelisted) {
    status = "blocked";
  } else if ((item instanceof BlockingFilter && isPageWhitelisted) || item instanceof WhitelistFilter) {
    status = "whitelisted";
  }

  if (!status) {
    return;
  }

  // Increment counts
  Prefs.stats_total[status] = Prefs.stats_total[status] || 0;
  Prefs.stats_total[status]++;
  Prefs.stats_total = Prefs.stats_total;

  let pageStats = statsPerPage.get(page);
  if (!pageStats)
  {
    pageStats = {};
    statsPerPage.set(page, pageStats);
  }
  pageStats[status] = pageStats[status] || 0;
  pageStats[status]++;

  Prefs.stats_by_domain[page.domain] = Prefs.stats_by_domain[page.domain] || {};
  Prefs.stats_by_domain[page.domain][status] = Prefs.stats_by_domain[page.domain][status] || 0;
  Prefs.stats_by_domain[page.domain][status]++;
  Prefs.stats_by_domain = Prefs.stats_by_domain;

  // Update number in icon
  if (Prefs.show_statsinicon && status == "blocked")
  {
    page.browserAction.setBadge({
      color: badgeColor,
      number: pageStats.blocked
    });
  }
});

Prefs.addListener(function(name)
{
  if (name != "show_statsinicon")
    return;

  ext.pages.query({}, function(pages)
  {
    for (var i = 0; i < pages.length; i++)
    {
      let page = pages[i];
      let badge = null;

      if (Prefs.show_statsinicon)
      {
        let pageStats = statsPerPage.get(page);
        if (pageStats && "blocked" in pageStats)
        {
          badge = {
            color: badgeColor,
            number: pageStats.blocked
          };
        }
      }

      page.browserAction.setBadge(badge);
    }
  });
});
