/*let settings = localStorage.getItem("settings")
if (!settings) settings = { downloadPathPrefix: "%file%" }
else settings = JSON.parse(settings)*/

// Testdata
let settings = [
      // Sections
      [
            // Settings
            { value: true, id: "vidDownload", type: "toggle", name: "Video download", description: "Placeholder" },
            { value: true, id: "imgDownload", type: "toggle", name: "Image download", description: "Placeholder" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF download", description: "Placeholder" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups", description: "Placeholder" }
      ],
      [
            { value: "test/%file%", id: "downloadPath", type: "pathInput", name: "Download path", description: "Placeholder" }
      ]
]

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

      constructor(value, type, name, description, settingId, container, settings) {
            this.value = value
            this.type = type
            this.name = name
            this.description = description
            this.container = container
            this.settingId = settingId
            this.settings = settings

            // Checkbox style setting
            if (this.type == "toggle") {
                  // Parse setting HTML
                  const domParser = new DOMParser()
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
                  })

                  // Add element to given container
                  this.container.appendChild(this.element)
            }

            // Special case for download path input
            else if (this.type == "pathInput") {

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
