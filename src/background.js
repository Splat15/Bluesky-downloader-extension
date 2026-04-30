import { Downloader } from "../src/downloader.js"

let installTime = 0
const startTime = Date.now()

let tabIDs = []
let lightMode = localStorage.getItem("lightMode") == "true"

let currentVer = browser.runtime.getManifest().version
let majorVerInfo = { version: "2.2.0", text: "Bluesky downloader has been updated", link: { text: "See changes", link: "https://github.com/Splat15/Bluesky-downloader-extension/releases/tag/v2.2.0" } }
let showVerInfo = localStorage.getItem("lastMajorVer") != majorVerInfo.version
localStorage.setItem("lastMajorVer", majorVerInfo.version)

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
            { value: true, id: "vidDownload", type: "toggle", name: "Video downloads" },
            { value: true, id: "imgDownload", type: "toggle", name: "Image downloads" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF downloads" }
      ],
      [
            { value: true, id: "gifsAsWEBM", type: "toggle", name: "Download GIFs as .webm" },
            { value: true, id: "imagesAsWEBP", type: "toggle", name: "Download images as .webp" },
            { value: false, id: "imgQualityMode", type: "toggle", name: "Change image quality" }
      ],
      [
            { value: 20, id: "imgQuality", type: "slider", name: "Image quality" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups" }
      ]
]

console.log(log("Fetching saved settings"))
let settings = localStorage.getItem("settings")
if (!settings) {
      // Standard configuration
      settings = standardSettings
      console.log(log("New user, standard settings applied"))
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
                        let newSetting = newSettings[category][setting]
                        // Fetch setting from stored settings
                        const oldSetting = GetSetting(newSetting.id)

                        // If setting is found, replace new value with old
                        if (oldSetting) {
                              newSetting.value = oldSetting.value
                        }
                  }
            }
            settings = newSettings

            console.log(log("Settings successuflly migrated"))
      }
      catch (e) {
            console.log(log("Error migrating settings: " + e))
            console.log(settings)
      }
}

localStorage.setItem("settings", JSON.stringify(settings))
console.log(log("Modified settings saved"))


browser.runtime.onInstalled.addListener((details) => {
      if (details.reason == "install") {
            console.log(log("New install detected, initiating onboarding"))

            onboardingStatus = { image: false, video: false }
            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            showVerInfo = false
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
                        console.log(log(`Download progress for ${message.id} at ${progress}%`))

                        // Send progress messages to sender
                        let response = {
                              type: "bsky-download-progress",
                              id: message.id,
                              url: message.downloadInfo.url,
                              progress: progress,
                              fileBlob: fileBlob
                        }

                        console.warn(message.id)
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
            SetSetting(message.settingId, message.value)
      }

      // Light mode status set requests
      else if (message.type == "set-light-mode") {
            lightMode = message.value
            console.log(log("Light mode change detected, new value: " + lightMode))
            localStorage.setItem("lightMode", lightMode)
      }

      // Light mode status get requests
      else if (message.type == "get-light-mode") {
            console.log(log("Light mode request received"))
            browser.tabs.sendMessage(sender.tab.id, { value: lightMode, type: "light-mode" })
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

      // Update popup display status
      else if (message.type == "version-info-displayed") {
            console.log(log("Version info displayed, relaying message"))
            showVerInfo = false
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
                  lightMode: lightMode,
                  inputMethod: inputMethod,
                  version: currentVer,
                  versionInfo: showVerInfo ? majorVerInfo : null
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
function SetSetting(settingId, value) {
      if (GetSetting(settingId).value == value)
            return

      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        localStorage.setItem("settings", JSON.stringify(settings))

                        console.log(log("Settings changed, relaying"))
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

const downloader = new Downloader();