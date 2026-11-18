import * as THREE from "three";
import { GREATER_ACCRA_ROAD_PATHS, GREATER_ACCRA_MAP_NODES, GREATER_ACCRA_COASTLINE, GREATER_ACCRA_REGION_ANCHORS } from "./world/greaterAccraLayout";
import { GREATER_ACCRA_LOCAL_ROADS } from "./world/greaterAccraRoadData";
import { GREATER_ACCRA_RAIL_ROUTES, GREATER_ACCRA_RAIL_NODES } from "./world/railNetwork";
import { GREATER_ACCRA_TRACK_PROFILE } from "./world/railTrackDesign";
import "./style.css";
import { getAkwantuoSession, signInAkwantuo, signUpAkwantuo, signOutAkwantuo, loadPlayerProfile, loadEconomyState, savePlayerProfile, type AkwantuoSession } from "./services/supabase";

const WORLD_ORIGIN_X=1100,WORLD_ORIGIN_Z=-1250;
const canvas=document.querySelector<HTMLCanvasElement>("#world")!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:innerWidth>700,powerPreference:"high-performance",stencil:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color("#9bb8c3");scene.fog=new THREE.FogExp2("#bac8bd",.00125);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1100);camera.position.set(WORLD_ORIGIN_X,7,WORLD_ORIGIN_Z+32);
scene.add(new THREE.HemisphereLight("#e4f2ff","#746044",1.8));
const sun=new THREE.DirectionalLight("#fff0d6",3.1);sun.position.set(WORLD_ORIGIN_X-100,150,WORLD_ORIGIN_Z+80);sun.target.position.set(WORLD_ORIGIN_X,0,WORLD_ORIGIN_Z);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=160;sun.shadow.camera.bottom=-160;sun.shadow.normalBias=.035;scene.add(sun);
const sky=new THREE.Mesh(new THREE.SphereGeometry(20000,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:"varying vec3 v;void main(){v=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(v,1.);}",fragmentShader:"varying vec3 v;void main(){float h=normalize(v).y;vec3 a=vec3(.78,.79,.72),b=vec3(.54,.70,.76),c=vec3(.22,.43,.58);gl_FragColor=vec4(mix(mix(a,b,smoothstep(-.08,.22,h)),c,smoothstep(.22,.78,h)),1.);}"}));scene.add(sky);

const cloudMaterial=new THREE.MeshBasicMaterial({color:"#eef0eb",transparent:true,opacity:.78,depthWrite:false});
const cloudMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),cloudMaterial,72);
const cloudDummy=new THREE.Object3D();let cloudIndex=0;
for(let c=0;c<12;c++){const cx=WORLD_ORIGIN_X+(c%4-1.5)*430,cz=WORLD_ORIGIN_Z+(Math.floor(c/4)-1)*520,cy=145+(c%3)*28;
 for(let p=0;p<6;p++){cloudDummy.position.set(cx+Math.sin(p*2.4)*48,cy+Math.cos(p*1.8)*10,cz+Math.cos(p*2.4)*38);cloudDummy.scale.set(45+(p%3)*18,12+(p%2)*7,28+(p%3)*9);cloudDummy.updateMatrix();cloudMesh.setMatrixAt(cloudIndex++,cloudDummy.matrix);}
}
cloudMesh.count=cloudIndex;cloudMesh.instanceMatrix.needsUpdate=true;scene.add(cloudMesh);

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
 for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x);const l=p.clone().addScaledVector(side,width/2),r=p.clone().addScaledVector(side,-width/2);positions.push(l.x,l.y,l.z,r.x,r.y,r.z);uvs.push(t*length/18,0,t*length/18,1);if(i<segments){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
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
 const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);
 solidAreas.push({minX:x+WORLD_ORIGIN_X-w/2-.8,maxX:x+WORLD_ORIGIN_X+w/2+.8,minZ:z+WORLD_ORIGIN_Z-d/2-.8,maxZ:z+WORLD_ORIGIN_Z+d/2+.8});
 const h=floors*3.1;box(g,w,h,d,0,0,0,mat(facade[Math.floor(Math.random()*facade.length)]));box(g,w+.4,.28,d+.4,0,h,0,roof);
 const count=Math.max(2,Math.floor(w/3.2)),windowTotal=count*floors,balconyTotal=kind==="flat"?count*Math.max(0,floors-1):0,ww=Math.min(1.55,w/count*.58),dummy=new THREE.Object3D();
 const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(ww,1.55,.12),glass,windowTotal);
 const frames=new THREE.InstancedMesh(new THREE.BoxGeometry(ww+.16,.1,.18),frame,windowTotal);
 const decks=balconyTotal?new THREE.InstancedMesh(new THREE.BoxGeometry(ww+.35,.12,.7),roof,balconyTotal):null;
 const rails=balconyTotal?new THREE.InstancedMesh(new THREE.BoxGeometry(ww+.35,.72,.07),frame,balconyTotal):null;
 let wi=0,bi=0;
 for(let f=0;f<floors;f++){
  for(let i=0;i<count;i++){
   const wx=-w/2+(i+.5)*w/count,wy=.9+f*3.1;
   dummy.position.set(wx,wy+.775,d/2+.08);dummy.updateMatrix();windows.setMatrixAt(wi,dummy.matrix);
   dummy.position.set(wx,wy+.05,d/2+.13);dummy.updateMatrix();frames.setMatrixAt(wi,dummy.matrix);wi++;
   if(f>0&&decks&&rails){dummy.position.set(wx,wy-.06,d/2+.4);dummy.updateMatrix();decks.setMatrixAt(bi,dummy.matrix);dummy.position.set(wx,wy+.54,d/2+.72);dummy.updateMatrix();rails.setMatrixAt(bi,dummy.matrix);bi++;}
  }
  if(f>0)box(g,w+.1,.14,.3,0,f*3.1,d/2+.16,frame,false);
 }
 windows.instanceMatrix.needsUpdate=true;frames.instanceMatrix.needsUpdate=true;windows.receiveShadow=true;frames.receiveShadow=true;g.add(windows,frames);
 if(decks&&rails){decks.instanceMatrix.needsUpdate=true;rails.instanceMatrix.needsUpdate=true;g.add(decks,rails);}
 if(kind==="shop"){box(g,w*.9,1.35,.15,0,.25,d/2+.12,glass,false);box(g,w+.15,.58,.3,0,2,d/2+.2,green,false);sign(g,name,"PROVISIONS · COLD DRINKS",w*.9,0,2.1,d/2+.37);box(g,w,.14,1.2,0,2.85,d/2+.55,yellow,false);}
 else sign(g,name,kind==="office"?"BUSINESS CENTRE":"RESIDENTIAL COURT",w*.78,0,h-.65,d/2+.08);
 if(floors>=2){const tank=new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,1.25,12),mat("#526c70",.55));tank.position.set(w*.22,h+.8,-d*.18);tank.castShadow=true;g.add(tank);box(g,1.8,.12,1.8,w*.22,h+.12,-d*.18,roof,false);}
}
const blocks=[
[-34,-68,18,18,3,"shop","Auntie Ama's"],[34,-68,22,18,4,"flat","Adom Court"],[-43,-12,19,22,2,"shop","Nkran Mart"],[42,-10,22,20,5,"office","Cedar House"],[-38,36,24,19,3,"flat","Palm Court"],[38,35,21,20,3,"shop","Kojo Stores"],[-54,118,28,22,4,"flat","Sunrise Court"],[54,118,30,22,5,"office","Meridian House"],[-88,-95,30,24,3,"flat","Garden View"],[88,-95,26,22,4,"flat","Hilltop Court"],[-90,48,28,23,3,"shop","Market Square"],[90,50,28,24,3,"flat","Cocoa Residence"],[-120,140,34,28,6,"office","Nkran Finance"],[120,140,32,26,5,"office","Atlantic Point"]
] as const;for(const b of blocks)building(b[0],b[1],b[2],b[3],b[4],b[5],b[6]);
for(const [x,z,w] of [[-62,-72,48],[62,-72,48],[-65,45,45],[65,45,45]] as const){box(scene,w,1.2,.45,x+WORLD_ORIGIN_X,.14,z+WORLD_ORIGIN_Z,mat("#b7a68c"));for(let i=-w/2+2;i<w/2;i+=5)box(scene,.24,1.45,.6,x+WORLD_ORIGIN_X+i,.14,z+WORLD_ORIGIN_Z,mat("#8d806e"));}
function kiosk(x:number,z:number,title:string){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);solidAreas.push({minX:x+WORLD_ORIGIN_X-2.4,maxX:x+WORLD_ORIGIN_X+2.4,minZ:z+WORLD_ORIGIN_Z-2,maxZ:z+WORLD_ORIGIN_Z+2});box(g,4,2.5,3,0,0,0,mat("#c49a61"));box(g,4.3,.2,3.4,0,2.6,0,green);box(g,3.1,1.1,.12,0,.8,1.58,dark);sign(g,title,"CHOP BAR",3.8,0,2.35,1.7);}
kiosk(-18,-25,"SWEET MOTHER");kiosk(19,20,"WAKE & EAT");
const trunk=mat("#654832"),leaves=[mat("#526d42"),mat("#607a49"),mat("#71844c")];
const treePositions:Array<{x:number;z:number;s:number}>=[];
function tree(x:number,z:number,s=1){treePositions.push({x,z,s});}
for(let z=-230;z<=230;z+=30){tree(-18,z,.8);tree(18,z,.85);}for(let x=-220;x<=220;x+=42){tree(x,-56,.85);tree(x,106,.9);}
const treeDummy=new THREE.Object3D(),trunkInstances=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.3,3.6,7),trunk,treePositions.length);
const leafInstances=leaves.map(material=>new THREE.InstancedMesh(new THREE.SphereGeometry(1.4,9,7),material,treePositions.length*2));
const leafCounts=[0,0,0];
treePositions.forEach((p,index)=>{
 treeDummy.position.set(p.x+WORLD_ORIGIN_X,1.8*p.s,p.z+WORLD_ORIGIN_Z);treeDummy.scale.setScalar(p.s);treeDummy.updateMatrix();trunkInstances.setMatrixAt(index,treeDummy.matrix);
 for(let i=0;i<5;i++){const materialIndex=i%3;treeDummy.position.set(p.x+WORLD_ORIGIN_X+Math.sin(i*2.4)*p.s,(3.4+(i%3)*.45)*p.s,p.z+WORLD_ORIGIN_Z+Math.cos(i*2.4)*p.s);treeDummy.scale.set(1.1*p.s,.8*p.s,p.s);treeDummy.updateMatrix();leafInstances[materialIndex].setMatrixAt(leafCounts[materialIndex]++,treeDummy.matrix);}
});
trunkInstances.instanceMatrix.needsUpdate=true;trunkInstances.castShadow=true;scene.add(trunkInstances);
leafInstances.forEach((mesh,index)=>{mesh.count=leafCounts[index];mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;scene.add(mesh);});
const pole=mat("#4a5050",.55,.3),lamp=mat("#fff0c9",.3);
function streetLight(x:number,z:number){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,7,8),pole);p.position.y=3.5;g.add(p);box(g,2.2,.12,.12,.95,6.8,0,pole);const l=new THREE.Mesh(new THREE.BoxGeometry(.65,.18,.42),lamp);l.position.set(1.9,6.7,0);g.add(l);}
for(let z=-200;z<=200;z+=65){streetLight(-14,z);streetLight(14,z);}
function vehicle(x:number,z:number,color:string,type:"trotro"|"taxi"|"car"){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,.12,z+WORLD_ORIGIN_Z);scene.add(g);const w=type==="trotro"?1.9:1.8,len=type==="trotro"?5.1:4.2,body=mat(color,.48);box(g,w,1.05,len,0,.85,0,body);box(g,w*.88,1,len*.64,0,1.85,-.12,type==="trotro"?mat("#e6dfcb"):body);box(g,w*.84,.72,.08,0,1.9,len*.21,glass,false);box(g,w*.84,.68,.08,0,1.9,-len*.43,glass,false);const wheels:THREE.Mesh[]=[];for(const side of [-1,1])for(const zz of [-.9,.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,14),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*w/2,.48,zz);g.add(wheel);wheels.push(wheel);}g.userData.wheels=wheels;if(type==="trotro"){box(g,.95,.26,.12,0,2.42,len/2+.05,yellow,false);sign(g,"NKRAN","MATE CALL",.88,0,2.48,len/2+.12);}if(type==="taxi")box(g,.75,.16,.55,0,2.45,0,yellow,false);return g;}
const trotro=vehicle(-3,8,"#28754f","trotro");vehicle(7,-75,"#d5ad36","taxi");const traffic=vehicle(3,150,"#b8c2c3","car");
function districtSign(x:number,z:number,title:string,sub:string){const g=new THREE.Group();g.position.set(x+WORLD_ORIGIN_X,0,z+WORLD_ORIGIN_Z);scene.add(g);const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.4,8),pole);p.position.y=1.7;g.add(p);box(g,4.8,1.05,.16,0,3.25,0,green);sign(g,title,sub,4.55,0,3.35,.1);}
districtSign(-16,-120,"OSU","ACCRA · SOUTH");districtSign(16,120,"LABADI ROAD","COASTAL DISTRICT");
const osuNode=GREATER_ACCRA_MAP_NODES.find(node=>node.nodeId==="osu-junction");if(osuNode)districtSign(osuNode.x-WORLD_ORIGIN_X,osuNode.z-WORLD_ORIGIN_Z,"OSU JUNCTION","RING ROAD · SOUTH");
const ridgeNode=GREATER_ACCRA_MAP_NODES.find(node=>node.nodeId==="37-junction");if(ridgeNode)districtSign(ridgeNode.x-WORLD_ORIGIN_X,ridgeNode.z-WORLD_ORIGIN_Z,"37 / RIDGE","RING ROAD · NORTH");

function roadInfoSign(x:number,z:number,title:string,sub:string){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,3.8,8),pole);post.position.y=1.9;g.add(post);
 box(g,4.6,1.15,.18,0,3.65,0,green);sign(g,title,sub,4.35,0,3.78,.11);
}
roadInfoSign(1100,-1450,"OSU OXFORD STREET","SPEED LIMIT 50");
roadInfoSign(-450,450,"CIRCLE / CENTRAL ACCRA","SPEED LIMIT 50");
roadInfoSign(1250,-350,"37 / RIDGE JUNCTION","SPEED LIMIT 70");
roadInfoSign(3650,1750,"N4 / N6 INTERCHANGE","SPEED LIMIT 80");
roadInfoSign(9000,-750,"TEMA MOTORWAY","SPEED LIMIT 100");
function addGhanaFlag(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const flagTex=tex((c,w,h)=>{c.fillStyle="#ce3c34";c.fillRect(0,0,w,h/3);c.fillStyle="#e8c34f";c.fillRect(0,h/3,w,h/3);c.fillStyle="#28794b";c.fillRect(0,2*h/3,w,h/3);c.fillStyle="#171717";c.font="bold 92px Arial";c.textAlign="center";c.textBaseline="middle";c.fillText("★",w/2,h/2+3);},256,160);
 const poleMesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,5.8,8),pole);poleMesh.position.y=2.9;g.add(poleMesh);
 const flagMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.75),new THREE.MeshBasicMaterial({map:flagTex,side:THREE.DoubleSide}));flagMesh.position.set(1.38,4.75,0);g.add(flagMesh);
}
addGhanaFlag(WORLD_ORIGIN_X+285,WORLD_ORIGIN_Z+265);
addGhanaFlag(-150,-900);


const districtNames:Record<string,string>={"airport-city":"AIRPORT CITY","east-legon":"EAST LEGON","legon":"LEGON","madina-adenta":"MADINA / ADENTA","achimota":"ACHIMOTA","accra-central-makola":"ACCRA CENTRAL","labadi":"LABADI","dansoman":"DANSOMAN","kaneshie":"KANESHIE","spintex":"SPINTEX","tema":"TEMA"};
for(const anchor of GREATER_ACCRA_REGION_ANCHORS){
 const name=districtNames[anchor.regionId];if(!name)continue;
 const lx=anchor.x-WORLD_ORIGIN_X,lz=anchor.z-WORLD_ORIGIN_Z;
 const floors=anchor.regionId==="airport-city"||anchor.regionId==="east-legon"||anchor.regionId==="spintex"?5:anchor.regionId==="accra-central-makola"||anchor.regionId==="tema"?4:3;
 const kind=anchor.regionId==="madina-adenta"||anchor.regionId==="dansoman"||anchor.regionId==="kaneshie"?"shop":"flat";
 building(lx-34,lz-28,28,22,floors,kind,name+" "+(kind==="shop"?"Market":"Court"));
 districtSign(lx,lz+52,name,"GREATER ACCRA · GHANA");
}
function addLandmarkSolid(x:number,z:number,w:number,d:number){solidAreas.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
const ballast=mat("#6d6a62",.98),steel=mat("#6f7778",.32,.72),sleeperMat=mat("#4c4941",.95);
function railCurve(points:readonly {x:number;z:number}[]){return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p.x,terrainHeight(p.x,p.z)+.38,p.z)),false,"catmullrom",.12);}
function drawRailRoute(points:readonly {x:number;z:number}[]){
 const curve=railCurve(points),length=curve.getLength(),sleeperCount=Math.max(2,Math.floor(length/GREATER_ACCRA_TRACK_PROFILE.sleeperSpacingM));
 ribbon(points,GREATER_ACCRA_TRACK_PROFILE.ballastWidthM,ballast,.08);
 const sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(GREATER_ACCRA_TRACK_PROFILE.sleeperLengthM,GREATER_ACCRA_TRACK_PROFILE.sleeperHeightM,GREATER_ACCRA_TRACK_PROFILE.sleeperWidthM),sleeperMat,sleeperCount);
 const dummy=new THREE.Object3D();
 for(let i=0;i<sleeperCount;i++){const t=i/sleeperCount,p=curve.getPointAt(t),tan=curve.getTangentAt(t);dummy.position.set(p.x,p.y-.14,p.z);dummy.rotation.set(0,Math.atan2(tan.x,tan.z),0);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);}
 sleepers.instanceMatrix.needsUpdate=true;sleepers.castShadow=true;scene.add(sleepers);
 const railSegments=Math.max(24,Math.ceil(length/4));
 for(const offset of [-GREATER_ACCRA_TRACK_PROFILE.gaugeM/2,GREATER_ACCRA_TRACK_PROFILE.gaugeM/2]){
  const pointsOnRail=curve.getPoints(railSegments).map((p,i)=>{const tangent=curve.getTangent(i/railSegments),side=new THREE.Vector3(-tangent.z,0,tangent.x);return p.addScaledVector(side,offset);});
  const railPath=new THREE.CatmullRomCurve3(pointsOnRail,false,"catmullrom",.08);
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(railPath,railSegments,GREATER_ACCRA_TRACK_PROFILE.railRadiusM,6,false),steel);mesh.castShadow=true;scene.add(mesh);
 }
 return curve;
}
const firstReleaseRailRoutes=GREATER_ACCRA_RAIL_ROUTES.filter(route=>route.firstRelease);
const railCurves=firstReleaseRailRoutes.map(route=>drawRailRoute(route.points));
function createRailStation(nodeId:string,label:string,routeIndex:number,atEnd:boolean){
 const node=GREATER_ACCRA_RAIL_NODES.find(item=>item.id===nodeId);if(!node)return;
 const curve=railCurves[routeIndex],tangent=curve.getTangentAt(atEnd?1:0),angle=Math.atan2(tangent.x,tangent.z);
 const g=new THREE.Group();g.position.set(node.position.x,terrainHeight(node.position.x,node.position.z),node.position.z);g.rotation.y=angle;scene.add(g);addLandmarkSolid(node.position.x,node.position.z,54,118);
 box(g,6.5,.7,112,-5,0,0,concrete);box(g,6.5,.7,112,5,0,0,concrete);
 box(g,.22,.22,94,-1.82,.7,0,yellow,false);box(g,.22,.22,94,1.82,.7,0,yellow,false);
 box(g,27,10,38,-23,.7,-27,mat("#b8c2bd",.4,.08));box(g,29,.8,40,-23,10.7,-27,roof);
 box(g,13,1,94,5,12,5,roof);for(const x of [0,10])for(const z of [-38,5,48])box(g,.35,12,.35,x,0,z,frame,false);
 sign(g,label,"GHANA CAPE GAUGE · 1,067 MM",23,-23,12.4,-6);
 box(g,8,1,.45,-23,11.5,-6,mat("#b13d32"),false);box(g,8,1,.45,-23,12.5,-6,yellow,false);box(g,8,1,.45,-23,13.5,-6,green,false);
}
createRailStation("accra-central-rail-station","ACCRA CENTRAL",0,false);
createRailStation("achimota-rail-junction","ACHIMOTA INTERCHANGE",1,false);
createRailStation("tema-rail-station","TEMA STATION",1,true);
const trainRoutePoints=[...firstReleaseRailRoutes[0].points,...firstReleaseRailRoutes[1].points.slice(1)];
const trainCurve=railCurve(trainRoutePoints),trainLength=trainCurve.getLength();
function createTrainCar(){
 const g=new THREE.Group(),body=mat("#e1e0d8",.48),windowMat=mat("#263f4a",.22,.12);
 box(g,3.2,3.3,18,0,.6,0,body);box(g,3.25,.24,18.2,0,.6,0,dark,false);box(g,3,.28,17.6,0,3.9,0,roof,false);
 const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,1.15,1.45),windowMat,12),dummy=new THREE.Object3D();let idx=0;
 for(const side of [-1,1])for(let i=0;i<6;i++){dummy.position.set(side*1.63,2.35,-7.2+i*2.85);dummy.updateMatrix();windows.setMatrixAt(idx++,dummy.matrix);}
 windows.instanceMatrix.needsUpdate=true;g.add(windows);
 for(const side of [-1,1]){box(g,.12,.24,17.4,side*1.64,1.25,0,mat("#b43d32"),false);box(g,.12,.22,17.4,side*1.65,1.48,0,yellow,false);box(g,.12,.22,17.4,side*1.66,1.7,0,green,false);}
 for(const side of [-1,1])for(const z of [-5.8,5.8]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.24,12),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*1.55,.48,z);g.add(wheel);}
 return g;
}
const trainCars=[createTrainCar(),createTrainCar()];trainCars.forEach(car=>scene.add(car));let railClock=0;
function landmarkTower(x:number,z:number,w:number,d:number,floors:number,name:string,color:string){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,w+5,d+5);
 const h=floors*3.5,glassMat=mat(color,.28,.16),fin=mat("#d7d3c6",.48,.25);
 box(g,w,h,d,0,0,0,glassMat);box(g,w+1,.55,d+1,0,h,0,fin);
 for(let f=1;f<floors;f++)box(g,w+.35,.13,d+.35,0,f*3.5,0,fin,false);
 for(const side of [-1,1])for(let i=-1;i<=1;i++)box(g,.24,h,d+.25,side*(w/2-.25),0,i*d*.28,fin,false);
 sign(g,name,"GREATER ACCRA",w*.82,0,h-.7,d/2+.18);
}
function createMall(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,190,120);
 box(g,180,20,105,0,0,0,mat("#c8c1ad"));box(g,184,1.1,109,0,20,0,roof);
 box(g,165,12,.45,0,3.5,52.8,glass,false);box(g,180,2,1.5,0,21,53,green,false);
 sign(g,"ACCRA MALL","SHOPPING · DINING · LIFESTYLE",55,0,22.2,53.9);
 for(let xw=-70;xw<=70;xw+=28)box(g,1.2,13,.8,xw,3,53.4,frame,false);
}
function createAirport(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,230,110);
 box(g,210,22,70,0,0,0,mat("#c7c9c3"));box(g,190,13,.55,0,4,35.4,glass,false);box(g,214,1,74,0,22,0,roof);
 sign(g,"KOTOKA INTERNATIONAL","ARRIVALS · DEPARTURES",68,0,23,35.8);
 box(g,18,52,18,92,0,-15,mat("#aeb9b7",.35,.12));box(g,20,2,20,92,52,-15,roof);
}
function createStadium(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,190,150);
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(78,84,28,48,1,true),mat("#a7a69e"));shell.scale.z=.72;shell.position.y=14;shell.castShadow=true;g.add(shell);
 const inner=new THREE.Mesh(new THREE.CylinderGeometry(61,68,16,48,1,true),mat("#bd9a70"));inner.scale.z=.72;inner.position.y=13;g.add(inner);
 const field=new THREE.Mesh(new THREE.PlaneGeometry(86,54),mat("#477c4b"));field.rotation.x=-Math.PI/2;field.position.y=4;g.add(field);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(77,2.1,8,56),mat("#d7d1bd",.5,.2));ring.rotation.x=Math.PI/2;ring.scale.z=.72;ring.position.y=28;g.add(ring);
 sign(g,"ACCRA SPORTS STADIUM","MATCH DAY",42,0,30,57);
}
function createTheatre(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,110,95);
 box(g,88,13,68,0,0,0,mat("#b9b7a8"));
 const shellGeo=new THREE.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI/2),shellMat=mat("#ded8c8",.65);
 for(const [sx,sy,sz,px,pz] of [[48,21,35,-12,0],[39,17,29,18,-7],[30,14,23,0,13]] as const){const s=new THREE.Mesh(shellGeo,shellMat);s.scale.set(sx,sy,sz);s.position.set(px,13,pz);s.castShadow=true;g.add(s);}
 sign(g,"NATIONAL THEATRE","ARTS · CULTURE · PERFORMANCE",48,0,14,35);
}
function createMemorial(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,95,95);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(36,42,5,32),mat("#d4c7a8"));base.position.y=2.5;g.add(base);
 const drum=new THREE.Mesh(new THREE.CylinderGeometry(17,20,18,24),mat("#a8a89d"));drum.position.y=14;g.add(drum);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(18,24,16,0,Math.PI*2,0,Math.PI/2),mat("#c9b36c",.55));dome.position.y=23;g.add(dome);
 sign(g,"KWAME NKRUMAH MEMORIAL","PARK · HERITAGE",42,0,9,40);
}
function createArtsCentre(x:number,z:number){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);addLandmarkSolid(x,z,112,92);
 box(g,100,12,78,0,0,0,mat("#b9b5a7"));box(g,92,9,.45,0,0,39.2,glass,false);
 const domeGeo=new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2),dome=new THREE.Mesh(domeGeo,mat("#e3dfd2",.55));
 dome.scale.set(54,22,42);dome.position.y=12;dome.castShadow=true;g.add(dome);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(48,1.5,10,64),yellow);ring.rotation.x=Math.PI/2;ring.scale.z=.78;ring.position.y=12;g.add(ring);
 box(g,30,1.2,.8,0,13,39.7,mat("#a33c32"),false);box(g,30,1.2,.8,0,14.2,39.7,yellow,false);box(g,30,1.2,.8,0,15.4,39.7,green,false);
 sign(g,"AKWAABA CREATIVE ARTS","MUSIC · CULTURE · EVENTS",54,0,18,40);
}
createArtsCentre(WORLD_ORIGIN_X+220,WORLD_ORIGIN_Z+230);
const missionMarker=new THREE.Group();missionMarker.position.set(WORLD_ORIGIN_X+220,10,WORLD_ORIGIN_Z+278);
const missionCrystal=new THREE.Mesh(new THREE.OctahedronGeometry(2.4,0),new THREE.MeshStandardMaterial({color:"#f0c66c",emissive:"#b77d23",emissiveIntensity:1.2,metalness:.2,roughness:.3}));
missionCrystal.castShadow=true;missionMarker.add(missionCrystal);
const missionRing=new THREE.Mesh(new THREE.TorusGeometry(3.6,.16,8,24),yellow);missionRing.rotation.x=Math.PI/2;missionMarker.add(missionRing);scene.add(missionMarker);

createStadium(-150,-820);
createTheatre(-80,-420);
createMemorial(-760,300);
createAirport(1700,950);
createMall(3290,2240);
landmarkTower(650,1770,28,28,13,"VILLAGGIO VISTA","#78999a");
landmarkTower(690,1770,24,24,11,"VILLAGGIO RESIDENCES","#8ca6a5");
landmarkTower(3750,2260,30,28,16,"THE SIGNATURE","#76969b");
landmarkTower(3790,2260,26,26,14,"SIGNATURE EAST","#8ca9aa");
landmarkTower(3350,3550,58,36,4,"UNIVERSITY OF GHANA","#b4b3a2");


// Character: licensed, original AKWANTUO male/female GLB models; animated clips are added after rig verification.
const player=new THREE.Group();player.position.set(WORLD_ORIGIN_X,0,WORLD_ORIGIN_Z+12);scene.add(player);
const fallback=new THREE.Group();player.add(fallback);const skin=mat("#754a35"),shirt=mat("#285d48"),trousers=mat("#292f35");
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.72,4,8),shirt);torso.position.y=1.28;fallback.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.26,16,12),skin);head.position.y=2.05;fallback.add(head);
for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.68,3,7),trousers);leg.position.set(side*.16,.55,0);fallback.add(leg);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.65,3,7),skin);arm.position.set(side*.43,1.28,0);fallback.add(arm);}
let activeModel:THREE.Object3D|null=null,modelRequest=0;
let playerMixer:THREE.AnimationMixer|null=null,idleAction:THREE.AnimationAction|null=null,walkAction:THREE.AnimationAction|null=null,isWalking=false;
async function loadCharacterModel(presentation:"masculine"|"feminine"){
 const request=++modelRequest;
 fallback.visible=true;
 try{
  const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
  const loader=new GLTFLoader();
  const path=presentation==="feminine"?"/assets/characters/akwantuo-female.glb":"/assets/characters/akwantuo-male.glb";
  // Load and display the actual character first. Animation files must never block the model.
  const gltf=await loader.loadAsync(path);
  if(request!==modelRequest)return;
  const model=gltf.scene;
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  const size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.05)throw new Error("Character model has no visible 3D geometry.");
  const scale=1.82/size.y;
  const widthScale=appearance.build==="broad"?1.08:appearance.build==="slim"?.94:1;
  const heightScale=appearance.age>=60?.96:1;
  model.scale.set(scale*widthScale,scale*heightScale,scale*widthScale);
  model.position.y=-bounds.min.y*scale*heightScale;
  model.traverse(o=>{if((o as THREE.Mesh).isMesh){const mesh=o as THREE.Mesh;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;}});
  model.updateMatrixWorld(true);
  if(playerMixer&&activeModel){playerMixer.stopAllAction();playerMixer.uncacheRoot(activeModel);}
  if(activeModel)player.remove(activeModel);
  playerMixer=null;idleAction=null;walkAction=null;isWalking=false;
  activeModel=model;
  player.add(model);
  fallback.visible=false;

  // Animation loading is independent: a missing clip leaves the 3D character visible.
  try{
   const [idleFile,walkFile]=await Promise.all([
    loader.loadAsync("/assets/characters/idle.glb"),
    loader.loadAsync("/assets/characters/walk.glb")
   ]);
   if(request!==modelRequest||activeModel!==model)return;
   const idleClip=(gltf.animations.find(c=>c.tracks.length>0)||idleFile.animations.find(c=>c.tracks.length>0))?.clone();
   const walkClip=(walkFile.animations.find(c=>c.tracks.length>0)||gltf.animations.find(c=>c.tracks.length>0))?.clone();
   if(!idleClip)throw new Error("No usable idle animation clip was found.");
   const nextMixer=new THREE.AnimationMixer(model);
   const nextIdle=nextMixer.clipAction(idleClip);
   const nextWalk=walkClip?nextMixer.clipAction(walkClip):null;
   nextIdle.reset().play();
   nextMixer.update(1/30);
   playerMixer=nextMixer;idleAction=nextIdle;walkAction=nextWalk;isWalking=false;
  }catch(animationError){
   console.error("AKWANTUO character is visible, but animation loading failed.",animationError);
  }
 }catch(error){
  if(request!==modelRequest)return;
  console.error("AKWANTUO 3D character load failed; showing fallback.",error);
  if(playerMixer&&activeModel){playerMixer.stopAllAction();playerMixer.uncacheRoot(activeModel);}
  if(activeModel){player.remove(activeModel);activeModel=null;}
  playerMixer=null;idleAction=null;walkAction=null;isWalking=false;
  fallback.visible=true;
 }
}
type Appearance={presentation:"masculine"|"feminine";age:number;complexion:string;build:string;hairstyle:string;outfit:string};
let appearance:Appearance={presentation:"masculine",age:25,complexion:"dark",build:"average",hairstyle:"short-natural",outfit:"street-green"};
function applyAppearance(next:Appearance){appearance=next;const form=document.querySelector<HTMLFormElement>("#character-form");if(form){for(const [key,value] of Object.entries(next)){const field=form.elements.namedItem(key) as HTMLInputElement|HTMLSelectElement|null;if(field)field.value=String(value);}}loadCharacterModel(next.presentation);}
function readAppearance():Appearance{const f=document.querySelector<HTMLFormElement>("#character-form")!;const d=new FormData(f);return{presentation:(d.get("presentation")==="feminine"?"feminine":"masculine"),age:Number(d.get("age")||25),complexion:String(d.get("complexion")||"dark"),build:String(d.get("build")||"average"),hairstyle:String(d.get("hairstyle")||"short-natural"),outfit:String(d.get("outfit")||"street-green")};}
loadCharacterModel(appearance.presentation);

const keys=new Set<string>(),touch=new Set<string>();let stickX=0,stickY=0;const stick=document.querySelector<HTMLElement>("#joystick"),stickKnob=document.querySelector<HTMLElement>("#joystick-knob");let stickPointer:number|null=null;function updateStick(e:PointerEvent){if(!stick)return;const rect=stick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,limit=rect.width*.34,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),factor=len>limit?limit/len:1;stickX=THREE.MathUtils.clamp(dx*factor/limit,-1,1);stickY=THREE.MathUtils.clamp(dy*factor/limit,-1,1);if(stickKnob)stickKnob.style.transform=`translate(calc(-50% + ${stickX*limit}px),calc(-50% + ${stickY*limit}px))`;}function resetStick(){stickPointer=null;stickX=0;stickY=0;if(stickKnob)stickKnob.style.transform="translate(-50%,-50%)";}stick?.addEventListener("pointerdown",e=>{e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateStick(e);});stick?.addEventListener("pointermove",e=>{if(e.pointerId===stickPointer)updateStick(e);});for(const ev of ["pointerup","pointercancel","lostpointercapture"]){stick?.addEventListener(ev,()=>resetStick());}window.addEventListener("keydown",e=>{keys.add(e.key.toLowerCase());if(e.key.startsWith("Arrow")||e.key===" ")e.preventDefault();if(e.key.toLowerCase()==="e"&&!e.repeat)toggleVehicle();},{passive:false});window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));

let yaw=0,pitch=.2,drag=false,lx=0,ly=0,playing=false,driving=false,vehicleSpeed=0,vehicleHeading=0,cameraSensitivity=.004,graphicsQuality:"performance"|"balanced"|"high"="balanced";canvas.addEventListener("pointerdown",e=>{drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener("pointerup",()=>drag=false);canvas.addEventListener("pointercancel",()=>drag=false);canvas.addEventListener("pointermove",e=>{if(!drag)return;yaw-=(e.clientX-lx)*cameraSensitivity;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-ly)*cameraSensitivity*.5,-.15,.7);lx=e.clientX;ly=e.clientY;});
document.querySelector<HTMLButtonElement>("#enter")!.addEventListener("click",()=>{playing=true;document.querySelector("#intro")!.classList.add("hidden");document.querySelector("#hud")!.classList.add("visible");document.querySelector("#mobile-controls")!.classList.add("visible");document.querySelector("#minimap")!.classList.add("visible");document.querySelector("#mission-card")!.classList.add("visible");});
function toggleVehicle(){
 if(!playing)return;
 if(driving){driving=false;player.visible=true;const side=new THREE.Vector3(Math.cos(vehicleHeading),0,-Math.sin(vehicleHeading));player.position.copy(trotro.position).addScaledVector(side,2.4);player.position.y=0;vehicleSpeed=0;const speedLabel=document.querySelector("#speed-display");if(speedLabel)speedLabel.textContent="ON FOOT";void saveGameState();return;}
 if(player.position.distanceTo(trotro.position)>6)return;
 driving=true;player.visible=false;vehicleHeading=trotro.rotation.y;vehicleSpeed=0;void saveGameState();
}
const vehicleActionButton=document.querySelector<HTMLButtonElement>("#interact");vehicleActionButton?.addEventListener("click",toggleVehicle);


const characterPanel=document.querySelector("#character-panel")!,accountPanel=document.querySelector("#account-panel")!,settingsPanel=document.querySelector("#settings-panel")!,newsPanel=document.querySelector("#news-panel")!;
const allPanels=[characterPanel,accountPanel,settingsPanel,newsPanel];
function showPanel(panel:Element){allPanels.forEach(item=>item.classList.remove("visible"));panel.classList.add("visible");}
document.querySelector("#character-open")?.addEventListener("click",()=>showPanel(characterPanel));
document.querySelector("#account-open")?.addEventListener("click",()=>showPanel(accountPanel));
document.querySelector("#settings-open")?.addEventListener("click",()=>showPanel(settingsPanel));
document.querySelector("#news-open")?.addEventListener("click",()=>showPanel(newsPanel));
function applyGraphicsQuality(level:"performance"|"balanced"|"high"){
 graphicsQuality=level;const ratio=level==="performance"?.9:level==="high"?1.5:1.2;
 renderer.setPixelRatio(Math.min(devicePixelRatio,ratio));renderer.shadowMap.enabled=level!=="performance";
 const size=level==="high"?2048:level==="balanced"?1024:512;sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);sun.shadow.camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
}
document.querySelector<HTMLFormElement>("#settings-form")!.addEventListener("submit",e=>{
 e.preventDefault();const level=(document.querySelector<HTMLSelectElement>("#graphics-quality")!.value||"balanced") as "performance"|"balanced"|"high";
 cameraSensitivity=Number(document.querySelector<HTMLInputElement>("#camera-sensitivity")!.value)||.004;applyGraphicsQuality(level);
 try{localStorage.setItem("akwantuo.settings",JSON.stringify({level,cameraSensitivity}));}catch{/* settings are optional */}
 document.querySelector("#settings-panel")!.classList.remove("visible");
});
try{const saved=JSON.parse(localStorage.getItem("akwantuo.settings")||"null");if(saved){if(typeof saved.cameraSensitivity==="number")cameraSensitivity=saved.cameraSensitivity;if(["performance","balanced","high"].includes(saved.level))applyGraphicsQuality(saved.level);}}catch{/* default settings */}

document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close!)?.classList.remove("visible")));
let currentSession:AkwantuoSession|null=null,firstMissionComplete=false;
const accountStatus=document.querySelector<HTMLElement>("#account-status")!;
async function syncProfile(){
 if(!currentSession)return;
 try{
  const profile=await loadPlayerProfile(currentSession);
  if(profile?.game_save?.mission_first_steps===true)firstMissionComplete=true;
  if(profile?.look){applyAppearance(profile.look as Appearance);const name=document.querySelector<HTMLInputElement>("#account-name");if(name)name.value=profile.display_name;
   const savedPosition=profile.game_save?.position as {x?:unknown;y?:unknown;z?:unknown}|undefined;
   if(savedPosition&&typeof savedPosition.x==="number"&&typeof savedPosition.z==="number"){player.position.set(savedPosition.x,typeof savedPosition.y==="number"?savedPosition.y:0,savedPosition.z);const savedRotation=profile.game_save?.rotation_y;if(typeof savedRotation==="number")player.rotation.y=savedRotation;}
   const savedVehicle=profile.game_save?.vehicle as {x?:unknown;z?:unknown;heading?:unknown}|null|undefined;
   if(savedVehicle&&typeof savedVehicle.x==="number"&&typeof savedVehicle.z==="number"){trotro.position.set(savedVehicle.x,.12,savedVehicle.z);if(typeof savedVehicle.heading==="number")vehicleHeading=savedVehicle.heading;driving=profile.game_save?.driving===true;player.visible=!driving;}
  }
 }catch(error){console.warn("Player profile restore",error);}
 try{const economy=await loadEconomyState(currentSession);const balance=economy.wallet?.balance_pesewas??0;const wallet=document.querySelector("#wallet-display");if(wallet)wallet.textContent="GH₵"+(balance/100).toFixed(2);}
 catch(error){console.warn("Economy state restore",error);}
}
let lastGameSaveAt=0;
async function saveGameState(){
 if(!currentSession||!playing||Date.now()-lastGameSaveAt<5000)return;
 lastGameSaveAt=Date.now();
 const name=document.querySelector<HTMLInputElement>("#account-name")?.value;
 const save={position:{x:player.position.x,y:player.position.y,z:player.position.z},rotation_y:player.rotation.y,vehicle:{x:trotro.position.x,z:trotro.position.z,heading:vehicleHeading},driving,mission_first_steps:firstMissionComplete};
 try{await savePlayerProfile(currentSession,appearance,name,save);}catch(error){console.warn("Player progress save",error);}
}
setInterval(()=>void saveGameState(),30000);

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
try{const saved=localStorage.getItem("akwantuo.character.appearance");if(saved)applyAppearance(JSON.parse(saved) as Appearance);if(localStorage.getItem("akwantuo.mission.first-steps")==="done")firstMissionComplete=true;}catch{/* local appearance is optional */}

const minimapCanvas=document.querySelector<HTMLCanvasElement>("#minimap")!,minimapContext=minimapCanvas.getContext("2d");
function updateMission(){const focus=driving?trotro.position:player.position,targetX=WORLD_ORIGIN_X+220,targetZ=WORLD_ORIGIN_Z+278,distance=Math.hypot(focus.x-targetX,focus.z-targetZ);if(!firstMissionComplete&&distance<18){firstMissionComplete=true;missionMarker.visible=false;document.querySelector("#mission-title")!.textContent="You found your first opportunity";document.querySelector("#mission-distance")!.textContent="MISSION COMPLETE · Welcome to Akwantuo.";try{localStorage.setItem("akwantuo.mission.first-steps","done");}catch{/* optional */}void saveGameState();}const title=document.querySelector("#mission-title"),status=document.querySelector("#mission-distance");if(firstMissionComplete){if(title)title.textContent="You found your first opportunity";if(status)status.textContent="MISSION COMPLETE · Welcome to Akwantuo.";}else{if(title)title.textContent="Visit Akwaaba Creative Arts Centre";if(status)status.textContent=Math.round(distance)+" m away · Follow the gold marker.";}missionMarker.visible=!firstMissionComplete;}
function updateMinimap(){
 if(!minimapContext)return;
 const ctx=minimapContext,size=minimapCanvas.width,center=size/2,range=650,focus=driving?trotro.position:player.position;
 ctx.clearRect(0,0,size,size);ctx.fillStyle="#17251f";ctx.fillRect(0,0,size,size);
 const drawPath=(points:readonly {x:number;z:number}[],width:number,color:string)=>{
  ctx.beginPath();let started=false;
  for(const point of points){const x=center+(point.x-focus.x)/range*center,y=center-(point.z-focus.z)/range*center;if(x< -size||x>size*2||y< -size||y>size*2){started=false;continue;}if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 for(const path of GREATER_ACCRA_ROAD_PATHS){if(path.playableInFirstRelease)drawPath(path.points,path.roadSegmentId.startsWith("n1-")||path.roadSegmentId.startsWith("n6-")?3:2,"#a9a99b");}
 for(const path of GREATER_ACCRA_LOCAL_ROADS)drawPath(path.points,1.5,"#777f72");
 // The playable Osu block's local streets.
 ctx.strokeStyle="#85877a";ctx.lineWidth=2;
 for(const z of [-270,-42,91,270]){const y=center-(WORLD_ORIGIN_Z+z-focus.z)/range*center;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
 for(const x of [-280,0,280]){const px=center+(WORLD_ORIGIN_X+x-focus.x)/range*center;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,size);ctx.stroke();}
 const mx=center+(WORLD_ORIGIN_X+220-focus.x)/range*center,my=center-(WORLD_ORIGIN_Z+278-focus.z)/range*center;if(!firstMissionComplete&&Math.abs(mx-center)<center&&Math.abs(my-center)<center){ctx.fillStyle="#e9c36d";ctx.beginPath();ctx.arc(mx,my,4,0,Math.PI*2);ctx.fill();}ctx.save();ctx.translate(center,center);ctx.rotate(-(driving?vehicleHeading:player.rotation.y));ctx.fillStyle="#f0c66c";ctx.strokeStyle="#30261a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,8);ctx.lineTo(0,5);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 const tx=center+(trotro.position.x-focus.x)/range*center,ty=center-(trotro.position.z-focus.z)/range*center;
 if(!driving&&Math.abs(tx-center)<center&&Math.abs(ty-center)<center){ctx.fillStyle="#d5a93f";ctx.fillRect(tx-3,ty-3,6,6);}
 ctx.strokeStyle="#d6c48e";ctx.lineWidth=1;ctx.beginPath();ctx.arc(center,center,center-2,0,Math.PI*2);ctx.stroke();
}
let minimapTimer=0;
const clock=new THREE.Clock();canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();const status=document.querySelector("#loading");if(status){status.textContent="GRAPHICS PAUSED · RETURN TO THE GAME";status.classList.add("visible");}},false);canvas.addEventListener("webglcontextrestored",()=>document.querySelector("#loading")?.remove(),false);document.addEventListener("visibilitychange",()=>{clock.getDelta();if(document.hidden)void saveGameState();});function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(document.hidden)return;minimapTimer+=dt;if(minimapTimer>.18){updateMinimap();updateMission();minimapTimer=0;}railClock+=dt;missionMarker.rotation.y+=dt*.7;missionMarker.position.y=10+Math.sin(railClock*2)*.7;const railProgress=((railClock*12)%trainLength)/trainLength;trainCars.forEach((car,index)=>{const t=(railProgress-(index*22/trainLength)+1)%1,p=trainCurve.getPointAt(t),tan=trainCurve.getTangentAt(t);car.position.set(p.x,p.y+.07,p.z);car.rotation.y=Math.atan2(tan.x,tan.z);});if(playing){const keyF=keys.has("w")||keys.has("arrowup"),keyB=keys.has("s")||keys.has("arrowdown"),keyL=keys.has("a")||keys.has("arrowleft"),keyR=keys.has("d")||keys.has("arrowright");const f=keyF||stickY<-.18,b=keyB||stickY>.18,l=keyL||stickX<-.18,r=keyR||stickX>.18;const inputX=keyR?1:keyL?-1:stickX,inputZ=keyB?1:keyF?-1:stickY;const moving=Math.hypot(inputX,inputZ)>.12;if(driving){const throttle=f?1:b?-1:0;if(throttle)vehicleSpeed+=throttle*8.5*dt;else vehicleSpeed*=Math.exp(-1.15*dt);if(keys.has(" "))vehicleSpeed*=Math.exp(-5.5*dt);vehicleSpeed=THREE.MathUtils.clamp(vehicleSpeed,-6,17);vehicleHeading+=(Number(r)-Number(l))*Math.min(Math.abs(vehicleSpeed)/8,1)*.78*Math.sign(vehicleSpeed||1)*dt;const candidate=trotro.position.clone();candidate.x+=Math.sin(vehicleHeading)*vehicleSpeed*dt;candidate.z+=Math.cos(vehicleHeading)*vehicleSpeed*dt;const blocked=solidAreas.some(s=>candidate.x+1.1>s.minX&&candidate.x-1.1<s.maxX&&candidate.z+2.7>s.minZ&&candidate.z-2.7<s.maxZ);if(!blocked)trotro.position.copy(candidate);else vehicleSpeed=0;trotro.rotation.y=vehicleHeading;for(const wheel of trotro.userData.wheels as THREE.Mesh[])wheel.rotation.x+=vehicleSpeed*dt;const speed=document.querySelector("#speed-display");if(speed)speed.textContent=Math.round(Math.abs(vehicleSpeed)*3.6)+" KM/H";}else{const v=new THREE.Vector3(inputX,0,inputZ);if(v.lengthSq()){v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);const candidate=player.position.clone().addScaledVector(v,dt*7.2),radius=.55;const blocked=(p:THREE.Vector3)=>solidAreas.some(s=>p.x+radius>s.minX&&p.x-radius<s.maxX&&p.z+radius>s.minZ&&p.z-radius<s.maxZ);if(!blocked(candidate))player.position.copy(candidate);else{const slideX=player.position.clone();slideX.x=candidate.x;if(!blocked(slideX))player.position.x=slideX.x;const slideZ=player.position.clone();slideZ.z=candidate.z;if(!blocked(slideZ))player.position.z=slideZ.z;}player.rotation.y=Math.atan2(v.x,v.z);}if(playerMixer){playerMixer.update(dt);if(moving&&!isWalking&&walkAction){walkAction.reset().play();idleAction?.crossFadeTo(walkAction,.18,true);isWalking=true;}else if(!moving&&isWalking&&idleAction){idleAction.reset().play();walkAction?.crossFadeTo(idleAction,.2,true);isWalking=false;}}const speed=document.querySelector("#speed-display");if(speed)speed.textContent="ON FOOT";}const interact=document.querySelector("#interact");if(interact){interact.textContent=driving?"EXIT TRO-TRO":"ENTER TRO-TRO";interact.classList.toggle("visible",driving||player.position.distanceTo(trotro.position)<6);}}traffic.position.z-=dt*5.5;if(traffic.position.z< -175)traffic.position.z=175;const focus=driving?trotro.position:player.position,target=new THREE.Vector3(focus.x,focus.y+(driving?2.3:1.6),focus.z),offset=driving?new THREE.Vector3(Math.sin(vehicleHeading)*10,4,-Math.cos(vehicleHeading)*10):new THREE.Vector3(Math.sin(yaw)*8.5,3.7+pitch*5,Math.cos(yaw)*8.5);camera.position.lerp(target.clone().add(offset),.09);camera.lookAt(target);renderer.render(scene,camera);}animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,graphicsQuality==="performance"?.9:graphicsQuality==="high"?1.5:1.2));});
document.querySelector("#loading")?.remove();
