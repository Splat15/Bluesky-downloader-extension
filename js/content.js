// Onboarding
let onboardingStatus
let onboardingElements = { image: [], video: [] }
let onboardingHasRun = { video: false, image: false }

const mobileDevice = Downloadbutton.DetectMobileDevice()

const minUptime = 1000
browser.runtime.onMessage.addListener((message) => {
      if (message.type == "init") {
            onboardingStatus = message.onboardingStatus

            if (message.uptime < minUptime) InstallCleanup()
      }
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

// Add download buttons to images in feed
new NodeObserver(
      // rudimentary test
      element =>
            element.tagName == "IMG" || element.tagName == "VIDEO",

      element => {
            if (element.downloadButton == true) return
            // exact tests
            // logic for image elements
            if (element.tagName == "IMG" &&
                  element.draggable == true &&
                  element.hasAttribute("alt") &&
                  element.hasAttribute("src") &&
                  /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src))
            // Create download button
            {
                  try {
                        const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src)

                        if (!onboardingStatus.image && !onboardingHasRun.image) {
                              if (mobileDevice) CreateFlashingBordersMobile(element, downloadButton, Downloadbutton.Image)
                              else CreateFlashingBorders(element, downloadButton, Downloadbutton.Image)
                              onboardingHasRun.image = true
                        }
                  }
                  catch (error) { console.error(error) }
            }

            // logic for video elements
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
                                          //new Downloadbutton(Downloadbutton.Video, element2, element.poster)
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
                                    // Create download button
                                    //new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster)
                                    downloadElement = element2
                                    resolve()
                              }
                        }).then(() => {
                              try {
                                    const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster)

                                    // Onboarding procedure
                                    if (!onboardingStatus.video && !onboardingHasRun.video) {
                                          if (mobileDevice) CreateFlashingBordersMobile(element, downloadButton, Downloadbutton.Video)
                                          else CreateFlashingBorders(element, downloadButton, Downloadbutton.Video)
                                          onboardingHasRun.video = true
                                    }

                              }
                              catch (error) { console.error(error) }
                        })
                  }

                  // tenor GIF posts (actually webm)
                  else if (element.preload == "auto" &&
                        element.downloadButton !== true)
                  // Create download button
                  {
                        try {
                              new Downloadbutton(Downloadbutton.GIF, element, element.src)
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
      const imageElements = Array.from(document.querySelectorAll("img[src][alt]"))
            .filter(element => /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src) && !element.hasAttribute("draggable"))
            .forEach(element => {
                  try {
                        let downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src)

                        if (!onboardingStatus.image && !onboardingHasRun.image) {
                              if (mobileDevice) CreateFlashingBordersMobile(element, downloadButton, Downloadbutton.Image)
                              else CreateFlashingBorders(element, downloadButton, Downloadbutton.Image)

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
                                    const downloadButton = new Downloadbutton(Downloadbutton.Video, downloadElement, videoElement.poster)

                                    // Onboarding procedure
                                    if (!onboardingStatus.video && !onboardingHasRun.video) {
                                          if (mobileDevice) CreateFlashingBordersMobile(videoElement, downloadButton, Downloadbutton.Video)
                                          else CreateFlashingBorders(videoElement, downloadButton, Downloadbutton.Video)

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
      Array.from(document.querySelectorAll("video[playsinline][preload='auto']"))
            .forEach(element => {
                  try {
                        new Downloadbutton(Downloadbutton.GIF, element, element.src)
                  }
                  catch (error) {
                        console.error(error)
                  }
            })
}



function CreateFlashingBorders(element, downloadButton, type) {
      let flashingBorders = []
      for (let i = 0; i < 3; i++) {
            const border = new FlashingBorder(
                  element.parentElement,
                  new FlashingBorder.BorderState(0, 0, 0),
                  new FlashingBorder.BorderState(i, i, 5),
                  new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                  800
            )
            border.Start()

            flashingBorders.push(border)
            if (type == Downloadbutton.Video) onboardingElements.video.push(border)
            else onboardingElements.image.push(border)
      }

      let hasRun = false
      element.parentElement.parentElement.addEventListener("mouseover", () => {
            if (hasRun &&
                  (type == Downloadbutton.Image && onboardingStatus.image) ||
                  (type == Downloadbutton.Video && onboardingStatus.video)
            ) return
            hasRun = true

            flashingBorders.forEach(border => border.Destroy())

            flashingBorders = []
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

                  flashingBorders.push(border)
                  if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                  else onboardingElements.image.push(border)
            }

            downloadButton.downloadButton.parentElement.addEventListener("mouseover", () => {
                  flashingBorders.forEach(border => border.Destroy())

                  if (type == Downloadbutton.Video) onboardingStatus.video = true
                  else onboardingStatus.image = true

                  browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
            })
      })
}

function CreateFlashingBordersMobile(element, downloadButton, type) {
      let flashingBorders = []

      if (type == Downloadbutton.Image) {
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

                  flashingBorders.push(border)
                  if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                  else onboardingElements.image.push(border)
            }

            setTimeout(() => {
                  flashingBorders.forEach(border => border.Destroy())

                  if (type == Downloadbutton.Video) onboardingStatus.video = true
                  else onboardingStatus.image = true

                  browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
            }, 2400)

            return
      }

      for (let i = 0; i < 3; i++) {
            const border = new FlashingBorder(
                  element.parentElement,
                  new FlashingBorder.BorderState(0, 0, 0),
                  new FlashingBorder.BorderState(i, i, 5),
                  new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                  800
            )
            border.Start()

            flashingBorders.push(border)
            if (type == Downloadbutton.Video) onboardingElements.video.push(border)
            else onboardingElements.image.push(border)
      }

      let hasRun = false
      element.parentElement.parentElement.addEventListener("click", () => {
            if (hasRun &&
                  type == Downloadbutton.Video &&
                  onboardingStatus.video
            ) return
            hasRun = true

            flashingBorders.forEach(border => border.Destroy())

            flashingBorders = []
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

                  flashingBorders.push(border)
                  if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                  else onboardingElements.image.push(border)
            }

            setTimeout(() => {
                  flashingBorders.forEach(border => border.Destroy())

                  if (type == Downloadbutton.Video) onboardingStatus.video = true
                  else onboardingStatus.image = true

                  browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
            }, 2400)
      })
}