const { createFFmpeg, fetchFile } = FFmpeg

// Modified downloader heavily based on down.blue
// https://github.com/breakzplatform/downloader.notx.blue

// Modified downloader to run as a standalone class
// Removed UI values
// Removed unused logic
// Extracted the video conversion locig into separate function
// Made to work with video URLs directly
// Made compatible as a web extension based on browser-extension-ffmpeg
// https://github.com/Aniny21/browser-extension-ffmpeg/
// Added simple progress estimation

// Side note: Firefox extensions can't run multi-core wasm
// Ffmpeg.wasm is best run in a background script due to
// security restrictions that some websites impose
// The browser will throw an error because of wasm restrictions
// This does not impact function
class VideoDownloader {
      #ffmpeg
      #queue
      #onProgress
      #downloadReady
      #maxTries = 3
      #mobileDevice = this.#detectMobile()

      constructor() {
            this.#queue = []
            this.#downloadReady = true
            this.progress = 0
            this.#onProgress = () => { }
      }

      download(url, filePath, onProgress = () => { }) {
            if (this.#queue.find(element => element.url == url)) return

            this.#queue.push({ url: url, filePath: filePath, onProgress: onProgress, tries: 0 })
            if (this.#downloadReady) {
                  this.#downloadReady = false
                  this.#download()
            }
      }

      // Downloads for GIFs in .gif format
      async downloadGIF(url, filePath, onProgress = () => { }) {
            try {
                  if (!this.#ffmpeg){
                        this.#ffmpeg = createFFmpeg({
                              corePath: chrome.runtime.getURL("lib/ffmpeg-core.js"),
                              log: true,
                              mainName: 'main'
                        });
                  }
                  let ffmpegLoading = new Promise(resolve => this.#ffmpeg.load().then(resolve()))


                  const videoBlob = await this.#proccessPlaylist(url);
                  await ffmpegLoading

                  onProgress(40)
                  let fileBlob = await this.#convertGIF(videoBlob)

                  if (this.#mobileDevice) {
                        onProgress(100, null, fileBlob)
                        return;
                  }

                  onProgress(90)
                  let fileURL = URL.createObjectURL(fileBlob)

                  browser.downloads.download({
                        // replace .webm with .gif
                        url: fileURL, filename: filePath
                  })


            } catch (error) {
                  console.error(error)
                  onProgress(this.progress, error)
            }

            await this.#ffmpeg.exit()
      }

      // Downloads for GIFs in .webm format and images
      async downloadImage(url, filePath, onProgress = () => { }) {
            try {
                  browser.downloads.download({ filename: filePath, url: url }).then(id => {
                        browser.downloads.search({ id: id }).then(downloadItems => {

                              if (downloadItems.length > 0) {
                                    const downloadItem = downloadItems[0]

                                    const _onProgress = ((interval) => {
                                          if (downloadItem.error)
                                                throw new Error(downloadItem.error)

                                          this.progress = (downloadItem.totalBytes == -1 ? 1 : downloadItem.bytesReceived / downloadItem.totalBytes) * 100
                                          console.log(" progress: " + this.progress)

                                          onProgress(this.progress, downloadItem.error)

                                          if (this.progress >= 100)
                                                clearInterval(interval)
                                    })

                                    const interval = setInterval(() => {
                                          _onProgress(interval)
                                    }, 100)
                                    _onProgress(interval)
                              }

                              else {
                                    onProgress(0, "Download object lost")
                              }
                        });
                  })

            } catch (error) {
                  console.error(error)
                  this.#setProgress(0, error)

            }
      }

      async #download() {
            const currentItem = this.#queue.shift()

            const tries = currentItem.tries
            const url = currentItem.url
            const filePath = currentItem.filePath
            this.#onProgress = currentItem.onProgress

            this.#downloadReady = false
            this.progress = 0


            if (!this.#ffmpeg){ 
            this.#ffmpeg = createFFmpeg({
                  corePath: chrome.runtime.getURL("lib/ffmpeg-core.js"),
                  log: true,
                  mainName: 'main'
            });
      }

            let ffmpegLoading = new Promise(resolve => this.#ffmpeg.load().then(resolve()))

            try {
                  const videoBlob = await this.#proccessPlaylist(url);
                  await ffmpegLoading
                  let fileBlob = await this.#convertVideo(videoBlob)

                  if (this.#mobileDevice) {
                        this.#setProgress(100, null, fileBlob)
                  }
                  else {
                        let fileURL = URL.createObjectURL(fileBlob)

                        browser.downloads.download({
                              url: fileURL, filename: filePath
                        })
                        this.#setProgress(100)
                  }

            } catch (error) {
                  console.error(error)

                  if (tries < this.#maxTries) {
                        currentItem.tries++
                        this.#queue.push(currentItem)
                        this.progress = 0
                  }
                  else {
                        this.#setProgress(0, error)
                  }

            }

            await this.#ffmpeg.exit()
            this.#downloadReady = true;
            if (this.#queue.length > 0) this.#download()
      }

      async #convertVideo(videoBlob) {
            if (!this.#ffmpeg) {

                  this.#ffmpeg = createFFmpeg({
                        corePath: chrome.runtime.getURL("lib/ffmpeg-core.js"),
                        log: true,
                        mainName: 'main'
                  });
            }

            if (!this.#ffmpeg.isLoaded()) {
                  await this.#ffmpeg.load();
            }

            this.#setProgress(90)

            this.#ffmpeg.FS(
                  "writeFile",
                  "input.ts",
                  await fetchFile(videoBlob)
            );


            await this.#ffmpeg.run(
                  "-i",
                  "input.ts",
                  "-map",
                  "0",
                  "-c",
                  "copy",
                  "output.mp4"
            );

            const videoData = this.#ffmpeg.FS("readFile", `output.mp4`);
            const mp4Blob = new Blob([videoData.buffer], {
                  type: "video/mp4",
            });

            return mp4Blob
      }

      async #convertGIF(videoBlob) {
            if (!this.#ffmpeg) {

                  this.#ffmpeg = createFFmpeg({
                        corePath: chrome.runtime.getURL("lib/ffmpeg-core.js"),
                        log: true,
                        mainName: 'main'
                  });
            }

            if (!this.#ffmpeg.isLoaded()) {
                  await this.#ffmpeg.load();
            }

            this.#ffmpeg.FS(
                  "writeFile",
                  "input.webm",
                  await fetchFile(videoBlob)
            );


            await this.#ffmpeg.run(
                  //ffmpeg -i test.webm -vf "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" test.gif -y
                  "-i",
                  "input.webm",
                  "-map",
                  "0",
                  "-vf",
                  "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
                  "output.gif"
            )

            const videoData = this.#ffmpeg.FS("readFile", `output.gif`);
            const mp4Blob = new Blob([videoData.buffer], {
                  type: "image/gif",
            });

            return mp4Blob
      }

      async #proccessPlaylist(playlistUrl) {
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

            this.#setProgress(15)

            return this.#downloadSegments(segmentUrls);
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

      #parseSegmentUrls(videoPlaylist, baseUrl) {
            return videoPlaylist
                  .split("\n")
                  .filter((line) => !line.startsWith("#") && line.trim() !== "")
                  .map((segment) => new URL(segment, baseUrl).toString());
      }

      async #downloadSegments(segmentUrls) {
            const chunks = [];
            for (let i = 0; i < segmentUrls.length; i++) {
                  let progress = Math.round(15 + (55 / segmentUrls.length) * (i + 1))
                  console.log(progress)
                  this.#setProgress(progress)

                  const response = await fetch(segmentUrls[i]);
                  chunks.push(await response.arrayBuffer());
            }

            return new Blob(chunks, { type: "video/MP2T" });
      }


      #setProgress(progress, error = null, videoBlob = null) {
            this.progress = progress
            this.#onProgress(this.progress, error, videoBlob)
      }

      /** Detect if a mobile device is used in the least intrusive way
       * 
       *  Checking if `browser.downloads === undefined` would require extra permissions
       */
      #detectMobile() {
            const toMatch = [
                  /Android/i,
                  /webOS/i,
                  /iPhone/i,
                  /iPad/i,
                  /iPod/i,
                  /BlackBerry/i,
                  /Windows Phone/i
            ];

            return toMatch.some((toMatchItem) => {
                  return navigator.userAgent.match(toMatchItem);
            });
      }
}
