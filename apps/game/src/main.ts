import * as THREE from "three";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#9ab8c0");
scene.fog = new THREE.Fog("#b8c9bf", 150, 720);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 22);

const hemi = new THREE.HemisphereLight("#e9f4ff", "#76664c", 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff0d2", 3.2);
sun.position.set(-90, 130, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: "#a99b72", roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// First-pass Ghana-inspired urban blockout: road hierarchy, verges and varied building massing.
const roadMat = new THREE.MeshStandardMaterial({ color: "#343b3b", roughness: 0.96 });
function road(w: number, d: number, x: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), roadMat);
  m.position.set(x, 0.06, z); m.receiveShadow = true; scene.add(m);
}
road(18, 520, 0, 0); road(520, 14, 0, -34); road(520, 8, 0, 54);
const lineMat = new THREE.MeshStandardMaterial({ color: "#e9dfb7" });
for (let z = -245; z <= 245; z += 16) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 7), lineMat);
  dash.position.set(0, 0.13, z); scene.add(dash);
}
for (let x = -245; x <= 245; x += 16) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(7, 0.025, 0.18), lineMat);
  dash.position.set(x, 0.13, -34); scene.add(dash);
}
const vergeMat = new THREE.MeshStandardMaterial({ color: "#65794d" });
for (const [x,z,w,d] of [[-13,0,5,520],[13,0,5,520], [0,-44,520,5], [0,-24,520,5]] as const) {
  const verge = new THREE.Mesh(new THREE.BoxGeometry(w,0.18,d),vergeMat);
  verge.position.set(x,0.02,z); verge.receiveShadow=true; scene.add(verge);
}
const palette = ["#d4b58c","#b7a18a","#c6c2ae","#a98c70","#d0c5a8","#8f9c91"];
for (let i=0;i<42;i++) {
  const side = i%2===0 ? -1 : 1;
  const z = -220 + Math.floor(i/2)*22;
  const x = side*(25 + (i%3)*8);
  const width = 10 + (i%4)*3;
  const height = 7 + ((i*7)%20);
  box(width,height,12,palette[i%palette.length],x,0,z);
  box(width*0.45,1.1,12.2,"#5b4638",x,height*0.35,z);
  if (i%5===0) box(width+1,0.5,13,"#77634d",x,height,z);
}
// Distant skyline to establish scale without loading a heavy asset set.
for (let i=0;i<24;i++) {
  const x=(i-12)*34;
  const h=18+(i*13)%48;
  box(15,h,16,i%3===0?"#8f9e9b":"#aab0a3",x,0,-300-(i%4)*25);
}

const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55,1.1,4,8),new THREE.MeshStandardMaterial({color:"#74452f",roughness:0.8}));
body.position.y=1.35; body.castShadow=true; player.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.42,16,12),new THREE.MeshStandardMaterial({color:"#593321"}));
head.position.y=2.45; head.castShadow=true; player.add(head);
player.position.set(0,0,12); scene.add(player);

const keys = new Set<string>();
window.addEventListener("keydown",e=>keys.add(e.key.toLowerCase()));
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
let yaw=0, dragging=false, lastX=0, lastY=0, pitch=0.18;
canvas.addEventListener("pointerdown",e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointerup",()=>dragging=false);
canvas.addEventListener("pointermove",e=>{if(!dragging)return; yaw-=(e.clientX-lastX)*0.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*0.002,-0.2,0.65);lastX=e.clientX;lastY=e.clientY;});
const touch = new Set<string>();
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach(button=>{
  const move=button.dataset.move!;
  button.addEventListener("pointerdown",e=>{e.preventDefault();touch.add(move);});
  for(const event of ["pointerup","pointercancel","pointerleave"]) button.addEventListener(event,()=>touch.delete(move));
});
let playing=false;
document.querySelector<HTMLButtonElement>("#enter")!.addEventListener("click",()=>{
  playing=true;
  document.querySelector("#intro")!.classList.add("hidden");
  document.querySelector("#hud")!.classList.add("visible");
  document.querySelector("#mobile-controls")!.classList.add("visible");
});
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.04);
  if(playing){
    const forward=keys.has("w")||keys.has("arrowup")||touch.has("forward");
    const back=keys.has("s")||keys.has("arrowdown")||touch.has("back");
    const left=keys.has("a")||keys.has("arrowleft")||touch.has("left");
    const right=keys.has("d")||keys.has("arrowright")||touch.has("right");
    const direction=new THREE.Vector3((right?1:0)-(left?1:0),0,(back?1:0)-(forward?1:0));
    if(direction.lengthSq()>0){direction.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);player.position.addScaledVector(direction,dt*13);player.rotation.y=Math.atan2(direction.x,direction.z);}
  }
  const target=new THREE.Vector3(player.position.x,player.position.y+2.5,player.position.z);
  const offset=new THREE.Vector3(Math.sin(yaw)*18,7+pitch*8,Math.cos(yaw)*18);
  camera.position.lerp(target.clone().add(offset),0.08);
  camera.lookAt(target);
  renderer.render(scene,camera);
}
animate();
window.addEventListener("resize",()=>{
  camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
});
document.querySelector("#loading")?.remove();
