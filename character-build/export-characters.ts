import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_PARAMS } from "./generator/src/core/params";
import { buildHuman } from "./generator/src/core/human";
import { planExport, runExport } from "./generator/src/export";
import { nodeLibrary } from "./generator/scripts/node-assets";

const root = process.cwd();
const lib = await nodeLibrary();
const jobs = [
  { input: join(root, "../male.params.json"), output: "akwantuo-male.glb" },
  { input: join(root, "../female.params.json"), output: "akwantuo-female.glb" }
];
const destination = join(root, "../../apps/game/public/assets/characters");
mkdirSync(destination, { recursive: true });

for (const job of jobs) {
  const overrides = JSON.parse(readFileSync(job.input, "utf8"));
  const params = { ...DEFAULT_PARAMS, ...overrides, detail: "high", rig: "game", restPose: "A", animations: true };
  const character = await buildHuman(lib, params);
  const plan = planExport(character, {
    mode: "animated",
    format: "glb",
    clips: ["idle", "walk"],
    packaging: "embedded",
    clipMesh: false,
    rootMotion: false,
    loopSuffix: false,
    weaponFile: "held",
    vehicleFile: false,
    stageProps: false
  });
  const file = await runExport(lib, character, plan);
  writeFileSync(join(destination, job.output), file.data);
  console.log(`Exported ${job.output}: ${(file.data.byteLength / 1024 / 1024).toFixed(2)} MB; ${character.rig?.bones.length ?? 0} bones; ${plan.files[0].clips.length} clips`);
}
