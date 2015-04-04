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

"use strict";

var AdblockCash = require("adblockcash").AdblockCash;

AdblockCash.setupErrorReporting(window, document);

(function()
{
  function onDOMLoaded() {
    document.querySelector(".js-login-with-facebook").addEventListener("click", function(){
      AdblockCash.loginWithProvider(window, "facebook").then(goToOptions);
    });

    document.querySelector(".js-login-with-google").addEventListener("click", function(){
      AdblockCash.loginWithProvider(window, "google").then(goToOptions);
    });
  }

  function goToOptions() {
    window.location.href = window.location.href.replace("firstRun.html", "options.html");
  }

  document.addEventListener("DOMContentLoaded", onDOMLoaded, false);
})();
