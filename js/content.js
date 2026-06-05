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
let theme = "theme--dim"
console.info(log("Initializing toast manager"))
const toastManager = new ToastManager()
let mediaElements = [] // Prevents duplicate application of download buttons and onboarding elements
let versionInfoToast
let versionInfo


const mobileDevice = DetectMobileDevice() // Detect browser based on user agent for compatibility and layout
let inputMethod

const minUptime = 1000 // Max. ms amount of time since install of extension for cleanup to be executed


const mainThreadHelperLoaded = new Promise(resolve => {
      console.info(log("Adding main thread code to document"))
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
                  console.info(log("Main thread code has run"))
                  resolve()
            }
      }).observe(script, { attributes: true })

      document.head.appendChild(script)
      console.info(log("Main thread code added"))
})


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

HandleThemeChanges()

function HandleThemeChanges() {
      let newTheme = Array.from(document.documentElement.classList)
            .find(cssClass => cssClass.startsWith("theme--"))

      if (theme && theme != newTheme) {
            console.info(log("Theme change detected, new theme is " + newTheme))

            theme = newTheme
            browser.runtime.sendMessage({ type: "set-theme", value: theme })

            SetThemeClass(theme)
      }
}


browser.runtime.onMessage.addListener((message) => {

      // Response to init request
      if (message.type == "init") {
            if (init) return

            init = true
            console.info(log("Init response received"))

            onboardingStatus = message.onboardingStatus
            settings = message.settings
            theme = message.theme
            inputMethod = message.inputMethod
            version = message.version

            // If there are unfinished downloads from the last session, ask to restart them
            if (message.unfinishedDownloads && message.unfinishedDownloads.length > 0) {
                  setTimeout(() => {
                        let popup
                        let userHasAccepted = false

                        const downloadsAmount = message.unfinishedDownloads.length || 0
                        const numbers = ["Zero", "One", "Two", "Three"] // Friendly names for 0-3
                        const amountText = downloadsAmount < 3 ? numbers[downloadsAmount] : downloadsAmount
                        const multipleDownloads = downloadsAmount != 1 // For grammar

                        const popupText = `${amountText} download${multipleDownloads ? "s" : ""} didn't finish. Do you want to restart ${multipleDownloads ? "them" : "it"}?`


                        const onPopupDismiss = () => {
                              // If the user didn't restart the downloads
                              if (!userHasAccepted)
                                    // Clear the unfinished downloads
                                    browser.runtime.sendMessage({ type: "clear-unfinished-downloads" })
                        }

                        // Popup option for restarting the downloads
                        const optionYes = new FullScreenPopup.PopupOption(
                              `Restart download${multipleDownloads ? "s" : ""}`,
                              () => {
                                    userHasAccepted = true
                                    popup.Dismiss()

                                    message.unfinishedDownloads.forEach(downloadJob =>
                                          ResumeUnfinishedDownload(downloadJob, toastManager)
                                    )
                              }
                        )

                        // Popup option for dismissing the popup
                        const optionNo = new FullScreenPopup.PopupOption(
                              "Cancel",
                              null,
                              false
                        )

                        // Display the popup
                        popup = new FullScreenPopup(
                              `Unfinished download${multipleDownloads ? "s" : ""}`,
                              popupText,
                              [optionYes, optionNo],
                              onPopupDismiss
                        )
                  }, 1000)
            }

            if (!inputMethod) {
                  inputMethod = navigator.maxTouchPoints > 0 ? "touch" : "mouse"
                  browser.runtime.sendMessage({ type: "set-input-method", value: inputMethod })
            }

            console.info(log("Running cleanup for previous versions"))
            if (message.uptime < minUptime) InstallCleanup()

            console.info(log("Running onInit"))
            onInit.forEach(element => {
                  element()
            });

            // Initialize theme
            SetThemeClass(theme)

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
            console.info(log("Received settings update"))
            // Workaround
            // Extension popup window can only be adressed with runtime.sendMessage but background script can't access this
            if (message.repeat) {
                  console.info(log("Relaying settings update"))
                  browser.runtime.sendMessage({ type: "settings-update", settings: message.settings })
            }

            settings = message.settings

            console.info(log(JSON.stringify(settings)))


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
            console.info(log("Received onboarding update"))
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
      console.info(log("Input change detected: " + method))

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
            element.tagName == "IMG" || element.tagName == "VIDEO" || element.tagName == "DIV" || element.tagName == "BUTTON",

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
            else if (element.tagName == "DIV" &&
                  element.previousElementSibling &&
                  element.previousElementSibling.tagName == "FIGURE" &&
                  element.previousElementSibling.children[0].tagName == "VIDEO" &&
                  element.downloadButton !== true) {

                  element = element.previousElementSibling.firstElementChild

                  // Video posts
                  let downloadElement;

                  // Get blank spacer element, after which the download button should be inserted
                  downloadElement = element.parentElement.parentElement.querySelector("button[tabindex][aria-label]+div[style*='flex:']")

                  try {
                        const func = () => {
                              // Early return if element has already been processed
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
            }

            // User GIF posts
            else if (element.tagName == "BUTTON" &&
                  element.previousElementSibling &&
                  element.previousElementSibling.tagName == "FIGURE" &&
                  element.previousElementSibling.children[0].tagName == "VIDEO" &&
                  element.downloadButton !== true) {
                  try {
                        element = element.previousElementSibling.firstElementChild
                        // Create download button
                        const func = () => {
                              if (mediaElements.includes(element)) return
                              mediaElements.push(element)

                              const downloadButton = new Downloadbutton(Downloadbutton.UploadedGIF, element, element.poster, settings, toastManager, !GetSetting("gifDownload", settings).value, inputMethod)
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

            // Tenor GIF posts
            else if (element.tagName == "VIDEO" &&
                  element.firstElementChild.src.includes("gifs.bsky.app") &&
                  element.downloadButton !== true) {
                  try {
                        const mp4Src = Array.from(element.children)
                              .find(element => /gifs\.bsky\.app\/[^\/]+\/[^.]+\.mp4/gi.test(element.src))

                        // Create download button
                        const func = () => {
                              if (mediaElements.includes(element)) return
                              mediaElements.push(element)

                              const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, mp4Src.src, settings, toastManager, !GetSetting("gifDownload", settings).value, inputMethod)
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
)

onInit.push(() => {
      // Remove old stylesheets
      Array.from(document.querySelectorAll("#bskyDownloadStylesheet"))
            .forEach(stylesheet => stylesheet.remove())

      let stylesheetPaths = ["../css/style.css", "../css/themes.css", "../css/shared.css"]
      for (let i = 0; i < stylesheetPaths.length; i++) {
            // Add stylesheet
            const stylesheet = document.createElement("link")
            // Incorporate version number to avoid caching issue
            stylesheet.href = browser.runtime.getURL(stylesheetPaths[i]) + "?version=" + version
            stylesheet.id = "bskyDownloadStylesheet"
            stylesheet.rel = "stylesheet"
            document.head.appendChild(stylesheet)
      }
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
      Array.from(document.querySelectorAll("figure:has(+div)>video[poster][playsinline][preload='none']"))
            .forEach(videoElement => {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.UploadedGIF, downloadElement, videoElement.poster, settings, toastManager, !GetSetting("vidDownload", settings).value, inputMethod, videoElement)
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
            })

      // User gifs
      Array.from(document.querySelectorAll("figure:has(+button)>video"))
            .forEach(videoElement => {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.UploadedGIF, videoElement, videoElement.poster, settings, toastManager, !GetSetting("vidDownload", settings).value, inputMethod, videoElement)
                        downloadButtons.gif.push(downloadButton)

                        // Onboarding procedure
                        if ((!onboardingStatus.video && !onboardingHasRun.video) && GetSetting("vidDownload", settings).value) {
                              flashingBorders.push(new FlashingBorders(videoElement, downloadButton, Downloadbutton.Video, inputMethod))

                              onboardingHasRun.video = true
                        }
                  }
                  catch (error) {
                        console.error(log(error))
                  }
            })

      // GIFs
      Array.from(document.querySelectorAll("video:has(>[src*='gifs.bsky.app'])"))
            .forEach(element => {
                  try {
                        const mp4Src = Array.from(element.children)
                              .find(element => /gifs\.bsky\.app\/[^\/]+\/[^.]+\.mp4/gi.test(element.src))

                        const downloadButton = new Downloadbutton(Downloadbutton.GIF, element, mp4Src.src, settings, toastManager, !GetSetting("gifDownload", settings).value, inputMethod)
                        downloadButtons.gif.push(downloadButton)
                  }
                  catch (error) {
                        console.error(log(error))
                  }
            })
}

const onImgIntersection = (entries) => {
      // Iterate though every intersection
      entries.forEach(entry => {
            const isVisible = entry.isIntersecting
            const element = entry.target
            let refreshInterval = null

            if (isVisible) {
                  // If element is visible and has failed to load
                  if (element.naturalWidth == 0) {
                        // Refresh the source to initialize loading the image again
                        element.src = element.src

                        // Check if the image has loaded in a regular interval
                        refreshInterval = setInterval(() => {
                              // Image hasn't loaded yet
                              if (element.naturalWidth == 0) {
                                    // Refresh the source to initialize loading the image again
                                    element.src = element.src
                              }
                              // Image has loaded
                              else {
                                    // Stop interval and intersection observer for this element
                                    intersectionObserver.unobserve(element)
                                    clearInterval(refreshInterval)
                              }
                              // Inverval of 1000ms ± 500ms to prevent simultaneous updates
                        }, 500 + (1000 * Math.random()));

                        // Save interval ID to element to stop interval once the element goes off screen
                        element.refreshInterval = refreshInterval
                  }
                  // If element has successfully loaded 
                  else {
                        // Remove element from intersection observer list to prevent future activation
                        intersectionObserver.unobserve(element)
                  }
            }
            // If element goes off screen
            else if (element.refreshInterval) {
                  // Stop interval if it exists
                  clearInterval(element.refreshInterval)
                  element.refreshInterval = null
            }
      })
};

const intersectionObserver = new IntersectionObserver(
      onImgIntersection,
      {
            // Configure to test if the element is on screen
            root: document,
            threshold: 0
      });

new NodeObserver(
      element => element.tagName == "IMG",
      element => {
            // Apply the intersection observer to every image
            intersectionObserver.observe(element)
      }
)

// Add all images that loaded before the node observer executed
Array.from(document.querySelectorAll("img")).forEach(image => {
      intersectionObserver.observe(image)
})