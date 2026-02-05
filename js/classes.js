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
            if (this.#TestNodeDeep && !this.#stopped && node.childNodes.length > 0) {
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
      static Image = { name: "Image", ext: ".jpg", searchDepth: 13 }
      static Video = { name: "Video", ext: ".mp4", searchDepth: 16 }
      static GIF = { name: "GIF", ext: ".webm", searchDepth: 8 }

      #mobileDevice = DetectMobileDevice()
      #inputMethod

      downloadButton = null
      #downloadIcon = null
      #downloadButtonDiv = null
      #progressCircle = null
      #progressCircleElem = null
      #toastManager
      #toast
      #did
      #postID
      #downloading = false


      #hash
      #displayName
      #fileExtension
      #fileName
      #filePath
      #username
      element
      videoElement

      constructor(type, element, url, toastManager, hidden, inputMethod, videoElement = null) {
            this.url = url
            this.type = type
            this.#toastManager = toastManager
            this.element = element
            this.#inputMethod = inputMethod
            this.videoElement = videoElement

            // Get user id
            this.#did = url.replace(/%3A/g, ":").match(/\/(did:plc:\w+)\//)
            if (this.#did) this.#did = this.#did[1]
            else this.#did = undefined

            if (this.type == Downloadbutton.Image) {
                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  this.element.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.element.parentElement.appendChild(this.#downloadButtonDiv)

                  let altTextButtons = Array.from(this.element.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.style.left = "16px !important")

                  this.element.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.element.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }

            else if (this.type == Downloadbutton.Video) {
                  this.url = this.url.replace("/thumbnail.jpg", "/playlist.m3u8")

                  this.element.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.element.parentElement.insertBefore(this.#downloadButtonDiv, this.element)
            }

            else if (this.type == Downloadbutton.GIF) {
                  this.element.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.element.parentElement.appendChild(this.#downloadButtonDiv)

                  let altTextButtons = Array.from(this.element.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.classList.add("alt-button-left"))

                  this.element.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.element.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }

            else {
                  throw new Error("Invalid download button type: " + this.type)
            }
      }

      SetVisibility(visibility) {
            if (visibility) this.Show()
            else this.Hide()
      }

      Hide() {
            this.#downloadButtonDiv.style.display = "none"
      }

      Show() {
            this.#downloadButtonDiv.style.display = "block"
      }

      /** Assembles the html element structure */
      #GetDownloadButton(url, hidden) {
            const domParser = new DOMParser()
            const downloadButton = domParser.parseFromString(`
                  <div class="download-button-div${this.type != Downloadbutton.Video ? ' download-button-div-image' : ''}" id="download-button-div" style="display: ${hidden ? "none" : "block"};">
                        ${this.type != Downloadbutton.Video ? '<div class="dropshadow" id="dropshadow"></div>' : ''}
                        <button class="download-button" id="download-button">
                        <img id="download-button-static" class="download-icon" draggable="false" style="opacity: 1;" src="${this.#GetURLFromHistory(url) ? Downloadbutton.Icons.Done : Downloadbutton.Icons.Download}">
                        </button>
                  </div>
                  `.replace(/\s{2,}/g, " "), "text/html")

            this.#downloadButtonDiv = downloadButton.getElementById("download-button-div")
            this.downloadButton = downloadButton.getElementById("download-button")
            this.#downloadIcon = downloadButton.getElementById("download-button-static")

            this.SetInputSupport(this.#inputMethod)

            this.downloadButton.addEventListener(
                  "click",
                  (event) => {
                        event.stopPropagation()
                        this.#Download(url);
                  })

            return downloadButton
      }

      // Set sstyling for touch devices
      SetInputSupport(inputMethod) {
            this.#inputMethod = inputMethod
            this.#downloadButtonDiv.style.opacity = this.#inputMethod == "touch" ? "1" : ""
      }

      /** Downloads the url based on type of button */
      async #Download(url) {
            try {
                  if (this.#downloading) return
                  this.#downloading = true

                  this.#downloadIcon.style.opacity = 0
                  this.#CreateProgressCircle()
                  this.#progressCircle.set(0.01)

                  if (GetSetting("downloadToast").value) this.#toast = this.#toastManager.DisplayToast()

                  this.#fileExtension = this.type.ext
                  this.#hash = GenerateHash(url).toString()

                  // Username has not been determined yet
                  if (!this.#username) { // debugging
                        // Try to get elements that contain an href with the username and post id
                        const elementHeight = this.element.getBoundingClientRect().y
                        let searchDepth = this.type.searchDepth

                        while (!this.#postID && searchDepth <= this.type.searchDepth + 3) {
                              let postElem = GetNthParent(this.element, searchDepth)

                              let linkElems = postElem.querySelectorAll("a[href*='/profile/']")


                              // Get username from collected elements
                              for (let i = 0; i < linkElems.length; i++) {
                                    const linkElem = linkElems[i]

                                    // Check if the link element is higher on screen than media element
                                    const linkElemHeight = linkElem.getBoundingClientRect().y
                                    if (linkElemHeight < elementHeight) {
                                          const href = linkElem.href
                                          let matches = href.match(/\/profile\/([^\/]+)(?:\/post\/([^\/]+)|)/)

                                          if (matches && matches.length >= 2) {
                                                this.#username = matches[1]
                                                if (matches[2]) {
                                                      //postElem.style.border = "solid red 2px"
                                                      //linkElem.style.border = "solid green 2px"
                                                      this.#postID = matches[2]
                                                      break
                                                }
                                          }
                                    }
                              }

                              searchDepth++
                        }
                  }

                  // Try to get post ID from URL
                  if (!this.#postID) {
                        let postID = document.URL.match(/\/profile\/[^\/]+\/post\/([^\/]+)/)
                        if (postID)
                              this.#postID = postID[1]
                  }

                  if (!this.#postID) {
                        //window.alert("no post id found")
                        console.error("no post id found")
                  }
                  console.log("post ID: " + this.#postID)

                  const response = await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" + (this.#did ? this.#did : this.#username))
                  const responseBody = JSON.parse(await response.text())
                  this.#displayName = responseBody.displayName

                  this.#filePath = this.#GetFilePath()
                  this.#fileName = this.#filePath.match(/[^\/\\]+$/gi)[0]

                  // If gifs should be downloaded as .gif, change file extension. Rest of the logic is handled in the bg script
                  if (!GetSetting("gifsAsWEBM").value) this.#fileExtension = ".gif"

                  this.#filePath += this.#fileExtension
                  if (this.#toast) this.#toastManager.SetText(this.#toast, this.#fileName + this.#fileExtension)

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
                              if (this.#mobileDevice &&
                                    (this.type == Downloadbutton.Image ||
                                          (this.type == Downloadbutton.GIF && GetSetting("gifsAsWEBM").value))) {
                                    // Get local URL
                                    const file = await fetch(url)
                                    this.#progressCircle.animate(0.5, { duration: 300 })
                                    if (this.#toast) this.#toastManager.SetProgress(this.#toast, 0.5)
                                    const fileBlob = await file.blob()
                                    this.#progressCircle.animate(1, { duration: 300 })
                                    if (this.#toast) this.#toastManager.SetProgress(this.#toast, 1)
                                    const fileURL = URL.createObjectURL(fileBlob)

                                    // Download file
                                    const a = document.createElement('a')
                                    a.download = this.#filePath
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
                                                if (this.#toast) this.#toastManager.SetProgress(this.#toast, progress)

                                                // Download is finished
                                                if (message.progress >= 100) {
                                                      this.#AddURLToHistory(url)

                                                      if (message.fileBlob) {
                                                            let fileURL = URL.createObjectURL(message.fileBlob)
                                                            const a = document.createElement('a');
                                                            a.download = this.#fileName + ".gif";
                                                            a.href = fileURL;

                                                            a.click();

                                                            window.URL.revokeObjectURL(fileURL)
                                                      }

                                                      this.#downloadIcon.src = Downloadbutton.Icons.Done

                                                      setTimeout(() => {
                                                            this.#progressCircleElem.style.opacity = 0
                                                            setTimeout(() => {
                                                                  this.#downloadIcon.style.opacity = 1
                                                                  this.#downloading = false
                                                                  this.#DestroyProgressCircle()
                                                            }, 100);
                                                      }, 800)
                                                }
                                          }

                                    })

                                    // Send download request
                                    browser.runtime.sendMessage({
                                          type: "bsky-download",
                                          id: id,
                                          url: url,
                                          fileType: this.type.name,
                                          filePath: this.#filePath
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
                                          if (this.#toast) this.#toastManager.SetProgress(this.#toast, progress)

                                          // Download done
                                          if (message.progress == 100) {
                                                // Save URL to history
                                                this.#AddURLToHistory(url)

                                                if (message.fileBlob) {
                                                      let fileURL = URL.createObjectURL(message.fileBlob)
                                                      const a = document.createElement('a');
                                                      a.download = this.#fileName + ".mp4";
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
                                    fileType: this.type.name,
                                    username: this.#username,
                                    filePath: this.#filePath
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
            tryRun(this.#progressCircle.destroy, true)
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

      /** Adds downloaded URL to local storage */
      #AddURLToHistory(url) {
            try {
                  const hash = GenerateHash(url)

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
                  const hash = GenerateHash(url)
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

      #GetFilePath() {
            return GetFilePath(this.#hash, this.type.name, this.#username, this.#displayName, this.#postID)
      }
}

/** Detect if a mobile device is used in the least intrusive way.
 * 
 * This method is used strictly for compatibility. 
 * 
 * Bypasses will break download functionality.
 */
function DetectMobileDevice() {
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

function GenerateHash(string) {
      let hash = 0;
      for (const char of string) {
            hash = (hash << 5) - hash + char.charCodeAt(0);
            hash |= 0; // Constrain to 32bit integer
      }
      return Math.abs(hash);
};

const pathVars = [
      { name: "Username", desc: "Username of the poster.", tags: ["username", "user", "tag"] },
      { name: "Display name", desc: "Display name of the poster.", tags: ["displayname", "poster", "name"] },
      { name: "File name", desc: "Username of the poster and the hash of the file url.", tags: ["filename", "file"] },
      { name: "Hash", desc: "Hash of the file URL.", tags: ["hash"] },
      { name: "Post ID", desc: "ID of the post.", tags: ["postid", "id"] },
      { name: "Type", desc: "Media type of the post.", tags: ["type", "media", "mediatype", "posttype", "format"] }
]

function GetFilePath(hash, type, username = "empty", displayName = "empty", postID = "0000000000000", pathTemplate = null) {
      try {
            // Sanitizing inputs by replacing slashes with invalid characters which will be removed later
            username = username.replaceAll(/\/\\/gi, "#")
            displayName = displayName.replaceAll(/\/\\/gi, "#")

            if (pathTemplate === null) pathTemplate = GetSetting("downloadPath").value

            if (DetectMobileDevice()) pathTemplate = pathTemplate.replaceAll(/[\/\\]+/gi, "")

            pathTemplate = pathTemplate
                  .replaceAll(new RegExp(`%(${pathVars[0].tags.join("|")})%`, "gi"), username)
                  .replaceAll(new RegExp(`%(${pathVars[1].tags.join("|")})%`, "gi"), displayName)
                  .replaceAll(new RegExp(`%(${pathVars[2].tags.join("|")})%`, "gi"), username + "-" + hash)
                  .replaceAll(new RegExp(`%(${pathVars[3].tags.join("|")})%`, "gi"), hash)
                  .replaceAll(new RegExp(`%(${pathVars[4].tags.join("|")})%`, "gi"), postID)
                  .replaceAll(new RegExp(`%(${pathVars[5].tags.join("|")})%`, "gi"), type)

            // Sanitize path for compatibility
            pathTemplate = pathTemplate.replaceAll(/\\{1, 2}/g, "/") // Replace backslashes with forward slashes
                  .replaceAll(/[^\/\w+-]+(?=$|\/)/g, "") // Truncate special characters at the end "file /file 🏳️‍⚧️" => "file/file"
                  .replaceAll(/[^\/\w+-.]/g, "_") // Replace special characters in the middle "files 01/file@01" => "files_01/file_01"
                  .replaceAll(/(?<=^|\/)\.+/g, "") // Remove leading dots ".files/.file" => "files/file"
                  .replaceAll(/\.(?=.+\/)/g, "_") // Remove dots in folder names "file.test/test" => "file_test/test"
                  .replaceAll(/(?<=^|\/)[^/]{0}(?=$|\/)/g, "empty") // Deal with empty folders / file names "/files/" => "empty/files/empty"


            return pathTemplate
      }
      catch (e) {
            console.error(e)
            console.error("Invalid file path")
            return "error"
      }
}

/** Returns the nth parent of an element */
function GetNthParent(element, n) {
      while (n > 0) {
            element = element.parentElement
            n--
      }

      return element
}

function GetSetting(settingId) {
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        return setting
                  }
            }
      }
}

function SetSetting(settingId, value, settings) {
      browser.runtime.sendMessage({ type: "set-setting", settingId: settingId, value: value })
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        return
                  }
            }
      }
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
            this.#intervalTime = intervalTime

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
      #inputMethod

      constructor(inputMethod) {
            this.#inputMethod = inputMethod
            this.toastContainer = document.getElementById("bskyDownloaderToastContainer")
            if (this.toastContainer) this.toastContainer.remove()

            this.toastContainer = document.createElement("div")
            this.toastContainer.classList.add("toast-container")
            this.toastContainer.id = "bskyDownloaderToastContainer"
            document.body.appendChild(this.toastContainer)

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

      SetInputMethod(inputMethod) {
            if (inputMethod == this.#inputMethod) return

            this.#inputMethod = inputMethod
            this.toastList.forEach(toast => toast.SetInputMethod(this.#inputMethod))
      }

      Destroy() {
            let containers = Array.from(document.querySelectorAll("bskyDownloaderToastContainer"))
            containers.forEach(container => container.remove())
      }

      DisplayToast(text, progressBar = true, helpLink = null, onDismiss = null) {
            let toast = new this.ToastNotification(text, this.toastContainer, progressBar, this.toastList.length == 1, this.mobileLayout, helpLink, onDismiss)
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

      SetText(toast, text) {
            toast.SetText(text)
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
            textElem
            textElemDiv
            helpLink
            container
            progressBar
            mouseOn = false
            onMouseEnter
            onMouseLeave
            onAction
            mobileLayout
            #toastAction
            dismissed = false
            #onDismiss

            constructor(text, container, progressBar, firstToast, mobileLayout, helpLink, onDismiss) {
                  this.container = container
                  this.text = text
                  this.progressBar = progressBar
                  this.mobileLayout = mobileLayout
                  this.helpLink = helpLink
                  this.#onDismiss = onDismiss
                  this.Display(firstToast)

                  if (this.text) this.SetText(this.text)

                  this.toastElem.addEventListener("mouseenter", () => {
                        this.mouseOn = true
                        if (this.onMouseEnter) this.onMouseEnter()
                  })
                  this.toastElem.addEventListener("mouseleave", () => {
                        this.mouseOn = false
                        if (this.onMouseEnter) this.onMouseLeave()
                  })
            }

            SetText(text) {
                  this.textElem.classList.remove("toast-text-loading")

                  this.textElem.textContent = text

                  // Handle overflowing width
                  // Will not work at document creation, needs some delay
                  // Get computed sizes to compare
                  const textComputedStyle = window.getComputedStyle(this.textElemDiv)
                  const divComputedStyle = window.getComputedStyle(this.textElemDiv.parentElement)

                  // Get with as float
                  const textWidth = parseFloat(textComputedStyle.width)
                  const divWidth = parseFloat(divComputedStyle.width)

                  const overflowAmount = textWidth - divWidth
                  const scrollTime = overflowAmount * 0.02 // time for scrolling in seconds, higher multiplyer = slower movement

                  // Text is wider than div
                  if (overflowAmount > 0) {
                        this.textElemDiv.style.transition = `transform linear ${scrollTime}s`

                        // Get gradient elements next to toast text
                        let overflowLeft = this.textElemDiv.parentElement.querySelector('[id="overflowLeft"]')
                        let overflowRight = this.textElemDiv.parentElement.querySelector('[id="overflowRight"]')

                        // Show right gradient
                        overflowRight.style.opacity = 1

                        let bool = true

                        const scroll = (bool) => {
                              if (bool) {
                                    // Move text right
                                    overflowLeft.style.opacity = 1
                                    this.textElemDiv.style.transform = `translateX(-${overflowAmount}px)`
                                    setTimeout(() => {
                                          overflowRight.style.opacity = 0
                                    }, scrollTime * 1000)
                              }
                              else {
                                    // Move text left
                                    overflowRight.style.opacity = 1
                                    this.textElemDiv.style.transform = `translateX(0px)`
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

            SetInputMethod(method) {
                  if (method == "touch")
                        this.#toastAction.classList.add("toast-action-icon-touch")
                  else
                        this.#toastAction.classList.remove("toast-action-icon-touch")
            }

            Dismiss(firstElement) {
                  this.dismissed = true

                  this.toastElem.style.transition = "transform ease-in 0.2s, opacity ease-in 0.2s"
                  this.toastElem.style.zIndex = 20
                  this.toastElem.style.transform = `translateY(${this.mobileLayout ? "-" : ""}${firstElement ? 2.2 : 60}px) scale(0.9)`
                  this.toastElem.style.opacity = 0

                  setTimeout(() => {
                        this.toastElem.remove()
                  }, 200);

                  if (this.#onDismiss) this.#onDismiss()
            }

            Display(firstToast) {
                  let link = { text: "Learn more", link: "" }

                  if (typeof this.helpLink === "object")
                        link = this.helpLink

                  else link.link = this.helpLink

                  const domParser = new DOMParser()

                  // Create toast from HTML string
                  this.toastElem = domParser.parseFromString(`
      <div class="toast${this.mobileLayout ? " toast-mobile" : ""}" id="toast" style="transform: scale(${firstToast ? 0 : 0.7}); transition: transform ease ${firstToast ? 0.2 : 0.1}s, bottom ease 0.3s, top ease 0.3s;">
            <div class="toast-border"></div>
            <div class="toast-body" style="display: flex;flex-direction: row;padding: 12px;height: 20px;">
                  <div class="toast-text-overflow">
                        <div class="toast-text-overflow-gradient" style="left: 0px; transform: rotate(180deg); opacity: 0;" id="overflowLeft"></div>
                        <div id="toastTextDiv" class="toast-text-div">
                              <p class="toast-text${this.text ? "" : " toast-text-loading"}" id="toastText">${this.text ? this.text : "Loading..."}</p>
                              ${this.helpLink ? `<a class="toast-text toast-help-link" href="${link.link}">${link.text}</a>` : ""}
                        </div>
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
            <div id="loadingBar" ${this.progressBar ? "" : 'style="background: none"'} class="loading-bar"></div>
      </div>`, "text/html").getElementById("toast")

                  this.textElem = this.toastElem.querySelector('[id="toastText"]')
                  this.textElemDiv = this.toastElem.querySelector('[id="toastTextDiv"]')

                  // Add click event to dismiss button
                  this.#toastAction = this.toastElem.querySelector('[id="toastAction"]')
                  this.#toastAction.addEventListener("click", () => { this.onAction() })

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
            }
      }
}

class FlashingBorders {
      flashingBorders = []
      #stop = false;

      constructor(element, downloadButton, type, inputMethod) {
            // Touch input
            if (inputMethod == "touch") {
                  // Images
                  if (type == Downloadbutton.Image) {
                        // Create individual border segments
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

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Destroy borders after 2.4s
                        setTimeout(() => {
                              this.flashingBorders.forEach(border => border.Destroy())
                              if (this.#stop) return

                              onboardingStatus.image = true
                              browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                        }, 2400)
                  }

                  // Videos
                  else {
                        for (let i = 0; i < 3; i++) {
                              // Create individual border segments
                              const border = new FlashingBorder(
                                    element.parentElement,
                                    new FlashingBorder.BorderState(0, 0, 0),
                                    new FlashingBorder.BorderState(i, i, 5),
                                    new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                                    800
                              )
                              border.Start()

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Add listener for when user interacts with video player
                        let hasRun = false
                        element.parentElement.parentElement.addEventListener("click", () => {
                              // Destroy old borders
                              if (!hasRun) this.flashingBorders.forEach(border => border.Destroy())

                              // If onboaring has occurred for this type
                              // or this eventlistener has run
                              // or flashing borders have been stopped
                              if (
                                    onboardingStatus.video ||
                                    hasRun ||
                                    this.#stop
                              ) return

                              hasRun = true

                              this.flashingBorders = []
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

                                    this.flashingBorders.push(border)
                                    if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                                    else onboardingElements.image.push(border)
                              }

                              setTimeout(() => {
                                    this.flashingBorders.forEach(border => border.Destroy())
                                    if (this.#stop) return;

                                    onboardingStatus.video = true
                                    browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                              }, 2400)
                        })
                  }
            }

            // Mouse input
            else {
                  // Create individual border segments
                  for (let i = 0; i < 3; i++) {
                        const border = new FlashingBorder(
                              element.parentElement,
                              new FlashingBorder.BorderState(0, 0, 0),
                              new FlashingBorder.BorderState(i, i, 5),
                              new FlashingBorder.BorderState(i * 9 - i * 1.5, i * 9 - i * 1.5, 5 - i * 1.5),
                              800
                        )
                        border.Start()
                        this.flashingBorders.push(border)

                        if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                        else onboardingElements.image.push(border)
                  }

                  let hasRun = false
                  // Add hover event listener
                  element.parentElement.parentElement.addEventListener("mouseover", () => {
                        // Destroy old borders
                        if (!hasRun) this.flashingBorders.forEach(border => border.Destroy())

                        // If onboaring has occurred for this type
                        // or this eventlistener has run
                        // or flashing borders have been stopped
                        if (
                              ((type == Downloadbutton.Image && onboardingStatus.image) ||
                                    (type == Downloadbutton.Video && onboardingStatus.video)) ||
                              this.#stop ||
                              hasRun
                        ) return
                        hasRun = true

                        // Reset list
                        this.flashingBorders = []
                        // Create new border segments
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

                              this.flashingBorders.push(border)
                              if (type == Downloadbutton.Video) onboardingElements.video.push(border)
                              else onboardingElements.image.push(border)
                        }

                        // Destroy borders after 2.4s
                        setTimeout(() => {
                              this.flashingBorders.forEach(border => border.Destroy())
                              if (this.#stop) return

                              if (type == Downloadbutton.Video) onboardingStatus.video = true
                              else onboardingStatus.image = true

                              browser.runtime.sendMessage({ type: "onboarding-update", onboardingStatus: onboardingStatus })
                        }, 2400)
                  })
            }
      }

      Destroy() {
            this.#stop = true
            this.flashingBorders.forEach(flashingBorder => flashingBorder.Destroy())
      }
}

function tryRun(func, log = false) {
      try { func }
      catch (e) {
            if (log) console.log(e)
      }
}