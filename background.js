chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({enabled: true}, function() {console.log("Enabled")});
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
          conditions: [new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostContains: 'youtube.com'},
          })
          ],
              actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
})