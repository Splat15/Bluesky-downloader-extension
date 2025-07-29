// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type == "bsky-download" && message.url.length > 0) {
            // Start download
            downloader.download(message.url, message.fileName, (progress, error) => {
                  // Send progress messages to sender
                  if (error !== null)
                        browser.tabs.sendMessage(sender.tab.id, { type: "bsky-download-progress", error: error.toString(), id: message.id, url: message.url, progress: progress })
                  else
                        browser.tabs.sendMessage(sender.tab.id, { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress })
            })
      }
});

let downloader = new VideoDownloader();