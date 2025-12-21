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

      constructor(value, type, name, description, settingId, container, settings) {
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
                                    <p style="margin: auto 0;">Download path</p>
                                    <input id="pathUndoButton" class="path-undo-button" type="button">
                              </div>
                              <div id="pathInputContainer" class="path-input-container-container">
                                    <div class="path-input-container">
                                          <input id="pathInput" type="text" value="${this.value}" spellcheck="false" class="path-input">
                                          <div class="path-input-suggestion-container">
                                                <span contentEditable=true id="pathInputHidden" class="path-input-hidden" spellcheck="false">${this.value}</span>
                                                <p class="path-input-suggestion" id="varSuggestion"></p>
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
                  pathVars.forEach(variable => {
                        const element = document.createElement("p")
                        element.classList.add("path-var")
                        element.textContent = variable.name

                        varList.appendChild(element)

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

                        if (this.pathVarMenuExpanded)
                              pathVarMenu.classList.add("path-input-vars-menu-opened")
                        else
                              pathVarMenu.classList.remove("path-input-vars-menu-opened")
                  })

                  // Reset input
                  pathActionReset.addEventListener("click", () => {
                        this.ChangePathVal("%file%")
                        varSuggestion.textContent = ""
                        this.FocusPathInput()
                  })

                  // Automatically save input to settings
                  pathInput.addEventListener("input", () => {
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
                  
                  this.UpdatePathExample()
            }

            // Invalid type
            else {
                  throw new Error("Error: setting type \"" + type + "\" not found")
            }
      }

      HandleUndoButton() {
            if (this.value == this.originalValue)
                  pathUndoButton.classList.remove("path-undo-button-active")
            else
                  pathUndoButton.classList.add("path-undo-button-active")
      }

      ChangePathVal(value) {
            pathInput.value = value
            this.value = value
            SetSetting(this.settingId, this.value, this.settings)

            this.HandleUndoButton()

            this.UpdatePathExample()

            pathInputHidden.textContent = pathInput.value
            pathInput.style.width = window.getComputedStyle(pathInputHidden).width
      }

      UpdatePathExample() {
            const url = "https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreifihgfy33x5mxc6metbzi42iv53i2s3fkxm4c3cehg6xuq7ce4hfm@jpeg"
            const hash = GenerateHash(url)
            const username = "bsky.app"
            const displayName = "Bluesky"
            const type = Downloadbutton.Image.name

            pathExample.textContent = GetFilePath(hash, type, username, displayName, this.value) + ".mp4"
      }

      FocusPathInput() {
            pathInputHidden.textContent = pathInput.value
            pathInput.style.width = window.getComputedStyle(pathInputHidden).width

            window.getSelection().selectAllChildren(pathInput)
            window.getSelection().collapseToEnd()
            pathInput.focus();
            pathInput.setSelectionRange(pathInput.value.length, pathInput.value.length);

            pathInput.parentElement.scrollTo({ left: 1000, behaviour: "smooth" })
      }
}


let settings = JSON.parse(localStorage.getItem("settings"))
const pathVars = [
      { name: "File name", desc: "Username of the poster and the hash of the file URL.", tags: ["filename", "file"] },
      { name: "Username", desc: "Username of the poster.", tags: ["username", "user", "tag"] },
      { name: "Display name", desc: "Display name of the poster.", tags: ["displayname", "poster", "name"] },
      { name: "Hash", desc: "Hash of the file URL.", tags: ["hash", "id"] },
      { name: "Type", desc: "Media type of the post.", tags: ["type", "media", "medium", "format"] }
]


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
            new Setting(setting.value, setting.type, setting.name, setting.description, setting.id, categoryElem, settings)
      }
}

browser.runtime.onMessage.addListener(message => {
      if (message.type == "settings-update")
            settings = message.settings
})