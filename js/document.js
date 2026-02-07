// This document runs on the main thread of the website to access things that the normal thread can't

/** Gets base post element and at uri */
function GetURI(element) {
      let uri
      // Get base post element
      let postElement = OuterQuerySelector(element, "div[data-testid*='postThreadItem-by-']")
      // Get property keys
      const keys = Object.getOwnPropertyNames(postElement)

      if (keys && keys.length > 0)
            // Filter for __reactProps
            for (let i = 0; i < keys.length; i++) {
                  const key = keys[i]
                  if (key.startsWith("__reactProps")) {
                        try {
                              // Try to return URI
                              uri = postElement[key].children[0].props.item.uri
                        }
                        catch {
                              // Post is focused
                              // URI is in document.URL
                        }
                        break
                  }
            }
      if (!uri) uri = "none"
      return uri
}


/** Like querySelector but working outwards through parents */
function OuterQuerySelector(element, selector) {
      while (!element.matches(selector)) {
            if (element == document.body)
                  return false
            element = element.parentElement
      }
      return element
}