# AKWANTUO player character assets

These two game-ready GLB files are the adult Ghanaian-inspired player characters used by the character selector.

- `akwantuo-male.glb`: skinned character model with embedded Idle and Walk animation clips.
- `akwantuo-female.glb`: skinned character model with embedded Idle and Walk animation clips.

## Provenance

- Character generator: [Ara 3D Gen](https://github.com/olatunde85/3d-gen), MIT.
- MakeHuman base data: CC0 1.0.
- Motion-capture clips derive from the CMU Graphics Lab Motion Capture Database. The motion data may be used in commercial and non-commercial products, but must not be resold on its own.

## Delivery

The game loads these files from `import.meta.env.BASE_URL + assets/characters/`, so the models are served by the same game deployment. No separate character-assets hosting project is required.
