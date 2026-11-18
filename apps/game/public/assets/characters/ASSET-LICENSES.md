# AKWANTUO character asset provenance

The male and female rigged character models and their matching Idle/Walk clips are imported from the isolated `feat/ghanaian-character-assets` branch.

- Ara 3D Gen source: https://github.com/olatunde85/3d-gen (MIT).
- MakeHuman base data: CC0 1.0.
- Motion-capture clips derive from the CMU Graphics Lab Motion Capture Database. Product use is permitted; the motion data itself must not be resold on its own.

The source GLBs are stored as base64 text under `apps/game/character-assets-b64/` so the build can recreate binary assets without requiring a GitHub Actions cross-branch copy. PlayCanvas loads the male model with the matching Idle and Walk animation skeletons.