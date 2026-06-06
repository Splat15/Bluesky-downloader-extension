let theme = localStorage.getItem("theme") || "theme--dim"
if (theme == "undefined") theme = "theme--dim"
SetThemeClass(theme)

browser.runtime.onMessage.addListener(message => {
      // Handle updates to theme from content script
      if (message.type == "set-theme") {
            theme = message.value

            SetThemeClass(theme)
      }
})


const licenses = [
      {
            name: "Bluesky downloader",
            path: "../LICENSE",
            links: {
                  repo: "https://github.com/Splat15/Bluesky-downloader-extension"
            }
      },
      {
            name: "Downloader.noxt.blue",
            path: "../Licenses/LICENSE_breakzplatform_downloader.notx.blue.txt",
            links: {
                  homepage: "https://downloader.notx.blue/",
                  repo: "https://github.com/breakzplatform/downloader.notx.blue"
            }
      },
      {
            name: "Ffmpeg.wasm",
            path: "../Licenses/LICENSE_ffmpegwasm_ffmpeg.wasm.txt",
            links: {
                  homepage: "https://ffmpegwasm.netlify.app/",
                  repo: "https://github.com/ffmpegwasm/ffmpeg.wasm"
            }
      },
      {
            name: "Progressar.js",
            path: "../Licenses/LICENSE_kimmobrunfeldt_progressbar.js.txt",
            links: {
                  homepage: "https://kimmobrunfeldt.github.io/progressbar.js/",
                  repo: "https://github.com/kimmobrunfeldt/progressbar.js"
            }
      },
      {
            name: "Browser extension ffmpeg",
            path: "../Licenses/LICENSE_Aniny21_browser-extension-ffmpeg.txt",
            links: {
                  repo: "https://github.com/Aniny21/browser-extension-ffmpeg"
            }
      },
]
let licenseElems = []

const mainPage = document.getElementsByClassName("main-page")[0]

const onResize = () => {
      if (window.innerWidth < 850) {
            mainPage.classList.add("main-page-narrow")
      }
      else {
            mainPage.classList.remove("main-page-narrow")
      }
}

onResize()
window.addEventListener("resize", () => {
      onResize()
})


const sidebarButton = document.getElementById("sidebarAcivateButton")
const sidebar = document.getElementById("sidebar")
const inputBlock = document.getElementById("inputBlock")
let sidebarActive = false
sidebarButton.addEventListener("click", () => {
      sidebarActive = true

      sidebar.classList.add("sidebar-active")
      inputBlock.classList.add("input-block-active")

})

inputBlock.addEventListener("click", () => {
      sidebarActive = false

      sidebar.classList.remove("sidebar-active")
      inputBlock.classList.remove("input-block-active")
})

const licenseTextElem = document.getElementById("contentLicenseText")
const licenseNameElem = document.getElementById("contentLicenseName")
const contentElem = document.getElementById("content")
const homepageLink = document.getElementById("homepageLink")
const repoLink = document.getElementById("repoLink")
const rawLink = document.getElementById("rawLink")
const selectLicense = async (event) => {
      // Fade out license content
      contentElem.style.opacity = 0;
      const timer = new Promise(resolve => setTimeout(() => resolve(), 80))

      // Hide sidebar if visible
      sidebarActive = false
      sidebar.classList.remove("sidebar-active")
      inputBlock.classList.remove("input-block-active")


      const element = event.target
      // Remove active class from all elements
      Array.from(document.getElementsByClassName("license-entry-active"))
            .forEach(element => element.classList.remove("license-entry-active"))
      // Add active class to current element
      element.classList.add("license-entry-active")

      // Get license text from file
      let licenseText = await fetch(element.path)
      licenseText = await licenseText.text()
      licenseText = licenseText.replaceAll(/\n/g, "<br>")

      // Await fade out transition if necessary
      await timer
      // Switch license
      licenseTextElem.innerHTML = licenseText
      licenseNameElem.textContent = element.textContent

      repoLink.href = element.repoURL || ""
      homepageLink.href = element.homeURL || ""
      rawLink.href = element.path || ""
      repoLink.onclick = (e) => { window.open(element.repoURL); e.preventDefault() }
      homepageLink.onclick = (e) => { window.open(element.homeURL); e.preventDefault() }
      rawLink.onclick = (e) => { window.open(element.path); e.preventDefault() }

      repoLink.style.display = element.repoURL ? "block" : "none"
      homepageLink.style.display = element.homeURL ? "block" : "none"

      // Fade in license content
      contentElem.style.opacity = 1
}

for (let i = 0; i < licenses.length; i++) {
      const license = licenses[i]

      const licenseListElem = document.createElement("div")
      licenseListElem.classList.add("license-entry")
      licenseListElem.textContent = license.name;
      licenseListElem.path = browser.runtime.getURL(license.path)
      licenseListElem.repoURL = license.links.repo
      licenseListElem.homeURL = license.links.homepage

      licenseListElem.addEventListener("click", elem => selectLicense(elem))

      sidebar.appendChild(licenseListElem)
      licenseElems.push(licenseListElem)
}

selectLicense({ target: licenseElems[0] })


setTimeout(() => document.body.style.opacity = 1, 200)