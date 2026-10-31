const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const output = path.join(root, "dist");
const files = ["index.html", "styles.css", "app.js", "avatar-bundle.js", "bomb.png"];

fs.mkdirSync(output, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

console.log(`Static app copied to ${output}`);
