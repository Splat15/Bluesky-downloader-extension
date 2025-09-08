Bluesky downloader is a Firefox extension that adds download buttons for video and image posts on Bluesky.<br/>
It is built to support Firefox desktop and mobile.<br/>
<br/>
Video downloads are based on [downloader.notx.blue](https://github.com/breakzplatform/downloader.notx.blue) ([down.blue](https://down.blue)) by [breakzplatform](https://github.com/breakzplatform).<br/>
The extension uses [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), a WebAssembly port of ffmpeg to convert downloaded videos to the mp4 format.<br/>
Implementation of ffmpeg.wasm is based on [browser-extension-ffmpeg](https://github.com/Aniny21/browser-extension-ffmpeg) by [Aniny21](https://github.com/Aniny21).<br/>
SVG icons are made by [https://flaticon.com/uicons](https://flaticon.com/uicons).<br/>
Progress indicators are from [progressbar.js](https://github.com/kimmobrunfeldt/progressbar.js) by [kimmobrunfeldt](https://github.com/kimmobrunfeldt). 

To build run:</br>
```
npm install --save-dev web-ext
web-ext build
```
