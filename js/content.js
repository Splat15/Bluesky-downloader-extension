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
      element => element.tagName == "IMG" &&
            element.hasAttribute("alt") &&
            element.hasAttribute("src") &&
            /^https:\/\/cdn\.bsky\.app\/img\/feed_/.test(element.src) &&
            element.draggable == true &&
            element.downloadButton !== true,
      // Create download button
      element => new Downloadbutton(Downloadbutton.Image, element, element.src)
)

// Add download buttons to videos in feed
new NodeObserver(
      element => element.tagName == "VIDEO" &&
            element.hasAttribute("poster") &&
            element.hasAttribute("playsinline") &&
            element.preload == "none" &&
            element.downloadButton !== true,

      element => {
            // Wait for element next to downloadButton to load
            let observer = new NodeObserver(
                  element2 => element2.tagName == "DIV" &&
                        element2.dir == "auto",
                  // Create download button
                  element2 => new Downloadbutton(Downloadbutton.Video, element2, element.poster),
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
                  const downloadElement = Array.from(element.parentElement.parentElement.querySelectorAll("div[dir='auto']"))
                        .filter(element => !element.parentElement.hasAttribute("aria-label"))[0]
                  if (downloadElement) {
                        new Downloadbutton(Downloadbutton.Video, downloadElement, element.poster)
                  }
            })

} 