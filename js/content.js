// Onboarding
let onboardingStatus
let onboardingElements = { image: [], video: [] }

const minUptime = 1000
browser.runtime.onMessage.addListener((message) => {
      if (message.type == "init") {
            if (Date.now() - message.uptime < minUptime) InstallCleanup()

            onboardingStatus = message.onboardingStatus
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

let imageOnboardingHasRun

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
                  const downloadButton = new Downloadbutton(Downloadbutton.Image, element, element.src)

                  if (imageOnboardingHasRun || onboardingStatus.image) return
                  imageOnboardingHasRun = true

                  // Onboarding procedure
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
                        onboardingElements.image.push(border)
                  }

                  let hasRun = false
                  element.parentElement.addEventListener("mouseover", () => {
                        if (hasRun) return
                        hasRun = true

                        flashingBorders.forEach(border => border.Destroy())

                        flashingBorders = []
                        for (let i = 0; i < 3; i++) {
                              let highStrokeWidth = 4 - i * 1.5
                              let highSize = -8.5 * i - highStrokeWidth * 2

                              const border = new FlashingBorder(
                                    downloadButton.downloadButton.parentElement,
                                    new FlashingBorder.BorderState(0, 0, 0),
                                    new FlashingBorder.BorderState(-4 * 2, -4 * 2, 4),
                                    new FlashingBorder.BorderState(highSize, highSize, highStrokeWidth),
                                    800
                              )
                              border.borderElement.style.borderRadius = "1000px"
                              border.Start()
                              flashingBorders.push(border)
                              onboardingElements.image.push(border)

                              downloadButton.downloadButton.parentElement.addEventListener("mouseover", () => {
                                    flashingBorders.forEach(border => border.Destroy())

                                    onboardingStatus.image = true
                                    browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                              })
                        }
                  })
            }

            // logic for video elements
            else if (element.tagName == "VIDEO" && element.hasAttribute("playsinline")) {

                  // Video posts
                  if (element.preload == "none" &&
                        element.hasAttribute("poster")) {

                        // Create download button

                        // Wait for element next to downloadButton to load
                        let observer = new NodeObserver(
                              element2 => element2.tagName == "DIV" &&
                                    element2.dir == "auto" &&
                                    !element2.parentElement.hasAttribute("aria-label"),
                              // Create download button
                              element2 => {
                                    new Downloadbutton(Downloadbutton.Video, element2, element.poster)
                              },
                              true,
                              element.parentElement.parentElement
                        )

                        // Check if element next to downloadButton is already loaded
                        const downloadElement = element.parentElement.parentElement.querySelector("div[dir='auto']")
                        if (downloadElement) {

                              // Stop node observer from triggering
                              observer.Stop()
                              // Create download button
                              new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster)
                        }

                  }

                  // tenor GIF posts (actually webm)
                  else if (element.preload == "auto" &&
                        element.downloadButton !== true)
                  // Create download button
                  {
                        new Downloadbutton(Downloadbutton.GIF
                              , element, element.src)
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
      Array.from(document.querySelectorAll("#download-button")).forEach(element => element.remove())

      // Manually re-add download buttons without the document needing to refresh
      // Images
      const imageElements = Array.from(document.querySelectorAll("img[src][alt]"))
            .filter(element => /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src) && !element.hasAttribute("draggable"))
            .forEach(element => new Downloadbutton(Downloadbutton.Image, element, element.src))

      // Videos
      Array.from(document.querySelectorAll("video[poster][playsinline][preload='none']"))
            .forEach(element => {
                  const downloadElement = Array.from(element.parentElement.parentElement.querySelectorAll('div:not([aria-label])>div[dir=auto]'))
                        .filter(element => !element.parentElement.hasAttribute("aria-label"))[0]
                  if (downloadElement) {
                        new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster)
                  }
            })

      // GIFs
      Array.from(document.querySelectorAll("video[playsinline][preload='auto']"))
            .forEach(element => {
                  new Downloadbutton(Downloadbutton.GIF, element, element.src)
            })

}

