let installTime = 0
const startTime = Date.now()

let tabIDs = []
let lightMode = localStorage.getItem("lightMode") == "true"

let librewolfWarning = localStorage.getItem("librewolfWarning") == "true"

let inputMethod = localStorage.getItem("inputMethod")

let onboardingStatus = localStorage.getItem("onboarding-status")
if (!onboardingStatus) onboardingStatus = { image: true, video: true }
else onboardingStatus = JSON.parse(onboardingStatus)

const standardSettings = [
      // Sections
      [
            { value: "%filename%", id: "downloadPath", type: "pathInput", name: "Download path", description: "Placeholder" }
      ],
      [
            // Settings
            { value: true, id: "vidDownload", type: "toggle", name: "Video download", description: "Placeholder" },
            { value: true, id: "imgDownload", type: "toggle", name: "Image download", description: "Placeholder" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF download", description: "Placeholder" }
      ],
      [
            { value: true, id: "gifsAsWEBM", type: "toggle", name: "Download GIFs as .webm", description: "Placeholder" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups", description: "Placeholder" }
      ]
]

let settings = localStorage.getItem("settings")
if (!settings) {
      // Standard configuration
      settings = standardSettings
}
else settings = JSON.parse(settings)

for (let i = 0; i < standardSettings.length; i++) {
      for (let j = 0; j < standardSettings[i].length; j++) {
            const setting = standardSettings[i][j]

            if (GetSetting(setting.id) == null) {
                  settings[i].push(setting)
            }
      }
}

localStorage.setItem("settings", JSON.stringify(settings))


browser.runtime.onInstalled.addListener((details) => {
      if (details.reason == "install") {
            onboardingStatus = { image: false, video: false }
            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))
      }
});

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      if (sender.tab && !tabIDs.includes(sender.tab.id)) tabIDs.push(sender.tab.id)

      // Downloads
      if (message.type == "bsky-download") {

            // Empty URL provided
            if (!message.url || message.url.length == 0) {
                  let response = { type: "bsky-download-progress", id: message.id, url: message.url, error: "Error: URL empty" }
                  browser.tabs.sendMessage(sender.tab.id, response)
            }

            // Video downloads
            if (message.fileType == "Video") {
                  // Start download
                  downloader.download(message.url, message.filePath, (progress, error, fileBlob = null) => {

                        // Send progress messages to sender
                        let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress, fileBlob: fileBlob }
                        if (error !== null) response.error = error.toString()

                        browser.tabs.sendMessage(sender.tab.id, response)
                  })
            }

            // Image downloads
            else {
                  try {
                        if (message.fileType == "GIF" && !GetSetting("gifsAsWEBM").value) {
                              downloader.downloadGIF(message.url, message.filePath, ((progress, error, fileBlob = null) => {
                                    if (error)
                                          throw new Error(error)

                                    let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress, fileBlob: fileBlob }
                                    browser.tabs.sendMessage(sender.tab.id, response)
                              }))
                        }
                        else {
                              downloader.downloadImage(message.url, message.filePath, ((progress, error) => {
                                    if (error)
                                          throw new Error(error)

                                    let response = { type: "bsky-download-progress", id: message.id, url: message.url, progress: progress }
                                    browser.tabs.sendMessage(sender.tab.id, response)
                              }))
                        }
                  }

                  catch (error) {
                        let response = { type: "bsky-download-progress", id: message.id, url: message.url, error: error }
                        browser.tabs.sendMessage(sender.tab.id, response)
                  }
            }
      }

      // Settings get requests
      else if (message.type == "get-settings") {
            browser.tabs.sendMessage(sender.tab.id, { settings: settings })
      }

      // Setting set requests
      else if (message.type == "set-setting") {
            SetSetting(message.settingId, message.value)
      }

      // Light mode status set requests
      else if (message.type == "set-light-mode") {
            lightMode = message.value
            localStorage.setItem("lightMode", lightMode)
      }

      // Light mode status get requests
      else if (message.type == "get-light-mode") {
            browser.tabs.sendMessage(sender.tab.id, { value: lightMode, type: "light-mode" })
      }

      // Input method set requests
      else if (message.type == "set-input-method") {
            if (message.value == inputMethod) return
            inputMethod = message.value
            localStorage.setItem("inputMethod", inputMethod)
      }

      // Librewolf warning status get request
      else if (message.type == "get-librewolf-warning") {
            browser.tabs.sendMessage(sender.tab.id, { value: librewolfWarning, type: "librewolf-warning" })
      }

      // Librewolf warning status set request
      else if (message.type == "set-librewolf-warning") {
            librewolfWarning = true
            localStorage.setItem("librewolfWarning", librewolfWarning)
      }

      // Install time request
      else if (message.type == "init") {
            const uptime = Date.now() - startTime
            browser.tabs.sendMessage(sender.tab.id, {
                  type: "init",
                  uptime: uptime,
                  onboardingStatus: onboardingStatus,
                  settings: settings,
                  lightMode: lightMode,
                  inputMethod: inputMethod,
                  version: browser.runtime.getManifest().version
            })
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
      let path = GetSetting("downloadPath").value

      path = path.replaceAll(/%(posttype|type)%/gi, postType)
            .replaceAll(/%(username|user|poster)%/gi, userName)
            .replaceAll(/%(filename|file|id|hash)%/gi, fileName)
      path += fileExt

      return path
}


function SetSetting(settingId, value) {
      if (GetSetting(settingId).value == value)
            return

      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        localStorage.setItem("settings", JSON.stringify(settings))

                        for (let i = 0; i < tabIDs.length; i++) {
                              const tabID = tabIDs[i]
                              try {
                                    // Extension popup window can only be adressed with runtime.sendMessage but background script can't access this
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


function GetSetting(settingId) {
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        return setting
                  }
            }
      }

      return null
}

const downloader = new VideoDownloader();
