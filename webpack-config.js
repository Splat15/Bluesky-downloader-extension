export default {
      mode: "production",
      devtool: [
            { type: "javascript", use: "source-map" },
            { type: "css", use: "inline-source-map" },
      ],
      entry: ["./src/downloader.js", "./src/background.js" ]
};