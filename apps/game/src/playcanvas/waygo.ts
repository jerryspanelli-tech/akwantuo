import {
  GREATER_ACCRA_MAP_EXTENT,
  GREATER_ACCRA_ROAD_PATHS,
  GREATER_ACCRA_REGION_ANCHORS,
  GREATER_ACCRA_COASTLINE,
  type MapPoint
} from "../world/greaterAccraLayout";
import { getRemainingRouteDistance, type GpsRoute } from "../world/gpsNavigation";

export type WayGoPlace = Readonly<{ name: string; district: string; x: number; z: number }>;
export type WayGoState = Readonly<{
  position: MapPoint;
  headingRadians: number;
  route: GpsRoute | null;
  destinationLabel: string;
  isDriving: boolean;
}>;

type WayGoAdapter = {
  getState: () => WayGoState;
  navigateTo: (place: WayGoPlace) => GpsRoute | null;
  clearRoute: () => void;
};

let adapter: WayGoAdapter | null = null;

export function setWayGoNavigationAdapter(value: WayGoAdapter): void {
  adapter = value;
}

const PLACES: readonly WayGoPlace[] = [
  { name: "Accra Mall", district: "Tetteh Quarshie", x: 3650, z: 1750 },
  { name: "Airport City", district: "Airport City", x: 1050, z: 850 },
  { name: "Osu", district: "Osu", x: 1450, z: -1350 },
  { name: "Makola Market", district: "Accra Central", x: -500, z: 350 },
  { name: "The Signature", district: "East Legon", x: 3750, z: 2160 },
  { name: "East Legon", district: "East Legon", x: 3780, z: 2090 },
  { name: "Labadi Beach", district: "Labadi", x: 2750, z: -2100 },
  { name: "Circle", district: "Accra Central", x: -450, z: 450 },
  { name: "Kaneshie", district: "Kaneshie", x: -2850, z: -250 },
  { name: "Madina", district: "Madina", x: 5000, z: 1750 },
  { name: "Spintex", district: "Spintex", x: 5600, z: -1150 },
  { name: "Tema", district: "Tema", x: 9000, z: -750 },
  { name: "Adenta", district: "Adenta", x: 6550, z: 950 }
];

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function drawMap(canvas: HTMLCanvasElement, state: WayGoState): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width, height = canvas.height;
  const bounds = GREATER_ACCRA_MAP_EXTENT;
  const rawProject = (value: MapPoint) => ({
    x: (value.x - value.z) * 0.72,
    y: (value.x + value.z) * 0.36
  });
  const corners = [
    rawProject({ x: bounds.minX, z: bounds.minZ }),
    rawProject({ x: bounds.minX, z: bounds.maxZ }),
    rawProject({ x: bounds.maxX, z: bounds.minZ }),
    rawProject({ x: bounds.maxX, z: bounds.maxZ })
  ];
  const minX = Math.min(...corners.map(p => p.x)), maxX = Math.max(...corners.map(p => p.x));
  const minY = Math.min(...corners.map(p => p.y)), maxY = Math.max(...corners.map(p => p.y));
  const pad = 30;
  const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
  const project = (value: MapPoint) => {
    const p = rawProject(value);
    return { x: (width - (maxX-minX)*scale)/2 + (p.x-minX)*scale,
      y: (height - (maxY-minY)*scale)/2 + (p.y-minY)*scale };
  };
  const polygon = (points: readonly MapPoint[]) => points.map(project);
  const path = (points: readonly MapPoint[]) => {
    const projected = polygon(points);
    context.beginPath();
    projected.forEach((p,i) => i ? context.lineTo(p.x,p.y) : context.moveTo(p.x,p.y));
  };
  context.clearRect(0,0,width,height);
  context.fillStyle="#e9eee8"; context.fillRect(0,0,width,height);

  // Pale land and a blue Gulf of Guinea coastline, projected in the same map space.
  const coast = polygon(GREATER_ACCRA_COASTLINE);
  context.beginPath();
  coast.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));
  context.lineTo(width+20,height+20); context.lineTo(-20,height+20); context.closePath();
  context.fillStyle="#a9d9e8"; context.fill();
  context.save();
  context.beginPath(); context.rect(0,0,width,height); context.clip();

  // Soft green parks/open areas around the urban districts.
  for (const [x,z,w,d] of [[-6000,1700,1500,900],[-1200,3200,1200,1000],[3000,3900,1300,900],[7000,900,900,700]] as const) {
    const c=project({x,z}), a=project({x:x+w,z}), b=project({x:x+w,z:z+d}), e=project({x,z:z+d});
    context.beginPath(); context.moveTo(c.x,c.y); context.lineTo(a.x,a.y); context.lineTo(b.x,b.y); context.lineTo(e.x,e.y); context.closePath();
    context.fillStyle="#d2e6c9"; context.fill();
  }

  // Small raised building blocks: a light 3D/isometric city texture, deterministic and lightweight.
  const districts = GREATER_ACCRA_REGION_ANCHORS;
  for (let districtIndex=0; districtIndex<districts.length; districtIndex++) {
    const district=districts[districtIndex];
    for(let row=-3;row<=3;row++) for(let col=-3;col<=3;col++) {
      const x=district.x+col*390+((row+districtIndex)%2)*75;
      const z=district.z+row*330;
      const base=project({x,z});
      const bw=(105+(Math.abs(row*3+col+districtIndex)%70))*scale;
      const bh=(85+(Math.abs(col*5-row+districtIndex)%55))*scale;
      const lift=(75+(Math.abs(row+col+districtIndex)%95))*scale;
      if(base.x<-20||base.x>width+20||base.y<-25||base.y>height+25) continue;
      const topY=base.y-lift;
      context.fillStyle="#b9c6c0";
      context.beginPath(); context.moveTo(base.x-bw/2,base.y); context.lineTo(base.x,base.y+bh/2); context.lineTo(base.x,topY+bh/2); context.lineTo(base.x-bw/2,topY); context.closePath(); context.fill();
      context.fillStyle="#dce4df";
      context.beginPath(); context.moveTo(base.x,base.y+bh/2); context.lineTo(base.x+bw/2,base.y); context.lineTo(base.x+bw/2,topY); context.lineTo(base.x,topY+bh/2); context.closePath(); context.fill();
      context.fillStyle="#f7f8f4";
      context.beginPath(); context.moveTo(base.x-bw/2,topY); context.lineTo(base.x,topY-bh/2); context.lineTo(base.x+bw/2,topY); context.lineTo(base.x,topY+bh/2); context.closePath(); context.fill();
    }
  }

  // Local roads first, then main highways on top for clear hierarchy.
  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease) continue;
    path(road.points);
    context.lineCap="round"; context.lineJoin="round";
    context.strokeStyle="#ffffff"; context.lineWidth=Math.max(2.2,road.roadSegmentId.match(/^(n1|n4|n6)-/)?5.5:3.1)*Math.max(.7,scale*2.4);
    context.stroke();
    path(road.points);
    context.strokeStyle=/^(n1|n4|n6)-/.test(road.roadSegmentId)?"#f2c66f":"#d4d9d4";
    context.lineWidth=Math.max(1.2,(/^(n1|n4|n6)-/.test(road.roadSegmentId)?3.1:1.45)*Math.max(.7,scale*2.4));
    context.stroke();
  }

  // Destination route is deliberately high contrast against the light map.
  if(state.route) {
    path(state.route.points); context.strokeStyle="#ffffff"; context.lineWidth=7; context.lineCap="round"; context.lineJoin="round"; context.stroke();
    path(state.route.points); context.strokeStyle="#287de0"; context.lineWidth=4.2; context.lineCap="round"; context.lineJoin="round"; context.stroke();
    const destination=state.route.points[state.route.points.length-1];
    if(destination){const p=project(destination);context.beginPath();context.arc(p.x,p.y,7,0,Math.PI*2);context.fillStyle="#287de0";context.fill();context.lineWidth=2;context.strokeStyle="#fff";context.stroke();}
  }

  // Readable destination pins and district labels.
  for(const place of PLACES) {
    const p=project(place);
    context.beginPath();context.arc(p.x,p.y,3.1,0,Math.PI*2);context.fillStyle="#d35d42";context.fill();
    context.lineWidth=1.2;context.strokeStyle="#fff";context.stroke();
  }
  for(const district of districts) {
    const p=project(district);
    const label=district.regionId.replace(/-/g," ").toUpperCase();
    context.font="700 8px system-ui,sans-serif";
    context.textAlign="center";
    context.lineWidth=3;context.strokeStyle="#ffffffdd";context.strokeText(label,p.x,p.y-14);
    context.fillStyle="#52645c";context.fillText(label,p.x,p.y-14);
  }

  const current=project(state.position);
  context.save();context.translate(current.x,current.y);context.rotate(state.headingRadians);
  context.beginPath();context.moveTo(0,-12);context.lineTo(8,8);context.lineTo(0,4);context.lineTo(-8,8);context.closePath();
  context.fillStyle="#1684ee";context.fill();context.lineWidth=2.5;context.strokeStyle="#fff";context.stroke();context.restore();
  context.restore();

  // Subtle map controls / scale cue.
  context.textAlign="left";context.fillStyle="#344b43";context.font="800 12px system-ui,sans-serif";
  context.fillText("WAYGO  ·  GREATER ACCRA",12,18);
  context.textAlign="right";context.fillStyle="#53675d";context.font="700 10px system-ui,sans-serif";
  context.fillText("N ↑",width-12,18);
}
function nextTurn(route: GpsRoute, position: MapPoint): string {
  const points = route.points;
  if (points.length < 3) return "Continue on the road";
  let closestIndex = 0, closestGap = Number.POSITIVE_INFINITY, closestT = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index], b = points[index + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1,
      ((position.x - a.x) * dx + (position.z - a.z) * dz) / lengthSquared)) : 0;
    const gap = Math.hypot(position.x - (a.x + dx * t), position.z - (a.z + dz * t));
    if (gap < closestGap) { closestGap = gap; closestIndex = index; closestT = t; }
  }
  let distanceToTurn = Math.hypot(
    points[closestIndex + 1].x - points[closestIndex].x,
    points[closestIndex + 1].z - points[closestIndex].z
  ) * (1 - closestT);
  let previousHeading = Math.atan2(
    points[closestIndex + 1].x - points[closestIndex].x,
    points[closestIndex + 1].z - points[closestIndex].z
  );
  for (let index = closestIndex + 1; index < points.length - 1; index += 1) {
    const a = points[index], b = points[index + 1];
    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    let change = heading - previousHeading;
    while (change > Math.PI) change -= Math.PI * 2;
    while (change < -Math.PI) change += Math.PI * 2;
    if (Math.abs(change) > 0.38 && distanceToTurn > 18) {
      return `${change > 0 ? "Turn right" : "Turn left"} in ${Math.round(distanceToTurn)} m`;
    }
    distanceToTurn += Math.hypot(b.x - a.x, b.z - a.z);
    previousHeading = heading;
  }
  return "Continue on the road";
}

export function mountWayGoApp(container: HTMLElement): () => void {
  container.replaceChildren();
  const shell = element("section", "waygo-shell");
  const status = element("div", "waygo-status", "Connecting to the game world…");
  const map = element("canvas", "waygo-map");
  map.width = 720;
  map.height = 440;
  map.setAttribute("role", "img");
  map.setAttribute("aria-label", "Greater Accra road map showing your position and selected route");
  const controls = element("div", "waygo-controls");
  const search = element("input", "waygo-search") as HTMLInputElement;
  search.type = "search";
  search.placeholder = "Search Accra, a district or destination";
  search.setAttribute("aria-label", "Search WayGo destinations");
  const results = element("div", "waygo-results");
  const footer = element("div", "waygo-footer");
  const clear = element("button", "waygo-clear", "Stop navigation") as HTMLButtonElement;
  clear.type = "button";
  clear.hidden = true;
  footer.append(clear);
  controls.append(search, results);
  shell.append(status, map, controls, footer);
  container.append(shell);

  let selected: WayGoPlace | null = null;
  const renderResults = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = PLACES.filter(place => !query ||
      place.name.toLocaleLowerCase().includes(query) ||
      place.district.toLocaleLowerCase().includes(query));
    results.replaceChildren();
    if (!matches.length) {
      results.append(element("p", "waygo-empty", "No matching destinations in the current game map."));
      return;
    }
    for (const place of matches) {
      const button = element("button", "waygo-place") as HTMLButtonElement;
      button.type = "button";
      button.append(element("strong", "", place.name), element("small", "", place.district));
      button.addEventListener("click", () => {
        if (!adapter) {
          status.textContent = "The game world is still starting. Try again in a moment.";
          return;
        }
        const route = adapter.navigateTo(place);
        if (!route) {
          selected = null;
          status.textContent = "No connected playable road reaches that destination yet.";
          return;
        }
        selected = place;
        const km = (route.distanceM / 1000).toFixed(1);
        status.textContent = `Route ready · ${place.name} · ${km} km by road`;
        clear.hidden = false;
        render();
      });
      results.append(button);
    }
  };

  const render = () => {
    if (!adapter) {
      status.textContent = "Waiting for the Greater Accra world…";
      return;
    }
    const state = adapter.getState();
    drawMap(map, state);
    if (state.route) {
      const remaining = getRemainingRouteDistance(state.route.points, state.position);
      const routeName = selected?.name ?? state.destinationLabel;
      const averageSpeed = state.isDriving ? 8.3 : 1.35;
      const etaMinutes = Math.max(1, Math.round(remaining / averageSpeed / 60));
      const turn = nextTurn(state.route, state.position);
      status.textContent = `To ${routeName} · ${(remaining / 1000).toFixed(1)} km · ~${etaMinutes} min · ${turn}`;
      clear.hidden = false;
    } else {
      status.textContent = "Choose a destination to plan a road route from your current position.";
      clear.hidden = true;
    }
  };

  search.addEventListener("input", renderResults);
  clear.addEventListener("click", () => {
    adapter?.clearRoute();
    selected = null;
    render();
  });
  renderResults();
  render();
  const interval = window.setInterval(render, 500);
  return () => window.clearInterval(interval);
}
