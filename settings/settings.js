let cachedExamplePost
let exampleAtURI = "at://bsky.app/app.bsky.feed.post/3lxxo3i4qzs2c"
let exampleURL = "https://video.bsky.app/watch/did%3Aplc%3Az72i7hdynmk6r22z27h6tvur/bafkreihqbowyhq3quw3ctt5t45jrvfycrbxbplp4oq5ho3pcq32zoihm6i/thumbnail.jpg"
let onExampleReady = []
fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=" + exampleAtURI)
      .then(response =>
            response.text().then(post => {
                  cachedExamplePost = JSON.parse(post)
                  onExampleReady.forEach(func => func())
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

      constructor(value, type, name, description, settingId, container, settings, isMobile) {
            this.value = value
            this.type = type
            this.name = name
            this.description = description
            this.container = container
            this.settingId = settingId
            this.settings = settings
            this.pathVarMenuExpanded = false
            this.originalValue = value
            const domParser = new DOMParser()

            // Checkbox style setting
            if (this.type == "toggle") {
                  // Parse setting HTML
                  this.element = domParser.parseFromString(`
                  <div class="setting setting-${this.value ? "" : "in"}active">
                        <div type="checkbox" class="checkbox">
                              <svg fill="none" width="14" viewBox="0 0 24 24" height="14" style="margin: 5px;">
                                    <path fill="#FFFFFF" stroke="none" stroke-width="0" stroke-linecap="butt"
                                          stroke-linejoin="miter" fill-rule="evenodd" clip-rule="evenodd"
                                          d="M21.474 2.98a2.5 2.5 0 0 1 .545 3.494l-10.222 14a2.5 2.5 0 0 1-3.528.52L2.49 16.617a2.5 2.5 0 0 1 3.018-3.986l3.75 2.84L17.98 3.525a2.5 2.5 0 0 1 3.493-.545Z">
                                    </path>
                              </svg>
                        </div>
                        <p class="setting-name">${this.name}</p>
                  </div>`, "text/html").getElementsByClassName("setting")[0]

                  // Handle toggeling
                  this.element.addEventListener("click", () => {
                        // Invert value and sync with settings

                        this.value = !this.value

                        if (this.value)
                              this.element.classList.replace("setting-inactive", "setting-active")
                        else
                              this.element.classList.replace("setting-active", "setting-inactive")

                        SetSetting(this.settingId, this.value, this.settings)
                  })

                  // Add element to given container
                  this.container.appendChild(this.element)
            }

            // Special case for download path input
            else if (this.type == "pathInput") {
                  this.element = domParser.parseFromString(`
                        <div class="setting path-setting">
                              <div class="path-input-desc">
                                    <p style="margin: auto 0;">${isMobile ? "File name" : "Download path"}</p>
                                    <input id="pathUndoButton" class="path-undo-button" type="button">
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
                                    <p id="pathActionInsert" class="path-input-action-label path-input-vars">Variables</p>
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
                                          <p id="pathActionHelp" class="path-input-action-label">Help</p>
                                    </div>
                                    <div class="path-input-action path-input-reset">
                                          <p id="pathActionReset" class="path-input-action-label">Reset</p>
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
                        helpPopupDiv.classList.add("help-popup-div-active")
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

                  // Handle var menu toggeling
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
                              if (!mobilePathWarning || mobilePathWarning.dismissed)
                                    mobilePathWarning = toastManager.DisplayToast(
                                          "Your browser doesn't support setting a download folder",
                                          false,
                                          "https://github.com/Splat15/Bluesky-downloader-extension/tree/main?tab=readme-ov-file#firefox-for-android"
                                    )

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
                  if (!mobilePathWarning || mobilePathWarning.dismissed)
                        mobilePathWarning = toastManager.DisplayToast(
                              "Your browser doesn't support setting a download folder",
                              false,
                              "https://github.com/Splat15/Bluesky-downloader-extension/tree/main?tab=readme-ov-file#firefox-for-android"
                        )

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
                  let postInfo = await GetInfoFromThread(exampleAtURI, exampleURL, cachedExamplePost)
                  pathExample.textContent = GetFilePath(postInfo, this.value) + ".mp4"
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

            pathInput.parentElement.scrollTo({ left: 1000000, behaviour: "smooth" })
      }
}

let lightMode = localStorage.getItem("lightMode") == "true"
if (lightMode) document.documentElement.classList.add("light-mode")
else document.documentElement.classList.add("dark-mode")

let isMobile = DetectMobileDevice()
let settings = JSON.parse(localStorage.getItem("settings"))
let toastManager = new ToastManager()
let mobilePathWarning;

if (isMobile) {
      document.getElementById("helpPopupTextMobile").style.display = "block"
      document.getElementById("helpPopupText").style.display = "none"

      document.getElementById("helpPopupTitle").textContent = "File name"
}

const helpPopup = document.getElementById("helpPopup")
const helpPopupDismiss = document.getElementById("helpPopupDismiss")
const helpPopupText = document.getElementById("helpPopupText")

// Enable dismissing of help popup with dismiss button or by clicking the background
helpPopupDiv.addEventListener("click", () => helpPopupDiv.classList.remove("help-popup-div-active"))
helpPopupDismiss.addEventListener("click", () => helpPopupDiv.classList.remove("help-popup-div-active"))
// Stop dismissing action when clicking help popup
helpPopup.addEventListener("click", (e) => e.stopPropagation())


const settingsContainer = document.getElementById("settings")
for (let i = 0; i < settings.length; i++) {
      const categoryElem = document.createElement("div")
      categoryElem.classList.add("category")
      settingsContainer.appendChild(categoryElem)

      if (settings.length > i + 1) {
            const separator = document.createElement("div")
            separator.classList.add("category-separator")
            settingsContainer.appendChild(separator)

      }

      for (let j = 0; j < settings[i].length; j++) {
            const setting = settings[i][j]
            new Setting(setting.value, setting.type, setting.name, setting.description, setting.id, categoryElem, settings, isMobile)
      }
}

browser.runtime.onMessage.addListener(message => {
      // Handle settings updates
      if (message.type == "settings-update")
            settings = message.settings

      // Handle updates to theme
      if (message.type == "set-light-mode") {
            lightMode = message.lightMode

            if (lightMode) {
                  document.documentElement.classList.remove("dark-mode")
                  document.documentElement.classList.add("light-mode")
            }
            else {
                  document.documentElement.classList.remove("light-mode")
                  document.documentElement.classList.add("dark-mode")
            }
      }
})