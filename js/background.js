// On install create popup on content script 
let installTime = 0
chrome.runtime.onInstalled.addListener((details) => {
      console.log("installed")
      installTime = Date.now();
});

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type == "bsky-download" && message.url.length > 0) {
            // Start download
            downloader.download(message.url, message.fileName, (progress, error) => {
                  // Send progress messages to sender
                  let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress }
                  if (error !== null) response.error = error.toString()

                  browser.tabs.sendMessage(sender.tab.id, response)
            })
      }

      // Listener for installTime request
      if (message.type == "install-time") {
            browser.tabs.sendMessage(sender.tab.id, { type: "install-time-response", installTime: installTime })
      }
});

let downloader = new VideoDownloader();
