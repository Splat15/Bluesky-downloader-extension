// Onboarding
let onboardingStatus
let onboardingElements = { image: [], video: [] }
let flashingBorders = []
let onboardingHasRun = { video: false, image: false }
let downloadButtons = { video: [], image: [], gif: [] }
let settings
let version
let onInit = []
let init = false
let lightMode = false
console.log(log("Initializing toast manager"))
const toastManager = new ToastManager()
let mediaElements = [] // Prevents duplicate application of download buttons and onboarding elements
let versionInfoToast
let versionInfo


const mobileDevice = DetectMobileDevice() // Detect browser based on user agent for compatibility and layout
let inputMethod

const minUptime = 1000 // Max. ms amount of time since install of extension for cleanup to be executed


const mainThreadHelperLoaded = new Promise(resolve => {
      console.log(log("Adding main thread code to document"))
      // Cleanup
      Array.from(document.querySelectorAll("#mainThreadHelper"))
            .forEach(script => script.remove())

      // Add main thread document
      const script = document.createElement("script")
      // Incorporate version number to avoid caching issue
      script.src = browser.runtime.getURL("/js/document.js")
      script.id = "mainThreadHelper"

      new MutationObserver((mutationList, observer) => {
            let hasRun = script.getAttribute("has-run")
            if (hasRun) {
                  observer.disconnect()
                  console.log(log("Main thread code has run"))
                  resolve()
            }
      }).observe(script, { attributes: true })

      document.head.appendChild(script)
      console.log(log("Main thread code added"))
})


browser.runtime.onMessage.addListener((message) => {

      // Response to init request
      if (message.type == "init") {
            if (init) return

            init = true
            console.log(log("Init response received"))

            onboardingStatus = message.onboardingStatus
            settings = message.settings
            lightMode = message.lightMode
            inputMethod = message.inputMethod
            version = message.version

            if (!inputMethod) {
                  inputMethod = navigator.maxTouchPoints > 0 ? "touch" : "mouse"
                  browser.runtime.sendMessage({ type: "set-input-method", value: inputMethod })
            }

            console.log(log("Running cleanup for previous versions"))
            if (message.uptime < minUptime) InstallCleanup()

            console.log(log("Running onInit"))
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
                  document.documentElement.classList.add("bsky-downloader-light-mode")
            else
                  document.documentElement.classList.add("bsky-downloader-dark-mode")

            function HandleThemeChanges() {
                  // Get bsky theme from html element class
                  let lightModeNew = document.documentElement.classList.contains("theme--light")
                  // If different to saved value, update
                  if (lightMode != lightModeNew) {
                        console.log(log("Theme change detected"))
                        lightMode = lightModeNew;
                        browser.runtime.sendMessage({ type: "set-light-mode", value: lightMode })

                        if (lightMode) {
                              console.log(log("Applying light theme"))
                              document.documentElement.classList.remove("bsky-downloader-dark-mode")
                              document.documentElement.classList.add("bsky-downloader-light-mode")
                        }
                        else {
                              console.log(log("Applying dark theme"))
                              document.documentElement.classList.remove("bsky-downloader-light-mode")
                              document.documentElement.classList.add("bsky-downloader-dark-mode")
                        }
                  }
            }

            // Show version info in focussed tab for at least 3 seconds.  
            versionInfo = message.versionInfo
            setTimeout(() => {
                  if (versionInfo) {
                        versionInfoToast = toastManager.DisplayToast(
                              versionInfo.text,
                              false,
                              versionInfo.link,
                              () => {
                                    versionInfoToast = null
                                    browser.runtime.sendMessage({ type: "version-info-displayed" })
                              }
                        )
                        let lastFocusLossTime = Date.now()
                        const minFocusTime = 3000
                        const DismissTime = 5000


                        const interval = setInterval(() => {
                              if (document.visibilityState != "visible")
                                    lastFocusLossTime = Date.now()

                              else if ((Date.now() - lastFocusLossTime) > minFocusTime) {
                                    clearInterval(interval)
                                    browser.runtime.sendMessage({ type: "version-info-displayed" })

                                    // Delay dismissal until mouse has hasn't been over the toast for specified time
                                    if (versionInfoToast) {
                                          let timeout = null

                                          // Mouse was NOT on element before
                                          if (!versionInfoToast.mouseOn)
                                                timeout = setTimeout(() => {
                                                      toastManager.DismissToast(versionInfoToast, toastManager.toastList)
                                                }, DismissTime);

                                          // Mouse enters element
                                          versionInfoToast.onMouseEnter = () => {
                                                if (timeout) {
                                                      clearTimeout(timeout)
                                                      timeout = null
                                                }
                                          }

                                          // Mouse leaves element
                                          versionInfoToast.onMouseLeave = () => {
                                                if (!timeout)
                                                      timeout = setTimeout(() => {
                                                            toastManager.DismissToast(versionInfoToast, toastManager.toastList)
                                                      }, DismissTime);
                                          }
                                    }
                              }
                        }, 200)
                  }
            }, 2000)
      }

      else if (message.type == "version-info-displayed") {
            versionInfo = null

            const minFocusTime = 3000
            const DismissTime = 5000

            // Delay dismissal until mouse has hasn't been over the toast for specified time
            if (versionInfoToast) {
                  let timeout = null

                  // Mouse was NOT on element before
                  if (!versionInfoToast.mouseOn)
                        timeout = setTimeout(() => {
                              toastManager.DismissToast(versionInfoToast, toastManager.toastList)
                        }, DismissTime);

                  // Mouse enters element
                  versionInfoToast.onMouseEnter = () => {
                        if (timeout) {
                              clearTimeout(timeout)
                              timeout = null
                        }
                  }

                  // Mouse leaves element
                  versionInfoToast.onMouseLeave = () => {
                        if (!timeout)
                              timeout = setTimeout(() => {
                                    toastManager.DismissToast(versionInfoToast, toastManager.toastList)
                              }, DismissTime);
                  }
            }
      }

      // Settings updates
      else if (message.type == "settings-update") {
            console.log(log("Received settings update"))
            // Workaround
            // Extension popup window can only be adressed with runtime.sendMessage but background script can't access this
            if (message.repeat) {
                  console.log(log("Relaying settings update"))
                  browser.runtime.sendMessage({ type: "settings-update", settings: message.settings })
            }

            settings = message.settings

            console.log(log(JSON.stringify(settings)))


            let img = GetSetting("imgDownload", settings).value
            let vid = GetSetting("vidDownload", settings).value
            let gif = GetSetting("gifDownload", settings).value

            const buttonFunc = (downloadbutton, val, settings) => {
                  downloadbutton.SetVisibility(val)
                  downloadbutton.settings = settings
            }

            downloadButtons.image.forEach(downloadButton => buttonFunc(downloadButton, img, settings))
            downloadButtons.video.forEach(downloadButton => buttonFunc(downloadButton, vid, settings))
            downloadButtons.gif.forEach(downloadButton => buttonFunc(downloadButton, gif, settings))
      }

      // Updates for the status of unboarding
      else if (message.type == "onboarding-update") {
            console.log(log("Received onboarding update"))
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

// Prevents false mouse inputs
let lastTouch = 0

// Handle change of input method
document.documentElement.addEventListener("mousemove", () => {
      // If touch was triggered less than 0.5s ago, ignore input
      // This prevents activation when opening and closing images
      if (Date.now() - lastTouch < 500) return

      if (inputMethod != "mouse") {
            HandleInputChange("mouse")
      }
})

document.documentElement.addEventListener("touchstart", () => {
      lastTouch = Date.now()

      if (inputMethod != "touch") {
            HandleInputChange("touch")
      }
})

// Switch input method for all relevant elements
function HandleInputChange(method) {
      console.log(log("Input change detected: " + method))

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
            if ((onboardingStatus && !onboardingStatus.image && !onboardingHasRun.image && downloadButtons.image.length > 0) && GetSetting("imgDownload", settings).value) {
                  flashingBorders.push(new FlashingBorders(downloadButtons.image[0].element, downloadButtons.image[0], Downloadbutton.Image, inputMethod))

                  onboardingHasRun.image = true
            }
      }
      catch (error) {
            console.error(log(error))
      }

      // Videos
      try {
            if ((onboardingStatus && !onboardingStatus.video && !onboardingHasRun.video && downloadButtons.video.length > 0) && GetSetting("vidDownload", settings).value) {
                  flashingBorders.push(new FlashingBorders(downloadButtons.video[0].videoElement, downloadButtons.video[0], Downloadbutton.Video, inputMethod))

                  onboardingHasRun.video = true
            }
      }
      catch (error) {
            console.error(log(error))
      }
}


// Add download buttons to images in feed
new NodeObserver(
      // Rudimentary test
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

                              const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src, settings, toastManager, !GetSetting("imgDownload", settings).value, inputMethod)
                              downloadButtons.image.push(downloadButton)

                              // Show flashing borders tutorial
                              if ((!onboardingStatus.image && !onboardingHasRun.image) && GetSetting("imgDownload", settings).value) {
                                    flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Image, inputMethod))
                                    onboardingHasRun.image = true
                              }
                        }

                        if (init)
                              func()
                        else
                              onInit.push(func)
                  }
                  catch (error) { console.error(log(error)) }
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

                                          const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster, settings, toastManager, !GetSetting("vidDownload", settings).value, inputMethod, element)
                                          downloadButtons.video.push(downloadButton)

                                          // Show flashing borders tutorial
                                          if ((!onboardingStatus.video && !onboardingHasRun.video) && GetSetting("vidDownload", settings).value) {
                                                flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Video, inputMethod))
                                                onboardingHasRun.video = true
                                          }
                                    }

                                    if (init)
                                          func()
                                    else
                                          onInit.push(func)

                              }
                              catch (error) { console.error(log(error)) }
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

                                    const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, element.src, settings, toastManager, !GetSetting("gifDownload", settings).value, inputMethod)
                                    downloadButtons.gif.push(downloadButton)
                              }

                              if (init)
                                    func()
                              else
                                    onInit.push(func)
                        }
                        catch (error) {
                              console.error(log(error))
                        }
                  }
            }
      }
)

onInit.push(() => {
      // Remove old stylesheets
      Array.from(document.querySelectorAll("#bskyDownloadStylesheet"))
            .forEach(stylesheet => stylesheet.remove())

      // Add stylesheet
      const stylesheet = document.createElement("link")
      // Incorporate version number to avoid caching issue
      stylesheet.href = browser.runtime.getURL("../css/style.css") + "?version=" + version
      stylesheet.id = "bskyDownloadStylesheet"
      stylesheet.rel = "stylesheet"
      document.head.appendChild(stylesheet)
})


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
                        const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src, settings, toastManager, !GetSetting("imgDownload", settings).value, inputMethod)
                        downloadButtons.image.push(downloadButton)

                        if ((!onboardingStatus.image && !onboardingHasRun.image) && GetSetting("imgDownload", settings).value) {
                              flashingBorders.push(new FlashingBorders(element, downloadButton, Downloadbutton.Image, inputMethod))

                              onboardingHasRun.image = true
                        }
                  }
                  catch (error) {
                        console.error(log(error))
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
                                    const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, videoElement.poster, settings, toastManager, !GetSetting("vidDownload", settings).value, inputMethod, videoElement)
                                    downloadButtons.video.push(downloadButton)

                                    // Onboarding procedure
                                    if ((!onboardingStatus.video && !onboardingHasRun.video) && GetSetting("vidDownload", settings).value) {
                                          flashingBorders.push(new FlashingBorders(videoElement, downloadButton, Downloadbutton.Video, inputMethod))

                                          onboardingHasRun.video = true
                                    }
                              }
                              catch (error) {
                                    console.error(log(error))
                              }
                        }
                  })
            })

      // GIFs
      Array.from(document.querySelectorAll("video[playsinline][loop]"))
            .forEach(element => {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, element.src, settings, toastManager, !GetSetting("gifDownload", settings).value, inputMethod)
                        downloadButtons.gif.push(downloadButton)
                  }
                  catch (error) {
                        console.error(log(error))
                  }
            })
}