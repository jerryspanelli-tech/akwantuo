import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "character-assets-b64");
const outputDir = path.join(root, "public", "assets", "characters");
fs.mkdirSync(outputDir, { recursive: true });

const assets = [
  { source: "akwantuo-male.glb.b64", output: "akwantuo-male.glb", kind: "character" },
  { source: "akwantuo-female.glb.b64", output: "akwantuo-female.glb", kind: "character" },
  { source: "idle.glb.b64", output: "idle.glb", kind: "animation", clip: /idle/i },
  { source: "walk.glb.b64", output: "walk.glb", kind: "animation", clip: /walk/i }
];

for (const asset of assets) {
  const encoded = fs.readFileSync(path.join(sourceDir, asset.source), "utf8").trim();
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(asset.output + ": invalid GLB file");
  }
  if (bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(asset.output + ": invalid GLB 2.0 header");
  }
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").trim());
  if (!document.skins?.length) throw new Error(asset.output + ": expected a rigged skeleton");
  if (asset.kind === "character" && !document.meshes?.length) {
    throw new Error(asset.output + ": expected a character mesh");
  }
  if (asset.kind === "animation" && !(document.animations ?? []).some((clip) => asset.clip.test(clip.name ?? ""))) {
    throw new Error(asset.output + ": expected matching animation clip");
  }
  fs.writeFileSync(path.join(outputDir, asset.output), bytes);
  console.log("Prepared " + asset.output + " (" + (bytes.length / 1024).toFixed(1) + " KB)");
}
