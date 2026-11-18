# Character model and animation credits

The male and female player models and the shared idle/walk animation clips were copied from [Mesh2Motion/mesh2motion-app](https://github.com/Mesh2Motion/mesh2motion-app):

- Male model: `static/assets/human/variations/psx-28-hm.glb`
- Female model: `static/assets/human/variations/psx-28-female-hm.glb`
- Idle animation: `static/assets/human/animations/idle-a.glb`
- Walk animation: `static/assets/human/animations/walk.glb`

The source repository's [LICENSE-CC0.MD](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/LICENSE-CC0.MD) dedicates its 3D models, rigs and animations to CC0 1.0 Universal. Its contributor credits identify Quaternius as the source of the base human model, rig and animations. The assets may be used and modified commercially under CC0.


Additional locomotion clips used by the game:

- Run: `run-female.glb`
- Jump start: `jump-start.glb`
- Jump air: `jump-air.glb`
- Jump landing: `jump-land.glb`

These clips are loaded from the pinned Mesh2Motion source revision
`5d6918ef67203e68c661b3e32e8e8f227bfd953e` via jsDelivr. They are from the
same CC0 asset collection described above. The game falls back to its existing
idle/walk handling if a remote clip cannot be reached.
