let installTime = 0
const startTime = Date.now()

let tabIDs = []

let onboardingStatus = localStorage.getItem("onboarding-status")
if (!onboardingStatus) onboardingStatus = { image: true, video: true }
else onboardingStatus = JSON.parse(onboardingStatus)

let settings = localStorage.getItem("settings")
//if (!settings) settings = { downloadPathPrefix: "test/%username%/test/%type%/%file%" } // for testing purposes (!)
if (!settings) settings = { downloadPathPrefix: "%file%" }
else settings = JSON.parse(settings)

browser.runtime.onInstalled.addListener((details) => {
      if (details.reason == "install") {
            onboardingStatus = { image: false, video: false }
            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))
      }
});

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      tabIDs.push(sender.tab.id)

      // Downloads
      if (message.type == "bsky-download") {

            // Empty URL provided
            if (!message.url || message.url.length == 0) {
                  let response = { type: "bsky-download-progress", id: message.id, url: message.url, error: "Error: URL empty" }
                  browser.tabs.sendMessage(sender.tab.id, response)
            }

            // Video downloads
            if (message.fileType == "video") {
                  // Start download
                  let fileName = GetFilePath("Videos", message.username, message.fileName, ".mp4")
                  downloader.download(message.url, fileName, (progress, error, fileBlob = null) => {

                        // Send progress messages to sender
                        let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress, fileBlob: fileBlob }
                        if (error !== null) response.error = error.toString()

                        browser.tabs.sendMessage(sender.tab.id, response)
                  })
            }

            // Image downloads
            else {
                  let fileName = GetFilePath((message.fileType == "gif" ? "GIFs" : "Photos"), message.username, message.fileName, (message.fileType == "gif" ? ".webm" : ".jpg"))
                  try {
                        downloader.downloadImage(message.url, fileName, ((progress, error) => {
                              if (error)
                                    throw new Error(error)

                              let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress }
                              browser.tabs.sendMessage(sender.tab.id, response)
                        }))
                  }

                  catch (error) {
                        let response = { type: "bsky-download-progress", id: message.id, url: message.url, error: error }
                        browser.tabs.sendMessage(sender.tab.id, response)
                  }
            }
      }


      // Listener for installTime request
      else if (message.type == "init") {
            const uptime = Date.now() - startTime
            browser.tabs.sendMessage(sender.tab.id, { type: "init", uptime: uptime, onboardingStatus: onboardingStatus })
      }

      // Onboarding status updates
      else if (message.type == "onboarding-update") {
            onboardingStatus.video = onboardingStatus.video || message.onboardingStatus.video
            onboardingStatus.image = onboardingStatus.image || message.onboardingStatus.image

            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "onboarding-update", onboardingStatus: onboardingStatus })
                  }
                  catch { }
            })
      }

      // Invalid message type
      else {
            let response = { error: `Invalid message.type "${message.type}"` }
            browser.tabs.sendMessage(sender.tab.id, response)
      }
});

function GetFilePath(postType, userName, fileName, fileExt) {
      let path = settings.downloadPathPrefix

      path = path.replaceAll(/%(posttype|type)%/gi, postType)
            .replaceAll(/%(username|user|poster)%/gi, userName)
            .replaceAll(/%(filename|file|id|hash)%/gi, fileName)
      path += fileExt

      return path
}

const downloader = new VideoDownloader();
