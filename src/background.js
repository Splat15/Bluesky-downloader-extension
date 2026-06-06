import { Downloader } from "../src/downloader.js"

let installTime = 0
const startTime = Date.now()

let tabIDs = []
let theme = localStorage.getItem("theme") || "theme--dim"
localStorage.setItem("theme", theme)

let downloadedURLs = localStorage.getItem("downloadedURLs")
if (!downloadedURLs) {
      downloadedURLs = { migrated: false, urls: [] }
}
else
      downloadedURLs = JSON.parse(downloadedURLs)

if (!downloadedURLs.urls) downloadedURLs.urls = []

localStorage.setItem("downloadedURLs", JSON.stringify(downloadedURLs))


let unfinishedDownloads = JSON.parse(localStorage.getItem("unfinished-downloads") || "[]")
const downloader = new Downloader(unfinishedDownloads);


// Set info for last major version. Will only be displayed if the extension has been updated from a version BELOW this one.
const majorVersionInfo = { version: "2.2.0", text: "Bluesky downloader has been updated", link: { text: "See changes", link: "https://github.com/Splat15/Bluesky-downloader-extension/releases/tag/v2.2.0" } }
// Get current version, including patches
const currentVersion = browser.runtime.getManifest().version
// Get version from when the bg script last ran
const lastVersion = localStorage.getItem("lastVersion")
// Dertermine whether the extension has been updated, including patches
const updated = isVersionNewer(lastVersion, currentVersion)
// Determine if the previous version of the extension was lower than the current major version. 
// This means that a major version update must have been installed.
let showVersionInfo = updated && !isVersionNewer(currentVersion, majorVersionInfo.version)

if (updated) {
      console.log(log(`Version updated from v${lastVersion} to v${currentVersion}`))
      if (showVersionInfo)
            console.log(log(`New version info for v${majorVersionInfo.version} availible`))
}

localStorage.setItem("lastVersion", currentVersion)


let inputMethod = localStorage.getItem("inputMethod")

let onboardingStatus = localStorage.getItem("onboarding-status")
if (!onboardingStatus) onboardingStatus = { image: true, video: true }
else onboardingStatus = JSON.parse(onboardingStatus)

const standardSettings = [
      // Sections
      [
            { value: "%filename%", id: "downloadPath", type: "pathInput", name: "Download path" }
      ],
      [
            // Settings
            { value: true, id: "vidDownload", type: "toggle", name: "Video downloads", tooltip: "Enable download buttons on videos." },
            { value: true, id: "imgDownload", type: "toggle", name: "Image downloads", tooltip: "Enable download buttons on images." },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF downloads", tooltip: "Enable download buttons on GIFs." }
      ],
      [
            { value: true, id: "gifsAsGIF", type: "toggle", name: "Download GIFs as .gif", tooltip: "Download GIFs as .gif files instead of as .mp4.<br/><b>May cause performance issues.</b>" },
            { value: true, id: "imagesAsWEBP", type: "toggle", name: "Download images as .webp", tooltip: "Download images as .webp instead of .jpg for potentially increased quality and smaller files." },
            { value: false, id: "imgQualityMode", type: "toggle", name: "Adjust image quality", tooltip: "Enable the adjustment of image quality.<br/>Can produce better images.<br/><b>May cause performance issues.</b>" }
      ],
      [
            { value: 20, id: "imgQuality", type: "slider", name: "Image quality" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups", tooltip: "Show progress notifications for downloads on the bluesky website.</br >This won't send you any push notifications or ads." },
            { value: true, id: "restartDowwnloads", type: "toggle", name: "Track unfinished downloads", tooltip: "Offer to restart interrupted downloads when you close your browser during a download." }
      ]
]

console.info(log("Fetching saved settings"))
let settings = localStorage.getItem("settings")
if (!settings) {
      // Standard configuration
      settings = structuredClone(standardSettings)
      console.info(log("New user, standard settings applied"))
}
else {
      try {
            // Parse saved settings
            settings = JSON.parse(settings)

            // Create temporary clone for migration
            let newSettings = structuredClone(standardSettings)

            // Loop through categories
            for (let category = 0; category < newSettings.length; category++) {
                  // Loop through individual settings
                  for (let setting = 0; setting < newSettings[category].length; setting++) {
                        try {
                              let newSetting = newSettings[category][setting]
                              let oldSetting

                              // Patch for old setting
                              // Setting needs to be migrated to new ID and inverted
                              if (newSetting.id == "gifsAsGIF" && GetSetting("gifsAsWEBM", settings)) {
                                    oldSetting = GetSetting("gifsAsWEBM", settings)
                                    oldSetting.value = !oldSetting.value
                              }
                              else
                                    oldSetting = GetSetting(newSetting.id, settings)

                              // If setting is found, replace new value with old
                              if (oldSetting) {
                                    newSetting.value = oldSetting.value
                              }
                        }
                        catch (e) {
                              console.error(log("Error importing setting"))
                              console.error(e)
                        }
                  }
            }
            settings = newSettings

            console.info(log("Settings successuflly migrated"))
      }
      catch (e) {
            console.info(log("Error migrating settings: " + e))
            console.info(settings)
      }
}

localStorage.setItem("settings", JSON.stringify(settings))
console.info(log("Modified settings saved"))


browser.runtime.onInstalled.addListener((details) => {
      if (details.reason == "install") {
            console.info(log("New install detected, initiating onboarding"))

            onboardingStatus = { image: false, video: false }
            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            showVersionInfo = false
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "version-info-displayed" })
                  }
                  catch { }
            }
      }
});

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      if (sender.tab && !tabIDs.includes(sender.tab.id)) tabIDs.push(sender.tab.id)

      // Downloads
      if (message.type == "bsky-download") {
            console.log(log("Download request received"))

            // Empty URL provided
            if (!message.downloadInfo.url || message.downloadInfo.url.length == 0) {
                  console.error(log("Empty download URL"))

                  let response = {
                        type: "bsky-download-progress",
                        id: message.id,
                        url: message.downloadInfo.url,
                        error: "Error: URL empty"
                  }
                  browser.tabs.sendMessage(sender.tab.id, response)
                  return
            }

            // Start download
            downloader.download(message.downloadInfo,
                  (progress, error, fileBlob = null) => {
                        // Counteracts a bug in ffmpeg.wasm reporting a progress of 304067243420184.2%
                        if (progress > 101)
                              return

                        console.info(log(`Download progress for ${message.downloadInfo.id} at ${progress}%`))

                        // Send progress messages to sender
                        let response = {
                              type: "bsky-download-progress",
                              id: message.downloadInfo.id,
                              url: message.downloadInfo.url,
                              progress: progress,
                              fileBlob: fileBlob
                        }

                        if (error !== null) response.error = error.toString()

                        browser.tabs.sendMessage(sender.tab.id, response)
                  })
      }

      // Settings get requests
      else if (message.type == "get-settings") {
            console.log(log("Settings get request received"))
            browser.tabs.sendMessage(sender.tab.id, { settings: settings })
      }

      // Setting set requests
      else if (message.type == "set-setting") {
            console.log(log("Settings set request received"))
            SetSetting(message.settingId, message.value, settings)
      }

      // Setting set requests
      else if (message.type == "reset-settings") {
            console.log(log("Resetting to standard settings"))

            downloadedURLs = { migrated: true, urls: [] }
            localStorage.setItem("downloadedURLs", JSON.stringify(downloadedURLs))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "downloaded-urls-update", value: downloadedURLs })
                  }
                  catch { }
            })

            settings = structuredClone(standardSettings)
            localStorage.setItem("settings", JSON.stringify(settings))

            console.info(log("Settings changed, relaying"))
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        // Extension popup window can only be addressed with runtime.sendMessage but background script can't access this
                        // Content script is tasked with repeating the message for the popup window
                        browser.tabs.sendMessage(tabID, { type: "settings-update", settings: settings, repeat: i == 0 })
                  }
                  catch { }
            }
      }

      // Theme set requests
      else if (message.type == "set-theme") {
            theme = message.value
            console.log(log("Theme change detected, new value: " + theme))
            localStorage.setItem("theme", theme)
      }

      // Theme get requests
      else if (message.type == "get-theme") {
            console.log(log("Theme request received"))
            browser.tabs.sendMessage(sender.tab.id, { value: theme, type: "theme" })
      }

      // Input method set requests
      else if (message.type == "set-input-method") {
            if (message.value == inputMethod) return
            console.log(log("Input method change detected"))
            inputMethod = message.value
            localStorage.setItem("inputMethod", inputMethod)
      }

      // settings update relay messages from content script to popup script
      else if (message.type == "settings-update") {
            return
      }

      // Clear the queue of unfinished downloads
      else if (message.type == "clear-unfinished-downloads") {
            console.log(log("Clearing unfinished download queue"))

            downloader.unfinishedDownloads = []
            localStorage.setItem("unfinished-downloads", JSON.stringify(downloader.unfinishedDownloads))

            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "clear-unfinished-downloads-popups" })
                  }
                  catch { }
            }
      }

      // Update popup display status
      else if (message.type == "version-info-displayed") {
            console.log(log("Version info displayed, relaying message"))
            showVersionInfo = false
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "version-info-displayed" })
                  }
                  catch { }
            }
      }

      // Install time request
      else if (message.type == "init") {
            console.log(log("Init request received"))
            const uptime = Date.now() - startTime

            browser.tabs.sendMessage(sender.tab.id, {
                  type: "init",
                  uptime: uptime,
                  onboardingStatus: onboardingStatus,
                  settings: settings,
                  theme: theme,
                  inputMethod: inputMethod,
                  downloadedURLs: downloadedURLs,
                  version: currentVersion,
                  versionInfo: showVersionInfo ? majorVersionInfo : null,
                  unfinishedDownloads: downloader.unfinishedDownloads
            })
      }

      // Set downloaded URLs specifically for migrating from website localstorage
      else if (message.type == "set-downloaded-urls") {
            if (!message.value == null) return
            downloadedURLs.urls = message.value
            downloadedURLs.migrated = true

            localStorage.setItem("downloadedURLs", JSON.stringify(downloadedURLs))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "downloaded-urls-update", value: downloadedURLs })
                  }
                  catch { }
            })
      }

      // Set downloaded URLs specifically for migrating from website localstorage
      else if (message.type == "get-downloaded-urls") {
            browser.tabs.sendMessage(sender.tab.id, { type: "downloaded-urls-update", value: downloadedURLs })
      }

      // Add an URL to the list of downloaded URLs
      else if (message.type == "add-downloaded-url") {
            if (downloadedURLs.urls == null)
                  downloadedURLs.urls = []

            downloadedURLs.urls.push(message.value)

            localStorage.setItem("downloadedURLs", JSON.stringify(downloadedURLs))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "downloaded-urls-update", value: downloadedURLs })
                  }
                  catch { }
            })
      }

      // Onboarding status updates
      else if (message.type == "onboarding-update") {
            console.log(log("Onboarding status update received"))
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
            console.error(log("Invalid message type: " + message.type))
            let response = { error: `Invalid message.type "${message.type}"` }
            browser.tabs.sendMessage(sender.tab.id, response)
      }
});

// Custom implementation to support directly saving to storage and informing tabs
function SetSetting(settingId, value, settings) {
      if (GetSetting(settingId, settings).value == value)
            return

      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        localStorage.setItem("settings", JSON.stringify(settings))

                        console.info(log("Settings changed, relaying"))
                        for (let i = 0; i < tabIDs.length; i++) {
                              const tabID = tabIDs[i]
                              try {
                                    // Extension popup window can only be addressed with runtime.sendMessage but background script can't access this
                                    // Content script is tasked with repeating the message for the popup window
                                    browser.tabs.sendMessage(tabID, { type: "settings-update", settings: settings, repeat: i == 0 })
                              }
                              catch { }
                        }
                        return
                  }
            }
      }
}