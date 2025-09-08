// Check if extension is newly installed
const maxInstallTimeDelay = 1000
browser.runtime.onMessage.addListener((message) => {
      if (message.type == "install-time-response" &&
            Date.now() - message.installTime < maxInstallTimeDelay)
            InstallCleanup()
})
browser.runtime.sendMessage({ type: "install-time" })


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
                  new Downloadbutton(Downloadbutton.Image, element, element.src)
                  StartOnboarding(element)
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

function StartOnboarding(element) {
      const outerFlasher = document.createElement("div")
      outerFlasher.classList.add("onboarding-image")
      element.parentElement.appendChild(outerFlasher)
      const innerFlasher = document.createElement("div")
      innerFlasher.classList.add("onboarding-image")
      innerFlasher.style.bor
      element.parentElement.appendChild(innerFlasher)
      setInterval(() => {
            innerFlasher.active = !innerFlasher.active
            if (innerFlasher.active) {
                  innerFlasher.style.borderWidth = "5px"
                  innerFlasher.style.width = "calc(100% - 40px)"
                  innerFlasher.style.height = "calc(100% - 40px)"
                  innerFlasher.style.margin = "15px"
            }
            else {
                  innerFlasher.style.borderWidth = "5px"
                  innerFlasher.style.width = "calc(100% - 20px)"
                  innerFlasher.style.height = "calc(100% - 20px)"
                  innerFlasher.style.margin = "5px"
            }
            outerFlasher.active = !outerFlasher.active
            if (outerFlasher.active) {
                  outerFlasher.style.borderWidth = "5px"
                  outerFlasher.style.width = "calc(100% - 20px)"
                  outerFlasher.style.height = "calc(100% - 20px)"
                  outerFlasher.style.margin = "5px"
            }
            else {
                  outerFlasher.style.borderWidth = "5px"
                  outerFlasher.style.width = "calc(100% - 10px)"
                  outerFlasher.style.height = "calc(100% - 10px)"
                  outerFlasher.style.margin = "0px"
            }
      }, 500)
}