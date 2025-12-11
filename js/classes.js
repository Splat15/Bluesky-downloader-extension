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
            test,
            callback,
            singleUse = false,
            node = document,
            testDeep = true
      ) {
            if (this.#observer) this.#observer.disconnect()

            this.#observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                              this.#TestNodeDeep(test, node, callback, singleUse, testDeep)
                        }
                  }
            });

            this.#observer.observe(node, { childList: true, subtree: true });
      }

      // Recursively test addedd nodes against condition
      #TestNodeDeep(Test, node, Callback, singleUse, testDeep) {
            // If mutation is an added node and Test is true
            if (node.nodeType === Node.ELEMENT_NODE && Test(node)) {
                  Callback(node);
                  if (singleUse) {
                        this.Stop()
                  }
            }
            if (testDeep && !this.#stopped && node.childNodes.length > 0) {
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
      #toastManager
      #toast
      #isMouseOnToast = false


      #username
      #did
      #downloading = false

      constructor(type, element, url, toastManager) {
            this.url = url
            this.type = type
            this.#toastManager = toastManager

            // Get user id
            this.#did = url.replace(/%3A/g, ":").match(/\/(did:plc:\w+)\//)
            if (this.#did) this.#did = this.#did[1]
            else this.#did = undefined

            if (this.type == Downloadbutton.Image) {
                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  element.downloadButton = true
                  this.#GetDownloadButton(this.url)
                  element.parentElement.appendChild(this.#downloadButtonDiv)

                  let altTextButtons = Array.from(element.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.style.left = "16px !important")

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

                  let altTextButtons = Array.from(element.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.classList.add("alt-button-left"))

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

                  let fileName
                  if (this.type != Downloadbutton.GIF) {
                        if (!this.#username) {
                              const response = await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" + this.#did)
                              const responseBody = JSON.parse(await response.text())
                              this.#username = responseBody.handle
                        }

                        fileName = this.#username + "-" + this.#GenerateHash(url).toString().slice(6)
                  }
                  else {
                        fileName = url.match(/\w+(?=\.\w+$)/)[0]
                  }

                  this.#toast = this.#toastManager.DisplayToast(fileName + (this.type == Downloadbutton.Video ? ".mp4" : (this.type == Downloadbutton.GIF ? ".webm" : ".jpg")))


                  // Purely cosmetic, delays download for 200ms to let the transition progress
                  await new Promise((resolve) => {
                        setTimeout(() => {
                              this.#progressCircleElem.style.opacity = 1
                              resolve()
                        }, 200);
                  })

                  try {
                        // Image download
                        if (this.type != Downloadbutton.Video) {

                              // Old method without support for file paths
                              // Used on mobile devices without browser.downloads API
                              if (this.#mobileDevice) {
                                    // Get local URL
                                    const file = await fetch(url)
                                    this.#progressCircle.animate(0.5, { duration: 300 })
                                    this.#toastManager.SetProgress(this.#toast, 0.5)
                                    const fileBlob = await file.blob()
                                    this.#progressCircle.animate(1, { duration: 300 })
                                    this.#toastManager.SetProgress(this.#toast, 1)
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

                              // New method
                              else {
                                    // Generate random process ID
                                    const id = Math.round(Math.random() * 1000000000)

                                    // Add listener for progress updates
                                    browser.runtime.onMessage.addListener(message => {
                                          if (message.type == "bsky-download-progress" &&
                                                message.id == id &&
                                                message.url == url) {

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

                                                const progress = message.progress / 100
                                                this.#progressCircle.animate(progress, { duration: 300 })
                                                this.#toastManager.SetProgress(this.#toast, progress)

                                                // Download is finished
                                                if (message.progress >= 100) {
                                                      this.#downloadIcon.src = Downloadbutton.Icons.Done

                                                      setTimeout(() => {
                                                            this.#progressCircleElem.style.opacity = 0
                                                            setTimeout(() => {
                                                                  this.#downloadIcon.style.opacity = 1
                                                                  this.#downloading = false
                                                                  this.#DestroyProgressCircle()
                                                            }, 100);
                                                      }, 800)

                                                      this.#AddURLToHistory(url)
                                                }
                                          }

                                    })

                                    // Send download request
                                    browser.runtime.sendMessage({
                                          type: "bsky-download",
                                          id: id,
                                          url: url,
                                          fileType: (this.fileType == Downloadbutton.GIF ? "gif" : "image"),
                                          username: this.#username,
                                          fileName: fileName
                                    })
                              }
                        }

                        // Video download
                        else {
                              // Generate unique ID for process
                              const id = Math.round(Math.random() * 1000000000)

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
                                          const progress = message.progress / 100
                                          this.#progressCircle.animate(progress, { duration: 300 })
                                          this.#toastManager.SetProgress(this.#toast, progress)

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
                                    fileType: "video",
                                    username: this.#username,
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

            // Dismiss toast some time after mouse left
            if (this.#toast) {
                  const toast = this.#toast
                  let timeout = null

                  // Mouse was NOT on element before
                  if (!toast.mouseOn)
                        timeout = setTimeout(() => {
                              this.#toastManager.DismissToast(toast, this.#toastManager.toastList)
                        }, 2500);

                  // Mouse enters element
                  toast.onMouseEnter = () => {
                        if (timeout) {
                              clearTimeout(timeout)
                              timeout = null
                        }
                  }

                  // Mouse leaves element
                  toast.onMouseLeave = () => {
                        if (!timeout)
                              timeout = setTimeout(() => {
                                    this.#toastManager.DismissToast(toast, this.#toastManager.toastList)
                              }, 2000);
                  }
            }
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
                  const hash = this.#GenerateHash(url)

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
                  const hash = this.#GenerateHash(url)
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

      #GenerateHash = (string) => {
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

// Displays and manages toast notifications
class ToastManager {
      toastList = []
      toastContainer
      mobileLayout = window.innerHeight > window.innerWidth

      constructor() {
            this.toastContainer = document.getElementById("bskyDownloaderToastContainer")
            if (!this.toastContainer) {
                  this.toastContainer = document.createElement("div")
                  this.toastContainer.classList.add("toast-container")
                  this.toastContainer.id = "bskyDownloaderToastContainer"
                  document.body.appendChild(this.toastContainer)
            }

            window.addEventListener("resize", () => {
                  const mobileLayout = window.innerHeight > window.innerWidth

                  if (this.mobileLayout != mobileLayout) {
                        this.mobileLayout = mobileLayout

                        this.toastList.forEach(toast => {
                              toast.mobileLayout = this.mobileLayout
                              if (mobileLayout)
                                    toast.toastElem.classList.add("toast-mobile")
                              else
                                    toast.toastElem.classList.remove("toast-mobile")
                        })

                        this.AlignItems()
                  }
            })
      }

      Destroy() {
            let containers = Array.from(document.querySelectorAll("bskyDownloaderToastContainer"))
            containers.forEach(container => container.remove())
      }

      DisplayToast(text, progressBar = true) {
            let toast = new this.ToastNotification(text, this.toastContainer, progressBar, this.toastList.length == 1, this.mobileLayout)
            toast.onAction = () => { this.DismissToast(toast, this.toastList) }
            this.toastList.unshift(toast)

            this.AlignItems()

            return toast
      }

      SetProgress(toast, progress) {
            toast.progressBar.animate(progress, { duration: 400 })

            // Make progress bar transparent, revealing green background
            if (progress == 1)
                  setTimeout(() => {
                        toast.toastElem.querySelector("div.loading-bar>svg").style.opacity = 0
                  }, 400);
      }

      DismissToast(toast, toastList) {
            try {
                  const toastIndex = toastList.indexOf(toast)

                  toast.Dismiss(toastIndex == 0)
                  toastList.splice(toastIndex, 1)
            }
            catch { }

            this.AlignItems()
      }


      AlignItems() {
            for (let i = 0; i < this.toastList.length; i++) {
                  let element = this.toastList[i]

                  setTimeout(() => {
                        if (this.mobileLayout) {
                              element.toastElem.style.top = 60 * (i + 1) - 40 + "px"
                              element.toastElem.style.bottom = ""
                        }
                        else {
                              element.toastElem.style.bottom = 60 * (i + 1) - 40 + "px"
                              element.toastElem.style.top = ""
                        }
                        if (i == 0) {
                              setTimeout(() => {
                                    element.toastElem.style.zIndex = 30
                              }, 50)

                              element.toastElem.style.transform = "scale(1)"
                              element.toastElem.style.opacity = 1
                        }
                        else if (i == 1) {
                              element.toastElem.style.zIndex = 40
                        }
                  }, 25 * i);
            }
      }


      ToastNotification = class ToastNotification {
            text = ""
            toastElem
            container
            progressBar
            mouseOn = false
            onMouseEnter
            onMouseLeave
            onAction
            mobileLayout

            constructor(text, container, progressBar, firstToast, mobileLayout) {
                  this.container = container
                  this.text = text
                  this.progressBar = progressBar
                  this.mobileLayout = mobileLayout
                  this.Display(firstToast)

                  this.toastElem.addEventListener("mouseenter", () => {
                        this.mouseOn = true
                        if (this.onMouseEnter) this.onMouseEnter()
                  })
                  this.toastElem.addEventListener("mouseleave", () => {
                        this.mouseOn = false
                        if (this.onMouseEnter) this.onMouseLeave()
                  })
            }

            Dismiss(firstElement) {
                  this.toastElem.style.transition = "transform ease-in 0.2s, opacity ease-in 0.2s"
                  this.toastElem.style.zIndex = 20
                  this.toastElem.style.transform = `translateY(${this.mobileLayout ? "-" : "" }${firstElement ? 2.2 : 60}px) scale(0.9)`
                  this.toastElem.style.opacity = 0

                  setTimeout(() => {
                        this.toastElem.remove()
                  }, 200);
            }

            Display(firstToast) {
                  const domParser = new DOMParser()

                  // Create toast from HTML string
                  this.toastElem = domParser.parseFromString(`
      <div class="toast${this.mobileLayout ? " toast-mobile" : ""}" id="toast" style="transform: scale(${firstToast ? 0 : 0.7}); transition: transform ease ${firstToast ? 0.2 : 0.1}s, bottom ease 0.3s, top ease 0.3s;">
            <div class="toast-border"></div>
            <div class="toast-body" style="display: flex;flex-direction: row;padding: 12px;height: 20px;">
                  <div class="toast-text-overflow">
                        <div class="toast-text-overflow-gradient" style="left: 0px; transform: rotate(180deg); opacity: 0;" id="overflowLeft"></div>
                        <p class="toast-text" id="toastText">${this.text}</p>
                        <div class="toast-text-overflow-gradient" style="right: 0px; opacity: 0;" id="overflowRight"></div>
                  </div>
                  <button class="toast-action" id="toastAction">
                        <svg fill="none" width="18" viewBox="0 0 24 24" height="18"
                              style="color: rgb(255, 255, 255); pointer-events: none;">
                              <path class="toast-action-icon" fill-rule="evenodd" clip-rule="evenodd"
                                    d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z">
                              </path>
                        </svg>
                  </button>
            </div>
            <div id="loadingBar" class="loading-bar"></div>
      </div>`, "text/html").getElementById("toast")


                  // Add click event to dismiss button
                  let toastAction = this.toastElem.querySelector('[id="toastAction"]')
                  toastAction.addEventListener("click", () => { this.onAction() })

                  // Add to main document
                  this.container.appendChild(this.toastElem)

                  // Add progress bar
                  if (this.progressBar) {
                        let progressbarElem = this.toastElem.querySelector('[id="loadingBar"]')
                        this.progressBar = new ProgressBar.Line(progressbarElem, {
                              strokeWidth: 10,
                              color: "rgb(15, 115, 255)",
                              trailColor: "rgb(34, 46, 63);"
                        });
                  }

                  // Get text element
                  const textElem = this.toastElem.querySelector('[id="toastText"]')

                  // Get computed sizes to compare
                  const textComputedStyle = window.getComputedStyle(textElem)
                  const divComputedStyle = window.getComputedStyle(textElem.parentElement)

                  // Get with as float
                  const textWidth = parseFloat(textComputedStyle.width)
                  const divWidth = parseFloat(divComputedStyle.width)

                  const overflowAmount = textWidth - divWidth
                  const scrollTime = overflowAmount * 0.03 // time for scrolling in seconds, higher multiplyer = slower movement

                  // Text is wider than div
                  if (overflowAmount > 0) {
                        textElem.style.transition = `transform linear ${scrollTime}s`

                        // Get gradient elements next to toast text
                        let overflowLeft = textElem.parentElement.querySelector('[id="overflowLeft"]')
                        let overflowRight = textElem.parentElement.querySelector('[id="overflowRight"]')

                        // Show right gradient
                        overflowRight.style.opacity = 1

                        let bool = true

                        const scroll = (bool) => {
                              if (bool) {
                                    // Move text right
                                    overflowLeft.style.opacity = 1
                                    textElem.style.transform = `translateX(-${overflowAmount}px)`
                                    setTimeout(() => {
                                          overflowRight.style.opacity = 0
                                    }, scrollTime * 1000)
                              }
                              else {
                                    // Move text left
                                    overflowRight.style.opacity = 1
                                    textElem.style.transform = `translateX(0px)`
                                    setTimeout(() => {
                                          overflowLeft.style.opacity = 0
                                    }, scrollTime * 1000)
                              }
                        }

                        setTimeout(() => {
                              setInterval(() => {
                                    bool = !bool
                                    scroll(bool)
                              }, scrollTime * 1000.0 + 1500)

                              scroll(bool)
                        }, 1500)
                  }
            }
      }
}