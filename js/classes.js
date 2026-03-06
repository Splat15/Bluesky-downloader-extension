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

      // Recursively test added nodes against condition
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
      static Image = { name: "Image", ext: ".webp", id: "image" }
      static Video = { name: "Video", ext: ".mp4", id: "video" }
      static GIF = { name: "GIF", ext: ".webm", id: "gif" }
      static UploadedGIF = { name: "GIF", ext: ".mp4", id: "uploadedgif" }

      #mobileDevice = DetectMobileDevice()
      #inputMethod

      downloadButton = null
      #downloadIcon = null
      #downloadButtonDiv = null
      #progressCircle = null
      #progressCircleElem = null
      #toastManager
      #toast
      #downloading = false

      #atURI
      url
      #fileExtension
      #filePath
      #fileName

      mediaElement
      postElement

      infoScanDone = false

      rawPostInfo
      postInfoDone = false
      postInfo = {
            postID: undefined,
            hash: undefined,
            username: undefined,
            displayName: undefined,
            timestamp: undefined,
            language: undefined,
            label: undefined,
            bookmarkCount: undefined,
            replyCount: undefined,
            repostCount: undefined,
            likeCount: undefined
      }


      constructor(type, element, url, toastManager, hidden, inputMethod) {
            this.url = url
            this.type = type
            this.#toastManager = toastManager
            this.mediaElement = element
            this.#inputMethod = inputMethod


            if (this.mediaElement.textContent == "GIF") {
                  this.type = Downloadbutton.UploadedGIF
                  this.mediaElement = this.mediaElement.parentElement.parentElement
            }

            if (this.type == Downloadbutton.Image) {
                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.parentElement.appendChild(this.#downloadButtonDiv)

                  let altTextButtons = Array.from(this.mediaElement.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.style.left = "16px !important")

                  this.mediaElement.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.mediaElement.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }

            else if (this.type == Downloadbutton.Video) {
                  this.url = this.url.replace("/thumbnail.jpg", "/playlist.m3u8")

                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.parentElement.insertBefore(this.#downloadButtonDiv, this.mediaElement)
            }

            else if (this.type == Downloadbutton.GIF || this.type == Downloadbutton.UploadedGIF) {
                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.parentElement.appendChild(this.#downloadButtonDiv)

                  let altTextButtons = Array.from(this.mediaElement.parentElement.querySelectorAll('button[data-testid="altTextButton"]'))
                  altTextButtons.forEach(altTextButton => altTextButton.classList.add("alt-button-left"))

                  this.mediaElement.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.mediaElement.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
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

      // Set styling for touch devices
      SetInputSupport(inputMethod) {
            this.#inputMethod = inputMethod
            this.#downloadButtonDiv.style.opacity = this.#inputMethod == "touch" ? "1" : ""
      }

      /** Downloads the url based on type of button */
      async #Download(url) {
            try {
                  console.log("Downloading " + url)

                  if (this.#downloading) return
                  this.#downloading = true

                  this.#downloadIcon.style.opacity = 0
                  this.#CreateProgressCircle()
                  this.#progressCircle.set(0.01)

                  let toastDisplayed = false
                  setTimeout(() => {
                        if (!toastDisplayed && GetSetting("downloadToast").value) {
                              toastDisplayed = true
                              this.#toast = this.#toastManager.DisplayToast()
                        }
                  }, 300)

                  await this.#RunPostInfoScan()

                  if (!this.postInfoDone) {
                        await this.#GetInfoFromThread()
                        this.postInfoDone = true
                  }

                  this.#filePath = this.#GetFilePath()
                  this.#fileName = this.#filePath.match(/[^\/\\]+$/gi)[0]

                  this.#fileExtension = this.type.ext
                  if (this.type == Downloadbutton.GIF)
                        // Tenor and the bluesky mirrors use the last two letters of the ID to indicate format
                        if (!GetSetting("gifsAsWEBM").value) {
                              this.#fileExtension = ".gif"
                              url = url.replace(/(?<=https?:\/\/(?:\w+\.)+\w+\/[^\/]+)[^\/]{2}(?=\/)/, "AC")
                        }
                        else
                              url = url.replace(/(?<=https?:\/\/(?:\w+\.)+\w+\/[^\/]+)[^\/]{2}(?=\/)/, "P3")

                  // Fake GIFs uploaded by users need to be converted to the right format
                  if (this.type == Downloadbutton.UploadedGIF) {
                        url = url.replace("/thumbnail.jpg", "/playlist.m3u8")
                  }

                  this.#filePath += this.#fileExtension

                  if (!toastDisplayed && GetSetting("downloadToast").value) {
                        toastDisplayed = true
                        this.#toast = this.#toastManager.DisplayToast()
                  }
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
                        if (this.type != Downloadbutton.Video && this.type != Downloadbutton.UploadedGIF) {

                              // Old method without support for file paths
                              // Used on mobile devices without browser.downloads API
                              if (this.#mobileDevice) {
                                    // Get local URL
                                    const webpURL = url.replaceAll(/@jpeg$/gi, "")
                                    const file = await fetch(webpURL)
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
                                    const webpURL = url.replaceAll(/@jpeg$/gi, "")

                                    // Add listener for progress updates
                                    browser.runtime.onMessage.addListener(message => {
                                          if (message.type == "bsky-download-progress" &&
                                                message.id == id &&
                                                message.url == webpURL) {

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
                                                      this.#AddURLToHistory(webpURL)

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
                                          url: webpURL,
                                          fileType: this.type,
                                          fileExt: this.#fileExtension,
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
                                    fileType: this.type,
                                    fileExt: this.#fileExtension,
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
                  this.#downloading = false
                  this.#downloadIcon.src = Downloadbutton.Icons.Error

                  this.#toastManager.SetText(this.#toast, error)

                  setTimeout(() => {
                        this.#progressCircleElem.style.opacity = 0
                        setTimeout(() => {
                              try {
                                    this.#downloadIcon.style.opacity = 1
                                    this.#downloading = false
                                    this.#DestroyProgressCircle()
                              }
                              catch { }
                        }, 100);
                  }, 800)

                  throw new Error(error)
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
            tryRun(this.#progressCircle.destroy)
            this.#progressCircle = null;
            
            this.#progressCircleElem.remove()

            // Dismiss toast some time after mouse left
            if (this.#toast) {
                  const toast = this.#toast
                  let timeout = null

                  // Mouse was NOT on element before
                  if (!toast.mouseOn)
                        timeout = setTimeout(() => {
                              this.#toastManager.DismissToast(toast, this.#toastManager.toastList)
                        }, 3500);

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
                              }, 2500);
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

      /** Add script to doc to get uri from main thread.
       * This looks for react properties which are only accessible in the main document thread.  */
      #RunPostInfoScan() {
            return new Promise(resolve => {
                  if (this.infoScanDone) resolve()
                        
                  else {
                        this.infoScanDone = true

                        let script = document.createElement("script")
                        script.id = "uriScript"
                        this.#downloadButtonDiv.appendChild(script)

                        new MutationObserver((mutationList, observer) => {
                              let postData = script.getAttribute("post-data")
                              if (postData) {
                                    try {
                                          postData = JSON.parse(postData)
                                          this.rawPostInfo = postData.postInfo
                                          this.#atURI = postData.uri || this.rawPostInfo.uri
                                          observer.disconnect()

                                          resolve()
                                    } catch { }
                              }
                        }).observe(script, { attributes: true })

                        // Await the injection of document.js by content.js
                        mainThreadHelperLoaded.then(() => {
                              script.textContent = `
                        (function () {
                              const element = document.currentScript;
                              const postData = GetURI(element)
                              element.setAttribute("post-data", JSON.stringify(postData))
                        })()`
                        })
                  }
            })
      }

      async #GetInfoFromThread() {
            try {
                  if (!this.rawPostInfo) {
                        this.rawPostInfo = await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=" + this.#atURI)
                        this.rawPostInfo = await this.rawPostInfo.text()
                        this.rawPostInfo = JSON.parse(this.rawPostInfo)
                        this.rawPostInfo = this.rawPostInfo.thread.post
                  }

                  const newPostInfo = await GetInfoFromThread(this.rawPostInfo, this.#atURI, this.url)
                  this.postInfo = { ...this.postInfo, ...newPostInfo }
                  this.postInfo.type = this.type.name

                  return
            } catch (e) { console.error(e) }
      }

      #GetFilePath() {
            return GetFilePath(this.postInfo)
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

const pathVars = {
      username: { name: "Username", desc: "Username of the poster.", default: "error", tags: ["username", "user", "tag", "handle"] },
      displayName: { name: "Display name", desc: "Display name of the poster.", default: "error", tags: ["displayname", "poster", "name"] },
      fileName: { name: "File name", desc: "Username of the poster, the ID of the post and, on multi-image posts, which image is being downloaded.", default: "error-0000000000000-1", tags: ["filename", "file"] },
      postID: { name: "Post ID", desc: "ID of the post.", default: "0000000000000", tags: ["postid", "id", "rkey", "record", "recordkey"] },
      hash: { name: "Hash", desc: "Hash of the file URL.", default: "0", tags: ["hash"] },
      type: { name: "Type", desc: "Media type of the post.", default: "Image", tags: ["type", "media", "mediatype", "posttype", "format"] },
      timestamp: { name: "Age", desc: "Approximate age of the post, example: 15h.", default: "0s", tags: ["age", "time", "timestamp"] },
      language: { name: "Language", desc: "Language of the post as a country code.", default: "en", tags: ["lang", "language"] },
      label: { name: "Label", desc: "Label of the post. Either SFW, NSFW or Graphic.", default: "SFW", tags: ["label", "labels", "nsfw", "sfw", "warning"] },
      bookmarkCount: { name: "Bookmarks", desc: "Amount of times the post has been bookmarked.", default: "0", tags: ["bookmarks", "bookmark", "bookmarked"] },
      replyCount: { name: "Replies", desc: "Amount of replies to the post.", default: "0", tags: ["replies", "replys", "reply", "replied", "comments", "comment"] },
      repostCount: { name: "Reposts", desc: "Amount of reposts of the post.", default: "0", tags: ["reposts", "repost", "reposted"] },
      likeCount: { name: "Likes", desc: "Amount of likes on the post.", default: "0", tags: ["likes", "like", "liked"] },
      mediaIndex: { name: "Media index", desc: "Number from 1-4 that indicates which of the post's media files is being downloaded.", default: "1", tags: ["index", "mediaindex"] },

      // Date components
      year: { name: "Year", desc: "Year of the post date.", default: "0000", tags: ["year", "y"] },
      year2: { name: "Year (two digits)", desc: "Truncated year of the post date.", default: "00", tags: ["year2", "y2"] },
      month: { name: "Month ", desc: "Month of the post date.", default: "0", tags: ["month", "mo"] },
      day: { name: "Day", desc: "Day of the post date.", default: "0", tags: ["day", "d"] },
      hour: { name: "Hour", desc: "Hour of the post date.", default: "0", tags: ["hour", "h"] },
      hour12: { name: "Hour (12hr)", desc: "Hour of the post date in 12hr format.", default: "0", tags: ["hour12", "h12"] },
      minute: { name: "Minute", desc: "Minute of the post date.", default: "0", tags: ["minute", "m"] },
      second: { name: "Second", desc: "Second of the post date.", default: "0", tags: ["second", "s"] }
}

function GetFilePath(properties, pathTemplate = null) {
      try {
            let tempProperties = structuredClone(properties)
            // Sanitizing inputs by replacing slashes with invalid characters which will be removed later
            try {
                  tempProperties.username = tempProperties.username.replaceAll(/\/\\/gi, "#")
                  tempProperties.displayName = tempProperties.displayName.replaceAll(/\/\\/gi, "#")
                  tempProperties.fileName = tempProperties.fileName.replaceAll(/\/\\/gi, "#")
                  tempProperties.timestamp = GetApproximateAge(tempProperties.timestamp)
            } catch { }

            if (pathTemplate === null) pathTemplate = GetSetting("downloadPath").value

            if (DetectMobileDevice()) pathTemplate = pathTemplate.replaceAll(/[\/\\]+/gi, "")


            Object.keys(pathVars).forEach(key => {
                  console.log(key + ":", tempProperties[key])
                  pathTemplate = pathTemplate.replaceAll(
                        new RegExp(`%(${pathVars[key].tags.join("|")})%`, "gi"),
                        tempProperties[key] || pathVars[key].default
                  )
            })

            // Sanitize path for compatibility
            pathTemplate = pathTemplate.replaceAll(/\\{1, 2}/g, "/") // Replace backslashes with forward slashes
                  .replaceAll(/[^\/\w+-]+(?=$|\/)/g, "") // Truncate special characters at the end "file /file 🏳️‍⚧️" => "file/file"
                  .replaceAll(/[^\/\w+ -.]/g, "_") // Replace special characters in the middle "files 01/file@01" => "files_01/file_01"
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


async function GetInfoFromThread(postInfo, atURI, url) {
      try {
            let info = {}
            let record = postInfo.record
            let media = ProcessMedia(record.embed)

            // URI doesn't match, try quoted post
            let mediaIndex = media.indexOf(media.find(cid => url.includes(cid)))
            if (mediaIndex == -1) {
                  postInfo = postInfo.embed.record.record || postInfo.embed.record
                  record = postInfo.value

                  atURI = postInfo.uri

                  media = ProcessMedia(record.embed)
                  mediaIndex = media.indexOf(media.find(cid => url.includes(cid)))
            }
            mediaIndex++
            if (mediaIndex == 1 && media.length == 1) mediaIndex = 0

            const date = new Date(record.createdAt)

            tryRun((() => info.postID = atURI.match(/[^\/]+$/)[0]))
            tryRun((() => info.hash = GenerateHash(url)))

            tryRun((() => info.username = postInfo.author.handle))
            tryRun((() => info.displayName = postInfo.author.displayName))
            tryRun((() => info.fileName = info.username + "-" + info.postID + (mediaIndex != 0 ? "-" + mediaIndex : "")))
            tryRun((() => info.timestamp = date))
            tryRun((() => info.language = record.langs[0]))
            tryRun((() => info.label = ProcessLabels(postInfo.labels)))

            tryRun((() => info.bookmarkCount = postInfo.bookmarkCount))
            tryRun((() => info.replyCount = postInfo.replyCount))
            tryRun((() => info.repostCount = postInfo.repostCount + postInfo.quoteCount))
            tryRun((() => info.likeCount = postInfo.likeCount))
            tryRun((() => info.mediaIndex = Math.max(mediaIndex, 1)))

            tryRun((() => info.year = date.getFullYear()))
            tryRun((() => info.year2 = date.getFullYear() % 1000))
            tryRun((() => info.month = date.getMonth() + 1))
            tryRun((() => info.day = date.getDate()))
            tryRun((() => info.hour = date.getHours()))
            tryRun((() => info.hour12 = convert24rTo12hr(date.getHours())))
            tryRun((() => info.minute = date.getMinutes()))
            tryRun((() => info.second = date.getSeconds()))

            return info
      }
      catch (e) {
            console.error("Error while parsing post information: " + e)
            return false
      }

}


function ProcessMedia(media) {
      if (!media) return null
      let mediaURLs = []

      // Handle quote posts with media
      if (media.$type == "app.bsky.embed.recordWithMedia") {
            media = media.media
      }

      // Handle images
      if (media.$type == "app.bsky.embed.images") {
            media.images.forEach(image => mediaURLs.push(image.image.ref.$link))
      }
      // Handle videos
      else if (media.$type == "app.bsky.embed.video") {
            mediaURLs.push(media.video.ref.$link)
      }
      // Handle external media such as tenor gifs
      else if (media.$type == "app.bsky.embed.external") {
            try {
                  // Tenor encodes desired format as 2 letters at the end of the ID
                  // media.tenor.com/*P3/*.gif => .webm
                  // media.tenor.com/*AC/*.gif => .gif

                  // Match GIF ID from tenor posts or website URLs with similar structure
                  mediaURLs.push(media.external.uri.match(/https?:\/\/(?:\w+\.)+\w+\/([^\/]+)[^\/]{2}\//)[1])
            }
            catch {
                  //window.alert("non tenor external media: " + media.external.uri)
            }
      }
      return mediaURLs
}


function ProcessLabels(labels) {
      // Severity of label from 0 to 2
      let labelScore = 0
      // Translation from label score to friendly names by index
      let friendlyNames = ["SFW", "NSFW", "Graphic"]
      // Assignment of severity per label
      let labelVals = [["porn", 1], ["sex", 1], ["nudity", 1], ["graphic-media", 2]]

      if (labels) {
            for (let i = 0; i < labels.length && labelScore != 2; i++) {
                  let label = labels[i].val
                  let labelVal = labelVals.find(element => label.includes(element[0]))[1] || 0
                  if (labelVal && labelVal > labelScore)
                        labelScore = labelVal
            }
      }
      return friendlyNames[labelScore]
}

function GetApproximateAge(date) {
      let ageStr

      const timeDiffS = (Date.now() - date) / 1000 // Age in seconds
      const secondsInYear = 31536000 // Seconds in 365 days
      const secondsInDay = 86400
      const secondsInHour = 3600
      const secondsInMinute = 60

      if (timeDiffS >= secondsInYear)
            ageStr = Math.round(timeDiffS / secondsInYear) + "y"
      else if (timeDiffS >= secondsInDay)
            ageStr = Math.round(timeDiffS / secondsInDay) + "d"
      else if (timeDiffS >= secondsInHour)
            ageStr = Math.round(timeDiffS / secondsInHour) + "h"
      else if (timeDiffS >= secondsInMinute)
            ageStr = Math.round(timeDiffS / secondsInMinute) + "m"
      else
            ageStr = Math.round(timeDiffS) + "s"

      return ageStr
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
                  const scrollTime = overflowAmount * 0.02 // time for scrolling in seconds, higher multiplier = slower movement

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
      try { func() }
      catch (e) {
            if (log) console.log(e)
      }
}

// Like querySelector but working outwards through parents
function OuterQuerySelector(element, selector) {
      while (!element.matches(selector)) {
            if (element == document.body)
                  return false
            element = element.parentElement
      }
      return element
}

function convert24rTo12hr(hour) {
      if (hour <= 11) {
            if (hour == 0)
                  return "12AM"
            return hour + "AM"
      }
      else {
            if (hour == 12)
                  return "12PM"
            return (hour % 12) + "PM"
      }
}