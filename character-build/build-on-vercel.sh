#!/usr/bin/env bash
set -euo pipefail

# Run Ara's headless exporter on Vercel, then publish only the two game-ready GLBs.
# Clone into a fresh staging directory, verify it, then replace the disposable checkout.
GENERATOR_STAGING="character-build/generator.staging.$$"
rm -rf "$GENERATOR_STAGING"
git clone --depth 1 https://github.com/olatunde85/3d-gen.git "$GENERATOR_STAGING"
test -f "$GENERATOR_STAGING/package.json" || { echo "Ara generator clone is incomplete"; exit 1; }
rm -rf character-build/generator
mv "$GENERATOR_STAGING" character-build/generator
cd character-build/generator
npm install --no-audit --no-fund
npm run setup-assets
npx tsx ../export-characters.ts

cd ../..
mkdir -p out
cp apps/game/public/assets/characters/akwantuo-male.glb out/akwantuo-male.glb
cp apps/game/public/assets/characters/akwantuo-female.glb out/akwantuo-female.glb
