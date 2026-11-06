import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import { COMPLEXIONS, OUTFITS, type CharacterAppearance } from "./appearance";
import { getHairstyle } from "./hairstyles";
import { WORLD_CONFIG } from "../world/config";

function createPlayer(scene: Scene, initialAppearance: CharacterAppearance): {
  root: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  applyAppearance: (appearance: CharacterAppearance) => void;
} {
  const root = new TransformNode("player-root", scene);
  root.position.set(WORLD_CONFIG.spawn.x, WORLD_CONFIG.spawn.y, WORLD_CONFIG.spawn.z);
  root.rotation.y = Math.PI;

  const skin = new StandardMaterial("player-skin", scene);
  skin.diffuseColor = new Color3(0.38, 0.21, 0.13);
  const shirt = new StandardMaterial("player-shirt", scene);
  shirt.diffuseColor = new Color3(0.12, 0.31, 0.25);
  const trousers = new StandardMaterial("player-trousers", scene);
  trousers.diffuseColor = new Color3(0.13, 0.15, 0.17);
  const shoes = new StandardMaterial("player-shoes", scene);
  shoes.diffuseColor = new Color3(0.08, 0.08, 0.075);

  const torso = MeshBuilder.CreateCapsule("player-torso", {
    height: 1.05, radius: 0.34, tessellation: 12
  }, scene);
  torso.position.y = 1.22;
  torso.material = shirt;
  torso.parent = root;

  const head = MeshBuilder.CreateSphere("player-head", { diameter: 0.48, segments: 16 }, scene);
  head.position.y = 2.02;
  head.material = skin;
  head.parent = root;

  const hairMaterial = new StandardMaterial("player-hair", scene);
  hairMaterial.diffuseColor = new Color3(0.055, 0.045, 0.04);
  const createHairShape = (name: string, diameter: number, height: number): ReturnType<typeof MeshBuilder.CreateSphere> => {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, scene);
    mesh.scaling.y = height;
    mesh.position.y = 2.23;
    mesh.material = hairMaterial;
    mesh.parent = root;
    return mesh;
  };
  const shortNaturalHair = createHairShape("hair-short-natural", 0.49, 0.48);
  const lowCutHair = createHairShape("hair-low-cut", 0.48, 0.27);
  const fadeHair = createHairShape("hair-classic-fade", 0.49, 0.37);
  const afroHair = createHairShape("hair-natural-afro", 0.56, 0.78);

  const leftArm = new TransformNode("left-arm-pivot", scene);
  leftArm.position.set(-0.39, 1.58, 0);
  leftArm.parent = root;
  const rightArm = new TransformNode("right-arm-pivot", scene);
  rightArm.position.set(0.39, 1.58, 0);
  rightArm.parent = root;

  for (const [name, pivot] of [["left-arm", leftArm], ["right-arm", rightArm]] as const) {
    const arm = MeshBuilder.CreateCapsule(name, { height: 0.78, radius: 0.13, tessellation: 10 }, scene);
    arm.position.y = -0.36;
    arm.material = skin;
    arm.parent = pivot;
  }

  const leftLeg = new TransformNode("left-leg-pivot", scene);
  leftLeg.position.set(-0.19, 0.76, 0);
  leftLeg.parent = root;
  const rightLeg = new TransformNode("right-leg-pivot", scene);
  rightLeg.position.set(0.19, 0.76, 0);
  rightLeg.parent = root;

  for (const [name, pivot] of [["left-leg", leftLeg], ["right-leg", rightLeg]] as const) {
    const leg = MeshBuilder.CreateCapsule(name, { height: 0.83, radius: 0.16, tessellation: 10 }, scene);
    leg.position.y = -0.39;
    leg.material = trousers;
    leg.parent = pivot;

    const shoe = MeshBuilder.CreateBox(`${name}-shoe`, { width: 0.28, height: 0.13, depth: 0.43 }, scene);
    shoe.position.set(0, -0.76, 0.09);
    shoe.material = shoes;
    shoe.parent = pivot;
  }

  const applyAppearance = (appearance: CharacterAppearance): void => {
    const complexion = COMPLEXIONS.find((preset) => preset.id === appearance.complexionId) ?? COMPLEXIONS[1];
    const outfit = OUTFITS.find((preset) => preset.id === appearance.outfitId) ?? OUTFITS[0];
    skin.diffuseColor = Color3.FromHexString(complexion.color);
    shirt.diffuseColor = Color3.FromHexString(outfit.topColor);
    trousers.diffuseColor = Color3.FromHexString(outfit.trouserColor);
    const buildScale = appearance.bodyBuild === "slim" ? 0.92 : appearance.bodyBuild === "broad" ? 1.1 : 1;
    const masculine = appearance.presentation === "masculine";
    const broadness = masculine ? 1.08 : 0.96;
    const hipWidth = masculine ? 0.96 : 1.08;

    // These are deliberately modest silhouette adjustments on the temporary
    // primitive avatar; final character art and rigging will replace this mesh.
    root.scaling.set(buildScale, 1, 1);
    torso.scaling.set(broadness * (appearance.bodyBuild === "broad" ? 1.06 : 1), 1, 1);
    leftArm.position.x = -0.39 * broadness;
    rightArm.position.x = 0.39 * broadness;
    leftLeg.position.x = -0.19 * hipWidth * buildScale;
    rightLeg.position.x = 0.19 * hipWidth * buildScale;
    const selectedStyle = getHairstyle(appearance.hairstyleId);
    const styleId = selectedStyle?.id ?? "short-natural";
    shortNaturalHair.isVisible = !["low-cut", "fade", "afro", "covered"].includes(styleId);
    lowCutHair.isVisible = styleId === "low-cut";
    fadeHair.isVisible = ["fade", "high-fade", "low-fade", "mid-fade", "skin-fade", "taper-fade", "waves", "line-up"].includes(styleId);
    afroHair.isVisible = ["afro", "twists", "starter-locs", "locs", "cornrows", "box-braids", "knotless-braids", "ghana-braids", "feed-in-cornrows", "fulani-braids", "faux-locs", "passion-twists", "wig-install", "natural-bun"].includes(styleId);
  };
  applyAppearance(initialAppearance);
  return { root, leftArm, rightArm, leftLeg, rightLeg, applyAppearance };
}
