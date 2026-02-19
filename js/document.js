// This document runs on the main thread of the website to access things that the normal thread can't

/** Gets at uri */
function GetURI(element) {
      let uri
      let postInfo
      let resultPath
      // Get base post element
      let postElement = OuterQuerySelector(element, ["[data-testid*='Screen']>div>div>div>div>div", "div:has(>div>[data-testid*='feedItem-by'])"]).lastElementChild.lastElementChild
      console.log(postElement)
      postElement.style.border = "solid green 1px"

      // Get property keys
      const keys = Object.getOwnPropertyNames(postElement)

      if (keys && keys.length > 0)
            // Filter for __reactProps
            for (let i = 0; i < keys.length; i++) {
                  const key = keys[i]
                  if (key.startsWith("__reactProps")) {
                        let result = ScanObject(postElement[key], (element, path) => {
                              return (path.endsWith("key") || path.endsWith("post.uri")) && element.startsWith("at://")
                        }, 20,
                              (resultElem, resultPath, stopSearch) => {
                                    if (resultPath.endsWith("uri")) {
                                          stopSearch()
                                          console.log("uri found")
                                    }
                                    else {
                                          console.log("key found, continuing")
                                    }
                              }
                        )
                        resultPath = result.path /*+ " (" + (Array.from(result.path.matchAll(/\./gi)).length + 1) + ")"*/
                        result = result.result
                        if (result && result.hasOwnProperty("key")) {
                              uri = result.key.replace(/lineartop$/i, "")
                        }
                        else {
                              postInfo = result
                        }
                        break
                  }
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
function ScanObject(object_, test, maxDepth, onResult = null, path = null, depth = 0, knownElements = []) {
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
                              if(typeof child != "string") knownElements.push(child)

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
                                    let results = ScanObject(child, test, maxDepth, onResult, childPath, depth + 1, knownElements)
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

document.currentScript.setAttribute("has-run", "true")