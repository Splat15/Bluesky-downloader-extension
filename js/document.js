// This document runs on the main thread of the website to access things that the normal thread can't

var knownURIPaths = []

/** Gets at uri */
async function GetURI(element) {
      let uri
      let postInfo
      let resultPath
      // Get base post element
      let postElement = OuterQuerySelector(element, [
            "[data-testid*='Screen']:not([data-testid='postThreadScreen'])>div>div>div>div>div>div>div>div",
            "div:has(>[data-testid*='postThreadItem'])",
            "div:has(>div>[data-testid*='feedItem-by'])",
            ":has(>*>*>*>*>*>[href*='/profile/'])"
      ]).lastElementChild.lastElementChild
      console.log(postElement)

      //postElement.style.border = "solid green 1px"

      // Get property keys
      const keys = Object.getOwnPropertyNames(postElement)
      const key = keys.find(element => element.startsWith("__reactProps"))

      // Test saved paths
      let result = TestSavedPaths(postElement[key])

      // One of the saved paths has worked. Skipping old procedure
      if (result) {
            console.log("Path cached")
      }
      else {
            result = await ScanObject(postElement[key], (element, path) => {
                  return (path.endsWith("key") || path.endsWith("post.uri")) && element.startsWith("at://")
            }, 20,
                  (resultElem, resultPath, stopSearch) => {
                        if (resultPath.endsWith("uri")) {
                              stopSearch()
                              //console.log("uri found")
                        }
                        else {
                              //console.log("key found, continuing")
                        }
                  }
            )

            // Add discovered path to array of known paths
            if (knownURIPaths.indexOf(result.path) == -1)
                  knownURIPaths.push(result.path)
      }

      resultPath = result.path
      result = result.result
      if (result && result.hasOwnProperty("key")) {
            uri = result.key.replace(/lineartop$/i, "")
      }
      else {
            postInfo = result
      }

      console.log(uri, postInfo, resultPath)

      return { uri: uri, postInfo: postInfo }
}


/** Like querySelector but working outwards through parents */
function OuterQuerySelector(element, selectors) {
      while (!selectors.find(selector => element.matches(selector))) {
            if (element == document.body)
                  return false
            element = element.parentElement
      }
      return element
}


/**Scan object by specifying desired path with dot notation. 
 * Will return element and its path */
async function ScanObject(object_, test, maxDepth, onResult = null, path = null, depth = 0, knownElements = []) {
      let resultElem;
      let resultPath;
      let stopped = false

      // Depth is not too high
      if (depth <= maxDepth) {
            const keys = Object.keys(object_)

            for (let i = 0; i < keys.length; i++) {
                  try {
                        const child = object_[keys[i]]

                        // If child is unknown
                        if (child && !knownElements.includes(child)) {
                              if (typeof child != "string") knownElements.push(child)

                              // Join child path
                              let childPath = (path ? path + "." : "") + keys[i]

                              // Test against supplied function
                              if (test(child, childPath)) {
                                    resultElem = object_
                                    resultPath = childPath

                                    // Allow optional early termination after finding a match
                                    let stopSearch = () => { stopped = true }
                                    if (onResult)
                                          onResult(resultElem, resultPath, stopSearch)
                                    if (stopped) break
                              }

                              // Process child
                              if (typeof child !== "string") {
                                    let results = await ScanObject(child, test, maxDepth, onResult, childPath, depth + 1, knownElements)
                                    knownElements = results.knownElements
                                    resultElem = results.result
                                    resultPath = results.path
                                    stopped = results.stopped

                                    if (stopped) break
                              }
                        }
                  } catch (e) {
                        console.log(e)
                  }
            }
      }

      return {
            knownElements: knownElements,
            result: resultElem,
            path: resultPath,
            stopped: stopped
      }
}

// Test whether a saved path works on this element
function TestSavedPaths(element) {
      // Loop through all known paths
      for (let i = 0; i < knownURIPaths.length; i++) {
            let tempElement
            let path
            try {
                  path = knownURIPaths[i]
                  // Split path into components
                  let components = path.split(".")
                  // Navigate into first sub-element
                  tempElement = element[components.shift()]

                  // Iterate through every component of the path
                  for (let i = 0; i < components.length; i++) {
                        let component = components[i]
                        // Save the last element to use it as a result later
                        previousElement = tempElement
                        // Try to navigate into a sub-element
                        tempElement = tempElement[component]

                        // Not the right path, abort
                        if (!tempElement)
                              break;
                  }
            }
            catch { }

            // The current path has worked
            if (tempElement) {
                  const results = { path: knownURIPaths[i], result: previousElement }
                  return results
            }
      }
}

// Let the content script know that this document has initialized
document.currentScript.setAttribute("has-run", "true")