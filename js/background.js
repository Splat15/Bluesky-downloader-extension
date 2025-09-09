let installTime = 0
const startTime = Date.now()

let tabIDs = []

let onboardingStatus = localStorage.getItem("onboarding-status")
if (!onboardingStatus) onboardingStatus = { image: false, video: false }
else onboardingStatus = JSON.parse(onboardingStatus)

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      tabIDs.push(sender.tab.id)

      if (message.type == "bsky-download" && message.url.length > 0) {
            // Start download
            downloader.download(message.url, message.fileName, (progress, error, fileBlob = null) => {
                  // Send progress messages to sender
                  let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress, fileBlob: fileBlob }
                  if (error !== null) response.error = error.toString()

                  browser.tabs.sendMessage(sender.tab.id, response)
            })
      }

      // Listener for installTime request
      if (message.type == "init") {
            const uptime = Date.now() - startTime
            browser.tabs.sendMessage(sender.tab.id, { type: "init", uptime: uptime, onboardingStatus: onboardingStatus })
      }

      // Onboarding status updates
      if (message.type == "onboarding-update") {
            onboardingStatus.video = onboardingStatus.video || message.onboardingStatus.video
            onboardingStatus.image = onboardingStatus.image || message.onboardingStatus.image

            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "onboarding-update", onboardingStatus: onboardingStatus })
                  }
                  catch {}
            })
      }
});

const downloader = new VideoDownloader();
