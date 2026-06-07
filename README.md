# Bluesky Downloader

## Introduction

Bluesky downloader is a Firefox extension that adds download buttons for videos, images and GIFs on Bluesky.<br/>
It's built to support Firefox for desktop and android devices.
<br/><br/>
[Download link](https://addons.mozilla.org/firefox/addon/bluesky-downloader)
<br/><br/>

## How to build

### Setup

Install Node.js<br>
Navigate into repository and run:
```
npm install
```

### Build

```
npm run build
web-ext build
```

## Compatibility

### 3rd party Firefox versions

> [!NOTE]
> This can be ignored if you are using an official Firefox version

Librewolf and other modified Firefox versions may not support prompt-less downloads. </br>
This cannot be influenced by an extension.  </br>
</br>

### Firefox for android

Firefox for android does not support specifying a path for downloaded files.</br>
You can however freely change the file name.</br>
Prompt-less downloads and downloading in the background are also not supported.</br>
Please keep the browser and tab in focus while downloading.
</br></br>

## Credit

Video downloads are based on [downloader.notx.blue](https://github.com/breakzplatform/downloader.notx.blue) ([down.blue](https://down.blue)) by [breakzplatform](https://github.com/breakzplatform).<br/>
The extension uses [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm), a WebAssembly port of ffmpeg to convert downloaded videos to the mp4 format.<br/>
Implementation of ffmpeg.wasm is based on [browser-extension-ffmpeg](https://github.com/Aniny21/browser-extension-ffmpeg) by [Aniny21](https://github.com/Aniny21).<br/>
SVG icons are made by [https://flaticon.com/uicons](https://flaticon.com/uicons).<br/>
Progress indicators are from [progressbar.js](https://github.com/kimmobrunfeldt/progressbar.js) by [kimmobrunfeldt](https://github.com/kimmobrunfeldt). 
