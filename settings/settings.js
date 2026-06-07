let cachedExamplePost
let exampleAtURI = "at://bsky.app/app.bsky.feed.post/3lxxo3i4qzs2c"
let exampleURL = "https://video.bsky.app/watch/did%3Aplc%3Az72i7hdynmk6r22z27h6tvur/bafkreihqbowyhq3quw3ctt5t45jrvfycrbxbplp4oq5ho3pcq32zoihm6i/thumbnail.jpg"
let onExampleReady = []
let pathVarHelpPopup

let downloadedURLs = localStorage.getItem("downloadedURLs") || "{ migrated: false, urls: [] }"
downloadedURLs = JSON.parse(downloadedURLs)


let theme = localStorage.getItem("theme") || "theme--dim"
if (theme == "undefined") theme = "theme--dim"
SetThemeClass(theme)


console.log(log("Fetching example post info"))
let postInfo
fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=" + exampleAtURI)
      .then(response =>
            response.text().then(post => {
                  cachedExamplePost = JSON.parse(post).thread.post
                  GetInfoFromThread(cachedExamplePost, exampleAtURI, exampleURL).then(info => {
                        postInfo = info

                        console.log(log("Example post info fetched, running onExampleReady"))
                        onExampleReady.forEach(func => func())
                  })
            })
      )

// Handles the display and function of different kinds of settings
class Setting {
      container
      element
      value
      type
      name
      settingId
      description
      settings
      pathVarMenuExpanded
      originalValue

      constructor(value, type, name, description, tooltip, settingId, container, settings, isMobile) {
            this.value = value
            this.type = type
            this.name = name
            this.description = description
            this.container = container
            this.settingId = settingId
            this.settings = settings
            this.pathVarMenuExpanded = false
            this.originalValue = value
            this.qualitySlider = undefined
            this.tooltip = tooltip
            const domParser = new DOMParser()

            // Checkbox style setting
            if (this.type == "toggle") {
                  // Parse setting HTML
                  this.element = domParser.parseFromString(`
                  <div class="setting setting-${this.value ? "" : "in"}active" id="${this.settingId}" title="Toggle ${this.name}">
                        <div class="setting-body">
                              <div type="checkbox" class="checkbox">
                                    <svg fill="none" width="14" viewBox="0 0 24 24" height="14" style="margin: 5px;">
                                          <path fill="#FFFFFF" stroke="none" stroke-width="0" stroke-linecap="butt"
                                                stroke-linejoin="miter" fill-rule="evenodd" clip-rule="evenodd"
                                                d="M21.474 2.98a2.5 2.5 0 0 1 .545 3.494l-10.222 14a2.5 2.5 0 0 1-3.528.52L2.49 16.617a2.5 2.5 0 0 1 3.018-3.986l3.75 2.84L17.98 3.525a2.5 2.5 0 0 1 3.493-.545Z">
                                          </path>
                                    </svg>
                              </div>
                              <p class="setting-name">${this.name}</p>
                        </div>
                  </div>`, "text/html").getElementsByClassName("setting")[0]

                  if (this.tooltip) {
                        let helpButton = document.createElement("div")
                        helpButton.innerHTML = `
                        <!-- Original file in ../icons/help.svg -->
                        <!-- Icon by https://www.flaticon.com/uicons -->
                        <svg xmlns="http://www.w3.org/2000/svg" id="Bold" viewBox="0 0 24 24" width="512" height="512" class="setting-help-button">
                              <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,21a9,9,0,1,1,9-9A9.01,9.01,0,0,1,12,21Z" />
                              <circle cx="12.005" cy="17.5" r="1.5" />
                              <path d="M12.757,4.987a4.25,4.25,0,0,0-5,4.181,1.5,1.5,0,0,0,3,0,1.248,1.248,0,1,1,1.847,1.1,3.323,3.323,0,0,0-2.038,3.158,1.5,1.5,0,0,0,3,0,1.274,1.274,0,0,1,.016-.218,1.852,1.852,0,0,1,.471-.313,4.248,4.248,0,0,0-1.292-7.9Z" />
                        </svg>`

                        helpButton.addEventListener("click", e => {
                              e.stopPropagation()
                              new FullScreenPopup(
                                    this.name,
                                    this.tooltip,
                                    [new FullScreenPopup.PopupOption("OK")]
                              )
                        })

                        this.element.appendChild(helpButton)
                  }

                  // Handle toggling
                  this.element.addEventListener("click", () => {
                        // Invert value and sync with settings

                        this.value = !this.value

                        if (this.value)
                              this.element.classList.replace("setting-inactive", "setting-active")
                        else
                              this.element.classList.replace("setting-active", "setting-inactive")

                        SetSetting(this.settingId, this.value, this.settings)

                        if (this.qualitySlider) setQualSliderVis(this.value, this.qualitySlider)

                        document.querySelector("#sliderSubtext").textContent = "~" + GetApproxFileSize(GetSetting("imgQuality", settings).value, GetSetting("imagesAsWEBP", settings).value == true ? "image/webp" : "image/jpeg")
                  })

                  if (this.settingId == "imgQualityMode") {
                        this.qualitySlider = document.querySelector("#imgQuality")
                        if (this.qualitySlider) {
                              setQualSliderVis(this.value, this.qualitySlider)
                        }
                        else {
                              new NodeObserver(e => e.id == "imgQuality",
                                    e => {
                                          this.qualitySlider = e
                                          setQualSliderVis(this.value, this.qualitySlider)
                                    }, true
                              )
                        }
                  }

                  function setQualSliderVis(value, qualitySlider) {
                        const category = qualitySlider.parentElement
                        const categorySeparator = category.nextSibling

                        if (value) {
                              categorySeparator.classList.remove("category-separator-hidden")
                              qualitySlider.classList.remove("slider-hidden")
                              setTimeout(() => {
                                    category.style.overflow = ""
                              }, 200);
                        }
                        else {
                              categorySeparator.classList.add("category-separator-hidden")
                              qualitySlider.classList.add("slider-hidden")
                              category.style.overflow = "hidden"
                        }

                  }

                  // Add element to given container
                  this.container.appendChild(this.element)
            }

            // Slider setting (image quality)
            else if (this.type == "slider") {
                  // Transform value from 10-100 to 0-100 for slider width percentage 
                  const sliderPerc = ApplySliderChoppiness(this.value)

                  let approximateFileSize = GetApproxFileSize(this.value, GetSetting("imagesAsWEBP", settings).value == true ? "image/webp" : "image/jpeg")

                  this.element = domParser.parseFromString(`
                  <div class="setting slider" id="${this.settingId}" title="Adjust ${this.name}">
                        <div class="slider-header">
                              <span class="setting-name">${this.name}</span>
                              <span class="path-example slider-subtext" id="sliderSubtext">~${approximateFileSize}</span>
                        </div>
                        <div class="slider-body">
                              <input type="text" class="slider-input-text" id="textInput" value="${this.value}">
                              <div class="slider-container">
                                    <div class="slider-bg"></div>
                                    <div class="slider-active-bar" id="sliderActiveBar" style="width: ${sliderPerc}%"></div>
                                    <div class="slider-knob" id="sliderKnob" style="left: ${sliderPerc}%">
                                          <div class="popup-val-container" id="sliderPopup">
                                                <div style="position:relative; width:100%; height:100%;">
                                                      <div class="popup-val">
                                                            <span class="popup-val-text" id="sliderPopupText">${this.value}</span>
                                                      </div>
                                                      <div class="popup-val-triangle" id="sliderPopup">
                                                            <svg class="popup-triangle-svg" viewBox="0 0 30 20">
                                                                  <path d=" M 0 0 l 12.5 15 a 5 5 0 0 0 5 0 l 12.5 -15" class="triangle-path"
                                                                        stroke-width="1px">
                                                                  </path>
                                                            </svg>
                                                      </div>
                                                </div>
                                          </div>
                                    </div>
                                    <input type="range" class="slider-input" id="sliderInput" title="Adjust image quality" value="${sliderPerc * 100}" min="0" max="10000">
                              </div>
                        </div>
                  </div>`, "text/html").getElementsByClassName("setting")[0]

                  const sliderSubtext = this.element.querySelector("#sliderSubtext");
                  const textInput = this.element.querySelector("#textInput");
                  const sliderInput = this.element.querySelector("#sliderInput");
                  const sliderActiveBar = this.element.querySelector("#sliderActiveBar");
                  const sliderKnob = this.element.querySelector("#sliderKnob");
                  const sliderPopupText = this.element.querySelector("#sliderPopupText");
                  const sliderPopup = this.element.querySelector("#sliderPopup");

                  let lastSliderInput = 0;

                  const onInput = (save = false, text = false) => {

                        let originalValue
                        let choppyValue

                        if (text) {
                              if (lastSliderInput > Date.now() - 50) return

                              originalValue = textInput.value
                              originalValue = originalValue.replaceAll(/\D/g, ""); // Sanitize input
                              originalValue = Number(originalValue) // Will spit out garbage without Number()
                              originalValue = Math.min(Math.max(originalValue, 0), 100) // limit to 10-100

                              choppyValue = ApplySliderChoppiness(originalValue) // Get value rounded to nearest 5, limits values to 10 - 100
                        }
                        else {
                              lastSliderInput = Date.now()
                              originalValue = Number(sliderInput.value) / 100 // Will spit out garbage without Number()
                              //originalValue = originalValue * 0.9 + 10

                              choppyValue = ApplySliderChoppiness(originalValue) // Get value rounded to nearest 5, limits values to 10 - 100
                        }


                        this.value = choppyValue

                        sliderPopupText.textContent = this.value

                        sliderSubtext.textContent = "~" + GetApproxFileSize(this.value, GetSetting("imagesAsWEBP", settings).value == true ? "image/webp" : "image/jpeg")

                        if (!text) textInput.value = this.value

                        sliderActiveBar.style.width = choppyValue + "%"
                        sliderKnob.style.left = choppyValue + "%"

                        if (save) {
                              SetSetting(this.settingId, this.value, this.settings)
                              textInput.value = this.value
                        }
                  }

                  const mouseDown = () => {
                        sliderPopup.classList.add("popup-val-container-active")
                        sliderKnob.classList.add("slider-knob-active")

                        onInput()
                  }

                  const mouseUp = () => {
                        sliderPopup.classList.remove("popup-val-container-active")
                        sliderKnob.classList.remove("slider-knob-active")

                        onInput(true)
                  }

                  sliderInput.addEventListener("touchstart", () => mouseDown())
                  sliderInput.addEventListener("touchend", () => mouseUp())

                  sliderInput.addEventListener("mousedown", () => mouseDown())
                  sliderInput.addEventListener("mouseup", () => mouseUp())

                  sliderInput.addEventListener("input", () => onInput())
                  textInput.addEventListener("input", () => onInput(false, true))
                  textInput.addEventListener("blur", () => {
                        onInput(true, true)
                  })

                  // Add element to given container
                  this.container.appendChild(this.element)
            }

            // Special case for download path input
            else if (this.type == "pathInput") {
                  this.element = domParser.parseFromString(`
                        <div class="setting path-setting"  id="${this.settingId}">
                              <div class="path-input-desc">
                                    <p style="margin: auto 0;">${isMobile ? "File name" : "Download path"}</p>
                                    <input id="pathUndoButton" class="path-undo-button" type="button" title="Undo changes">
                              </div>
                              <div id="pathInputContainer" class="path-input-container-container">
                                    <div class="path-input-container">
                                          <input id="pathInput" type="text" value="${this.value}" spellcheck="false" class="path-input">
                                          <div class="path-input-suggestion-container">
                                                <span contentEditable=true id="pathInputHidden" class="path-input-hidden" spellcheck="false">${this.value}</span>
                                                <p class="path-input-suggestion" id="varSuggestion" style="display:none;"></p>
                                          </div>
                                    </div>
                                    <p class="path-input-ext" type="text">.mp4</p>
                              </div>
                              <p class="path-example" id="pathExample"></p>
                              <div class="path-actions path-input-vars-container">
                                    <p id="pathActionInsert" class="path-input-action-label path-input-vars" title="Open the variable selection">Variables</p>
                                    <div id="pathVarMenu" class="path-input-vars-menu">
                                          <div id="varList" class="path-input-menu-var-list">
                                          </div>
                                          <div class="path-input-menu-right-panel">
                                                <div class="path-input-menu-var-desc">
                                                      <p id="pathVarDesc" class="path-input-menu-var-desc-text">
                                                            Select a variable
                                                      </p>
                                                </div>
                                                <p id="pathVarInsert" class="path-input-menu-var-insert path-input-menu-var-insert-locked">Insert</p>
                                          </div>
                                    </div>
                              </div>
                              <div class="path-actions">
                                    <div class="path-input-action path-input-help">
                                          <p id="pathActionHelp" class="path-input-action-label" title="Open the help popup">Help</p>
                                    </div>
                                    <div class="path-input-action path-input-reset">
                                          <p id="pathActionReset" class="path-input-action-label" title="Reset path to default value">Reset</p>
                                    </div>
                              </div>
                        </div>`, "text/html")
                        .getElementsByClassName("setting")[0];


                  const varList = this.element.querySelector("#varList")
                  const pathVarInsert = this.element.querySelector("#pathVarInsert")
                  const pathVarMenu = this.element.querySelector("#pathVarMenu")
                  const pathVarDesc = this.element.querySelector("#pathVarDesc")
                  const pathUndoButton = this.element.querySelector("#pathUndoButton")
                  const pathInputContainer = this.element.querySelector("#pathInputContainer")
                  const varSuggestion = this.element.querySelector("#varSuggestion")

                  const pathInput = this.element.querySelector("#pathInput")
                  const pathInputHidden = this.element.querySelector("#pathInputHidden")

                  const pathExample = this.element.querySelector("#pathExample")

                  const pathActionInsert = this.element.querySelector("#pathActionInsert")
                  const pathActionHelp = this.element.querySelector("#pathActionHelp")
                  const pathActionReset = this.element.querySelector("#pathActionReset")


                  // Add variables to list
                  let pathVarKeys = Object.keys(pathVars)
                  for (let i = 0; i < pathVarKeys.length; i++) {
                        const variable = pathVars[pathVarKeys[i]]

                        const element = document.createElement("p")
                        element.classList.add("path-var")
                        element.textContent = variable.name

                        varList.appendChild(element)

                        // Focus first variable
                        if (i == 0) {
                              element.classList.add("path-var-active")

                              pathVarDesc.textContent = variable.desc
                              pathVarInsert.currentVar = variable.tags[0]
                              pathVarInsert.classList.remove("path-input-menu-var-insert-locked");

                              varSuggestion.textContent = `%${variable.tags[0]}%`
                        }

                        // On selection of variable
                        element.addEventListener("click", () => {
                              // Cleanup
                              Array.from(varList.getElementsByClassName("path-var-active"))
                                    .forEach(element => element.classList.remove("path-var-active"));

                              element.classList.add("path-var-active")

                              pathVarDesc.textContent = variable.desc
                              pathVarInsert.currentVar = variable.tags[0]
                              pathVarInsert.classList.remove("path-input-menu-var-insert-locked");

                              varSuggestion.textContent = `%${variable.tags[0]}%`

                              this.FocusPathInput()
                        })
                  }

                  // Display help popup
                  pathActionHelp.addEventListener("click", () => {
                        let helpTextMobile = `With this setting you can specify the name of downloaded files.<br />
                        A preview of your file name is shown below the input.<br />
                        Variables can be used to add extra data like the username of the author and more.<br />
                        Click the Variables button to use them.`

                        let helpText = `With this setting you can specify the location and name of downloaded files.<br />
                        A preview of your path is shown below the input.<br />
                        A subfolder inside your download folder can be specified with a slash.<br />
                        Variables can be used to add extra data like the username, date and more.<br />
                        Click the Variables button to use them.`

                        pathVarHelpPopup = new FullScreenPopup(
                              "Download path",
                              isMobile ? helpTextMobile : helpText,
                              [new FullScreenPopup.PopupOption("OK")]
                        )
                  })

                  // Insert selected variable into input
                  pathVarInsert.addEventListener("click", () => {
                        if (pathVarInsert.currentVar) {
                              this.ChangePathVal(this.value + `%${pathVarInsert.currentVar}%`)
                              varSuggestion.textContent = ``
                              this.FocusPathInput()
                        }
                  })

                  // Show variable suggestion when hovered even if it has been cleared
                  pathVarInsert.addEventListener("mouseenter", () => {
                        varSuggestion.textContent = `%${pathVarInsert.currentVar}%`
                        this.FocusPathInput()
                  })

                  // Accept suggested vars
                  varSuggestion.addEventListener("click", () => {
                        this.ChangePathVal(pathInput.value + varSuggestion.textContent)
                        varSuggestion.textContent = ""
                        this.FocusPathInput()
                  })

                  // Handle var menu toggling
                  pathActionInsert.addEventListener("click", () => {
                        this.pathVarMenuExpanded = !this.pathVarMenuExpanded

                        if (this.pathVarMenuExpanded) {
                              pathVarMenu.classList.add("path-input-vars-menu-opened")
                              varSuggestion.style.display = "block"
                              this.FocusPathInput()
                        }
                        else {
                              pathVarMenu.classList.remove("path-input-vars-menu-opened")
                              varSuggestion.style.display = "none"
                              this.FocusPathInput()
                        }
                  })

                  // Reset input
                  pathActionReset.addEventListener("click", () => {
                        this.ChangePathVal("%filename%")
                        varSuggestion.textContent = ""
                        this.FocusPathInput()
                  })

                  // Automatically save input to settings
                  pathInput.addEventListener("input", () => {
                        if (isMobile && /[\/\\]/gi.test(pathInput.value)) {
                              // Only display warning if no warning is present
                              if (!mobilePathWarning || mobilePathWarning.dismissed) {
                                    mobilePathWarning = toastManager.DisplayToast(
                                          "Your browser doesn't support setting a download folder",
                                          false,
                                          "https://github.com/Splat15/Bluesky-downloader-extension/tree/main?tab=readme-ov-file#firefox-for-android"
                                    )
                                    mobilePathWarning.DismissOnUninterested()
                              }

                              pathInput.value = pathInput.value.replaceAll(/[\/\\]+/gi, "")
                        }
                        this.value = pathInput.value
                        SetSetting(this.settingId, this.value, this.settings)

                        varSuggestion.textContent = ""
                        pathInputHidden.textContent = pathInput.value
                        pathInput.style.width = window.getComputedStyle(pathInputHidden).width

                        this.HandleUndoButton()

                        this.UpdatePathExample()
                  })

                  // Handle undoing of changes
                  pathUndoButton.addEventListener("click", () => {
                        this.ChangePathVal(this.originalValue)
                        varSuggestion.textContent = ""
                        this.FocusPathInput()
                  })

                  // Add element to container
                  this.container.appendChild(this.element)
                  this.FocusPathInput()

                  if (!cachedExamplePost)
                        onExampleReady.push(() => { this.UpdatePathExample() })
                  else
                        this.UpdatePathExample()
            }

            // Invalid type
            else {
                  throw new Error("Error: setting type \"" + type + "\" not found")
            }
      }

      // Handle when to show the undo button
      HandleUndoButton() {
            if (this.value == this.originalValue)
                  pathUndoButton.classList.remove("path-undo-button-active")
            else
                  pathUndoButton.classList.add("path-undo-button-active")
      }

      // Set path input value manually
      async ChangePathVal(value) {
            if (isMobile && /[\/\\]/gi.test(pathInput.value)) {
                  // Only display warning if no warning is present
                  if (!mobilePathWarning || mobilePathWarning.dismissed) {
                        mobilePathWarning = toastManager.DisplayToast(
                              "Your browser doesn't support setting a download folder",
                              false,
                              "https://github.com/Splat15/Bluesky-downloader-extension/tree/main?tab=readme-ov-file#firefox-for-android"
                        )
                        mobilePathWarning.DismissOnUninterested()
                  }

                  pathInput.value = pathInput.value.replaceAll(/[\/\\]+/gi, "")
            }
            pathInput.value = value
            this.value = value
            SetSetting(this.settingId, this.value, this.settings)

            this.HandleUndoButton()

            this.UpdatePathExample()

            pathInputHidden.textContent = pathInput.value
            pathInput.style.width = window.getComputedStyle(pathInputHidden).width
      }

      // Simulate an example file path using example data
      async UpdatePathExample() {
            if (cachedExamplePost) {
                  pathExample.textContent = GetFilePath(postInfo, this.settings, this.value) + ".mp4"
            }
            else
                  pathExample.textContent = ""
      }

      // Set focus to path input field
      FocusPathInput() {
            pathInputHidden.textContent = pathInput.value
            pathInput.style.width = window.getComputedStyle(pathInputHidden).width

            window.getSelection().selectAllChildren(pathInput)
            window.getSelection().collapseToEnd()
            pathInput.focus();
            pathInput.setSelectionRange(pathInput.value.length, pathInput.value.length);

            pathInput.parentElement.scrollTo({ left: 1000000, behavior: "smooth" })
      }
}

let isMobile = DetectMobileDevice()
let settings = JSON.parse(localStorage.getItem("settings"))
let toastManager = new ToastManager()
let mobilePathWarning;

const settingsContainer = document.getElementById("settings")
const scrollFadeTop = document.getElementById("scrollFadeTop")
const scrollFadeBottom = document.getElementById("scrollFadeBottom")

const scrollbar = document.getElementById("scrollbar")
const scrollbarInputBlock = document.getElementById("scrollbarInputBlock")
let scrollbarDown = false
let scrollbarYOffset = 0
let lastMousePos = 0
let settingsBox
let settingsStyle
let scrollbarInvisible

const onDocumentScroll = () => {
      if (scrollbarDown) return

      let boundingRect = document.documentElement.getBoundingClientRect()
      settingsBox = settingsContainer.getBoundingClientRect()

      const accuracy = 5
      const top = document.documentElement.scrollTop < accuracy
      const bottom = (window.innerHeight - (boundingRect.height - document.documentElement.scrollTop)) > -accuracy

      scrollFadeTop.style.opacity = top ? 0 : 1;
      scrollFadeBottom.style.opacity = bottom ? 0 : 1;


      let scrollRange = settingsBox.height - window.innerHeight
      let scrollPos = window.scrollY
      let percentage = scrollPos / scrollRange

      scrollbar.style = "--scroll-pos: " + percentage

      if (top && bottom) {
            if (!scrollbarInvisible) {
                  scrollbarInvisible = true
                  scrollbar.classList.add("scrollbar-hitbox-hidden")
            }
      }
      else if (scrollbarInvisible) {
            scrollbarInvisible = false
            scrollbar.classList.remove("scrollbar-hitbox-hidden")
      }
}

document.addEventListener("scroll", onDocumentScroll)
window.addEventListener("resize", onDocumentScroll)

const mouseMove = e => {
      if (e.buttons == 0) {
            scrollbarDown = false
      }
      // Scrollbar is active
      if (scrollbarDown) {
            // Left mouse button isn't being pressed
            if (e.buttons == 0) {
                  scrollbarDown = false
                  scrollbarInputBlock.style.display = ""
                  scrollbar.classList.remove("scrollbar-hover")
                  return
            }

            // Set scrollbar position to mouse cursor
            let settingsHeight = settingsBox.height;

            let minPos = parseInt(settingsStyle.paddingTop)
            let maxPos = window.innerHeight - 50
            let sliderRange = maxPos - minPos
            let scrollRange = settingsBox.height - window.innerHeight

            const mousePos = e.clientY || e.touches[0].clientY

            let sliderPos = Math.min(Math.max(mousePos + scrollbarYOffset, minPos), maxPos)
            let percentage = (sliderPos - minPos) / sliderRange

            window.scroll(0, percentage * scrollRange)
            scrollbar.style = "--scroll-pos: " + percentage
      }
}

const mouseDown = e => {
      e.preventDefault()

      scrollbarDown = true;
      scrollbarInputBlock.style.display = "unset"
      scrollbar.classList.add("scrollbar-hover")
      let hitbox = scrollbar.getBoundingClientRect();
      scrollbarYOffset = hitbox.top - (e.clientY || e.touches[0].clientY)
      console.log(scrollbarYOffset)
      console.log("mouse down")
}

const mouseUp = e => {
      scrollbarDown = false;
      scrollbarInputBlock.style.display = ""
      scrollbar.classList.remove("scrollbar-hover")
}

document.addEventListener("mousemove", e => mouseMove(e))
document.addEventListener("touchmove", e => mouseMove(e))

scrollbar.addEventListener("mousedown", e => mouseDown(e))
scrollbar.addEventListener("touchstart", e => mouseDown(e))

document.addEventListener("mouseup", e => mouseUp(e))
document.addEventListener("touchend", e => mouseUp(e))


const licenseCategory = document.getElementById("licenses-category")

for (let i = 0; i < settings.length; i++) {
      const categoryElem = document.createElement("div")
      categoryElem.classList.add("category")
      settingsContainer.insertBefore(categoryElem, licenseCategory)

      const separator = document.createElement("div")
      separator.classList.add("category-separator")
      settingsContainer.insertBefore(separator, document.getElementById("licenses-category"))
      settingsContainer.insertBefore(separator, licenseCategory)

      for (let j = 0; j < settings[i].length; j++) {
            const setting = settings[i][j]
            new Setting(setting.value, setting.type, setting.name, setting.description, setting.tooltip, setting.id, categoryElem, settings, isMobile)
      }
}

browser.runtime.onMessage.addListener(message => {
      // Handle updates to theme from content script
      if (message.type == "set-theme") {
            theme = message.value

            SetThemeClass(theme)
      }
})

function ApplySliderChoppiness(val) {
      return Math.round(val / 5) * 5
}

settingsBox = settingsContainer.getBoundingClientRect()
settingsStyle = getComputedStyle(settingsContainer)

const bodyOutline = document.getElementById("bodyOutline")
bodyOutline.style.height = settingsStyle.height - 1.1

onDocumentScroll()

setTimeout(() => document.body.style.opacity = 1, 200)


const licensesButton = document.getElementById("licensesButton")
licensesButton.addEventListener("click",
      () => window.open(browser.runtime.getURL("../licensepage/licensepage.html")))

const importButton = document.getElementById("settingsImportButton")
importButton.addEventListener("click", () => {
      // Initialize a simplified settings object
      let tempSettings = {
            settings: [],
            downloadedPosts: downloadedURLs.urls
      }

      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]

                  tempSettings.settings.push({
                        id: setting.id,
                        value: setting.value
                  })
            }
      }


      let settingsStr = JSON.stringify(tempSettings, null, 2)


      let popup

      const copySettings = () => {
            console.info(log("Copying settings to clipboard"))
            navigator.clipboard.writeText(popup.textVal)

            const toast = toastManager.DisplayToast("Copied to clipboard")
            toast.DismissOnUninterested(0, 3000)
      }

      const saveSettings = () => {
            console.info(log("Saving modified settings"))
            try {
                  const newSettings = JSON.parse(popup.textVal)
                  console.info(newSettings)

                  for (let i = 0; i < newSettings.settings.length; i++) {
                        const setting = newSettings.settings[i]
                        SetSetting(setting.id, setting.value, settings)
                  }

                  downloadedURLs.urls = newSettings.downloadedPosts

                  browser.runtime.sendMessage({ type: "set-downloaded-urls", value: downloadedURLs.urls })

                  console.log(log("Settings saved successfully"))

                  location.href = location.href
            }
            catch (e) {
                  console.error(log("Saving modified settings failed"))
                  console.error(e)
                  const toast = toastManager.DisplayToast("Error while saving settings")
                  toast.DismissOnUninterested()
            }
      }


      const copyOption = new FullScreenPopup.PopupOption("Copy", () => copySettings())
      const saveOption = new FullScreenPopup.PopupOption("Save", () => saveSettings())
      const cancelOption = new FullScreenPopup.PopupOption("Cancel", null, false)



      popup = new FullScreenPopup(
            "Import settings",
            "",
            [copyOption, saveOption, cancelOption],
            null,
            settingsStr
      )
})

const resetButton = document.getElementById("settingsResetButton")
resetButton.addEventListener("click", () => {
      const resetSettings = () => {
            browser.runtime.sendMessage({ type: "reset-settings" })

            location.href = location.href
      }

      const optionYes = new FullScreenPopup.PopupOption("Yes", () => resetSettings())
      const optionNo = new FullScreenPopup.PopupOption("No", null, false)

      const popup = new FullScreenPopup("Reset",
            "Do you really want to reset Bluesky downloader?",
            [optionYes, optionNo],)
})