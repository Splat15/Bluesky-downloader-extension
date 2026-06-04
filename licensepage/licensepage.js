const mainPage = document.getElementsByClassName("main-page")[0]

window.addEventListener("resize", () => {
      if (window.innerHeight >= window.innerWidth) {
            mainPage.classList.add("main-page-narrow")
      }
      else {
            mainPage.classList.remove("main-page-narrow")
      }
})