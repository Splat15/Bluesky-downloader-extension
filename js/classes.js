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
      #stopped = false
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
            if (!this.#stopped && node.childNodes.length > 0) {
                  const childNodeArr = Array.from(node.childNodes) // Prevents recursive behaviour
                  for (let i = 0; i < childNodeArr.length; i++) {
                        const child = childNodeArr[i]
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
            this.#stopped = true
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
      static GIF = 2

      #mobileDevice = Downloadbutton.DetectMobileDevice()

      downloadButton = null
      #downloadIcon = null
      #downloadButtonDiv = null
      #progressCircle = null
      #progressCircleElem = null
      #dropshadow

      #username
      #did
      #downloading = false

      constructor(type, element, url) {
            this.url = url
            this.type = type

            // Get user id
            this.#did = url.replace(/%3A/g, ":").match(/\/(did:plc:\w+)\//)
            if (this.#did) this.#did = this.#did[1]
            else this.#did = undefined

            if (this.type == Downloadbutton.Image) {
                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  element.downloadButton = true
                  this.#GetDownloadButton(this.url)
                  element.parentElement.appendChild(this.#downloadButtonDiv)

                  element.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  element.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }
            else if (this.type == Downloadbutton.Video) {
                  this.url = this.url.replace("/thumbnail.jpg", "/playlist.m3u8")

                  element.downloadButton = true
                  this.#GetDownloadButton(this.url)
                  element.parentElement.insertBefore(this.#downloadButtonDiv, element)
            }
            else if (this.type == Downloadbutton.GIF) {
                  element.downloadButton = true
                  this.#GetDownloadButton(this.url)
                  element.parentElement.appendChild(this.#downloadButtonDiv)

                  element.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  element.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }
            else {
                  throw new Error("Invalid download button type: " + this.type)
            }
      }

      /** Assembles the html element structure */
      #GetDownloadButton(url) {
            const domParser = new DOMParser()
            const downloadButton = domParser.parseFromString(`
                  <div class="download-button-div${this.type != Downloadbutton.Video ? ` download-button-div-image` : ``}" id="download-button-div"${this.#mobileDevice ? ` style="opacity: 1"` : ``}>
                  ${this.type != Downloadbutton.Video ? `<div class="dropshadow" id="dropshadow"></div>` : ``}
                  <button class="download-button" id="download-button">
                  <img id="download-button-static" class="download-icon" style="opacity: 1;" src="${this.#GetURLFromHistory(url) ? Downloadbutton.Icons.Done : Downloadbutton.Icons.Download}">
                  </button>
                  </div>`.replace(/\s{2,}/g, " "), "text/html")

            this.#downloadButtonDiv = downloadButton.getElementById("download-button-div")
            this.#dropshadow = downloadButton.getElementById("dropshadow")
            this.downloadButton = downloadButton.getElementById("download-button")
            this.#downloadIcon = downloadButton.getElementById("download-button-static")

            this.downloadButton.addEventListener(
                  "click",
                  (event) => {
                        event.stopPropagation()
                        this.#Download(url);
                  })

            return downloadButton
      }

      /** Downloads the url based on type of button */
      async #Download(url) {
            try {
                  if (this.#downloading) return
                  this.#downloading = true

                  this.#downloadIcon.style.opacity = 0
                  this.#CreateProgressCircle()
                  this.#progressCircle.set(0.01)

                  // Purely cosmetic, delays download for 300ms to let the opacity transitions progress
                  await new Promise((resolve) => {
                        setTimeout(() => {
                              this.#progressCircleElem.style.opacity = 1

                              setTimeout(() => {
                                    resolve()
                              }, 100);
                        }, 200);
                  })

                  try {
                        let fileName
                        if (this.type != Downloadbutton.GIF) {
                              if (!this.#username) {
                                    const response = await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" + this.#did)
                                    const responseBody = JSON.parse(await response.text())
                                    this.#username = responseBody.handle
                              }

                              fileName = this.#username + "-" + this.#generateHash(url).toString().slice(6)
                        }
                        else {
                              fileName = url.match(/\w+(?=\.\w+$)/)[0]
                        }

                        // Image download
                        if (this.type != Downloadbutton.Video) {

                              // Get local URL
                              const file = await fetch(url)
                              this.#progressCircle.animate(0.5, { duration: 300 })
                              const fileBlob = await file.blob()
                              this.#progressCircle.animate(1, { duration: 300 })
                              const fileURL = URL.createObjectURL(fileBlob)

                              // Download file
                              const a = document.createElement('a')
                              a.download = fileName + (this.type == Downloadbutton.GIF ? ".webm" : ".jpg")
                              a.href = fileURL
                              a.click()

                              this.#downloadIcon.src = Downloadbutton.Icons.Done
                              setTimeout(() => {
                                    this.#progressCircleElem.style.opacity = 0
                                    setTimeout(() => {
                                          this.#downloadIcon.style.opacity = 1
                                          this.#downloading = false
                                          this.#DestroyProgressCircle()
                                    }, 100);
                              }, 800)

                              window.URL.revokeObjectURL(fileURL);
                              this.#AddURLToHistory(url)
                        }

                        // Video download
                        else {
                              // Generate unique ID for process
                              const id = Math.round(Math.random() * 10000000)

                              // Add listener for progress updates from background script
                              browser.runtime.onMessage.addListener((message) => {
                                    if (message.type == "bsky-download-progress" &&
                                          message.id == id &&
                                          message.url == url) {

                                          // Error occurred during download, skipped file 
                                          if (message.hasOwnProperty("error")) {
                                                this.#downloadIcon.src = Downloadbutton.Icons.Error
                                                this.#progressCircleElem.style.opacity = 0
                                                setTimeout(() => {
                                                      this.#downloadIcon.style.opacity = 1
                                                      this.#downloading = false
                                                      this.#DestroyProgressCircle()
                                                }, 300);
                                                throw new Error(message.error)
                                          }

                                          // Progress update
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
                                                            this.#downloading = false
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
                              this.#downloading = false
                              this.#DestroyProgressCircle()
                        }, 300);
                  }
            }
            catch (error) {
                  console.log(error)
            }
      }

      /** Add download button progress circle */
      #CreateProgressCircle() {
            this.#progressCircleElem = document.createElement("div")
            this.#progressCircleElem.classList.add("download-icon")
            this.downloadButton.appendChild(this.#progressCircleElem)

            this.#progressCircle = new ProgressBar.Circle(this.#progressCircleElem, {
                  strokeWidth: 10,
                  color: "#f1f3f5ff",
                  trailColor: "#f1f3f534"
            });
            this.#progressCircleElem.firstElementChild.classList.add("download-progress")
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
            try {
                  const hash = this.#generateHash(url)

                  let _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
                  if (_storage == null) _storage = []
                  if (_storage.indexOf(hash) == -1) _storage.push(hash)
                  localStorage.setItem("downloadedURLs", JSON.stringify(_storage))
            }
            catch (error) {
                  console.error(error)
            }
      }

      /** Checks if URL is present in local storage */
      #GetURLFromHistory(url) {
            try {
                  const hash = this.#generateHash(url)
                  let _storage = []
                  try {
                        _storage = JSON.parse(localStorage.getItem("downloadedURLs"));
                  }
                  catch {
                        localStorage.setItem("downloadedURLs", JSON.stringify([]))
                  }

                  return _storage && _storage.length > 0 && _storage.indexOf(hash) !== -1
            }
            catch (error) {
                  console.error(error)
                  return false
            }
      }

      /** Detect if a mobile device is used in the least intrusive way
       */
      static DetectMobileDevice() {
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

class FlashingBorder {
      #element
      borderElement
      #lowState
      #highState
      #intervalTime
      #initialState
      #active = false
      #interval
      #state = 0
      #borderStates

      /**
       * @param {Node} element Element to add append border element to
       * @param {BorderState} initialState Initial state of the border
       * @param {BorderState} lowState Low state of the border
       * @param {BorderState} highState High state of the border
       * @param {Number} intervalTime Interval of flashing in ms
       */
      constructor(element, initialState, lowState, highState, intervalTime) {
            this.#element = element
            if (typeof initialState === undefined) initialState = new FlashingBorder.BorderState(0, 0, 0)
            this.#borderStates = [initialState, lowState, highState]
            this.#lowState = lowState
            this.#highState = highState
            this.#intervalTime = intervalTime
            this.#initialState = initialState

            this.borderElement = document.createElement("div")
            this.borderElement.classList.add("onboarding-image")
            this.borderElement.id = "flashing-border"
            this.#ApplyState()
            this.borderElement.style.transition = `cubic-bezier(.45,.05,.55,.95) all ${this.#intervalTime * 0.9}ms`
            this.#element.appendChild(this.borderElement)
      }

      Start() {
            if (this.#active) return
            this.#active = true

            setTimeout(() => {
                  this.#interval = setInterval(() => this.#Flash(), this.#intervalTime)
                  this.#Flash()
            }, 100)
      }

      Stop() {
            return new Promise((resolve, reject) => {
                  if (!this.#active) reject
                  this.#active = false

                  clearInterval(this.#interval)

                  this.#state = 0
                  this.#ApplyState()
                  setTimeout(() => resolve(), this.#intervalTime)
            })
      }

      Destroy() {
            try {
                  this.Stop().then(() => {
                        this.borderElement.remove()
                  })
            }
            catch (error) {
                  
            }
      }

      #Flash() {
            if (this.#state != 2) this.#state = 2
            else this.#state = 1

            this.#ApplyState()
      }

      #ApplyState() {
            this.#borderStates[this.#state].Apply(this.borderElement)
      }


      static BorderState = class BorderState {
            xSize
            ySize
            strokeWidth

            /**
             * @param {Number} x Width in 100% - __px
             * @param {Number} y Height in 100% - __px
             * @param {Number} strokeWidth Width of the border stroke
             */
            constructor(x, y, strokeWidth) {
                  this.xSize = x
                  this.ySize = y
                  this.strokeWidth = strokeWidth
            }

            Apply(element) {
                  element.style.width = `calc(100% - ${(this.xSize + this.strokeWidth) * 2}px + 1px)`
                  element.style.height = `calc(100% - ${(this.ySize + this.strokeWidth) * 2}px + 1px)`
                  element.style.marginTop = this.ySize + "px"
                  element.style.marginLeft = this.xSize + "px"
                  element.style.borderWidth = this.strokeWidth + "px"
            }
      }
}