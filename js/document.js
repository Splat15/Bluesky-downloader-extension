// This document runs on the main thread of the website to access things that the normal thread can't

/** Gets at uri */
function GetURI(element) {
      let uri
      let postInfo
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
                              return (/*path.endsWith("key") ||*/ path.endsWith("post.uri")) && element.startsWith("at://")

                        }, 20).result
                        if (result.hasOwnProperty("key")) {
                              uri = result.key.replace(/lineartop$/i, "")
                        }
                        else {
                              postInfo = result
                        }
                        break
                  }
            }

      console.log(uri, postInfo)

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
function ScanObject(object_, test, maxDepth, path = null, depth = 0, knownElements = []) {
      let resultElem;
      let resultPath;

      // Depth is not too high
      if (depth <= maxDepth) {
            //console.log(path)
            const keys = Object.keys(object_)
            //console.log(keys)

            for (let i = 0; i < keys.length; i++) {
                  try {
                        const child = object_[keys[i]]

                        // If child is unknown
                        if (child && !knownElements.includes(child)) {
                              knownElements.push(child)

                              let childPath = (path ? path + "." : "") + keys[i]
                              if (test(child, childPath)) {
                                    resultElem = object_
                                    resultPath = childPath
                                    break
                              }

                              if (typeof child !== "string") {
                                    let results = ScanObject(child, test, maxDepth, childPath, depth + 1, knownElements)
                                    knownElements = results.knownElements
                                    resultElem = results.result
                                    resultPath = results.path
                                    if (resultElem) break
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
            path: resultPath
      }
}

document.currentScript.setAttribute("has-run", "true")