# AKWANTUO player character assets

These two game-ready GLB files are the adult Ghanaian-inspired player characters used by the character selector. Each character file contains a skinned humanoid rig, but does not embed animation clips.

- `akwantuo-male.glb`: male-presenting skinned character model.
- `akwantuo-female.glb`: female-presenting skinned character model.
- `idle.glb`: shared idle animation clip (`Idle_A`).
- `walk.glb`: shared walking animation clip (`Walk`).

The loader imports the selected character model, then retargets the separate idle and walk clips by matching their animated node names to the character rig. The male and female rigs contain the matching bone/node names needed by these clips.

## Provenance

- Character generator: [Ara 3D Gen](https://github.com/olatunde85/3d-gen), MIT.
- MakeHuman base data: CC0 1.0.
- Motion-capture clips derive from the CMU Graphics Lab Motion Capture Database. The motion data may be used in commercial and non-commercial products, but must not be resold on its own.

## Delivery

The game loads these files from `import.meta.env.BASE_URL` followed by `assets/characters/`, so the models and animation clips are served by the same game deployment. No separate character-assets hosting project is required.
