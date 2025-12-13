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

      constructor(value, type, name, description, settingId, container, settings) {
            this.value = value
            this.type = type
            this.name = name
            this.description = description
            this.container = container
            this.settingId = settingId
            this.settings = settings
            this.pathVarMenuExpanded = false
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
                        this.ChangeSetting(!this.value)

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
                        <p class="path-input-desc">Download path</p>
                        <div class="path-input-container">
                              <input value="${this.value}" id="pathInput" class="path-input" type="text">
                              <p class="path-input-ext" type="text">.mp4</p>
                        </div>
                        <div class="path-actions path-input-vars-container">
                              <p id="pathActionInsert" class="path-input-action-label path-input-vars">Variables</p>
                              <div id="pathVarsMenu" class="path-input-vars-menu">
                                    <div id="pathVarList" class="path-input-menu-var-list">
                                          <p id="pathVar" class="path-var">test</p>
                                          <p id="pathVar" class="path-var">test</p>
                                          <p id="pathVar" class="path-var">test</p>
                                          <p id="pathVar" class="path-var">test</p>
                                          <p id="pathVar" class="path-var">test</p>
                                          <p id="pathVar" class="path-var">test</p>
                                    </div>
                                    <div class="path-input-menu-right-panel">
                                          <div class="path-input-menu-var-desc">
                                                <p class="path-input-menu-var-desc-text">
                                                      this is a very long test of descriptions d d f f d s s s s w
                                                      wdakmsondwa ndlmaslkdlkw aksjdlk aslkd lkawd s dlkwjak
                                                      ldjsalkd alkdjs lkdjklaw lkjsalkdjklaj ldwl
                                                </p>
                                          </div>
                                          <p id="pathVarInsert" class="path-input-menu-var-insert">Insert</p>
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
                  </div>`, "text/html").getElementsByClassName("setting")[0]

                  const varList = this.element.querySelector("#pathVarList")
                  const pathVarInsert = this.element.querySelector("#pathVarInsert")
                  const pathVarsMenu = this.element.querySelector("#pathVarsMenu")

                  const pathInput = this.element.querySelector("#pathInput")

                  const pathActionInsert = this.element.querySelector("#pathActionInsert")
                  const pathActionHelp = this.element.querySelector("#pathActionHelp")
                  const pathActionReset = this.element.querySelector("#pathActionReset")

                  // Handle toggeling
                  pathActionInsert.addEventListener("click", () => {
                        this.pathVarMenuExpanded = !this.pathVarMenuExpanded

                        if (this.pathVarMenuExpanded)
                              pathVarsMenu.classList.add("path-input-vars-menu-opened")
                        else
                              pathVarsMenu.classList.remove("path-input-vars-menu-opened")
                  })

                  pathActionReset.addEventListener("click", () => {
                        pathInput.value = "%file%"
                        this.value = pathInput.value
                        SetSetting(this.settingId, this.value, this.settings)
                  })

                  pathInput.addEventListener("change", () => {
                        this.value = pathInput.value
                        SetSetting(this.settingId, this.value, this.settings)
                  })

                  // Add element to given container
                  this.container.appendChild(this.element)
            }

            // Invalid type
            else {
                  throw new Error("Error: setting type \"" + type + "\" not found")
            }
      }


      // Change a setting from a given setting object
      ChangeSetting(value) {
            this.value = value

            // Iterate through the different sections / categories
            for (let i = 0; i < this.settings.length; i++) {

                  // Iterate through the different settings
                  for (let j = 0; j < this.settings[i].length; j++) {

                        // Check setting against given ID
                        if (this.settings[i][j].id == this.settingId) {
                              this.settings[i][j].value = this.value
                              return
                        }
                  }
            }

      }
}



let settings = JSON.parse(localStorage.getItem("settings"))


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


function SetSetting(settingId, value, settings) {
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        setting.value = value;
                        localStorage.setItem("settings", JSON.stringify(settings))
                        return
                  }
            }
      }
}