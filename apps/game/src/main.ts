import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GREATER_ACCRA_ROAD_PATHS, GREATER_ACCRA_MAP_NODES, GREATER_ACCRA_COASTLINE } from "./world/greaterAccraLayout";
import { GREATER_ACCRA_LOCAL_ROADS } from "./world/greaterAccraRoadData";
import "./style.css";
import { getAkwantuoSession, signInAkwantuo, signUpAkwantuo, signOutAkwantuo, loadPlayerProfile, savePlayerProfile, type AkwantuoSession } from "./services/supabase";

const WORLD_ORIGIN_X=1100,WORLD_ORIGIN_Z=-1250;
const canvas=document.querySelector<HTMLCanvasElement>("#world")!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:innerWidth>700,powerPreference:"high-performance",stencil:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.2:1.6));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color("#9bb8c3");scene.fog=new THREE.FogExp2("#bac8bd",.00125);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1100);camera.position.set(WORLD_ORIGIN_X,7,WORLD_ORIGIN_Z+32);
scene.add(new THREE.HemisphereLight("#e4f2ff","#746044",1.8));
const sun=new THREE.DirectionalLight("#fff0d6",3.1);sun.position.set(WORLD_ORIGIN_X-100,150,WORLD_ORIGIN_Z+80);sun.target.position.set(WORLD_ORIGIN_X,0,WORLD_ORIGIN_Z);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=160;sun.shadow.camera.bottom=-160;sun.shadow.normalBias=.035;scene.add(sun);
const sky=new THREE.Mesh(new THREE.SphereGeometry(20000,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:"varying vec3 v;void main(){v=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(v,1.);}",fragmentShader:"varying vec3 v;void main(){float h=normalize(v).y;vec3 a=vec3(.78,.79,.72),b=vec3(.54,.70,.76),c=vec3(.22,.43,.58);gl_FragColor=vec4(mix(mix(a,b,smoothstep(-.08,.22,h)),c,smoothstep(.22,.78,h)),1.);}"}));scene.add(sky);
function mat(c:string,r=.85,m=0){return new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});}
function tex(draw:(c:CanvasRenderingContext2D,w:number,h:number)=>void,w=512,h=512){const el=document.createElement("canvas");el.width=w;el.height=h;const c=el.getContext("2d")!;draw(c,w,h);const t=new THREE.CanvasTexture(el);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
const soilTex=tex((c,w,h)=>{c.fillStyle="#a99b75";c.fillRect(0,0,w,h);for(let i=0;i<14000;i++){const a=.02+Math.random()*.08;c.fillStyle=Math.random()>.5?"rgba(55,73,44,"+a+")":"rgba(240,216,163,"+a+")";c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*2);}});
soilTex.repeat.set(180,120);
function coastlineAt(x:number):number{for(let i=0;i<GREATER_ACCRA_COASTLINE.length-1;i++){const a=GREATER_ACCRA_COASTLINE[i],b=GREATER_ACCRA_COASTLINE[i+1];if(x>=a.x&&x<=b.x){const t=(x-a.x)/(b.x-a.x);return a.z+(b.z-a.z)*t;}}return -3300;}
function terrainHeight(x:number,z:number):number{const base=(Math.sin(x*.0018)+Math.cos(z*.0021))*.85+Math.sin((x+z)*.0011)*.65;const shore=coastlineAt(x);if(z<shore-80)return -3;if(z<shore+80){const t=THREE.MathUtils.clamp((z-(shore-80))/160,0,1);return -3*(1-t)+base*t;}return base;}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(24000,17000,120,85),new THREE.MeshStandardMaterial({map:soilTex,color:"#c0b28c",roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(2500,0,1750);
const gp=ground.geometry.attributes.position as THREE.BufferAttribute;for(let i=0;i<gp.count;i++){const x=gp.getX(i)+ground.position.x,z=gp.getY(i)+ground.position.z;gp.setZ(i,terrainHeight(x,z));}ground.geometry.computeVertexNormals();ground.receiveShadow=true;scene.add(ground);
const asphaltTex=tex((c,w,h)=>{c.fillStyle="#343a3b";c.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=80+Math.random()*60;c.fillStyle="rgba("+v+","+v+","+v+",.12)";c.fillRect(Math.random()*w,Math.random()*h,1,1);}});asphaltTex.repeat.set(2,24);
const asphalt=new THREE.MeshStandardMaterial({map:asphaltTex,color:"#b7b7b0",roughness:.98}),concrete=mat("#aaa79a"),white=mat("#e8dfc3"),yellow=mat("#dfb34e"),green=mat("#2d7652"),dark=mat("#242a2a");

const sand=mat("#c4ad7d",1),waterMat=new THREE.MeshStandardMaterial({color:"#397d88",roughness:.42,metalness:.04,side:THREE.DoubleSide});
const coastShape=new THREE.Shape();coastShape.moveTo(GREATER_ACCRA_COASTLINE[0].x,-GREATER_ACCRA_COASTLINE[0].z);
for(const point of GREATER_ACCRA_COASTLINE.slice(1))coastShape.lineTo(point.x,-point.z);
coastShape.lineTo(GREATER_ACCRA_COASTLINE[GREATER_ACCRA_COASTLINE.length-1].x,7000);coastShape.lineTo(GREATER_ACCRA_COASTLINE[0].x,7000);coastShape.closePath();
const ocean=new THREE.Mesh(new THREE.ShapeGeometry(coastShape,48),waterMat);ocean.geometry.rotateX(-Math.PI/2);ocean.position.y=-.4;ocean.receiveShadow=true;scene.add(ocean);
function ribbon(points:readonly {x:number;z:number}[],width:number,material:THREE.Material,y=.13):THREE.Mesh|null{
 if(points.length<2)return null;
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+y,p.z)),false,"catmullrom",.12);
 const length=points.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z):0,0);
 const segments=Math.max(16,Math.ceil(length/24)),positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x);const l=p.clone().addScaledVector(side,width/2),r=p.clone().addScaledVector(side,-width/2);positions.push(l.x,l.y,l.z,r.x,r.y,r.z);uvs.push(t*length/18,0,t*length/18,1);if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function roadMarking(points:readonly {x:number;z:number}[],offset:number,material:THREE.LineDashedMaterial|THREE.LineBasicMaterial){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+.2,p.z)),false,"catmullrom",.12),samples=curve.getPoints(Math.max(16,points.length*18));
 const shifted=samples.map((p,i)=>{const t=curve.getTangent(i/Math.max(1,samples.length-1)),side=new THREE.Vector3(-t.z,0,t.x);return p.addScaledVector(side,offset);});
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(shifted),material);if(material instanceof THREE.LineDashedMaterial)line.computeLineDistances();scene.add(line);
}
function drawRoad(points:readonly {x:number;z:number}[],width:number,highway=false){
 ribbon(points,width,asphalt,.12);
 if(highway){ribbon(points,2.6,concrete,.17);roadMarking(points,-width*.31,new THREE.LineDashedMaterial({color:"#eee5cc",dashSize:10,gapSize:9}));roadMarking(points,width*.31,new THREE.LineDashedMaterial({color:"#eee5cc",dashSize:10,gapSize:9}));}
 else roadMarking(points,0,new THREE.LineDashedMaterial({color:"#e8dfc3",dashSize:5,gapSize:7}));
 roadMarking(points,-width*.46,new THREE.LineBasicMaterial({color:"#e6dfc6"}));roadMarking(points,width*.46,new THREE.LineBasicMaterial({color:"#e6dfc6"}));
}
for(const path of GREATER_ACCRA_ROAD_PATHS){if(!path.playableInFirstRelease)continue;const width=path.roadSegmentId.startsWith("n1-")||path.roadSegmentId.startsWith("n6-")?30:path.roadSegmentId.startsWith("n4-")||path.roadSegmentId.includes("spintex")?22:path.roadSegmentId==="la-beach-road"?15:18;drawRoad(path.points,width,width>=28);}
for(const path of GREATER_ACCRA_LOCAL_ROADS)drawRoad(path.points,path.width,false);
const beachPoints=GREATER_ACCRA_COASTLINE.map(p=>({x:p.x,z:p.z+55}));ribbon(beachPoints,100,sand,.11);

function box(p:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,shadow=true){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y+h/2,z);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o;}
function road(w:number,d:number,x:number,z:number){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,.05,z+WORLD_ORIGIN_Z);scene.add(g);const s=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),asphalt);s.receiveShadow=true;g.add(s);return g;}
const ns=road(19,560,0,0),ew=road(560,17,0,-42),local=road(300,9,0,91);
for(let z=-270;z<270;z+=13)box(ns,.22,.025,6,0,.075,z,white,false);
for(let x=-270;x<270;x+=14){box(ew,6,.025,.2,x,.075,0,white,false);box(local,5,.025,.16,x,.075,0,white,false);}
for(const x of [-10,10])box(ns,.2,.03,560,x,.08,0,yellow,false);
for(const z of [-50,-34])box(ew,560,.03,.2,0,.08,z,yellow,false);
function zebra(g:THREE.Group,h:boolean){for(let i=-5;i<=5;i++)if(h)box(g,2.4,.03,.65,i*2.9,.09,0,white,false);else box(g,.65,.03,2.4,0,.09,i*2.9,white,false);}
zebra(ns,true);zebra(ew,false);
for(const x of [-12,12]){const s=new THREE.Mesh(new THREE.BoxGeometry(2,.28,560),concrete);s.position.set(x+WORLD_ORIGIN_X,.02,WORLD_ORIGIN_Z);s.receiveShadow=true;scene.add(s);}
for(const z of [-50,-34]){const s=new THREE.Mesh(new THREE.BoxGeometry(560,.28,2),concrete);s.position.set(WORLD_ORIGIN_X,.02,z+WORLD_ORIGIN_Z);scene.add(s);}
const solidAreas:Array<{minX:number;maxX:number;minZ:number;maxZ:number}>=[];
const facade=["#c9b99c","#d5c7ad","#b8b3a4","#d1b18d","#b6bda9","#d9d1bd"],glass=mat("#29414a",.25,.1),frame=mat("#e0d5bd"),roof=mat("#89755e");
function signTex(title:string,sub:string){return tex((c,w,h)=>{c.fillStyle="#eadfc5";c.fillRect(0,0,w,h);c.fillStyle="#174c3a";c.fillRect(0,0,w,18);c.fillStyle="#173b2e";c.font="bold 42px Arial";c.textAlign="center";c.fillText(title,w/2,92);c.fillStyle="#705c3c";c.font="bold 18px Arial";c.fillText(sub.toUpperCase(),w/2,128);c.fillStyle="#c59d4b";c.fillRect(0,h-8,w,8);},512,160);}
function sign(p:THREE.Object3D,title:string,sub:string,w:number,x:number,y:number,z:number){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.31),new THREE.MeshStandardMaterial({map:signTex(title,sub)}));m.position.set(x,y,z);p.add(m);}
function building(x:number,z:number,w:number,d:number,floors:number,kind:"shop"|"flat"|"office",name:string){
 const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);solidAreas.push({minX:x+WORLD_ORIGIN_X-w/2-0.8,maxX:x+WORLD_ORIGIN_X+w/2+0.8,minZ:z+WORLD_ORIGIN_Z-d/2-0.8,maxZ:z+WORLD_ORIGIN_Z+d/2+0.8});const h=floors*3.1;
 box(g,w,h,d,0,h/2,0,mat(facade[Math.floor(Math.random()*facade.length)]));box(g,w+.4,.28,d+.4,0,h,0,roof);
 const count=Math.max(2,Math.floor(w/3.2));
 for(let f=0;f<floors;f++){for(let i=0;i<count;i++){const wx=-w/2+(i+.5)*w/count,wy=.9+f*3.1,ww=Math.min(1.55,w/count*.58);box(g,ww,1.55,.12,wx,wy,d/2+.08,glass,false);box(g,ww+.16,.1,.18,wx,wy-.1,d/2+.13,frame,false);if(kind==="flat"&&f>0){box(g,ww+.35,.12,.7,wx,wy-.12,d/2+.4,roof,false);box(g,ww+.35,.72,.07,wx,wy+.18,d/2+.72,frame,false);}}if(f>0)box(g,w+.1,.14,.3,0,f*3.1,d/2+.16,frame,false);}
 if(kind==="shop"){box(g,w*.9,1.35,.15,0,.25,d/2+.12,glass,false);box(g,w+.15,.58,.3,0,2,d/2+.2,green,false);sign(g,name,"PROVISIONS · COLD DRINKS",w*.9,0,2.1,d/2+.37);box(g,w,.14,1.2,0,2.85,d/2+.55,yellow,false);}else sign(g,name,kind==="office"?"BUSINESS CENTRE":"RESIDENTIAL COURT",w*.78,0,h-.65,d/2+.08);
 if(floors>=2){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,1.25,12),mat("#526c70",.55));tank.position.set(w*.22,h+.8,-d*.18);tank.castShadow=true;g.add(tank);box(g,1.8,.12,1.8,w*.22,h+.12,-d*.18,roof,false);}
}
const blocks=[
[-34,-68,18,18,3,"shop","Auntie Ama's"],[34,-68,22,18,4,"flat","Adom Court"],[-43,-12,19,22,2,"shop","Nkran Mart"],[42,-10,22,20,5,"office","Cedar House"],[-38,36,24,19,3,"flat","Palm Court"],[38,35,21,20,3,"shop","Kojo Stores"],[-54,118,28,22,4,"flat","Sunrise Court"],[54,118,30,22,5,"office","Meridian House"],[-88,-95,30,24,3,"flat","Garden View"],[88,-95,26,22,4,"flat","Hilltop Court"],[-90,48,28,23,3,"shop","Market Square"],[90,50,28,24,3,"flat","Cocoa Residence"],[-120,140,34,28,6,"office","Nkran Finance"],[120,140,32,26,5,"office","Atlantic Point"]
] as const;for(const b of blocks)building(b[0],b[1],b[2],b[3],b[4],b[5],b[6]);
for(const [x,z,w] of [[-62,-72,48],[62,-72,48],[-65,45,45],[65,45,45]] as const){box(scene,w,1.2,.45,x+WORLD_ORIGIN_X,.14,z+WORLD_ORIGIN_Z,mat("#b7a68c"));for(let i=-w/2+2;i<w/2;i+=5)box(scene,.24,1.45,.6,x+WORLD_ORIGIN_X+i,.14,z+WORLD_ORIGIN_Z,mat("#8d806e"));}
function kiosk(x:number,z:number,title:string){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);solidAreas.push({minX:x+WORLD_ORIGIN_X-2.4,maxX:x+WORLD_ORIGIN_X+2.4,minZ:z+WORLD_ORIGIN_Z-2,maxZ:z+WORLD_ORIGIN_Z+2});box(g,4,2.5,3,0,1.25,0,mat("#c49a61"));box(g,4.3,.2,3.4,0,2.6,0,green);box(g,3.1,1.1,.12,0,.8,1.58,dark);sign(g,title,"CHOP BAR",3.8,0,2.35,1.7);}
kiosk(-18,-25,"SWEET MOTHER");kiosk(19,20,"WAKE & EAT");
const trunk=mat("#654832"),leaves=[mat("#526d42"),mat("#607a49"),mat("#71844c")];
function tree(x:number,z:number,s=1){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);g.scale.setScalar(s);scene.add(g);const t=new THREE.Mesh(new THREE.CylinderGeometry(.2,.3,3.6,7),trunk);t.position.y=1.8;t.castShadow=true;g.add(t);for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.SphereGeometry(1.4+(i%2)*.2,9,7),leaves[i%3]);c.position.set(Math.sin(i*2.4),3.4+(i%3)*.45,Math.cos(i*2.4));c.scale.set(1.1,.8,1);c.castShadow=true;g.add(c);}}
for(let z=-230;z<=230;z+=30){tree(-18,z,.8);tree(18,z,.85);}for(let x=-220;x<=220;x+=42){tree(x,-56,.85);tree(x,106,.9);}
const pole=mat("#4a5050",.55,.3),lamp=mat("#fff0c9",.3);
function streetLight(x:number,z:number){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,7,8),pole);p.position.y=3.5;g.add(p);box(g,2.2,.12,.12,.95,6.8,0,pole);const l=new THREE.Mesh(new THREE.BoxGeometry(.65,.18,.42),lamp);l.position.set(1.9,6.7,0);g.add(l);}
for(let z=-200;z<=200;z+=65){streetLight(-14,z);streetLight(14,z);}
function vehicle(x:number,z:number,color:string,type:"trotro"|"taxi"|"car"){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,.12,z+WORLD_ORIGIN_Z);scene.add(g);const w=type==="trotro"?1.9:1.8,len=type==="trotro"?5.1:4.2,body=mat(color,.48);box(g,w,1.05,len,0,.85,0,body);box(g,w*.88,1,len*.64,0,1.85,-.12,type==="trotro"?mat("#e6dfcb"):body);box(g,w*.84,.72,.08,0,1.9,len*.21,glass,false);box(g,w*.84,.68,.08,0,1.9,-len*.43,glass,false);const wheels:THREE.Mesh[]=[];for(const side of [-1,1])for(const zz of [-.9,.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,14),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*w/2,.48,zz);g.add(wheel);wheels.push(wheel);}g.userData.wheels=wheels;if(type==="trotro"){box(g,.95,.26,.12,0,2.42,len/2+.05,yellow,false);sign(g,"NKRAN","MATE CALL",.88,0,2.48,len/2+.12);}if(type==="taxi")box(g,.75,.16,.55,0,2.45,0,yellow,false);return g;}
const trotro=vehicle(-3,8,"#28754f","trotro");vehicle(7,-75,"#d5ad36","taxi");const traffic=vehicle(3,150,"#b8c2c3","car");
function districtSign(x:number,z:number,title:string,sub:string){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.4,8),pole);p.position.y=1.7;g.add(p);box(g,4.8,1.05,.16,0,3.25,0,green);sign(g,title,sub,4.55,0,3.35,.1);}
districtSign(-16,-120,"OSU","ACCRA · SOUTH");districtSign(16,120,"LABADI ROAD","COASTAL DISTRICT");
const osuNode=GREATER_ACCRA_MAP_NODES.find(node=>node.nodeId==="osu-junction");if(osuNode)districtSign(osuNode.x-WORLD_ORIGIN_X,osuNode.z-WORLD_ORIGIN_Z,"OSU JUNCTION","RING ROAD · SOUTH");
const ridgeNode=GREATER_ACCRA_MAP_NODES.find(node=>node.nodeId==="37-junction");if(ridgeNode)districtSign(ridgeNode.x-WORLD_ORIGIN_X,ridgeNode.z-WORLD_ORIGIN_Z,"37 / RIDGE","RING ROAD · NORTH");

// Character: licensed, original AKWANTUO male/female GLB models; animated clips are added after rig verification.
const player=new THREE.Group();player.position.set(WORLD_ORIGIN_X,0,WORLD_ORIGIN_Z+12);scene.add(player);
const fallback=new THREE.Group();player.add(fallback);const skin=mat("#754a35"),shirt=mat("#285d48"),trousers=mat("#292f35");
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.72,4,8),shirt);torso.position.y=1.28;fallback.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.26,16,12),skin);head.position.y=2.05;fallback.add(head);
for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.68,3,7),trousers);leg.position.set(side*.16,.55,0);fallback.add(leg);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.65,3,7),skin);arm.position.set(side*.43,1.28,0);fallback.add(arm);}
let activeModel:THREE.Object3D|null=null,modelRequest=0;
let playerMixer:THREE.AnimationMixer|null=null,idleAction:THREE.AnimationAction|null=null,walkAction:THREE.AnimationAction|null=null;
function loadCharacterModel(presentation:"masculine"|"feminine"){
 const request=++modelRequest;fallback.visible=true;
 const path=presentation==="feminine"?"/assets/characters/akwantuo-female.glb":"/assets/characters/akwantuo-male.glb";
 new GLTFLoader().load(path,gltf=>{
  if(request!==modelRequest)return;
  if(playerMixer&&activeModel){playerMixer.stopAllAction();playerMixer.uncacheRoot(activeModel);}
  playerMixer=null;idleAction=null;walkAction=null;
  if(activeModel){player.remove(activeModel);activeModel=null;}
  const model=gltf.scene,bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),scale=1.82/Math.max(size.y,.001);
  model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;
  model.traverse(o=>{if((o as THREE.Mesh).isMesh){(o as THREE.Mesh).castShadow=true;(o as THREE.Mesh).receiveShadow=true;}});
  player.add(model);activeModel=model;fallback.visible=false;
  void (async()=>{
   try{
    const loader=new GLTFLoader();
    const [idle,walk]=await Promise.all([loader.loadAsync("/assets/characters/idle.glb"),loader.loadAsync("/assets/characters/walk.glb")]);
    if(request!==modelRequest)return;
    playerMixer=new THREE.AnimationMixer(model);
    const idleClip=idle.animations[0]?.clone(),walkClip=walk.animations[0]?.clone();
    if(idleClip)idleAction=playerMixer.clipAction(idleClip);
    if(walkClip)walkAction=playerMixer.clipAction(walkClip);
    idleAction?.play();
   }catch(error){console.warn("AKWANTUO character animations could not load",error);}
  })();
 },undefined,e=>console.warn("Character model fallback",e));
}
type Appearance={presentation:"masculine"|"feminine";age:number;complexion:string;build:string;hairstyle:string;outfit:string};
let appearance:Appearance={presentation:"masculine",age:25,complexion:"dark",build:"average",hairstyle:"short-natural",outfit:"street-green"};
function applyAppearance(next:Appearance){appearance=next;const form=document.querySelector<HTMLFormElement>("#character-form");if(form){for(const [key,value] of Object.entries(next)){const field=form.elements.namedItem(key) as HTMLInputElement|HTMLSelectElement|null;if(field)field.value=String(value);}}loadCharacterModel(next.presentation);}
function readAppearance():Appearance{const f=document.querySelector<HTMLFormElement>("#character-form")!;const d=new FormData(f);return{presentation:(d.get("presentation")==="feminine"?"feminine":"masculine"),age:Number(d.get("age")||25),complexion:String(d.get("complexion")||"dark"),build:String(d.get("build")||"average"),hairstyle:String(d.get("hairstyle")||"short-natural"),outfit:String(d.get("outfit")||"street-green")};}
loadCharacterModel(appearance.presentation);

const keys=new Set<string>(),touch=new Set<string>();window.addEventListener("keydown",e=>{keys.add(e.key.toLowerCase());if(e.key.startsWith("Arrow")||e.key===" ")e.preventDefault();if(e.key.toLowerCase()==="e"&&!e.repeat)toggleVehicle();},{passive:false});window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach(b=>{const m=b.dataset.move!;b.addEventListener("pointerdown",e=>{e.preventDefault();touch.add(m);b.setPointerCapture(e.pointerId);});for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,()=>touch.delete(m));});
let yaw=0,pitch=.2,drag=false,lx=0,ly=0,playing=false,driving=false,vehicleSpeed=0,vehicleHeading=0;canvas.addEventListener("pointerdown",e=>{drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener("pointerup",()=>drag=false);canvas.addEventListener("pointercancel",()=>drag=false);canvas.addEventListener("pointermove",e=>{if(!drag)return;yaw-=(e.clientX-lx)*.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-ly)*.002,-.15,.7);lx=e.clientX;ly=e.clientY;});
document.querySelector<HTMLButtonElement>("#enter")!.addEventListener("click",()=>{playing=true;document.querySelector("#intro")!.classList.add("hidden");document.querySelector("#hud")!.classList.add("visible");document.querySelector("#mobile-controls")!.classList.add("visible");});
function toggleVehicle(){
 if(!playing)return;
 if(driving){driving=false;player.visible=true;player.position.set(trotro.position.x+2.4,0,trotro.position.z);vehicleSpeed=0;return;}
 if(player.position.distanceTo(trotro.position)>6)return;
 driving=true;player.visible=false;vehicleHeading=trotro.rotation.y;vehicleSpeed=0;
}
document.querySelector<HTMLButtonElement>("#interact")?.addEventListener("click",toggleVehicle);


const characterPanel=document.querySelector("#character-panel")!,accountPanel=document.querySelector("#account-panel")!;
function showPanel(panel:Element){characterPanel.classList.remove("visible");accountPanel.classList.remove("visible");panel.classList.add("visible");}
document.querySelector("#character-open")?.addEventListener("click",()=>showPanel(characterPanel));
document.querySelector("#account-open")?.addEventListener("click",()=>showPanel(accountPanel));
document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close!)?.classList.remove("visible")));
let currentSession:AkwantuoSession|null=null;
const accountStatus=document.querySelector<HTMLElement>("#account-status")!;
async function syncProfile(){if(!currentSession)return;const profile=await loadPlayerProfile(currentSession);if(profile?.look){applyAppearance(profile.look as Appearance);const name=document.querySelector<HTMLInputElement>("#account-name");if(name)name.value=profile.display_name;}}
void getAkwantuoSession().then(async session=>{currentSession=session;if(session){accountStatus.textContent="Signed in. Loading your saved player…";await syncProfile();accountStatus.textContent="Signed in. Your player profile is connected.";document.querySelector("#account-signout")?.classList.remove("hidden");}}).catch(error=>{console.warn("Account restore",error);});
document.querySelector<HTMLFormElement>("#account-form")!.addEventListener("submit",async e=>{
 e.preventDefault();const email=document.querySelector<HTMLInputElement>("#account-email")!.value,password=document.querySelector<HTMLInputElement>("#account-password")!.value;
 accountStatus.textContent="Signing in…";
 try{currentSession=await signInAkwantuo(email,password);await syncProfile();accountStatus.textContent="Signed in. Player profile synced.";document.querySelector("#account-signout")?.classList.remove("hidden");}
 catch(error){accountStatus.textContent=error instanceof Error?error.message:"Sign-in failed. Please try again.";}
});
document.querySelector<HTMLButtonElement>("#account-signup")!.addEventListener("click",async()=>{
 const email=document.querySelector<HTMLInputElement>("#account-email")!.value,password=document.querySelector<HTMLInputElement>("#account-password")!.value,name=document.querySelector<HTMLInputElement>("#account-name")!.value;
 if(!email||password.length<8||!name.trim()){accountStatus.textContent="Enter your email, a password of at least 8 characters, and your player name.";return;}
 accountStatus.textContent="Creating your account…";
 try{const result=await signUpAkwantuo(email,password,name);currentSession=result.session;if(result.session){await savePlayerProfile(result.session,appearance,name);accountStatus.textContent="Account created. Your player is ready.";document.querySelector("#account-signout")?.classList.remove("hidden");}else accountStatus.textContent="Check your email to confirm your account, then sign in here.";}
 catch(error){accountStatus.textContent=error instanceof Error?error.message:"Account creation failed.";}
});
document.querySelector<HTMLButtonElement>("#account-signout")!.addEventListener("click",async()=>{await signOutAkwantuo();currentSession=null;accountStatus.textContent="Signed out. Your local character remains on this device.";document.querySelector("#account-signout")?.classList.add("hidden");});
document.querySelector<HTMLFormElement>("#character-form")!.addEventListener("submit",async e=>{
 e.preventDefault();const next=readAppearance();if(!Number.isFinite(next.age)||next.age<18||next.age>80){document.querySelector("#character-status")!.textContent="Choose an age between 18 and 80.";return;}
 applyAppearance(next);try{localStorage.setItem("akwantuo.character.appearance",JSON.stringify(next));if(currentSession){await savePlayerProfile(currentSession,next,document.querySelector<HTMLInputElement>("#account-name")?.value);document.querySelector("#character-status")!.textContent="Character saved and synced to your AKWANTUO account.";}else document.querySelector("#character-status")!.textContent="Character saved on this device. Sign in to sync it to your account.";}
 catch(error){document.querySelector("#character-status")!.textContent=error instanceof Error?error.message:"Character save failed.";}
});
try{const saved=localStorage.getItem("akwantuo.character.appearance");if(saved)applyAppearance(JSON.parse(saved) as Appearance);}catch{/* local appearance is optional */}

const clock=new THREE.Clock();canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();const status=document.querySelector("#loading");if(status){status.textContent="GRAPHICS PAUSED · RETURN TO THE GAME";status.classList.add("visible");}},false);canvas.addEventListener("webglcontextrestored",()=>document.querySelector("#loading")?.remove(),false);document.addEventListener("visibilitychange",()=>clock.getDelta());function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(document.hidden)return;if(playing){const f=keys.has("w")||keys.has("arrowup")||touch.has("forward"),b=keys.has("s")||keys.has("arrowdown")||touch.has("back"),l=keys.has("a")||keys.has("arrowleft")||touch.has("left"),r=keys.has("d")||keys.has("arrowright")||touch.has("right");const moving= f||b||l||r;if(driving){const throttle=f?1:b?-1:0;if(throttle)vehicleSpeed+=throttle*8.5*dt;else vehicleSpeed*=Math.exp(-1.15*dt);if(keys.has(" "))vehicleSpeed*=Math.exp(-5.5*dt);vehicleSpeed=THREE.MathUtils.clamp(vehicleSpeed,-6,17);vehicleHeading+=(Number(r)-Number(l))*Math.min(Math.abs(vehicleSpeed)/8,1)*.78*Math.sign(vehicleSpeed||1)*dt;const candidate=trotro.position.clone();candidate.x+=Math.sin(vehicleHeading)*vehicleSpeed*dt;candidate.z+=Math.cos(vehicleHeading)*vehicleSpeed*dt;const blocked=solidAreas.some(s=>candidate.x+1.1>s.minX&&candidate.x-1.1<s.maxX&&candidate.z+2.7>s.minZ&&candidate.z-2.7<s.maxZ);if(!blocked)trotro.position.copy(candidate);else vehicleSpeed=0;trotro.rotation.y=vehicleHeading;for(const wheel of trotro.userData.wheels as THREE.Mesh[])wheel.rotation.x+=vehicleSpeed*dt;const speed=document.querySelector("#speed-display");if(speed)speed.textContent=Math.round(Math.abs(vehicleSpeed)*3.6)+" KM/H";}else{const v=new THREE.Vector3(Number(r)-Number(l),0,Number(b)-Number(f));if(v.lengthSq()){v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);const candidate=player.position.clone().addScaledVector(v,dt*7.2),radius=.55;const blocked=(p:THREE.Vector3)=>solidAreas.some(s=>p.x+radius>s.minX&&p.x-radius<s.maxX&&p.z+radius>s.minZ&&p.z-radius<s.maxZ);if(!blocked(candidate))player.position.copy(candidate);else{const slideX=player.position.clone();slideX.x=candidate.x;if(!blocked(slideX))player.position.x=slideX.x;const slideZ=player.position.clone();slideZ.z=candidate.z;if(!blocked(slideZ))player.position.z=slideZ.z;}player.rotation.y=Math.atan2(v.x,v.z);}if(playerMixer){playerMixer.update(dt);if(moving&&walkAction&&!walkAction.isRunning()){walkAction.reset().play();idleAction?.crossFadeTo(walkAction,.18,true);}else if(!moving&&idleAction&&!idleAction.isRunning()){idleAction.reset().play();walkAction?.crossFadeTo(idleAction,.2,true);}}const speed=document.querySelector("#speed-display");if(speed)speed.textContent="ON FOOT";}const interact=document.querySelector("#interact");if(interact)interact.classList.toggle("visible",!driving&&player.position.distanceTo(trotro.position)<6);}traffic.position.z-=dt*5.5;if(traffic.position.z< -175)traffic.position.z=175;const focus=driving?trotro.position:player.position,target=new THREE.Vector3(focus.x,focus.y+(driving?2.3:1.6),focus.z),offset=driving?new THREE.Vector3(Math.sin(vehicleHeading)*10,4,-Math.cos(vehicleHeading)*10):new THREE.Vector3(Math.sin(yaw)*8.5,3.7+pitch*5,Math.cos(yaw)*8.5);camera.position.lerp(target.clone().add(offset),.09);camera.lookAt(target);renderer.render(scene,camera);}animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.2:1.6));});
document.querySelector("#loading")?.remove();
