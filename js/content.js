// Add download buttons to images in feed
new NodeObserver(
      element => element.tagName == "IMG" &&
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