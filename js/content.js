// Onboarding
let onboardingStatus
let onboardingElements = { image: [], video: [] }
let flashingBorders = []
let onboardingHasRun = { video: false, image: false }
let downloadButtons = { video: [], image: [], gif: [] }
let settings
let onInit = []
let init = false
let lightMode = false
const toastManager = new ToastManager()
let mediaElements = [] // Prevents duplicate application of download buttons and onboarding elements

const mobileDevice = DetectMobileDevice() // Detect browser based on user agent for compatibility and layout
let inputMethod

const minUptime = 1000 // Max. ms amount of time since install of extension for cleanup to be executed

browser.runtime.onMessage.addListener((message) => {

      // Response to init request
      if (message.type == "init") {
            if (init) return

            init = true

            onboardingStatus = message.onboardingStatus
            settings = message.settings
            lightMode = message.lightMode
            inputMethod = message.inputMethod

            if (message.uptime < minUptime) InstallCleanup()


            onInit.forEach(element => {
                  element()
            });


            // Handle theme changes
            new MutationObserver((mutationList) => {
                  for (const mutation of mutationList) {
                        if (mutation.type === "attributes") {
                              if (mutation.attributeName == "class" &&
                                    document.documentElement.classList.length > 0) {
                                    HandleThemeChanges()
                              }
                        }
                  }
            }).observe(document.documentElement, { attributes: true });


            // Initialize theme
            if (lightMode)
                  document.documentElement.classList.add("light-mode")
            else
                  document.documentElement.classList.add("dark-mode")

            function HandleThemeChanges() {
                  // Get bsky theme from html element class
                  let lightModeNew = document.documentElement.classList.contains("theme--light")
                  // If different to saved value, update
                  if (lightMode != lightModeNew) {
                        lightMode = lightModeNew;
                        browser.runtime.sendMessage({ type: "set-light-mode", value: lightMode })

                        if (lightMode) {
                              document.documentElement.classList.remove("dark-mode")
                              document.documentElement.classList.add("light-mode")
                        }
                        else {
                              document.documentElement.classList.remove("light-mode")
                              document.documentElement.classList.add("dark-mode")
                        }
                  }

                  if (!document.documentElement.classList.contains("dark-mode") &&
                        !document.documentElement.classList.contains("light-mode")) {
                        if (lighMode)
                              document.documentElement.classList.add("light-mode")
                        else
                              document.documentElement.classList.add("dark-mode")
                  }
            }
      }

      // Settings updates
      else if (message.type == "settings-update") {
            // Workaround
            // Extension popup window can only be adressed with runtime.sendMessage but background script can't access this
            if (message.repeat)
                  browser.runtime.sendMessage({ type: "setting-update", settings: settings })

            settings = message.settings

            console.log(settings)


            let img = GetSetting("imgDownload").value
            let vid = GetSetting("vidDownload").value
            let gif = GetSetting("gifDownload").value

            downloadButtons.image.forEach(downloadButton => downloadButton.SetVisibility(img))
            downloadButtons.video.forEach(downloadButton => downloadButton.SetVisibility(vid))
            downloadButtons.gif.forEach(downloadButton => downloadButton.SetVisibility(gif))
      }

      // Updates for the status of unboarding
      else if (message.type == "onboarding-update") {
            onboardingStatus = message.onboardingStatus
            if (onboardingStatus.image) {
                  onboardingElements.image.forEach(borderElement => borderElement.Destroy())
            }
            if (onboardingStatus.video) {
                  onboardingElements.video.forEach(borderElement => borderElement.Destroy())
            }
      }
})
browser.runtime.sendMessage({ type: "init" })


// Handle change of input method
document.documentElement.addEventListener("mousemove", () => {
      if (inputMethod != "mouse") {
            HandleInputChange("mouse")
      }
})

document.documentElement.addEventListener("touchstart", () => {
      if (inputMethod != "touch") {
            HandleInputChange("touch")
      }
})

// Switch input method for all relevant elements
function HandleInputChange(method) {
      inputMethod = method
      browser.runtime.sendMessage({ type: "set-input-method", value: inputMethod })

      downloadButtons.video.forEach(downloadButton => downloadButton.SetInputSupport(inputMethod))
      downloadButtons.image.forEach(downloadButton => downloadButton.SetInputSupport(inputMethod))
      downloadButtons.gif.forEach(downloadButton => downloadButton.SetInputSupport(inputMethod))

      toastManager.SetInputMethod(inputMethod)

      onboardingElements.image.forEach(borderElement => borderElement.Destroy())
      onboardingElements.video.forEach(borderElement => borderElement.Destroy())

      onboardingHasRun.image = false
      onboardingHasRun.video = false


      // Manually re-add onboarding elements
      // Images
      try {
            if (!onboardingStatus.image && !onboardingHasRun.image && downloadButtons.image.length > 0) {
                  flashingBorders.push(new FlashingBorders(downloadButtons.image[0].element, downloadButtons.image[0], Downloadbutton.Image, inputMethod))

                  onboardingHasRun.image = true
            }
      }
      catch (error) {
            console.error(error)
      }

      // Videos
      try {
            if (!onboardingStatus.video && !onboardingHasRun.video && downloadButtons.video.length > 0) {
                  flashingBorders.push(new FlashingBorders(downloadButtons.video[0].videoElement, downloadButtons.video[0], Downloadbutton.Video, inputMethod))

                  onboardingHasRun.video = true
            }
      }
      catch (error) {
            console.error(error)
      }
}


// Add download buttons to images in feed
new NodeObserver(
      // rudimentary test
      element =>
            element.tagName == "IMG" || element.tagName == "VIDEO",

      element => {
            if (element.downloadButton == true) return

            // Image elements
            if (element.tagName == "IMG" &&
                  element.draggable == true &&
                  element.hasAttribute("alt") &&
                  element.hasAttribute("src") &&
                  /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src))
            // Create download button
            {
                  try {
                        const func = () => {
                              if (mediaElements.includes(element)) return
                              mediaElements.push(element)

                              const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src, toastManager, !GetSetting("imgDownload").value, inputMethod)
                              downloadButtons.image.push(downloadButton)

                              // Show flashing borders tutorial
                              if (!onboardingStatus.image && !onboardingHasRun.image) {
                                    flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Image, inputMethod))
                                    onboardingHasRun.image = true
                              }
                        }

                        if (init)
                              func()
                        else
                              onInit.push(func)
                  }
                  catch (error) { console.error(error) }
            }

            // Video element posts
            else if (element.tagName == "VIDEO" && element.hasAttribute("playsinline")) {

                  // Video posts
                  if (element.preload == "none" &&
                        element.hasAttribute("poster")) {
                        let downloadElement;
                        // Create download button
                        new Promise(resolve => {
                              // Wait for element next to downloadButton to load
                              let observer = new NodeObserver(
                                    element2 => element2.tagName == "DIV" &&
                                          element2.dir == "auto" &&
                                          !element2.parentElement.hasAttribute("aria-label"),
                                    // Create download button
                                    element2 => {
                                          downloadElement = element2
                                          resolve()
                                    },
                                    true,
                                    element.parentElement.parentElement
                              )

                              // Check if element next to downloadButton is already loaded
                              const element2 = element.parentElement.parentElement.querySelector("div[dir='auto']")
                              if (element2) {

                                    // Stop node observer from triggering
                                    observer.Stop()
                                    downloadElement = element2
                                    resolve()
                              }
                        }).then(() => {
                              try {
                                    const func = () => {
                                          if (mediaElements.includes(element)) return
                                          mediaElements.push(element)

                                          const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster, toastManager, !GetSetting("vidDownload").value, inputMethod, element)
                                          downloadButtons.video.push(downloadButton)

                                          // Show flashing borders tutorial
                                          if (!onboardingStatus.video && !onboardingHasRun.video) {
                                                flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Video, inputMethod))
                                                onboardingHasRun.video = true
                                          }
                                    }

                                    if (init)
                                          func()
                                    else
                                          onInit.push(func)

                              }
                              catch (error) { console.error(error) }
                        })
                  }

                  // GIF posts (webm)
                  else if (element.getAttribute("playsinline") === "" &&
                        element.getAttribute("loop") === "" &&
                        element.downloadButton !== true) {
                        try {
                              // Create download button
                              const func = () => {
                                    if (mediaElements.includes(element)) return
                                    mediaElements.push(element)

                                    const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, element.src, toastManager, !GetSetting("gifDownload").value, inputMethod)
                                    downloadButtons.gif.push(downloadButton)
                              }

                              if (init)
                                    func()
                              else
                                    onInit.push(func)
                        }
                        catch (error) {
                              console.error(error)
                        }
                  }
            }
      }
)


// Add stylesheet
const stylesheet = document.createElement("link")
stylesheet.href = browser.runtime.getURL("../css/style.css")
stylesheet.rel = "stylesheet"
document.head.appendChild(stylesheet)


/** 
 * Clean up old and non-functional download buttons
 * 
 * Manually add download buttons again
 * 
 * The document should already be completely loaded when this fires
 */
function InstallCleanup() {
      // Clean up
      Array.from(document.querySelectorAll("#download-button-div")).forEach(element => element.remove())
      Array.from(document.querySelectorAll("#flashing-border")).forEach(element => element.remove())

      // Manually re-add download buttons without the document needing to refresh
      // Images
      Array.from(document.querySelectorAll("img[src][alt]"))
            .filter(element => /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src) && !element.hasAttribute("draggable"))
            .forEach(element => {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src, toastManager, !GetSetting("imgDownload").value, inputMethod)
                        downloadButtons.image.push(downloadButton)

                        if (!onboardingStatus.image && !onboardingHasRun.image) {
                              flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Image, inputMethod))

                              onboardingHasRun.image = true
                        }
                  }
                  catch (error) {
                        console.error(error)
                  }
            })

      // Videos
      Array.from(document.querySelectorAll("video[poster][playsinline][preload='none']"))
            .forEach(videoElement => {
                  const downloadElements = Array.from(videoElement.parentElement.parentElement.querySelectorAll('div:not([aria-label])>div[dir=auto]'))
                        .filter(element => !element.parentElement.hasAttribute("aria-label"))
                  downloadElements.forEach(downloadElement => {
                        if (downloadElement) {
                              try {
                                    const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, videoElement.poster, toastManager, !GetSetting("vidDownload").value, inputMethod, videoElement)
                                    downloadButtons.video.push(downloadButton)

                                    // Onboarding procedure
                                    if (!onboardingStatus.video && !onboardingHasRun.video) {
                                          flashingBorders.push(new FlashingBorders(videoElement, downloadButton, Downloadbutton.Video, inputMethod))

                                          onboardingHasRun.video = true
                                    }
                              }
                              catch (error) {
                                    console.error(error)
                              }
                        }
                  })
            })

      // GIFs
      Array.from(document.querySelectorAll("video[playsinline][loop]"))
            .forEach(element => {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, element.src, toastManager, !GetSetting("gifDownload").value, inputMethod)
                        downloadButtons.gif.push(downloadButton)
                  }
                  catch (error) {
                        console.error(error)
                  }
            })
}



class FlashingBorders {
      flashingBorders = []
      #stop = false;

      constructor(element, downloadButton, type, inputMethod) {
            // Touch input
            if (inputMethod == "touch") {
                  // Images
                  if (type == Downloadbutton.Image) {
                        // Create individual border segments
                        for (let i = 0; i < 3; i++) {
                              let highStrokeWidth = 4 - i * 1.5
                              let highSize = -8.5 * i - highStrokeWidth * 2

                              const border = new FlashingBorder(
                                    downloadButton.downloadButton,
                                    new FlashingBorder.BorderState(0, 0, 0),
                                    new FlashingBorder.BorderState(-4 * 2, -4 * 2, 4),
                                    new FlashingBorder.BorderState(highSize, highSize, highStrokeWidth),
                                    800
                              )
                              border.borderElement.style.borderRadius = "1000px"
                              border.Start()

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Destroy borders after 2.4s
                        setTimeout(() => {
                              this.flashingBorders.forEach(border => border.Destroy())
                              if (this.#stop) return

                              onboardingStatus.image = true
                              browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                        }, 2400)
                  }

                  // Videos
                  else {
                        for (let i = 0; i < 3; i++) {
                              // Create individual border segments
                              const border = new FlashingBorder(
                                    element.parentElement,
                                    new FlashingBorder.BorderState(0, 0, 0),
                                    new FlashingBorder.BorderState(i, i, 5),
                                    new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                                    800
                              )
                              border.Start()

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Add listener for when user interacts with video player
                        let hasRun = false
                        element.parentElement.parentElement.addEventListener("click", () => {
                              // Destroy old borders
                              if (!hasRun) this.flashingBorders.forEach(border => border.Destroy())

                              // If onboaring has occurred for this type
                              // or this eventlistener has run
                              // or flashing borders have been stopped
                              if (
                                    onboardingStatus.video ||
                                    hasRun ||
                                    this.#stop
                              ) return

                              hasRun = true

                              this.flashingBorders = []
                              for (let i = 0; i < 3; i++) {
                                    let highStrokeWidth = 4 - i * 1.5
                                    let highSize = -8.5 * i - highStrokeWidth * 2

                                    const border = new FlashingBorder(
                                          downloadButton.downloadButton,
                                          new FlashingBorder.BorderState(0, 0, 0),
                                          new FlashingBorder.BorderState(-4 * 2, -4 * 2, 4),
                                          new FlashingBorder.BorderState(highSize, highSize, highStrokeWidth),
                                          800
                                    )
                                    border.borderElement.style.borderRadius = "1000px"
                                    border.Start()

                                    this.flashingBorders.push(border)
                                    if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                                    else onboardingElements.image.push(border)
                              }

                              setTimeout(() => {
                                    this.flashingBorders.forEach(border => border.Destroy())
                                    if (this.#stop) return;

                                    onboardingStatus.video = true
                                    browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                              }, 2400)
                        })
                  }
            }

            // Mouse input
            else {
                  // Create individual border segments
                  for (let i = 0; i < 3; i++) {
                        const border = new FlashingBorder(
                              element.parentElement,
                              new FlashingBorder.BorderState(0, 0, 0),
                              new FlashingBorder.BorderState(i, i, 5),
                              new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                              800
                        )
                        border.Start()
                        this.flashingBorders.push(border)

                        if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                        else onboardingElements.image.push(border)
                  }

                  let hasRun = false
                  // Add hover event listener
                  element.parentElement.parentElement.addEventListener("mouseover", () => {
                        // Destroy old borders
                        if (!hasRun) this.flashingBorders.forEach(border => border.Destroy())

                        // If onboaring has occurred for this type
                        // or this eventlistener has run
                        // or flashing borders have been stopped
                        if (
                              ((type == Downloadbutton.Image && onboardingStatus.image) ||
                                    (type == Downloadbutton.Video && onboardingStatus.video)) ||
                              this.#stop ||
                              hasRun
                        ) return
                        hasRun = true

                        // Reset list
                        this.flashingBorders = []
                        // Create new border segments
                        for (let i = 0; i < 3; i++) {
                              let highStrokeWidth = 4 - i * 1.5
                              let highSize = -8.5 * i - highStrokeWidth * 2

                              const border = new FlashingBorder(
                                    downloadButton.downloadButton,
                                    new FlashingBorder.BorderState(0, 0, 0),
                                    new FlashingBorder.BorderState(-4 * 2, -4 * 2, 4),
                                    new FlashingBorder.BorderState(highSize, highSize, highStrokeWidth),
                                    800
                              )
                              border.borderElement.style.borderRadius = "1000px"
                              border.Start()

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Destroy borders after 2.4s
                        setTimeout(() => {
                              this.flashingBorders.forEach(border => border.Destroy())
                              if (this.#stop) return

                              if (type == Downloadbutton.Video) onboardingStatus.video = true
                              else onboardingStatus.image = true

                              browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                        }, 2400)
                  })
            }
      }

      Destroy() {
            this.#stop = true
            this.flashingBorders.forEach(flashingBorder => flashingBorder.Destroy())
      }
}

// Returns setting object with specified setting ID
function GetSetting(settingId) {
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        return setting
                  }
            }
      }
}