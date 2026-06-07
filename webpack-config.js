import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
      context: path.resolve(__dirname, "dist"),
      mode: "development",
      devtool: [
            { type: "javascript", use: "source-map" },
            { type: "css", use: "inline-source-map" },
      ],
      entry: {
            background: {
                  import: ["../src/downloader.js", "../src/background.js", "../js/classes.js"], filename: "[name].js"
            }
      }
};