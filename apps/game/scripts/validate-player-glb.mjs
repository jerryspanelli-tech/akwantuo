import fs from "node:fs";

const file = process.argv[2] ?? "public/assets/characters/generated/player.glb";
if (!fs.existsSync(file)) throw new Error(`Player GLB was not generated: ${file}`);

const bytes = fs.readFileSync(file);
if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
  throw new Error("Player asset is not a valid GLB file.");
}
if (bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
  throw new Error("Player asset must use a valid GLB 2.0 header and declared file length.");
}

let offset = 12;
let document = null;
while (offset + 8 <= bytes.length) {
  const chunkLength = bytes.readUInt32LE(offset);
  const chunkType = bytes.readUInt32LE(offset + 4);
  const start = offset + 8;
  const end = start + chunkLength;
  if (end > bytes.length) throw new Error("Player GLB contains a truncated chunk.");
  if (chunkType === 0x4e4f534a) {
    document = JSON.parse(bytes.subarray(start, end).toString("utf8").trim());
    break;
  }
  offset = end;
}

if (!document) throw new Error("Player GLB has no JSON document chunk.");
if (!document.meshes?.length) throw new Error("Player GLB contains no character mesh.");
if (!document.skins?.length) throw new Error("Player GLB is not rigged (no skin/skeleton).");

const clips = (document.animations ?? []).map((animation) => animation.name ?? "");
const required = ["idle", "walk", "run"];
const missing = required.filter((name) => !clips.some((clip) => new RegExp(name, "i").test(clip)));
if (missing.length) {
  throw new Error(`Player GLB is missing required embedded animation clips: ${missing.join(", ")}. Found: ${clips.join(", ") || "none"}`);
}

console.log(`Validated ${file}: ${(bytes.length / 1048576).toFixed(2)} MB; ${document.meshes.length} mesh(es); ${document.skins.length} skin(s); clips: ${clips.join(", ")}`);
