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

let {Utils} = require("./utils");

function init()
{
  // Attach event listeners
  window.addEventListener("keydown", onKeyDown, false);
  window.addEventListener("dragstart", onDragStart, false);
  window.addEventListener("drag", onDrag, false);
  window.addEventListener("dragend", onDragEnd, false);

  $("#addButton").click(addFilters);
  $("#cancelButton").click(closeDialog.bind(null, false));

  Utils.backgroundPage.sendMessage(
  {
    type: "forward",
    payload:
    {
      type: "clickhide-init",
      width: Math.max(document.body.offsetWidth || document.body.scrollWidth),
      height: Math.max(document.body.offsetHeight || document.body.scrollHeight)
    }
  },
  function(response)
  {
    document.getElementById("filters").value = response.filters.join("\n");
  });

  document.getElementById("filters").focus();
}
window.addEventListener("load", init, false);

function onKeyDown(event)
{
  if (event.keyCode == 27)
  {
    event.preventDefault();
    closeDialog();
  }
  else if (event.keyCode == 13 && !event.shiftKey && !event.ctrlKey)
  {
    event.preventDefault();
    addFilters();
  }
}

function addFilters()
{
  // Tell the background page to add the filters
  var filters = document.getElementById("filters").value.split(/[\r\n]+/)
                        .map(function(f) {return f.replace(/^\s+/, "").replace(/\s+$/, "");})
                        .filter(function(f) {return f != "";});
  Utils.backgroundPage.sendMessage({type: "add-filters", filters: filters});
  closeDialog(true);
}

function closeDialog(success)
{
  Utils.backgroundPage.sendMessage(
    {
      type: "forward",
      payload:
      {
        type: "clickhide-close",
        remove: (typeof success == "boolean" ? success : false)
      }
    }
  );
}

var dragCoords = null;
function onDragStart(event)
{
  dragCoords = [event.screenX, event.screenY];
}

function onDrag(event)
{
  if (!dragCoords)
    return;

  if (!event.screenX && !event.screenY)
    return;

  var diff = [event.screenX - dragCoords[0], event.screenY - dragCoords[1]];
  if (diff[0] || diff[1])
  {
    Utils.backgroundPage.sendMessage(
      {
        type: "forward",
        payload:
        {
          type: "clickhide-move",
          x: diff[0],
          y: diff[1]
        }
      }
    );
    dragCoords = [event.screenX, event.screenY];
  }
}

function onDragEnd(event)
{
  onDrag(event);
  dragCoords = null;
}
