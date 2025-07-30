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

      /** Stops the **`NodeObserver`** */
      Stop() {
            this.#observer.disconnect()
      }
}


// Download button
/** Creates a download button structure at the specified **`element`**. */
class Downloadbutton {
      static Icons = {
            Download: browser.runtime.getURL("../icons/download.svg"),
            Done: browser.runtime.getURL("../icons/checkbox.svg"),
            Error: browser.runtime.getURL("../icons/error.svg")
      }
      static Image = 0
      static Video = 1

      #mobileDevice = this.#detectMobile()

      #downloadButton = null
      #downloadIcon = null
      #downloadButtonDiv = null
      #progressCircle = null
      #progressCircleElem = null
      #dropshadow

      #username
      #postID
      #fileName

      constructor(type, element, url) {
            this.url = url
            this.type = type

            // Get post URL
            if (/bsky\.app\/profile\/[^\/]+\/post\/\w+/.test(document.URL)) {
                  const matches = document.location.href.match(/profile\/([^\/]+)\/post\/([^\/]+)/)
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

                  element.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  element.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
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

      /** Assembles the html element structure */
      #GetDownloadButton(url, fileName) {
            // Download button div
            this.#downloadButtonDiv = document.createElement("div")
            this.#downloadButtonDiv.classList.add("download-button-div")
            if (this.#mobileDevice)
                  this.#downloadButtonDiv.style.opacity = 1
            if (this.type == Downloadbutton.Image)
                  this.#downloadButtonDiv.classList.add("download-button-div-image")
            this.#downloadButtonDiv.id = "download-button"

            if (this.type == Downloadbutton.Image) {
                  // Dropshadow 
                  this.#dropshadow = document.createElement("div")
                  this.#dropshadow.classList.add("dropshadow")
                  this.#downloadButtonDiv.appendChild(this.#dropshadow)
            }

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
      }

      /** Downloads the url based on type of button */
      async #Download(url, fileName) {
            this.status
            this.#CreateProgressCircle()
            this.#progressCircle.set(0.01)

            this.#downloadIcon.style.opacity = 0
            setTimeout(() => {
                  this.#progressCircleElem.style.opacity = 1
            }, 200);

            try {
                  // Image download
                  if (this.type == Downloadbutton.Image) {

                        // Get local URL
                        const file = await fetch(url)
                        this.#progressCircle.animate(0.5, { duration: 300 })
                        const fileBlob = await file.blob()
                        this.#progressCircle.animate(1, { duration: 300 })
                        const fileURL = URL.createObjectURL(fileBlob)

                        // Download file
                        const a = document.createElement('a');
                        a.download = fileName + "-" + Math.round(Math.random() * 1000) + ".jpg";
                        a.href = fileURL;
                        a.click();

                        this.#downloadIcon.src = Downloadbutton.Icons.Done
                        setTimeout(() => {
                              this.#progressCircleElem.style.opacity = 0
                              setTimeout(() => {
                                    this.#downloadIcon.style.opacity = 1
                                    this.#DestroyProgressCircle()
                              }, 200);
                        }, 800)

                        window.URL.revokeObjectURL(fileURL);
                        this.#AddURLToHistory(url)
                  }

                  // Video download
                  else if (this.type == Downloadbutton.Video) {
                        // Generate unique ID for process
                        const id = Math.round(Math.random() * 10000000)

                        // Add listener for progress updates from background script
                        browser.runtime.onMessage.addListener((message) => {
                              if (message.type == "bsky-download-progress" &&
                                    message.id == id &&
                                    message.url == url) {

                                    // Error occurred during download, skipped file 
                                    if (message.hasOwnProperty("error")) {
                                          throw new Error(message.error)
                                    }

                                    // Progress update
                                    console.log(message.progress)
                                    this.#progressCircle.animate(message.progress / 100, { duration: 300 })

                                    // Download done
                                    if (message.progress == 100) {
                                          // Save URL to history
                                          this.#AddURLToHistory(url)

                                          if (message.fileBlob !== null) {
                                                let fileURL = URL.createObjectURL(message.fileBlob)
                                                const a = document.createElement('a');
                                                a.download = fileName + ".mp4";
                                                a.href = fileURL;

                                                a.click();

                                                window.URL.revokeObjectURL(fileURL)
                                          }

                                          // transition back to static icon
                                          this.#downloadIcon.src = Downloadbutton.Icons.Done
                                          setTimeout(() => {
                                                this.#progressCircleElem.style.opacity = 0
                                                setTimeout(() => {
                                                      this.#downloadIcon.style.opacity = 1
                                                      this.#DestroyProgressCircle()
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
            catch (error) {
                  console.error(error)

                  this.#downloadIcon.src = Downloadbutton.Icons.Error
                  this.#progressCircleElem.style.opacity = 0
                  setTimeout(() => {
                        this.#downloadIcon.style.opacity = 1
                        this.#DestroyProgressCircle()
                  }, 300);
            }
      }

      /** Add download button progress circle */
      #CreateProgressCircle() {
            this.#progressCircle = new ProgressBar.Circle(this.#downloadButton, {
                  strokeWidth: 10,
                  color: "#f1f3f5ff",
            });
            this.#progressCircleElem = this.#downloadButton.lastElementChild
            this.#progressCircleElem.style.opacity = 0
            this.#progressCircleElem.classList.add("download-icon", "download-progress")
            this.#progressCircleElem.id = "download-button-progress"
      }

      /** Free up memory by destroying progress circle */
      #DestroyProgressCircle() {
            this.#progressCircle.destroy()
            this.#progressCircle = null;
      }

      /** Returns the nth parent of an element */
      #GetNthParent(element, n) {
            while (n > 0) {
                  element = element.parentElement
                  n--
            }

            return element
      }

      /** Adds downloaded URL to local storage */
      #AddURLToHistory(url) {
            const hash = this.#generateHash(url)

            let _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
            if (_storage == null) _storage = []
            if (_storage.indexOf(hash) == -1) _storage.push(hash)
            localStorage.setItem("downloadedURLs", JSON.stringify(_storage))
      }

      /** Checks if URL is present in local storage */
      #GetURLFromHistory(url) {
            const hash = this.#generateHash(url)

            let _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
            if (_storage == null) return false
            return _storage.indexOf(hash) !== -1
      }

      /** Detect if a mobile device is used in the least intrusive way
       * 
       *  Checking if `browser.downloads === undefined` would require extra permissions
       */
      #detectMobile() {
            const toMatch = [
                  /Android/i,
                  /webOS/i,
                  /iPhone/i,
                  /iPad/i,
                  /iPod/i,
                  /BlackBerry/i,
                  /Windows Phone/i
            ];

            return toMatch.some((toMatchItem) => {
                  return navigator.userAgent.match(toMatchItem);
            });
      }

      #generateHash = (string) => {
            let hash = 0;
            for (const char of string) {
                  hash = (hash << 5) - hash + char.charCodeAt(0);
                  hash |= 0; // Constrain to 32bit integer
            }
            return hash;
      };
}