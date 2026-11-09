#!/usr/bin/env bash
set -euo pipefail

# Run Ara's headless exporter on Vercel, then publish only the two game-ready GLBs.
git clone --depth 1 https://github.com/olatunde85/3d-gen.git character-build/generator
cd character-build/generator
npm ci --no-audit --no-fund
npm run setup-assets
npx tsx ../export-characters.ts

cd ../..
mkdir -p out
cp apps/game/public/assets/characters/akwantuo-male.glb out/akwantuo-male.glb
cp apps/game/public/assets/characters/akwantuo-female.glb out/akwantuo-female.glb
