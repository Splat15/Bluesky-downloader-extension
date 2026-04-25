var standardSettings = [
      // Sections
      [
            { value: "%filename%", id: "downloadPath", type: "pathInput", name: "Download path" }
      ],
      [
            // Settings
            { value: true, id: "vidDownload", type: "toggle", name: "Video downloading" },
            { value: true, id: "imgDownload", type: "toggle", name: "Image downloading" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF downloading" }
      ],
      [
            { value: true, id: "gifsAsWEBM", type: "toggle", name: "Download GIFs as .webm" },
            { value: true, id: "imagesAsWEBP", type: "toggle", name: "Download images as .webp" },
            { value: true, id: "imgQualityMode", type: "toggle", name: "High quality images" }//ANCHOR - TODO
      ],
      [
            { value: 20, id: "imgQuality", type: "slider", name: "Image quality" }
      ],
      [
            { value: true, id: "downloadToast", type: "toggle", name: "Show download popups" }
      ]
]

var settings = [
      // Sections
      [
            { value: "%filename%", id: "downloadPath", type: "pathInput", name: "Download path" }
      ],
      [
            // Settings
            { value: false, id: "imgDownload", type: "toggle", name: "Image downloading" },
            { value: true, id: "gifDownload", type: "toggle", name: "GIF downlosdfasading" }
      ],
      [
            { value: true, id: "gifsAsWEBM", type: "toggle", name: "Download GIFs as .webm" },
            { value: null, id: "imagesAsWEBP", type: "toggle", name: "Download images as .webp" },
      ],
      [
            { value: 17, id: "imgQuality", type: "slider", name: "Image quality" }
      ]
]

let newSettings = structuredClone(standardSettings)

// Loop through categories
for (let category = 0; category < newSettings.length; category++) {
      // Loop through individual settings
      for (let setting = 0; setting < newSettings[category].length; setting++) {
            // Fetch setting from stored settings
            let newSetting = newSettings[category][setting]
            const oldSetting = GetSetting(newSetting.id)

            if (oldSetting) {
                  newSetting.value = oldSetting.value
            }
      }
}
settings = newSettings

console.log(JSON.stringify(settings, null, 2))


function GetSetting(settingId) {
      for (let i = 0; i < settings.length; i++) {
            for (let j = 0; j < settings[i].length; j++) {
                  const setting = settings[i][j]
                  if (setting.id == settingId) {
                        return setting
                  }
            }
      }

      return null
}