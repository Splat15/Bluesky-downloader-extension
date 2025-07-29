// Observes an element for added subnodes
/**
 * Observes an element for added subnodes and executes the **`Callback`** if the **`Test`** returns `true`.
 * 
 * **`Test`** is passed the added subnode.
 * 
 * **`singleuse`** dictates if the `NodeObserver` is disposed if the `Test` returns `true`. 
 */
class NodeObserver {
      #observer = null
      constructor(
            Test,
            Callback,
            singleUse = false,
            node = document
      ) {
            this.#Observe(Test,
                  Callback,
                  singleUse,
                  node)
      }

      // Recursively test addedd nodes against condition
      #TestNodeDeep(Test, node, Callback, singleUse) {
            // If mutation is an added node and Test is true
            if (node.nodeType === Node.ELEMENT_NODE && Test(node)) {
                  Callback(node);
                  if (singleUse) {
                        this.Stop()
                  }
            }
            if (node.childNodes.length > 0) {
                  for (const child of node.childNodes) {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                              this.#TestNodeDeep(Test, child, Callback, singleUse)
                        }
                  }
            }

            return this
      }

      // Creates and starts the node observer
      #Observe(
            Test,
            Callback,
            singleUse = false,
            node = document
      ) {
            if (this.#observer) this.#observer.disconnect()

            this.#observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                              this.#TestNodeDeep(Test, node, Callback, singleUse)
                        }
                  }
            });

            this.#observer.observe(node, { childList: true, subtree: true });

            return this
      }

      // Stops the node observer
      /**
       * Stops the **`NodeObserver`**
       */
      Stop() {
            this.#observer.disconnect()
      }
}


// Download button
/**
 * Creates a download button structure at the specified **`element`**.
 */
class Downloadbutton {
      static Icons = {
            Download: browser.runtime.getURL("../icons/download.svg"),
            Done: browser.runtime.getURL("../icons/checkbox.svg"),
            Error: browser.runtime.getURL("../icons/error.svg")
      }
      static Image = 0
      static Video = 1

      #downloadButton = null
      #downloadIcon = null
      #downloadButtonDiv = null
      #progressCircle = null
      #progressCircleElem = null

      #username
      #postID
      #fileName

      constructor(type, element, url) {
            this.url = url
            this.type = type

            // Get post URL
            if (/bsky\.app\/profile\/[^\/]+\/post\/\w+/.test(document.URL)) {
                  const matches = document.URL.match(/profile\/([^\/]+)\/post\/([^\/]+)/)
                  this.#username = matches[1]
                  this.#postID = matches[2]
            }
            else {
                  const timestamps = this.#GetNthParent(element, 18).querySelectorAll("a[href] span")
                  for (let i = 0; i < timestamps.length; i++) {
                        try {
                              const matches = timestamps[i].parentElement.href.match(/profile\/([^\/]+)\/post\/([^\/]+)/)
                              this.#username = matches[1]
                              this.#postID = matches[2]
                              break
                        }
                        catch { }
                  }
            }
            this.#fileName = this.#username + "@" + this.#postID

            if (this.type == Downloadbutton.Image) {

                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  element.downloadButton = true
                  this.#GetDownloadButton(this.url, this.#fileName)
                  element.parentElement.appendChild(this.#downloadButtonDiv)

                  element.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-spacer-hover"))
                  element.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-spacer-hover"))
                  this.#downloadButtonDiv.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-spacer-hover"))
                  this.#downloadButtonDiv.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-spacer-hover"))
            }
            else if (this.type == Downloadbutton.Video) {
                  this.url = this.url.replace("/thumbnail.jpg", "/playlist.m3u8")

                  element.downloadButton = true
                  this.#GetDownloadButton(this.url, this.#fileName)
                  element.parentElement.insertBefore(this.#downloadButtonDiv, element)
            }
            else {
                  throw new Error("Invalid download button type: " + this.type)
            }
      }

      // Assembles the html element structure
      #GetDownloadButton(url, fileName) {
            // Download button div
            this.#downloadButtonDiv = document.createElement("div")
            this.#downloadButtonDiv.classList.add("download-button-spacer")
            if (this.type == Downloadbutton.Image)
                  this.#downloadButtonDiv.classList.add("download-button-spacer-image")
            this.#downloadButtonDiv.id = "download-button"

            // Download button
            this.#downloadButton = document.createElement("button")
            this.#downloadButton.className = "download-button"
            this.#downloadButton.addEventListener(
                  "click",
                  (event) => {
                        event.stopPropagation()
                        this.#Download(url, fileName);
                  })
            this.#downloadButtonDiv.appendChild(this.#downloadButton);

            // Download button static icon
            this.#downloadIcon = document.createElement("img")
            this.#downloadIcon.id = "download-button-static"
            this.#downloadIcon.classList.add("download-icon")
            this.#downloadIcon.src = this.#GetURLFromHistory(url) ? Downloadbutton.Icons.Done : Downloadbutton.Icons.Download
            this.#downloadButton.appendChild(this.#downloadIcon)

            // Download button progress circle
            this.#progressCircle = new ProgressBar.Circle(this.#downloadButton, {
                  strokeWidth: 10,
                  color: "#f1f3f5ff",
            });
            this.#progressCircleElem = this.#downloadButton.lastElementChild
            this.#progressCircleElem.classList.add("download-icon", "download-progress")
            this.#progressCircleElem.style.opacity = 0
            this.#progressCircleElem.id = "download-button-progress"
      }

      // Downloads the url based on type of button
      async #Download(url, fileName) {
            this.#progressCircle.set(0.01)
            this.#progressCircle.animate(0.05)
            // Image download
            if (this.type == Downloadbutton.Image) {
                  // Get local URL
                  const file = await fetch(url)
                  const fileBlob = await file.blob()
                  const fileURL = URL.createObjectURL(fileBlob)

                  // Download file
                  const a = document.createElement('a');
                  a.download = fileName + "-" + Math.round(Math.random() * 1000) + ".jpg";
                  a.href = fileURL;

                  a.click();

                  window.URL.revokeObjectURL(fileURL);
                  this.#downloadIcon.style.opacity = 0
                  setTimeout(() => {
                        this.#downloadIcon.src = Downloadbutton.Icons.Done
                        this.#downloadIcon.style.opacity = 1
                  }, 300);
                  this.#AddURLToHistory(url)
            }

            // Video download
            else if (this.type == Downloadbutton.Video) {
                  this.#downloadIcon.style.opacity = 0
                  setTimeout(() => {
                        this.#progressCircleElem.style.opacity = 1
                  }, 300);

                  // Generate unique ID for process
                  const id = Math.round(Math.random() * 10000000)

                  // Add listener for progress updates from background script
                  browser.runtime.onMessage.addListener((message) => {
                        if (message.type == "bsky-download-progress" &&
                              message.id == id &&
                              message.url == url) {

                              // Error occurred during download, skipped file 
                              if (message.hasOwnProperty("error")) {
                                    console.error(message.error)

                                    this.#downloadIcon.src = Downloadbutton.Icons.Error
                                    this.#progressCircleElem.style.opacity = 0
                                    setTimeout(() => {
                                          this.#downloadIcon.style.opacity = 1
                                    }, 300);
                              }

                              // Progress update
                              console.log(message.progress)
                              this.#progressCircle.animate(message.progress / 100, { duration: 300 })

                              // Download done
                              if (message.progress == 100) {
                                    // Save URL to history
                                    this.#AddURLToHistory(url)

                                    // transition back to static icon
                                    this.#downloadIcon.src = Downloadbutton.Icons.Done
                                    setTimeout(() => {
                                          this.#progressCircleElem.style.opacity = 0
                                          setTimeout(() => {
                                                this.#downloadIcon.style.opacity = 1
                                                this.#progressCircle.set(0)
                                          }, 200);
                                    }, 800)
                              }
                        }
                  })

                  // Send download request to background script
                  browser.runtime.sendMessage({
                        type: "bsky-download",
                        id: id,
                        url: url,
                        fileName: fileName
                  })
            }
      }

      #GetNthParent(element, n) {
            while (n > 0) {
                  element = element.parentElement
                  n--
            }

            return element
      }

      /**
       * Adds downloaded URL to local storage
       */
      #AddURLToHistory(url) {
            let _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
            if (_storage == null) _storage = []
            if (_storage.indexOf(url) == -1) _storage.push(url)
            localStorage.setItem("downloadedURLs", JSON.stringify(_storage))
      }

      /**
       * Checks if URL is present in local storage
       */
      #GetURLFromHistory(url) {
            let _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
            if (_storage == null) return false
            return _storage.indexOf(url) !== -1
      }
}