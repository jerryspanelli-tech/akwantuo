import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";

type Point = { x: number; z: number };
type Walker = {
  root: Entity;
  route: Point[];
  segment: number;
  progress: number;
  speed: number;
  leftLeg: Entity;
  rightLeg: Entity;
  leftArm: Entity;
  rightArm: Entity;
  phase: number;
};
type TrafficUnit = {
  root: Entity;
  route: Point[];
  segment: number;
  progress: number;
  speed: number;
  lane: number;
};

export function createAmbientLife(app: AppBase): void {
  const materials = {
    black: makeMaterial(0.035, 0.045, 0.045),
    glass: makeMaterial(0.12, 0.27, 0.31),
    tyre: makeMaterial(0.025, 0.03, 0.03),
    taxi: makeMaterial(0.82, 0.68, 0.25),
    trotro: makeMaterial(0.12, 0.36, 0.24),
    trotroStripe: makeMaterial(0.86, 0.72, 0.28),
    white: makeMaterial(0.82, 0.83, 0.79),
    blue: makeMaterial(0.12, 0.28, 0.48),
    red: makeMaterial(0.58, 0.15, 0.12),
    silver: makeMaterial(0.48, 0.52, 0.53),
    orange: makeMaterial(0.82, 0.39, 0.12),
    skin1: makeMaterial(0.31, 0.17, 0.1),
    skin2: makeMaterial(0.43, 0.25, 0.16),
    skin3: makeMaterial(0.24, 0.12, 0.075),
    shirt1: makeMaterial(0.12, 0.31, 0.23),
    shirt2: makeMaterial(0.76, 0.55, 0.24),
    shirt3: makeMaterial(0.55, 0.18, 0.14),
    shirt4: makeMaterial(0.18, 0.31, 0.52),
    shirt5: makeMaterial(0.78, 0.76, 0.67),
    cloth: makeMaterial(0.23, 0.16, 0.12),
    trousers: makeMaterial(0.12, 0.16, 0.2),
    skirt: makeMaterial(0.55, 0.16, 0.13),
    kente: makeMaterial(0.82, 0.57, 0.12)
  };

  function makeMaterial(r: number, g: number, b: number): StandardMaterial {
    const material = new StandardMaterial();
    material.diffuse = new Color(r, g, b);
    material.specular = new Color(0.08, 0.08, 0.08);
    material.gloss = 18;
    material.update();
    return material;
  }
  function part(parent: Entity, name: string, type: "box" | "sphere" | "cylinder", material: StandardMaterial, position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] = [0, 0, 0]): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type, material, castShadows: false, receiveShadows: true });
    entity.setLocalPosition(position[0], position[1], position[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);
    entity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
    parent.addChild(entity);
    return entity;
  }

  function createVehicle(name: string, bodyMaterial: StandardMaterial, width: number, length: number, height: number, minibus = false): Entity {
    const root = new Entity(name);
    part(root, name + " lower body", "box", bodyMaterial, [0, height * 0.48, 0], [width, height * 0.58, length]);
    part(root, name + " cabin", "box", materials.glass, [0, height * 0.98, -length * 0.06], [width * 0.82, height * 0.56, length * (minibus ? 0.48 : 0.52)]);
    part(root, name + " bonnet", "box", bodyMaterial, [0, height * 0.67, length * 0.32], [width * 0.92, height * 0.2, length * 0.28]);
    part(root, name + " front bumper", "box", materials.black, [0, height * 0.24, length * 0.51], [width * 0.94, 0.18, 0.16]);
    part(root, name + " rear bumper", "box", materials.black, [0, height * 0.24, -length * 0.51], [width * 0.94, 0.18, 0.16]);
    for (const side of [-1, 1]) {
      for (const axle of [-1, 1]) {
        const wheel = part(root, name + " wheel", "cylinder", materials.tyre, [side * width * 0.53, height * 0.27, axle * length * 0.31], [height * 0.42, 0.22, height * 0.42], [0, 0, 90]);
        wheel.name = name + " wheel";
      }
    }
    if (minibus) {
      part(root, name + " yellow route stripe", "box", materials.trotroStripe, [0, height * 0.62, -length * 0.03], [width * 1.01, 0.22, length * 0.68]);
      part(root, name + " roof rack", "box", materials.black, [0, height * 1.32, 0], [width * 0.76, 0.12, length * 0.65]);
    }
    app.root.addChild(root);
    return root;
  }

  const coastRoad: Point[] = [
    { x: 1250, z: -350 }, { x: 1450, z: -700 }, { x: 1450, z: -1050 }, { x: 1450, z: -1350 },
    { x: 1850, z: -1650 }, { x: 2300, z: -1900 }, { x: 2750, z: -2100 }
  ];
  const beachRoad: Point[] = [
    { x: 1450, z: -1350 }, { x: 1850, z: -1650 }, { x: 2300, z: -1900 }, { x: 2750, z: -2100 }
  ];
  const traffic: TrafficUnit[] = [
    { root: createVehicle("Osu yellow taxi traffic", materials.taxi, 1.9, 4.1, 1.45), route: coastRoad, segment: 0, progress: 0.15, speed: 7.2, lane: -2.2 },
    { root: createVehicle("Accra trotro traffic", materials.trotro, 2.15, 5.2, 2.1, true), route: coastRoad.slice().reverse(), segment: 0, progress: 0.38, speed: 5.6, lane: 2.3 },
    { root: createVehicle("Osu private saloon traffic", materials.silver, 1.9, 4.2, 1.4), route: beachRoad, segment: 1, progress: 0.2, speed: 8.5, lane: -2.2 },
    { root: createVehicle("Labadi delivery pickup traffic", materials.blue, 2, 4.8, 1.65), route: beachRoad.slice().reverse(), segment: 1, progress: 0.62, speed: 6.1, lane: 2.2 },
    { root: createVehicle("Accra ride-hailing car traffic", materials.white, 1.9, 4.2, 1.4), route: coastRoad, segment: 2, progress: 0.52, speed: 7.8, lane: -2.2 }
  ];

  function createWalker(name: string, position: Point, route: Point[], speed: number, skin: StandardMaterial, shirt: StandardMaterial, lower: StandardMaterial, phase: number): Walker {
    const root = new Entity(name);
    const torso = part(root, name + " torso", "box", shirt, [0, 1.52, 0], [0.58, 0.86, 0.32]);
    part(root, name + " waist cloth", "box", lower, [0, 1.02, 0], [0.54, 0.24, 0.34]);
    part(root, name + " head", "sphere", skin, [0, 2.18, 0], [0.42, 0.48, 0.4]);
    part(root, name + " hair", "sphere", materials.black, [0, 2.39, -0.025], [0.43, 0.2, 0.42]);
    const leftArm = part(root, name + " left arm", "box", shirt, [-0.39, 1.5, 0], [0.19, 0.78, 0.2]);
    const rightArm = part(root, name + " right arm", "box", shirt, [0.39, 1.5, 0], [0.19, 0.78, 0.2]);
    const leftLeg = part(root, name + " left leg", "box", lower, [-0.16, 0.53, 0], [0.22, 0.9, 0.25]);
    const rightLeg = part(root, name + " right leg", "box", lower, [0.16, 0.53, 0], [0.22, 0.9, 0.25]);
    part(root, name + " left shoe", "box", materials.black, [-0.16, 0.08, 0.08], [0.25, 0.16, 0.42]);
    part(root, name + " right shoe", "box", materials.black, [0.16, 0.08, 0.08], [0.25, 0.16, 0.42]);
    if (shirt === materials.shirt2 || shirt === materials.shirt3) {
      part(root, name + " kente chest sash", "box", materials.kente, [0, 1.55, 0.17], [0.13, 0.78, 0.035], [0, 0, -18]);
    }
    root.setPosition(position.x, 0, position.z);
    app.root.addChild(root);
    return { root, route, segment: 0, progress: 0, speed, leftLeg, rightLeg, leftArm, rightArm, phase };
  }

  const walkers: Walker[] = [
    createWalker("Osu pedestrian 01", { x: 1330, z: -1162 }, [{ x: 1330, z: -1162 }, { x: 1510, z: -1162 }], 0.78, materials.skin1, materials.shirt1, materials.trousers, 0.2),
    createWalker("Osu pedestrian 02", { x: 1510, z: -1200 }, [{ x: 1510, z: -1200 }, { x: 1320, z: -1200 }], 0.72, materials.skin2, materials.shirt2, materials.skirt, 1.2),
    createWalker("Osu pedestrian 03", { x: 1390, z: -1145 }, [{ x: 1390, z: -1145 }, { x: 1580, z: -1145 }], 0.66, materials.skin3, materials.shirt4, materials.trousers, 2.1),
    createWalker("Osu pedestrian 04", { x: 1570, z: -1208 }, [{ x: 1570, z: -1208 }, { x: 1360, z: -1208 }], 0.82, materials.skin1, materials.shirt3, materials.skirt, 2.8),
    createWalker("Labadi pedestrian 01", { x: 2220, z: -2360 }, [{ x: 2220, z: -2360 }, { x: 2360, z: -2360 }], 0.7, materials.skin2, materials.shirt5, materials.trousers, 0.7),
    createWalker("Labadi pedestrian 02", { x: 2370, z: -2400 }, [{ x: 2370, z: -2400 }, { x: 2200, z: -2400 }], 0.62, materials.skin3, materials.shirt1, materials.skirt, 1.7),
    createWalker("Makola pedestrian 01", { x: -480, z: 485 }, [{ x: -480, z: 485 }, { x: -350, z: 485 }], 0.58, materials.skin1, materials.shirt2, materials.trousers, 2.5)
  ];

  // Update only the small ambient population; static streets and buildings never move.
  let clock = 0;
  app.on("update", (dt: number) => {
    const step = Math.min(Math.max(dt, 0), 0.05);
    clock += step;
    for (const unit of traffic) {
      const a = unit.route[unit.segment];
      const b = unit.route[(unit.segment + 1) % unit.route.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.max(1, Math.hypot(dx, dz));
      unit.progress += (unit.speed * step) / length;
      if (unit.progress >= 1) {
        unit.progress -= 1;
        unit.segment = (unit.segment + 1) % (unit.route.length - 1);
      }
      const t = unit.progress;
      const laneX = (dz / length) * unit.lane;
      const laneZ = (-dx / length) * unit.lane;
      unit.root.setPosition(a.x + dx * t + laneX, 0, a.z + dz * t + laneZ);
      unit.root.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
    }
    for (const walker of walkers) {
      const a = walker.route[walker.segment];
      const b = walker.route[(walker.segment + 1) % walker.route.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.max(1, Math.hypot(dx, dz));
      walker.progress += (walker.speed * step) / length;
      if (walker.progress >= 1) {
        walker.progress = 0;
        walker.segment = (walker.segment + 1) % (walker.route.length - 1);
      }
      const t = walker.progress;
      walker.root.setPosition(a.x + dx * t, 0, a.z + dz * t);
      walker.root.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
      const swing = Math.sin(clock * 5 + walker.phase) * 24;
      walker.leftLeg.setLocalEulerAngles(swing, 0, 0);
      walker.rightLeg.setLocalEulerAngles(-swing, 0, 0);
      walker.leftArm.setLocalEulerAngles(-swing * 0.65, 0, 0);
      walker.rightArm.setLocalEulerAngles(swing * 0.65, 0, 0);
    }
  });
}
