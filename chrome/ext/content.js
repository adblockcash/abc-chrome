var backgroundPage = chrome.extension.getBackgroundPage();
var require = backgroundPage.require;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse)
{
  return Utils.onMessage._dispatch(message, {}, sendResponse);
});
