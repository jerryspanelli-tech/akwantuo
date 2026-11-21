import {
  GREATER_ACCRA_MAP_EXTENT,
  GREATER_ACCRA_ROAD_PATHS,
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
  { name: "Kotoka International Airport", district: "Airport City", x: 1050, z: 850 },
  { name: "Osu", district: "Osu", x: 1450, z: -1350 },
  { name: "Makola Market", district: "Accra Central", x: -500, z: 350 },
  { name: "The Signature", district: "East Legon", x: 3750, z: 2160 },
  { name: "East Legon", district: "East Legon", x: 3780, z: 2090 },
  { name: "Labadi Beach", district: "Labadi", x: 2750, z: -2100 },
  { name: "Circle", district: "Accra Central", x: -450, z: 450 },
  { name: "Kaneshie", district: "Kaneshie", x: -2850, z: -250 },
  { name: "Achimota", district: "Achimota", x: -1750, z: 2100 },
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
  const pad = 26;
  const scale = Math.min((width - pad * 2) / bounds.widthM, (height - pad * 2) / bounds.depthM);
  const mapWidth = bounds.widthM * scale, mapHeight = bounds.depthM * scale;
  const ox = (width - mapWidth) / 2, oy = (height - mapHeight) / 2;
  const point = (value: MapPoint) => ({
    x: ox + (value.x - bounds.minX) * scale,
    y: oy + (bounds.maxZ - value.z) * scale
  });

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#10251f";
  context.fillRect(0, 0, width, height);
  const coastY = point({ x: 0, z: -3050 }).y;
  context.fillStyle = "#123c50";
  context.fillRect(0, coastY, width, height - coastY);
  context.fillStyle = "#20382b";
  context.fillRect(ox, oy, mapWidth, mapHeight);

  context.save();
  context.beginPath();
  context.rect(ox, oy, mapWidth, mapHeight);
  context.clip();
  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease) continue;
    context.beginPath();
    road.points.forEach((coordinate, index) => {
      const p = point(coordinate);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    const highway = /^(n1|n4|n6)-/.test(road.roadSegmentId);
    context.strokeStyle = highway ? "#c7a66f" : "#84988a";
    context.lineWidth = highway ? 4 : 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  }

  if (state.route) {
    context.beginPath();
    state.route.points.forEach((coordinate, index) => {
      const p = point(coordinate);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.strokeStyle = "#ffcf62";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    const destination = state.route.points[state.route.points.length - 1];
    if (destination) {
      const p = point(destination);
      context.fillStyle = "#ffcf62";
      context.beginPath();
      context.arc(p.x, p.y, 7, 0, Math.PI * 2);
      context.fill();
    }
  }

  for (const place of PLACES) {
    const p = point(place);
    context.fillStyle = "#f0c77e";
    context.beginPath();
    context.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  const current = point(state.position);
  context.save();
  context.translate(current.x, current.y);
  context.rotate(state.headingRadians);
  context.fillStyle = "#6ce0a3";
  context.strokeStyle = "#f4fff8";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -10);
  context.lineTo(7, 8);
  context.lineTo(0, 5);
  context.lineTo(-7, 8);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
  context.restore();

  context.fillStyle = "#f3eee2";
  context.font = "600 13px system-ui, sans-serif";
  context.fillText("GREATER ACCRA · GHANA", 16, 22);
  context.fillStyle = "#9cc8b1";
  context.font = "11px system-ui, sans-serif";
  context.fillText("N ↑", width - 30, 22);
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
