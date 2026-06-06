import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Modified downloader heavily based on down.blue
// https://github.com/breakzplatform/downloader.notx.blue

// Modified downloader to run as a standalone class
// Removed UI values
// Removed unused logic
// Extracted the video conversion logic into separate function
// Made to work with video URLs directly
// Made compatible as a web extension based on browser-extension-ffmpeg
// https://github.com/Aniny21/browser-extension-ffmpeg/
// Added simple progress estimation

// Side note: Firefox extensions can't run multi-core wasm
// Ffmpeg.wasm is best run in a background script due to
// security restrictions that some websites impose
// The browser will throw an error because of wasm restrictions
// This does not impact function
export class Downloader {
      #ffmpeg = new FFmpeg();
      #queue
      #onProgress
      #downloadReady
      #maxTries = 3
      #mobileDevice = DetectMobileDevice()
      ffmpegLoaded = false
      shutDownFFmpeg = null
      unfinishedDownloads

      constructor(unfinishedDownloads) {
            this.unfinishedDownloads = unfinishedDownloads
            this.#queue = []
            this.#downloadReady = true
            this.progress = 0
            this.#onProgress = () => { }

            this.#ffmpeg.on('log', ({ message, type }) => {
                  console.info(log("Ffmpeg Log " + message));
            });
      }

      // Push new download to queue and try to start 
      download(downloadInfo,
            onProgress = () => { }) {
            if (this.#queue.find(element => element.data.url == downloadInfo.url)) return

            // Save it as an unfinished download in case it doesn't complete
            if (!this.unfinishedDownloads.find(element => element.id == downloadInfo.id)) {
                  this.unfinishedDownloads.push(downloadInfo)
                  localStorage.setItem("unfinished-downloads", JSON.stringify(this.unfinishedDownloads))
            }

            this.#queue.push({
                  id: downloadInfo.id,
                  data: downloadInfo,
                  onProgress: onProgress,
                  tries: 0
            })

            this.#download()
      }

      async #download() {
            if (!this.#downloadReady) return

            // Block downloads until complete
            this.#downloadReady = false

            this.progress = 0
            let ffmpegLoading

            // Get next download item
            const currentItem = this.#queue.shift()

            // Get individual properties
            const id = currentItem.id
            const url = currentItem.data.url
            const fileType = currentItem.data.fileType
            const fileExt = currentItem.data.fileExt
            const filePath = currentItem.data.filePath
            const mimeType = currentItem.data.mimeType
            const imgCompression = currentItem.data.imgCompression
            const imgQuality = currentItem.data.imgQuality

            this.#onProgress = currentItem.onProgress
            const tries = currentItem.tries

            console.log(log("Download started for: " + currentItem.data.url))

            // Initialize ffmpeg if needed
            // Always initialized unless media is an image and image compression is off
            if (fileType.id != Downloadbutton.Image.id || imgCompression) {

                  if (this.shutDownFFmpeg) {
                        console.info(log("FFmpeg shutdown aborted"))
                        clearTimeout(this.shutDownFFmpeg)
                  }

                  if (!this.ffmpegLoaded) {
                        console.info(log("Loading FFmpeg"))
                        ffmpegLoading = this.#loadFFmpeg()
                  }
            }

            try {
                  if (fileType.id == Downloadbutton.Image.id)
                        await this.downloadImage(
                              url,
                              filePath,
                              fileExt,
                              ffmpegLoading,
                              imgCompression,
                              imgQuality,
                              mimeType
                        )

                  else if (fileType.id == Downloadbutton.GIF.id)
                        await this.downloadTenorGIF(
                              url,
                              filePath,
                              fileExt,
                              ffmpegLoading,
                              mimeType
                        )

                  else
                        await this.downloadVideo(
                              url,
                              filePath,
                              fileExt,
                              ffmpegLoading,
                              mimeType
                        )

            } catch (error) {
                  console.error(error)

                  if (tries < this.#maxTries) {
                        currentItem.tries++
                        this.#queue.unshift(currentItem)
                        this.progress = 0
                  }
                  else {
                        this.#setProgress(0, error)
                  }

            }

            // Remove download from unfinished downloads regardless if an error has occurred to prevent loops
            this.unfinishedDownloads = this.unfinishedDownloads.filter(element => element.id != id)
            localStorage.setItem("unfinished-downloads", JSON.stringify(this.unfinishedDownloads))

            // Start next download
            this.#downloadReady = true;

            if (this.#queue.length > 0) this.#download()
            else {
                  if (this.#ffmpeg.loaded) {
                        console.info(log("Download queue empty, stopping FFmpeg in 10s"))
                        this.shutDownFFmpeg = setTimeout(() => {
                              console.info(log("Shutting down FFmpeg"))
                              this.#ffmpeg.terminate()
                              this.shutDownFFmpeg = null
                              this.ffmpegLoaded = false
                        }, 10000)
                  }
                  else
                        console.info(log("Download queue empty, FFmpeg not running"))
            }
      }

      // Downloads for images
      async downloadImage(
            url,
            filePath,
            fileExtension,
            ffmpegLoading,
            compressImage,
            imageQuality,
            mimeType
      ) {
            try {
                  // Runs when progress is made
                  const _onProgress = (progress, blob = undefined, filePath = "") => {
                        return new Promise(resolve => {
                              this.progress = progress

                              // Download in progress
                              if (!blob) {
                                    this.#setProgress(progress)
                                    resolve()
                              }

                              // Download finished
                              else if (this.#mobileDevice) {
                                    // Send blob to content script to download
                                    this.#setProgress(100, null, blob)
                                    resolve()
                              }
                              else {
                                    // Download using downloads API
                                    let fileURL = URL.createObjectURL(blob)

                                    // Initiate download
                                    browser.downloads.download({
                                          url: fileURL, filename: filePath
                                    }).then(() => {
                                          this.#setProgress(100)
                                          resolve()

                                          // Free up RAM, will interrupt download if done too soon for some reason
                                          setTimeout(() => {
                                                URL.revokeObjectURL(fileURL)
                                          }, 5000)
                                    })
                              }

                        })
                  }

                  // Fetch image
                  let response = await fetch(url)
                  // Set progress
                  await _onProgress(compressImage ? 20 : 50)

                  // Get image data
                  let arrayBuffer = await response.arrayBuffer()
                  let blob = new Blob([arrayBuffer], { type: mimeType })

                  // Early exit when conversion is not needed
                  if (!compressImage || (mimeType == "image/jpeg" && imageQuality == 100)) {
                        await _onProgress(100, blob, filePath)
                  }
                  // Continue when conversion is needed
                  else {
                        // Set progress
                        await _onProgress(40)

                        // Write file to virtual FS
                        await ffmpegLoading
                        await this.#ffmpeg.writeFile(
                              "input.jpg",
                              await fetchFile(blob)
                        );

                        // Set argument for setting quality based on file type
                        let qualityStr = "";
                        if (mimeType == "image/webp") {
                              qualityStr = "-q"

                              imageQuality = Math.max(imageQuality, 1)
                        }
                        else {
                              qualityStr = "-q:v"

                              // Convert from quality 0% = worst => 100% best to 32 = worst => 1 = best
                              imageQuality = Math.round(32 - 0.31 * imageQuality)
                        }

                        console.info(log("Converting to " + mimeType + " at quality: " + imageQuality))

                        const startTime = Date.now()
                        const onFFmpegProgress = async ({ progress, time }) => {
                              await _onProgress(40 + Math.round(50 * progress))

                              let elapsedMS = Date.now() - startTime
                              let remainingMS = (elapsedMS / progress) - elapsedMS

                              console.info(log(`Progress: ${Math.round(progress * 1000) / 10}%   Elapsed time: ${Math.round(elapsedMS / 100) / 10}s   Estimated time remaining: ${Math.round(remainingMS / 100) / 10}s`))
                        }

                        this.#ffmpeg.on('progress', onFFmpegProgress)

                        // Convert and compress file
                        await this.#ffmpeg.exec(
                              [
                                    "-i",
                                    "input.jpg",
                                    qualityStr,
                                    imageQuality.toString(),
                                    "output" + fileExtension
                              ]
                        )

                        this.#ffmpeg.off("progress", onFFmpegProgress)

                        const image = await this.#ffmpeg.readFile("output" + fileExtension);
                        const imageBlob = new Blob([image], { type: mimeType, });

                        await _onProgress(100, imageBlob, filePath)
                  }

            } catch (error) {
                  console.error(error)
                  this.#setProgress(0, error)
            }
      }

      async downloadVideo(
            url,
            filePath,
            fileExtension,
            ffmpegLoading,
            mimeType
      ) {
            // Code largely written https://github.com/breakzplatform
            // Produces slightly better videos than letting ffmpeg download the video
            const videoBlob = await this.#processPlaylist(url);

            // Wait for ffmpeg to load if it hasn't yet
            await ffmpegLoading
            // Convert to mp4

            let command;
            if (mimeType == "image/gif")
                  command = [
                        "-i",
                        "input.ts",
                        "-map",
                        "0",
                        "-vf",
                        "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                        "output.gif"
                  ]
            else
                  command = [
                        "-i",
                        "input.ts",
                        "-map",
                        "0",
                        "-c",
                        "copy",
                        "output" + fileExtension
                  ]

            let blob = await this.#convertVideo(videoBlob, fileExtension, mimeType, command)

            if (this.#mobileDevice) {
                  // Return file to content script to download
                  this.#setProgress(100, null, blob)
            }
            else {
                  // Download using downloads API
                  let fileURL = URL.createObjectURL(blob)

                  // Initiate download
                  await browser.downloads.download({
                        url: fileURL, filename: filePath
                  })

                  this.#setProgress(100)

                  // Free up RAM, will interrupt download if done too soon for some reason
                  setTimeout(() => {
                        URL.revokeObjectURL(fileURL)
                  }, 5000)
            }
      }

      async downloadTenorGIF(
            url,
            filePath,
            fileExtension,
            ffmpegLoading,
            mimeType
      ) {
            let gif = await fetch(url)
            gif = await gif.arrayBuffer()
            const fileBlob = new Blob([gif], { type: mimeType, });

            if (mimeType == "video/mp4") {
                  if (this.#mobileDevice) {
                        // Return file to content script to download
                        this.#setProgress(100, null, fileBlob)
                  }
                  else {
                        // Download using downloads API
                        let fileURL = URL.createObjectURL(fileBlob)

                        // Initiate download
                        await browser.downloads.download({
                              url: fileURL, filename: filePath
                        })

                        this.#setProgress(100)

                        // Free up RAM, will interrupt download if done too soon for some reason
                        setTimeout(() => {
                              URL.revokeObjectURL(fileURL)
                        }, 5000)
                  }

                  return
            }

            // Wait for ffmpeg to load if it hasn't yet
            await ffmpegLoading
            // Convert to mp4

            let command = [
                  "-i",
                  "input.mp4",
                  "-map",
                  "0",
                  "-vf",
                  "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                  "output.gif"
            ]

            let blob = await this.#convertVideo(fileBlob, fileExtension, mimeType, command, ".mp4")

            if (this.#mobileDevice) {
                  // Return file to content script to download
                  this.#setProgress(100, null, fileBlob)
            }
            else {
                  // Download using downloads API
                  let fileURL = URL.createObjectURL(blob)

                  // Initiate download
                  await browser.downloads.download({
                        url: fileURL, filename: filePath
                  })

                  this.#setProgress(100)

                  // Free up RAM, will interrupt download if done too soon for some reason
                  setTimeout(() => {
                        URL.revokeObjectURL(fileURL)
                  }, 5000)
            }
      }

      async #processPlaylist(playlistUrl) {
            const masterPlaylistResponse = await fetch(playlistUrl);
            const masterPlaylist = await masterPlaylistResponse.text();

            const videoPlaylistUrl = this.#parseHighestQualityVideoUrl(
                  masterPlaylist,
                  playlistUrl
            );
            const videoPlaylistResponse = await fetch(videoPlaylistUrl);
            const videoPlaylist = await videoPlaylistResponse.text();
            const segmentUrls = this.#parseSegmentUrls(
                  videoPlaylist,
                  videoPlaylistUrl
            );

            this.#setProgress(10)

            return this.#downloadSegments(segmentUrls);
      }

      #parseSegmentUrls(videoPlaylist, baseUrl) {
            return videoPlaylist
                  .split("\n")
                  .filter((line) => !line.startsWith("#") && line.trim() !== "")
                  .map((segment) => new URL(segment, baseUrl).toString());
      }

      #parseHighestQualityVideoUrl(masterPlaylist, baseUrl) {
            let highestBandwidth = 0;
            let highestQualityUrl = "";
            masterPlaylist.split("\n").forEach((line, i, lines) => {
                  if (line.startsWith("#EXT-X-STREAM-INF")) {
                        const bandwidth = parseInt(line.match(/BANDWIDTH=(\d+)/)[1]);
                        if (bandwidth > highestBandwidth) {
                              highestBandwidth = bandwidth;
                              highestQualityUrl = lines[i + 1];
                        }
                  }
            });
            return new URL(highestQualityUrl, baseUrl).toString();
      }

      async #downloadSegments(segmentUrls) {
            const chunks = [];
            for (let i = 0; i < segmentUrls.length; i++) {
                  let progress = Math.round(10 + (20 / segmentUrls.length) * (i + 1))
                  this.#setProgress(progress)

                  const response = await fetch(segmentUrls[i]);
                  chunks.push(await response.arrayBuffer());
            }

            return new Blob(chunks, { type: "video/MP2T" });
      }

      async #convertVideo(videoBlob, fileExtension, mimeType, command, inputFileExtension = ".ts") {
            try {
                  // Write file to virtual FS
                  await this.#ffmpeg.writeFile(
                        "input" + inputFileExtension,
                        await fetchFile(videoBlob)
                  );

                  const startTime = Date.now()
                  const onFFmpegProgress = ({ progress, time }) => {
                        this.#setProgress(30 + Math.round(70 * progress))

                        let elapsedMS = Date.now() - startTime
                        let remainingMS = (elapsedMS / progress) - elapsedMS

                        console.info(log(`Progress: ${Math.round(progress * 1000) / 10}%   Elapsed time: ${Math.round(elapsedMS / 100) / 10}s   Estimated time remaining: ${Math.round(remainingMS / 100) / 10}s`))
                  }

                  this.#ffmpeg.on('progress', onFFmpegProgress)

                  // Convert file
                  await this.#ffmpeg.exec(command);

                  // Read file and write it to blob
                  const videoData = await this.#ffmpeg.readFile("output" + fileExtension);
                  const mp4Blob = new Blob([videoData.buffer], {
                        type: mimeType,
                  });

                  return mp4Blob
            }
            catch (e) {
                  console.error(e)
            }
      }

      #setProgress(progress, error = null, videoBlob = null) {
            this.progress = progress
            this.#onProgress(this.progress, error, videoBlob)
      }

      async #loadFFmpeg() {
            await this.#ffmpeg.load({
                  coreURL: browser.runtime.getURL("lib/ffmpeg-core.js"),
                  wasmURL: browser.runtime.getURL("lib/ffmpeg-core.wasm"),
            })
            this.ffmpegLoaded = true
      }
}
