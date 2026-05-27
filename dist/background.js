/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "../js/classes.js"
/*!************************!*\
  !*** ../js/classes.js ***!
  \************************/
() {

const documentStartTime = Date.now()
let numLogs = 0

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

      static MimeTypes = {
            ".jpg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".webm": "video/webm",
            ".mp4": "video/mp4",
      }

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
      #settings

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
            did: undefined,
            username: undefined,
            displayName: undefined,
            timestamp: undefined,
            language: undefined,
            label: undefined,
            cid: undefined,
            bookmarkCount: undefined,
            replyCount: undefined,
            repostCount: undefined,
            likeCount: undefined
      }


      constructor(type, element, url, setings, toastManager, hidden, inputMethod) {
            this.url = url
            this.type = type
            this.settings = settings
            this.#toastManager = toastManager
            this.mediaElement = element
            this.#inputMethod = inputMethod

            console.info(log("Creating download button of type " + type.name + " for URL: " + url))

            if (this.mediaElement.textContent == "GIF") {
                  this.type = Downloadbutton.UploadedGIF
                  this.mediaElement = this.mediaElement.parentElement.parentElement
            }

            if (this.type == Downloadbutton.Image) {
                  this.url = this.url.replace("/feed_thumbnail/", "/feed_fullsize/")

                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.parentElement.appendChild(this.#downloadButtonDiv)

                  this.mediaElement.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.mediaElement.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
            }

            else if (this.type == Downloadbutton.Video) {
                  this.url = this.url.replace("/thumbnail.jpg", "/playlist.m3u8")

                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.after(this.#downloadButtonDiv)
            }

            else if (this.type == Downloadbutton.GIF || this.type == Downloadbutton.UploadedGIF) {
                  this.mediaElement.downloadButton = true
                  this.#GetDownloadButton(this.url, hidden)
                  this.mediaElement.parentElement.appendChild(this.#downloadButtonDiv)

                  this.mediaElement.parentElement.parentElement.addEventListener("mouseover", () => this.#downloadButtonDiv.classList.add("download-button-div-hover"))
                  this.mediaElement.parentElement.parentElement.addEventListener("mouseout", () => this.#downloadButtonDiv.classList.remove("download-button-div-hover"))
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
                        this.Download(url);
                  })

            return downloadButton
      }

      // Set styling for touch devices
      SetInputSupport(inputMethod) {
            this.#inputMethod = inputMethod
            this.#downloadButtonDiv.style.opacity = this.#inputMethod == "touch" ? "1" : ""
      }

      /** Downloads the url based on type of button */
      async Download(url) {
            try {
                  const originalURL = url

                  let imagesAsWEBP = undefined;
                  let imgQualityMode = undefined;
                  let imgQuality = undefined;

                  console.log(log("Downloading " + url))

                  if (this.#downloading) return
                  this.#downloading = true

                  this.#downloadIcon.style.opacity = 0
                  this.#CreateProgressCircle()
                  this.#progressCircle.set(0.01)

                  // Delay toast for up to 300ms to allow the post info to be fetched
                  let toastDisplayed = false
                  setTimeout(() => {
                        if (!toastDisplayed && GetSetting("downloadToast", this.settings).value) {
                              toastDisplayed = true
                              this.#toast = this.#toastManager.DisplayToast()
                        }
                  }, 300)

                  if (!this.postInfoDone) {
                        // Fetch raw post data from main thread
                        await this.#RunPostInfoScan()

                        // Analyze raw post data
                        await this.#GetInfoFromThread()
                        this.postInfoDone = true
                  }

                  this.#filePath = this.#GetFilePath()
                  this.#fileName = this.#filePath.match(/[^\/\\]+$/gi)[0]

                  this.#fileExtension = this.type.ext
                  if (this.type == Downloadbutton.GIF) {
                        // Tenor and the bluesky mirrors use the last two letters of the ID to indicate format
                        if (GetSetting("gifsAsGIF", this.settings).value) {
                              this.#fileExtension = ".gif"

                              url = url.replace(/(?<=https?:\/\/(?:\w+\.)+\w+\/[^\/]+)[^\/]{2}(?=\/)/, "AC")
                        }
                        else
                              url = url.replace(/(?<=https?:\/\/(?:\w+\.)+\w+\/[^\/]+)[^\/]{2}(?=\/)/, "P3")
                  }

                  // Fake GIFs uploaded by users need to be converted to the right format
                  else if (this.type == Downloadbutton.UploadedGIF) {
                        url = url.replace("/thumbnail.jpg", "/playlist.m3u8")

                        if (GetSetting("gifsAsGIF", this.settings).value)
                              this.#fileExtension = ".gif"
                  }

                  // If reqested, change file extension to .jpg
                  else if (this.type == Downloadbutton.Image) {
                        // Get relevant settings
                        imagesAsWEBP = GetSetting("imagesAsWEBP", this.settings).value
                        imgQualityMode = GetSetting("imgQualityMode", this.settings).value
                        imgQuality = GetSetting("imgQuality", this.settings).value

                        // Override file extension
                        if (!imagesAsWEBP)
                              this.#fileExtension = ".jpg"

                        if (imgQualityMode) {
                              // Change URL to API to get better quality
                              url = `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${this.postInfo.did}&cid=${this.postInfo.cid}`
                        }
                        else {
                              if (imagesAsWEBP)
                                    // Remove "@jpeg" modifier if present
                                    url = url.replaceAll(/@jpeg$/gi, "")
                              else
                                    // Add "@jpeg" modifier if not present
                                    url = url.replaceAll(/(?<!@jpeg)$/gi, "@jpeg")
                        }
                  }

                  this.#filePath += this.#fileExtension

                  // Display toast if not yet displayed
                  if (!toastDisplayed && GetSetting("downloadToast", this.settings).value) {
                        toastDisplayed = true
                        this.#toast = this.#toastManager.DisplayToast()
                  }
                  // Set toast text to file name
                  if (this.#toast) this.#toastManager.SetText(this.#toast, this.#fileName + this.#fileExtension)

                  // Purely cosmetic, delays download for 200ms to let the transition progress
                  await new Promise((resolve) => {
                        setTimeout(() => {
                              this.#progressCircleElem.style.opacity = 1
                              resolve()
                        }, 200);
                  })

                  try {
                        console.info(log("Sending download to background script"))

                        // Generate process ID
                        const downloadProcessId = Date.now()

                        // Add listener for progress updates
                        browser.runtime.onMessage.addListener(message => {
                              if (message.type == "bsky-download-progress" &&
                                    message.id == downloadProcessId &&
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
                                          console.log(log("Download successful"))

                                          Downloadbutton.AddURLToHistory(originalURL)

                                          if (message.fileBlob) {
                                                let fileURL = URL.createObjectURL(message.fileBlob)
                                                const a = document.createElement('a');
                                                a.download = this.#fileName + this.#fileExtension;
                                                a.href = fileURL;

                                                a.click();

                                                window.URL.revokeObjectURL(fileURL)
                                                a.remove()
                                          }

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

                        // Send download request
                        browser.runtime.sendMessage({
                              type: "bsky-download",
                              downloadInfo: {
                                    id: downloadProcessId,
                                    url: url,
                                    originalURL: originalURL,
                                    fileType: this.type,
                                    fileName: this.#fileName,
                                    fileExt: this.#fileExtension,
                                    filePath: this.#filePath,
                                    mimeType: Downloadbutton.MimeTypes[this.#fileExtension],
                                    imgCompression: imgQualityMode,
                                    imgQuality: imgQuality
                              }
                        })
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
      static AddURLToHistory(url) {
            try {
                  let _storage = JSON.parse(localStorage.getItem("downloadedURLs")) || [];

                  const hash = GenerateHash(url)
                  if (_storage.indexOf(hash) == -1) {
                        _storage.push(hash)

                        localStorage.setItem("downloadedURLs", JSON.stringify(_storage))
                  }
            }
            catch (error) {
                  console.error(log("Error while adding URL to history: " + error))
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
                  console.error(log("Error while fetching URL from history: " + error))
                  return false
            }
      }

      /** Add script to document to get uri from main thread.
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
                        (async function () {
                              const element = document.currentScript;
                              const postData = await GetURI(element)
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
            } catch (e) {
                  console.error(log("Error while fetching thread information: " + e))
            }
      }

      #GetFilePath() {
            return GetFilePath(this.postInfo, this.settings)
      }
}

// Resume a download without a download button
function ResumeUnfinishedDownload(downloadInfo, toastManager) {
      // Display toast
      const toast = toastManager.DisplayToast(downloadInfo.fileName)

      browser.runtime.onMessage.addListener(message => {
            if (message.type == "bsky-download-progress" &&
                  message.id == downloadInfo.id &&
                  message.url == downloadInfo.url) {

                  if (message.hasOwnProperty("error")) {
                        throw new Error(message.error)
                  }

                  const progress = message.progress / 100
                  if (toast) toastManager.SetProgress(toast, progress)

                  // Download is finished
                  if (message.progress >= 100) {
                        console.log(log("Download successful"))

                        Downloadbutton.AddURLToHistory(downloadInfo.originalURL)

                        if (message.fileBlob) {
                              let fileURL = URL.createObjectURL(message.fileBlob)
                              const a = document.createElement('a');
                              a.download = downloadInfo.fileName + downloadInfo.fileExt;
                              a.href = fileURL;

                              a.click();

                              window.URL.revokeObjectURL(fileURL)
                              a.remove()
                        }
                  }
            }
      })

      // Send job to background script
      browser.runtime.sendMessage({
            type: "bsky-download",
            downloadInfo: downloadInfo
      })
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

function GetFilePath(properties, settings, pathTemplate = null) {
      try {
            let tempProperties = structuredClone(properties)
            // Sanitizing inputs by replacing slashes with invalid characters which will be removed later
            try {
                  tempProperties.username = tempProperties.username.replaceAll(/\/\\/gi, "#")
                  tempProperties.displayName = tempProperties.displayName.replaceAll(/\/\\/gi, "#")
                  tempProperties.fileName = tempProperties.fileName.replaceAll(/\/\\/gi, "#")
                  tempProperties.timestamp = GetApproximateAge(tempProperties.timestamp)
            } catch { }

            if (pathTemplate === null) pathTemplate = GetSetting("downloadPath", settings).value

            if (DetectMobileDevice()) pathTemplate = pathTemplate.replaceAll(/[\/\\]+/gi, "")


            Object.keys(pathVars).forEach(key => {
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
            console.error(log("Invalid file path template: " + e))
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

function GetSetting(settingId, settings) {
      console.info(log("Fetching setting: " + settingId))
      if (!settings) {
            console.error(log("No settings provided"))
            return
      }
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
      console.info(log("Overwriting setting: " + settingId + " => " + value))
      browser.runtime.sendMessage({ type: "set-setting", settingId: settingId, value: value })
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        return true
                  }
            }
      }

      return false
}


async function GetInfoFromThread(postInfo, atURI, url) {
      try {
            console.info(log("Getting post info from thread"))
            let info = {}
            let record = postInfo.record
            let media = ProcessMedia(record.embed)

            // URI doesn't match, try quoted post
            let cid = media.find(cid => url.includes(cid))
            let mediaIndex = media.indexOf(cid)
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
            tryRun((() => info.did = postInfo.author.did))
            tryRun((() => info.displayName = postInfo.author.displayName))
            tryRun((() => info.fileName = info.username + "-" + info.postID + (mediaIndex != 0 ? "-" + mediaIndex : "")))
            tryRun((() => info.timestamp = date))
            tryRun((() => info.language = record.langs[0]))
            tryRun((() => info.label = ProcessLabels(postInfo.labels)))
            tryRun((() => info.cid = cid))

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
            console.error(log("Error while parsing post information: " + e))
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
            if (this.mobileLayout)
                  this.toastContainer.style.top = "0px"
            else
                  this.toastContainer.style.top = ""
            document.body.appendChild(this.toastContainer)

            window.addEventListener("resize", () => {
                  const mobileLayout = window.innerHeight > window.innerWidth

                  if (this.mobileLayout != mobileLayout) {
                        this.mobileLayout = mobileLayout

                        if (this.mobileLayout)
                              this.toastContainer.style.top = "0px"
                        else
                              this.toastContainer.style.top = ""

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
            console.log(log("Displaying toast"))
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
            if (log) console.error(log(e))
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

// Add formatting, timestamps and numbering to logs
function log(text) {
      try {
            numLogs++;
            // Count up number of logs, display document time and input text
            return `${textPadFactor(numLogs.toString(), 3)} ${textPadFactor((Date.now() - documentStartTime).toString(), 6)}   ${text}`
      } catch (e) {
            console.error("Error during logging")
            console.error(e)
      }
}

// Pads text input length to a multiple of the factor
function textPadFactor(text, factor, paddingChar = " ", minLen) {
      while (text.length % factor != 0)
            text = paddingChar + text
      return text
}

function GetApproxFileSize(quality, format) {
      const q = Math.max(quality / 100, 0.01)
      let apprFileSize

      if (!quality && quality !== 0) console.error(log("No quality provided"))
      else if (!format) console.error(log("No format provided"))

      else if (format == "image/webp") {
            apprFileSize = 70 * q + 20 + Math.pow(q + 0.3, 20)
      }
      else {
            apprFileSize = 60 * Math.pow(q, 2) + 0.1 * Math.pow(q + 0.3, 34) + 30
      }
      apprFileSize = Math.round(apprFileSize)
      return apprFileSize + "kb"
}

function isVersionNewer(oldVer, newVer) {
      try {
            if (!oldVer) return true
            if (!newVer) return undefined
            oldVer = oldVer.split(".")
            newVer = newVer.split(".")

            for (let i = 0; i < newVer.length; i++) {
                  const newVerComp = Number(newVer[i])
                  const oldVerComp = Number(oldVer[i])

                  if (newVerComp > oldVerComp)
                        return true
                  else if (newVerComp < oldVerComp)
                        return false
            }
            return false
      } catch (e) {
            console.error(e)
            return undefined
      }
}

class FullScreenPopup {
      headerText
      text
      options
      onDismiss

      containerElem
      popupElem
      buttonDiv

      constructor(headerText, text = "", options = [], onDismiss = () => { }) {
            this.headerText = headerText
            this.text = text
            this.options = options
            this.onDismiss = onDismiss

            const domParser = new DOMParser()
            this.containerElem = domParser.parseFromString(`
            <div class="bsky-downloader-popup-container" id="downloaderPopupContainer">
                  <div class="bsky-downloader-popup" id="downloaderPopup">
                        <div style="padding: 24px;">
                              <div class="bsky-downloader-popup-text-container">
                                    <p class="bsky-downloader-popup-header" id="downloaderPopupHeader">${this.headerText}</p>
                                    <p class="bsky-downloader-popup-text" id="downloaderPopupText">${this.text}</p>
                              </div>
                              <div class="bsky-downloader-popup-button-div" id="downloaderPopupButtonDiv">
                              </div>
                        </div>
                  </div>
            </div>
            `, "text/html").body.firstElementChild

            this.popupElem = this.containerElem.querySelector("#downloaderPopup");
            this.buttonDiv = this.containerElem.querySelector("#downloaderPopupButtonDiv");

            for (let i = 0; i < options.length; i++) {
                  const option = options[i]
                  const button = option.GetElement()

                  button.addEventListener("click", option.onClick || (() => this.Dismiss()))

                  this.buttonDiv.appendChild(button)
            }

            this.popupElem.addEventListener("click", e => e.stopPropagation())

            this.containerElem.addEventListener("click", () => {
                  this.containerElem.remove()
            })

            document.body.appendChild(this.containerElem)

            setTimeout(() => {
                  this.containerElem.style.opacity = "1"
                  this.popupElem.style.transform = "scale(1)"
            }, 50)
      }

      Dismiss() {
            this.containerElem.style.opacity = "0"
            this.popupElem.style.transform = "scale(0.95)"
            this.containerElem.style.pointerEvents = "none"
            setTimeout(() => {
                  this.containerElem.remove()
            }, 300)

            this.onDismiss()
      }

      static PopupOption = class PopupOption {
            text;
            onClick;
            primaryButton;

            constructor(text = "Empty", onClick = null, primaryButton = true) {
                  this.text = text
                  this.onClick = onClick
                  this.primaryButton = primaryButton
            }

            GetElement() {
                  const button = document.createElement("input")
                  button.type = "button"
                  button.value = this.text

                  button.classList.add("bsky-downloader-popup-button")
                  if (!this.primaryButton)
                        button.classList.add("bsky-downloader-popup-button-secondary")

                  return button
            }
      }
}

/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js"
/*!**********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js ***!
  \**********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FFmpeg: () => (/* binding */ FFmpeg)
/* harmony export */ });
/* harmony import */ var _const_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./const.js */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/const.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/utils.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./errors.js */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js");



/**
 * Provides APIs to interact with ffmpeg web worker.
 *
 * @example
 * ```ts
 * const ffmpeg = new FFmpeg();
 * ```
 */
class FFmpeg {
    #worker = null;
    /**
     * #resolves and #rejects tracks Promise resolves and rejects to
     * be called when we receive message from web worker.
     */
    #resolves = {};
    #rejects = {};
    #logEventCallbacks = [];
    #progressEventCallbacks = [];
    loaded = false;
    /**
     * register worker message event handlers.
     */
    #registerHandlers = () => {
        if (this.#worker) {
            this.#worker.onmessage = ({ data: { id, type, data }, }) => {
                switch (type) {
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.LOAD:
                        this.loaded = true;
                        this.#resolves[id](data);
                        break;
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.MOUNT:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.UNMOUNT:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.EXEC:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.FFPROBE:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.WRITE_FILE:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.READ_FILE:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.DELETE_FILE:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.RENAME:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.CREATE_DIR:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.LIST_DIR:
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.DELETE_DIR:
                        this.#resolves[id](data);
                        break;
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.LOG:
                        this.#logEventCallbacks.forEach((f) => f(data));
                        break;
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.PROGRESS:
                        this.#progressEventCallbacks.forEach((f) => f(data));
                        break;
                    case _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.ERROR:
                        this.#rejects[id](data);
                        break;
                }
                delete this.#resolves[id];
                delete this.#rejects[id];
            };
        }
    };
    /**
     * Generic function to send messages to web worker.
     */
    #send = ({ type, data }, trans = [], signal) => {
        if (!this.#worker) {
            return Promise.reject(_errors_js__WEBPACK_IMPORTED_MODULE_2__.ERROR_NOT_LOADED);
        }
        return new Promise((resolve, reject) => {
            const id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getMessageID)();
            this.#worker && this.#worker.postMessage({ id, type, data }, trans);
            this.#resolves[id] = resolve;
            this.#rejects[id] = reject;
            signal?.addEventListener("abort", () => {
                reject(new DOMException(`Message # ${id} was aborted`, "AbortError"));
            }, { once: true });
        });
    };
    on(event, callback) {
        if (event === "log") {
            this.#logEventCallbacks.push(callback);
        }
        else if (event === "progress") {
            this.#progressEventCallbacks.push(callback);
        }
    }
    off(event, callback) {
        if (event === "log") {
            this.#logEventCallbacks = this.#logEventCallbacks.filter((f) => f !== callback);
        }
        else if (event === "progress") {
            this.#progressEventCallbacks = this.#progressEventCallbacks.filter((f) => f !== callback);
        }
    }
    /**
     * Loads ffmpeg-core inside web worker. It is required to call this method first
     * as it initializes WebAssembly and other essential variables.
     *
     * @category FFmpeg
     * @returns `true` if ffmpeg core is loaded for the first time.
     */
    load = ({ classWorkerURL, ...config } = {}, { signal } = {}) => {
        if (!this.#worker) {
            this.#worker = classWorkerURL ?
                new Worker(__webpack_require__("../node_modules/@ffmpeg/ffmpeg/dist/esm sync recursive")(classWorkerURL), {
                    type: "module",
                }) :
                // We need to duplicated the code here to enable webpack
                // to bundle worekr.js here.
                new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("node_modules_ffmpeg_ffmpeg_dist_esm_worker_js"), __webpack_require__.b), {
                    type: undefined,
                });
            this.#registerHandlers();
        }
        return this.#send({
            type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.LOAD,
            data: config,
        }, undefined, signal);
    };
    /**
     * Execute ffmpeg command.
     *
     * @remarks
     * To avoid common I/O issues, ["-nostdin", "-y"] are prepended to the args
     * by default.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * await ffmpeg.writeFile("video.avi", ...);
     * // ffmpeg -i video.avi video.mp4
     * await ffmpeg.exec(["-i", "video.avi", "video.mp4"]);
     * const data = ffmpeg.readFile("video.mp4");
     * ```
     *
     * @returns `0` if no error, `!= 0` if timeout (1) or error.
     * @category FFmpeg
     */
    exec = (
    /** ffmpeg command line args */
    args, 
    /**
     * milliseconds to wait before stopping the command execution.
     *
     * @defaultValue -1
     */
    timeout = -1, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.EXEC,
        data: { args, timeout },
    }, undefined, signal);
    /**
     * Execute ffprobe command.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * await ffmpeg.writeFile("video.avi", ...);
     * // Getting duration of a video in seconds: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.avi -o output.txt
     * await ffmpeg.ffprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", "video.avi", "-o", "output.txt"]);
     * const data = ffmpeg.readFile("output.txt");
     * ```
     *
     * @returns `0` if no error, `!= 0` if timeout (1) or error.
     * @category FFmpeg
     */
    ffprobe = (
    /** ffprobe command line args */
    args, 
    /**
     * milliseconds to wait before stopping the command execution.
     *
     * @defaultValue -1
     */
    timeout = -1, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.FFPROBE,
        data: { args, timeout },
    }, undefined, signal);
    /**
     * Terminate all ongoing API calls and terminate web worker.
     * `FFmpeg.load()` must be called again before calling any other APIs.
     *
     * @category FFmpeg
     */
    terminate = () => {
        const ids = Object.keys(this.#rejects);
        // rejects all incomplete Promises.
        for (const id of ids) {
            this.#rejects[id](_errors_js__WEBPACK_IMPORTED_MODULE_2__.ERROR_TERMINATED);
            delete this.#rejects[id];
            delete this.#resolves[id];
        }
        if (this.#worker) {
            this.#worker.terminate();
            this.#worker = null;
            this.loaded = false;
        }
    };
    /**
     * Write data to ffmpeg.wasm.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * await ffmpeg.writeFile("video.avi", await fetchFile("../video.avi"));
     * await ffmpeg.writeFile("text.txt", "hello world");
     * ```
     *
     * @category File System
     */
    writeFile = (path, data, { signal } = {}) => {
        const trans = [];
        if (data instanceof Uint8Array) {
            trans.push(data.buffer);
        }
        return this.#send({
            type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.WRITE_FILE,
            data: { path, data },
        }, trans, signal);
    };
    mount = (fsType, options, mountPoint) => {
        const trans = [];
        return this.#send({
            type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.MOUNT,
            data: { fsType, options, mountPoint },
        }, trans);
    };
    unmount = (mountPoint) => {
        const trans = [];
        return this.#send({
            type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.UNMOUNT,
            data: { mountPoint },
        }, trans);
    };
    /**
     * Read data from ffmpeg.wasm.
     *
     * @example
     * ```ts
     * const ffmpeg = new FFmpeg();
     * await ffmpeg.load();
     * const data = await ffmpeg.readFile("video.mp4");
     * ```
     *
     * @category File System
     */
    readFile = (path, 
    /**
     * File content encoding, supports two encodings:
     * - utf8: read file as text file, return data in string type.
     * - binary: read file as binary file, return data in Uint8Array type.
     *
     * @defaultValue binary
     */
    encoding = "binary", { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.READ_FILE,
        data: { path, encoding },
    }, undefined, signal);
    /**
     * Delete a file.
     *
     * @category File System
     */
    deleteFile = (path, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.DELETE_FILE,
        data: { path },
    }, undefined, signal);
    /**
     * Rename a file or directory.
     *
     * @category File System
     */
    rename = (oldPath, newPath, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.RENAME,
        data: { oldPath, newPath },
    }, undefined, signal);
    /**
     * Create a directory.
     *
     * @category File System
     */
    createDir = (path, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.CREATE_DIR,
        data: { path },
    }, undefined, signal);
    /**
     * List directory contents.
     *
     * @category File System
     */
    listDir = (path, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.LIST_DIR,
        data: { path },
    }, undefined, signal);
    /**
     * Delete an empty directory.
     *
     * @category File System
     */
    deleteDir = (path, { signal } = {}) => this.#send({
        type: _const_js__WEBPACK_IMPORTED_MODULE_0__.FFMessageType.DELETE_DIR,
        data: { path },
    }, undefined, signal);
}


/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/const.js"
/*!********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/const.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CORE_URL: () => (/* binding */ CORE_URL),
/* harmony export */   CORE_VERSION: () => (/* binding */ CORE_VERSION),
/* harmony export */   FFMessageType: () => (/* binding */ FFMessageType),
/* harmony export */   MIME_TYPE_JAVASCRIPT: () => (/* binding */ MIME_TYPE_JAVASCRIPT),
/* harmony export */   MIME_TYPE_WASM: () => (/* binding */ MIME_TYPE_WASM)
/* harmony export */ });
const MIME_TYPE_JAVASCRIPT = "text/javascript";
const MIME_TYPE_WASM = "application/wasm";
const CORE_VERSION = "0.12.9";
const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;
var FFMessageType;
(function (FFMessageType) {
    FFMessageType["LOAD"] = "LOAD";
    FFMessageType["EXEC"] = "EXEC";
    FFMessageType["FFPROBE"] = "FFPROBE";
    FFMessageType["WRITE_FILE"] = "WRITE_FILE";
    FFMessageType["READ_FILE"] = "READ_FILE";
    FFMessageType["DELETE_FILE"] = "DELETE_FILE";
    FFMessageType["RENAME"] = "RENAME";
    FFMessageType["CREATE_DIR"] = "CREATE_DIR";
    FFMessageType["LIST_DIR"] = "LIST_DIR";
    FFMessageType["DELETE_DIR"] = "DELETE_DIR";
    FFMessageType["ERROR"] = "ERROR";
    FFMessageType["DOWNLOAD"] = "DOWNLOAD";
    FFMessageType["PROGRESS"] = "PROGRESS";
    FFMessageType["LOG"] = "LOG";
    FFMessageType["MOUNT"] = "MOUNT";
    FFMessageType["UNMOUNT"] = "UNMOUNT";
})(FFMessageType || (FFMessageType = {}));


/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js"
/*!*********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ERROR_IMPORT_FAILURE: () => (/* binding */ ERROR_IMPORT_FAILURE),
/* harmony export */   ERROR_NOT_LOADED: () => (/* binding */ ERROR_NOT_LOADED),
/* harmony export */   ERROR_TERMINATED: () => (/* binding */ ERROR_TERMINATED),
/* harmony export */   ERROR_UNKNOWN_MESSAGE_TYPE: () => (/* binding */ ERROR_UNKNOWN_MESSAGE_TYPE)
/* harmony export */ });
const ERROR_UNKNOWN_MESSAGE_TYPE = new Error("unknown message type");
const ERROR_NOT_LOADED = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
const ERROR_TERMINATED = new Error("called FFmpeg.terminate()");
const ERROR_IMPORT_FAILURE = new Error("failed to import ffmpeg-core.js");


/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/index.js"
/*!********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/index.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FFFSType: () => (/* reexport safe */ _types_js__WEBPACK_IMPORTED_MODULE_1__.FFFSType),
/* harmony export */   FFmpeg: () => (/* reexport safe */ _classes_js__WEBPACK_IMPORTED_MODULE_0__.FFmpeg)
/* harmony export */ });
/* harmony import */ var _classes_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./classes.js */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js");
/* harmony import */ var _types_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./types.js */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/types.js");




/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/types.js"
/*!********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/types.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FFFSType: () => (/* binding */ FFFSType)
/* harmony export */ });
var FFFSType;
(function (FFFSType) {
    FFFSType["MEMFS"] = "MEMFS";
    FFFSType["NODEFS"] = "NODEFS";
    FFFSType["NODERAWFS"] = "NODERAWFS";
    FFFSType["IDBFS"] = "IDBFS";
    FFFSType["WORKERFS"] = "WORKERFS";
    FFFSType["PROXYFS"] = "PROXYFS";
})(FFFSType || (FFFSType = {}));


/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm/utils.js"
/*!********************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/utils.js ***!
  \********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getMessageID: () => (/* binding */ getMessageID)
/* harmony export */ });
/**
 * Generate an unique message ID.
 */
const getMessageID = (() => {
    let messageID = 0;
    return () => messageID++;
})();


/***/ },

/***/ "../node_modules/@ffmpeg/ffmpeg/dist/esm sync recursive"
/*!*****************************************************!*\
  !*** ../node_modules/@ffmpeg/ffmpeg/dist/esm/ sync ***!
  \*****************************************************/
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "../node_modules/@ffmpeg/ffmpeg/dist/esm sync recursive";
module.exports = webpackEmptyContext;

/***/ },

/***/ "../src/background.js"
/*!****************************!*\
  !*** ../src/background.js ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _src_downloader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../src/downloader.js */ "../src/downloader.js");


let installTime = 0
const startTime = Date.now()

let tabIDs = []
let lightMode = localStorage.getItem("lightMode") == "true"

let unfinishedDownloads = JSON.parse(localStorage.getItem("unfinished-downloads") || "[]")
const downloader = new _src_downloader_js__WEBPACK_IMPORTED_MODULE_0__.Downloader(unfinishedDownloads);


// Set info for last major version. Will only be displayed if the extension has been updated from a version BELOW this one.
const majorVersionInfo = { version: "2.2.0", text: "Bluesky downloader has been updated", link: { text: "See changes", link: "https://github.com/Splat15/Bluesky-downloader-extension/releases/tag/v2.2.0" } }
// Get current version, including patches
const currentVersion = browser.runtime.getManifest().version
// Get version from when the bg script last ran
const lastVersion = localStorage.getItem("lastVersion")
// Dertermine whether the extension has been updated, including patches
const updated = isVersionNewer(lastVersion, currentVersion)
// Determine if the previous version of the extension was lower than the current major version. 
// This means that a major version update must have been installed.
let showVersionInfo = updated && !isVersionNewer(currentVersion, majorVersionInfo.version)

if (updated) {
      console.log(log(`Version updated from v${lastVersion} to v${currentVersion}`))
      if (showVersionInfo)
            console.log(log(`New version info for v${majorVersionInfo.version} availible`))
}

localStorage.setItem("lastVersion", currentVersion)


let inputMethod = localStorage.getItem("inputMethod")

let onboardingStatus = localStorage.getItem("onboarding-status")
if (!onboardingStatus) onboardingStatus = { image: true, video: true }
else onboardingStatus = JSON.parse(onboardingStatus)

const standardSettings = [
      // Sections
      [
            { value: "%filename%", id: "downloadPath", type: "pathInput", name: "Download path" }
      ],
      [
            // Settings
            { value: true, id: "vidDownload", type: "toggle", name: "Video downloads" },
            { value: true, id: "imgDownload", type: "toggle", name: "Image downloads" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF downloads" }
      ],
      [
            { value: true, id: "gifsAsGIF", type: "toggle", name: "Download GIFs as .gif" },
            { value: true, id: "imagesAsWEBP", type: "toggle", name: "Download images as .webp" },
            { value: false, id: "imgQualityMode", type: "toggle", name: "Change image quality" }
      ],
      [
            { value: 20, id: "imgQuality", type: "slider", name: "Image quality" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups" }
      ]
]

console.info(log("Fetching saved settings"))
let settings = localStorage.getItem("settings")
if (!settings) {
      // Standard configuration
      settings = standardSettings
      console.info(log("New user, standard settings applied"))
}
else {
      try {
            // Parse saved settings
            settings = JSON.parse(settings)

            // Create temporary clone for migration
            let newSettings = structuredClone(standardSettings)

            // Loop through categories
            for (let category = 0; category < newSettings.length; category++) {
                  // Loop through individual settings
                  for (let setting = 0; setting < newSettings[category].length; setting++) {
                        try {
                              let newSetting = newSettings[category][setting]
                              let oldSetting

                              // Patch for old setting
                              // Setting needs to be migrated to new ID and inverted
                              if (newSetting.id == "gifsAsGIF" && GetSetting("gifsAsWEBM", settings)) {
                                    oldSetting = GetSetting("gifsAsWEBM", settings)
                                    oldSetting.value = !oldSetting.value
                              }
                              else
                                    oldSetting = GetSetting(newSetting.id, settings)

                              // If setting is found, replace new value with old
                              if (oldSetting) {
                                    newSetting.value = oldSetting.value
                              }
                        }
                        catch (e) {
                              console.error(log("Error importing setting"))
                              console.error(e)
                        }
                  }
            }
            settings = newSettings

            console.info(log("Settings successuflly migrated"))
      }
      catch (e) {
            console.info(log("Error migrating settings: " + e))
            console.info(settings)
      }
}

localStorage.setItem("settings", JSON.stringify(settings))
console.info(log("Modified settings saved"))


browser.runtime.onInstalled.addListener((details) => {
      if (details.reason == "install") {
            console.info(log("New install detected, initiating onboarding"))

            onboardingStatus = { image: false, video: false }
            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            showVersionInfo = false
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "version-info-displayed" })
                  }
                  catch { }
            }
      }
});

// Add listeners for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
      if (sender.tab && !tabIDs.includes(sender.tab.id)) tabIDs.push(sender.tab.id)

      // Downloads
      if (message.type == "bsky-download") {
            console.log(log("Download request received"))

            // Empty URL provided
            if (!message.downloadInfo.url || message.downloadInfo.url.length == 0) {
                  console.error(log("Empty download URL"))

                  let response = {
                        type: "bsky-download-progress",
                        id: message.id,
                        url: message.downloadInfo.url,
                        error: "Error: URL empty"
                  }
                  browser.tabs.sendMessage(sender.tab.id, response)
                  return
            }

            // Start download
            downloader.download(message.downloadInfo,
                  (progress, error, fileBlob = null) => {
                        console.info(log(`Download progress for ${message.downloadInfo.id} at ${progress}%`))

                        // Send progress messages to sender
                        let response = {
                              type: "bsky-download-progress",
                              id: message.downloadInfo.id,
                              url: message.downloadInfo.url,
                              progress: progress,
                              fileBlob: fileBlob
                        }

                        if (error !== null) response.error = error.toString()

                        browser.tabs.sendMessage(sender.tab.id, response)
                  })
      }

      // Settings get requests
      else if (message.type == "get-settings") {
            console.log(log("Settings get request received"))
            browser.tabs.sendMessage(sender.tab.id, { settings: settings })
      }

      // Setting set requests
      else if (message.type == "set-setting") {
            console.log(log("Settings set request received"))
            SetSetting(message.settingId, message.value, settings)
      }

      // Light mode status set requests
      else if (message.type == "set-light-mode") {
            lightMode = message.value
            console.log(log("Light mode change detected, new value: " + lightMode))
            localStorage.setItem("lightMode", lightMode)
      }

      // Light mode status get requests
      else if (message.type == "get-light-mode") {
            console.log(log("Light mode request received"))
            browser.tabs.sendMessage(sender.tab.id, { value: lightMode, type: "light-mode" })
      }

      // Input method set requests
      else if (message.type == "set-input-method") {
            if (message.value == inputMethod) return
            console.log(log("Input method change detected"))
            inputMethod = message.value
            localStorage.setItem("inputMethod", inputMethod)
      }

      // settings update relay messages from content script to popup script
      else if (message.type == "settings-update") {
            return
      }

      // Clear the queue of unfinished downloads
      else if (message.type == "clear-unfinished-downloads") {
            console.log(log("Clearing unfinished download queue"))

            downloader.unfinishedDownloads = []
            localStorage.setItem("unfinished-downloads", JSON.stringify(downloader.unfinishedDownloads))
            
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "clear-unfinished-downloads-popup" }) /// TODO
                  }
                  catch { }
            }
      }

      // Update popup display status
      else if (message.type == "version-info-displayed") {
            console.log(log("Version info displayed, relaying message"))
            showVersionInfo = false
            for (let i = 0; i < tabIDs.length; i++) {
                  const tabID = tabIDs[i]
                  try {
                        browser.tabs.sendMessage(tabID, { type: "version-info-displayed" })
                  }
                  catch { }
            }
      }

      // Install time request
      else if (message.type == "init") {
            console.log(log("Init request received"))
            const uptime = Date.now() - startTime
            browser.tabs.sendMessage(sender.tab.id, {
                  type: "init",
                  uptime: uptime,
                  onboardingStatus: onboardingStatus,
                  settings: settings,
                  lightMode: lightMode,
                  inputMethod: inputMethod,
                  versionInfo: showVersionInfo ? majorVersionInfo : null,
                  unfinishedDownloads: downloader.unfinishedDownloads
            })
      }

      // Onboarding status updates
      else if (message.type == "onboarding-update") {
            console.log(log("Onboarding status update received"))
            onboardingStatus.video = onboardingStatus.video || message.onboardingStatus.video
            onboardingStatus.image = onboardingStatus.image || message.onboardingStatus.image

            localStorage.setItem("onboarding-status", JSON.stringify(onboardingStatus))

            tabIDs.forEach(tabID => {
                  try {
                        browser.tabs.sendMessage(tabID, { type: "onboarding-update", onboardingStatus: onboardingStatus })
                  }
                  catch { }
            })
      }

      // Invalid message type
      else {
            console.error(log("Invalid message type: " + message.type))
            let response = { error: `Invalid message.type "${message.type}"` }
            browser.tabs.sendMessage(sender.tab.id, response)
      }
});

// Custom implementation to support directly saving to storage and informing tabs
function SetSetting(settingId, value, settings) {
      if (GetSetting(settingId, settings).value == value)
            return

      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        localStorage.setItem("settings", JSON.stringify(settings))

                        console.info(log("Settings changed, relaying"))
                        for (let i = 0; i < tabIDs.length; i++) {
                              const tabID = tabIDs[i]
                              try {
                                    // Extension popup window can only be addressed with runtime.sendMessage but background script can't access this
                                    // Content script is tasked with repeating the message for the popup window
                                    browser.tabs.sendMessage(tabID, { type: "settings-update", settings: settings, repeat: i == 0 })
                              }
                              catch { }
                        }
                        return
                  }
            }
      }
}

/***/ },

/***/ "../src/downloader.js"
/*!****************************!*\
  !*** ../src/downloader.js ***!
  \****************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Downloader: () => (/* binding */ Downloader)
/* harmony export */ });
/* harmony import */ var _ffmpeg_ffmpeg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @ffmpeg/ffmpeg */ "../node_modules/@ffmpeg/ffmpeg/dist/esm/index.js");
/* harmony import */ var _ffmpeg_util__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @ffmpeg/util */ "../node_modules/@ffmpeg/util/dist/esm/index.js");



// Modified downloader heavily based on down.blue
// https://github.com/breakzplatform/downloader.notx.blue

// Modified downloader to run as a standalone class
// Removed UI values
// Removed unused logic
// Extracted the video conversion logic into separate function
// Made to work with video URLs directly
// Made compatible as a web extension based on browser-extension-ffmpeg
// https://github.com/Aniny21/browser-extension-ffmpeg/ ///TODO - Remove
// Added simple progress estimation

// Side note: Firefox extensions can't run multi-core wasm
// Ffmpeg.wasm is best run in a background script due to
// security restrictions that some websites impose
// The browser will throw an error because of wasm restrictions
// This does not impact function
class Downloader {
      #ffmpeg = new _ffmpeg_ffmpeg__WEBPACK_IMPORTED_MODULE_0__.FFmpeg();
      #queue
      #onProgress
      #downloadReady
      #maxTries = 3
      #mobileDevice = DetectMobileDevice()
      ffmpegLoaded = false
      shutDownFFmpeg = null
      unfinishedDownloads

      constructor(unfinishedDownloads) {
            this.unfinishedDownloads = unfinishedDownloads
            this.#queue = []
            this.#downloadReady = true
            this.progress = 0
            this.#onProgress = () => { }

            this.#ffmpeg.on('log', ({ message, type }) => {
                  console.info(log(message));
            });
      }

      // Push new download to queue and try to start 
      download(downloadInfo,
            onProgress = () => { }) {
            if (this.#queue.find(element => element.data.url == downloadInfo.url)) return

            // Save it as an unfinished download in case it doesn't complete
            if (!this.unfinishedDownloads.find(element => element.id == downloadInfo.id)) {
                  this.unfinishedDownloads.push(downloadInfo)
                  localStorage.setItem("unfinished-downloads", JSON.stringify(this.unfinishedDownloads))
            }

            this.#queue.push({
                  id: downloadInfo.id,
                  data: downloadInfo,
                  onProgress: onProgress,
                  tries: 0
            })

            this.#download()
      }

      async #download() {
            if (!this.#downloadReady) return

            // Block downloads until complete
            this.#downloadReady = false

            this.progress = 0
            let ffmpegLoading

            // Get next download item
            const currentItem = this.#queue.shift()

            // Get individual properties
            const id = currentItem.id
            const url = currentItem.data.url
            const fileType = currentItem.data.fileType
            const fileExt = currentItem.data.fileExt
            const filePath = currentItem.data.filePath
            const mimeType = currentItem.data.mimeType
            const imgCompression = currentItem.data.imgCompression
            const imgQuality = currentItem.data.imgQuality

            this.#onProgress = currentItem.onProgress
            const tries = currentItem.tries

            console.log(log("Download started for: " + currentItem.data.url))

            // Initialize ffmpeg if needed
            // Always initialized unless media is an image and image compression is off
            if (fileType.id != Downloadbutton.Image.id || imgCompression) {

                  if (this.shutDownFFmpeg) {
                        console.info(log("FFmpeg shutdown aborted"))
                        clearTimeout(this.shutDownFFmpeg)
                  }

                  if (!this.ffmpegLoaded) {
                        console.info(log("Loading FFmpeg"))
                        ffmpegLoading = this.#loadFFmpeg()
                  }
            }

            try {
                  if (fileType.id == Downloadbutton.Video.id || fileType.id == Downloadbutton.UploadedGIF.id)
                        await this.downloadVideo(
                              url,
                              filePath,
                              fileExt,
                              ffmpegLoading,
                              mimeType
                        )

                  else
                        await this.downloadImage(
                              url,
                              filePath,
                              fileExt,
                              ffmpegLoading,
                              imgCompression,
                              imgQuality,
                              mimeType
                        )

            } catch (error) {
                  console.error(error)

                  if (tries < this.#maxTries) {
                        currentItem.tries++
                        this.#queue.unshift(currentItem)
                        this.progress = 0
                  }
                  else {
                        this.#setProgress(0, error)
                  }

            }

            // Remove download from unfinished downloads regardless if an error has occurred to prevent loops
            this.unfinishedDownloads = this.unfinishedDownloads.filter(element => element.id != id)
            localStorage.setItem("unfinished-downloads", JSON.stringify(this.unfinishedDownloads))

            // Start next download
            this.#downloadReady = true;
            if (this.#queue.length > 0) this.#download()
            else {
                  if (this.#ffmpeg.loaded) {
                        console.info(log("Download queue empty, stopping FFmpeg in 10s"))
                        this.shutDownFFmpeg = setTimeout(() => {
                              console.info(log("Shutting down FFmpeg"))
                              this.#ffmpeg.terminate()
                              this.shutDownFFmpeg = null
                              this.ffmpegLoaded = false
                        }, 10000)
                  }
                  else
                        console.info(log("Download queue empty, FFmpeg not running"))
            }
      }

      // Downloads for images
      async downloadImage(
            url,
            filePath,
            fileExtension,
            ffmpegLoading,
            compressImage,
            imageQuality,
            mimeType
      ) {
            try {
                  // Runs when progress is made
                  const _onProgress = (progress, blob = undefined, filePath = "") => {
                        return new Promise(resolve => {
                              this.progress = progress

                              // Download in progress
                              if (!blob) {
                                    this.#setProgress(progress)
                                    resolve()
                              }

                              // Download finished
                              else if (this.#mobileDevice) {
                                    // Send blob to content script to download
                                    this.#setProgress(100, null, blob)
                                    resolve()
                              }
                              else {
                                    // Download using downloads API
                                    let fileURL = URL.createObjectURL(blob)

                                    // Initiate download
                                    browser.downloads.download({
                                          url: fileURL, filename: filePath
                                    }).then(() => {
                                          this.#setProgress(100)
                                          resolve()

                                          // Free up RAM, will interrupt download if done too soon for some reason
                                          setTimeout(() => {
                                                URL.revokeObjectURL(fileURL)
                                          }, 5000)
                                    })
                              }
                        })
                  }

                  // Fetch image
                  let response = await fetch(url)
                  // Set progress
                  await _onProgress(compressImage ? 20 : 50)

                  // Get image data
                  let arrayBuffer = await response.arrayBuffer()
                  let blob = new Blob([arrayBuffer], { type: mimeType })

                  // Early exit when conversion is not needed
                  if (!compressImage || (mimeType == "image/jpeg" && imageQuality == 100)) {
                        await _onProgress(100, blob, filePath)
                  }
                  // Continue when conversion is needed
                  else {
                        // Set progress
                        await _onProgress(40)

                        // Write file to virtual FS
                        await ffmpegLoading
                        await this.#ffmpeg.writeFile(
                              "input.jpg",
                              await (0,_ffmpeg_util__WEBPACK_IMPORTED_MODULE_1__.fetchFile)(blob)
                        );

                        // Set argument for setting quality based on file type
                        let qualityStr = "";
                        if (mimeType == "image/webp") {
                              qualityStr = "-q"

                              imageQuality = Math.max(imageQuality, 1)
                        }
                        else {
                              qualityStr = "-q:v"

                              // Convert from quality 0% = worst => 100% best to 32 = worst => 1 = best
                              imageQuality = Math.round(32 - 0.31 * imageQuality)
                        }

                        console.info(log("Converting to " + mimeType + " at quality: " + imageQuality))

                        const startTime = Date.now()
                        const onFFmpegProgress = ({ progress, time }) => {
                              _onProgress(40 + Math.round(50 * progress))

                              let elapsedMS = Date.now() - startTime
                              let remainingMS = (elapsedMS / progress) - elapsedMS

                              console.info(log(`Progress: ${Math.round(progress * 1000) / 10}%   Elapsed time: ${Math.round(elapsedMS / 100) / 10}s   Estimated time remaining: ${Math.round(remainingMS / 100) / 10}s`))
                        }

                        this.#ffmpeg.on('progress', onFFmpegProgress)

                        // Convert and compress file
                        await this.#ffmpeg.exec(
                              [
                                    "-i",
                                    "input.jpg",
                                    qualityStr,
                                    imageQuality.toString(),
                                    "output" + fileExtension
                              ]
                        )

                        this.#ffmpeg.off("progress", onFFmpegProgress)

                        const image = await this.#ffmpeg.readFile("output" + fileExtension);
                        const imageBlob = new Blob([image], { type: mimeType, });

                        await _onProgress(100, imageBlob, filePath)
                  }

            } catch (error) {
                  console.error(error)
                  this.#setProgress(0, error)
            }
      }

      async downloadVideo(
            url,
            filePath,
            fileExtension,
            ffmpegLoading,
            mimeType
      ) {
            // Code largely written https://github.com/breakzplatform
            // Produces slightly better videos than letting ffmpeg download the video
            const videoBlob = await this.#processPlaylist(url);

            // Wait for ffmpeg to load if it hasn't yet
            await ffmpegLoading
            // Convert to mp4

            let command;
            if (mimeType == "image/gif")
                  command = [
                        "-i",
                        "input.ts",
                        "-map",
                        "0",
                        "-vf",
                        "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                        "output.gif"
                  ]
            else
                  command = [
                        "-i",
                        "input.ts",
                        "-map",
                        "0",
                        "-c",
                        "copy",
                        "output" + fileExtension
                  ]

            let blob = await this.#convertVideo(videoBlob, fileExtension, mimeType, command)

            if (this.#mobileDevice) {
                  // Return file to content script to download
                  this.#setProgress(100, null, fileBlob)
            }
            else {
                  // Download using downloads API
                  let fileURL = URL.createObjectURL(blob)

                  // Initiate download
                  browser.downloads.download({
                        url: fileURL, filename: filePath
                  }).then(() => {
                        this.#setProgress(100)

                        // Free up RAM, will interrupt download if done too soon for some reason
                        setTimeout(() => {
                              URL.revokeObjectURL(fileURL)
                        }, 5000)
                  })
            }
      }

      async #processPlaylist(playlistUrl) {
            const masterPlaylistResponse = await fetch(playlistUrl);
            const masterPlaylist = await masterPlaylistResponse.text();

            const videoPlaylistUrl = this.#parseHighestQualityVideoUrl(
                  masterPlaylist,
                  playlistUrl
            );
            const videoPlaylistResponse = await fetch(videoPlaylistUrl);
            const videoPlaylist = await videoPlaylistResponse.text();
            const segmentUrls = this.#parseSegmentUrls(
                  videoPlaylist,
                  videoPlaylistUrl
            );

            this.#setProgress(10)

            return this.#downloadSegments(segmentUrls);
      }

      #parseSegmentUrls(videoPlaylist, baseUrl) {
            return videoPlaylist
                  .split("\n")
                  .filter((line) => !line.startsWith("#") && line.trim() !== "")
                  .map((segment) => new URL(segment, baseUrl).toString());
      }

      #parseHighestQualityVideoUrl(masterPlaylist, baseUrl) {
            let highestBandwidth = 0;
            let highestQualityUrl = "";
            masterPlaylist.split("\n").forEach((line, i, lines) => {
                  if (line.startsWith("#EXT-X-STREAM-INF")) {
                        const bandwidth = parseInt(line.match(/BANDWIDTH=(\d+)/)[1]);
                        if (bandwidth > highestBandwidth) {
                              highestBandwidth = bandwidth;
                              highestQualityUrl = lines[i + 1];
                        }
                  }
            });
            return new URL(highestQualityUrl, baseUrl).toString();
      }

      async #downloadSegments(segmentUrls) {
            const chunks = [];
            for (let i = 0; i < segmentUrls.length; i++) {
                  let progress = Math.round(10 + (20 / segmentUrls.length) * (i + 1))
                  this.#setProgress(progress)

                  const response = await fetch(segmentUrls[i]);
                  chunks.push(await response.arrayBuffer());
            }

            return new Blob(chunks, { type: "video/MP2T" });
      }

      async #convertVideo(videoBlob, fileExtension, mimeType, command) {
            try {
                  // Write file to virtual FS
                  await this.#ffmpeg.writeFile(
                        "input.ts",
                        await (0,_ffmpeg_util__WEBPACK_IMPORTED_MODULE_1__.fetchFile)(videoBlob)
                  );

                  const startTime = Date.now()
                  const onFFmpegProgress = ({ progress, time }) => {
                        this.#setProgress(30 + Math.round(70 * progress))

                        let elapsedMS = Date.now() - startTime
                        let remainingMS = (elapsedMS / progress) - elapsedMS

                        console.info(log(`Progress: ${Math.round(progress * 1000) / 10}%   Elapsed time: ${Math.round(elapsedMS / 100) / 10}s   Estimated time remaining: ${Math.round(remainingMS / 100) / 10}s`))
                  }

                  this.#ffmpeg.on('progress', onFFmpegProgress)

                  // Convert file
                  await this.#ffmpeg.exec(command);

                  // Read file and write it to blob
                  const videoData = await this.#ffmpeg.readFile("output" + fileExtension);
                  const mp4Blob = new Blob([videoData.buffer], {
                        type: mimeType,
                  });

                  return mp4Blob
            }
            catch (e) {
                  console.error(e)
            }
      }

      #setProgress(progress, error = null, videoBlob = null) {
            this.progress = progress
            this.#onProgress(this.progress, error, videoBlob)
      }

      async #loadFFmpeg() {
            await this.#ffmpeg.load({
                  coreURL: browser.runtime.getURL("lib/ffmpeg-core.js"),
                  wasmURL: browser.runtime.getURL("lib/ffmpeg-core.wasm"),
            })
            this.ffmpegLoaded = true
      }
}


/***/ },

/***/ "../node_modules/@ffmpeg/util/dist/esm/const.js"
/*!******************************************************!*\
  !*** ../node_modules/@ffmpeg/util/dist/esm/const.js ***!
  \******************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HeaderContentLength: () => (/* binding */ HeaderContentLength)
/* harmony export */ });
const HeaderContentLength = "Content-Length";


/***/ },

/***/ "../node_modules/@ffmpeg/util/dist/esm/errors.js"
/*!*******************************************************!*\
  !*** ../node_modules/@ffmpeg/util/dist/esm/errors.js ***!
  \*******************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ERROR_INCOMPLETED_DOWNLOAD: () => (/* binding */ ERROR_INCOMPLETED_DOWNLOAD),
/* harmony export */   ERROR_RESPONSE_BODY_READER: () => (/* binding */ ERROR_RESPONSE_BODY_READER)
/* harmony export */ });
const ERROR_RESPONSE_BODY_READER = new Error("failed to get response body reader");
const ERROR_INCOMPLETED_DOWNLOAD = new Error("failed to complete download");


/***/ },

/***/ "../node_modules/@ffmpeg/util/dist/esm/index.js"
/*!******************************************************!*\
  !*** ../node_modules/@ffmpeg/util/dist/esm/index.js ***!
  \******************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   downloadWithProgress: () => (/* binding */ downloadWithProgress),
/* harmony export */   fetchFile: () => (/* binding */ fetchFile),
/* harmony export */   importScript: () => (/* binding */ importScript),
/* harmony export */   toBlobURL: () => (/* binding */ toBlobURL)
/* harmony export */ });
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./errors.js */ "../node_modules/@ffmpeg/util/dist/esm/errors.js");
/* harmony import */ var _const_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./const.js */ "../node_modules/@ffmpeg/util/dist/esm/const.js");


const readFromBlobOrFile = (blob) => new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
        const { result } = fileReader;
        if (result instanceof ArrayBuffer) {
            resolve(new Uint8Array(result));
        }
        else {
            resolve(new Uint8Array());
        }
    };
    fileReader.onerror = (event) => {
        reject(Error(`File could not be read! Code=${event?.target?.error?.code || -1}`));
    };
    fileReader.readAsArrayBuffer(blob);
});
/**
 * An util function to fetch data from url string, base64, URL, File or Blob format.
 *
 * Examples:
 * ```ts
 * // URL
 * await fetchFile("http://localhost:3000/video.mp4");
 * // base64
 * await fetchFile("data:<type>;base64,wL2dvYWwgbW9yZ...");
 * // URL
 * await fetchFile(new URL("video.mp4", import.meta.url));
 * // File
 * fileInput.addEventListener('change', (e) => {
 *   await fetchFile(e.target.files[0]);
 * });
 * // Blob
 * const blob = new Blob(...);
 * await fetchFile(blob);
 * ```
 */
const fetchFile = async (file) => {
    let data;
    if (typeof file === "string") {
        /* From base64 format */
        if (/data:_data\/([a-zA-Z]*);base64,([^"]*)/.test(file)) {
            data = atob(file.split(",")[1])
                .split("")
                .map((c) => c.charCodeAt(0));
            /* From remote server/URL */
        }
        else {
            data = await (await fetch(file)).arrayBuffer();
        }
    }
    else if (file instanceof URL) {
        data = await (await fetch(file)).arrayBuffer();
    }
    else if (file instanceof File || file instanceof Blob) {
        data = await readFromBlobOrFile(file);
    }
    else {
        return new Uint8Array();
    }
    return new Uint8Array(data);
};
/**
 * importScript dynamically import a script, useful when you
 * want to use different versions of ffmpeg.wasm based on environment.
 *
 * Example:
 *
 * ```ts
 * await importScript("http://localhost:3000/ffmpeg.js");
 * ```
 */
const importScript = async (url) => new Promise((resolve) => {
    const script = document.createElement("script");
    const eventHandler = () => {
        script.removeEventListener("load", eventHandler);
        resolve();
    };
    script.src = url;
    script.type = "text/javascript";
    script.addEventListener("load", eventHandler);
    document.getElementsByTagName("head")[0].appendChild(script);
});
/**
 * Download content of a URL with progress.
 *
 * Progress only works when Content-Length is provided by the server.
 *
 */
const downloadWithProgress = async (url, cb) => {
    const resp = await fetch(url);
    let buf;
    try {
        // Set total to -1 to indicate that there is not Content-Type Header.
        const total = parseInt(resp.headers.get(_const_js__WEBPACK_IMPORTED_MODULE_1__.HeaderContentLength) || "-1");
        const reader = resp.body?.getReader();
        if (!reader)
            throw _errors_js__WEBPACK_IMPORTED_MODULE_0__.ERROR_RESPONSE_BODY_READER;
        const chunks = [];
        let received = 0;
        for (;;) {
            const { done, value } = await reader.read();
            const delta = value ? value.length : 0;
            if (done) {
                if (total != -1 && total !== received)
                    throw _errors_js__WEBPACK_IMPORTED_MODULE_0__.ERROR_INCOMPLETED_DOWNLOAD;
                cb && cb({ url, total, received, delta, done });
                break;
            }
            chunks.push(value);
            received += delta;
            cb && cb({ url, total, received, delta, done });
        }
        const data = new Uint8Array(received);
        let position = 0;
        for (const chunk of chunks) {
            data.set(chunk, position);
            position += chunk.length;
        }
        buf = data.buffer;
    }
    catch (e) {
        console.log(`failed to send download progress event: `, e);
        // Fetch arrayBuffer directly when it is not possible to get progress.
        buf = await resp.arrayBuffer();
        cb &&
            cb({
                url,
                total: buf.byteLength,
                received: buf.byteLength,
                delta: 0,
                done: true,
            });
    }
    return buf;
};
/**
 * toBlobURL fetches data from an URL and return a blob URL.
 *
 * Example:
 *
 * ```ts
 * await toBlobURL("http://localhost:3000/ffmpeg.js", "text/javascript");
 * ```
 */
const toBlobURL = async (url, mimeType, progress = false, cb) => {
    const buf = progress
        ? await downloadWithProgress(url, cb)
        : await (await fetch(url)).arrayBuffer();
    const blob = new Blob([buf], { type: mimeType });
    return URL.createObjectURL(blob);
};


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = (typeof document !== 'undefined' && document.baseURI) || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"background": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	__webpack_require__("../src/downloader.js");
/******/ 	__webpack_require__("../src/background.js");
/******/ 	var __webpack_exports__ = __webpack_require__("../js/classes.js");
/******/ 	
/******/ })()
;
//# sourceMappingURL=background.js.map