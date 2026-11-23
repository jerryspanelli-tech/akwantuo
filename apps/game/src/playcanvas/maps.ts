import type { MapPoint, MapRoadPath } from "../world/greaterAccraLayout";
import type { GreaterAccraRoute } from "../world/greaterAccraNavigation";

export type MinimapBuilding = Readonly<{
  x: number; z: number; hx: number; hz: number; yaw: number;
}>;

const LANDMARKS: readonly (MapPoint & { name: string; kind: "district" | "market" | "transport" | "landmark" | "beach" })[] = [
  { name: "OSU", x: 1450, z: -1180, kind: "district" },
  { name: "MAKOLA", x: -500, z: 350, kind: "market" },
  { name: "CIRCLE", x: -450, z: 450, kind: "transport" },
  { name: "37", x: 1250, z: -350, kind: "district" },
  { name: "AIRPORT CITY", x: 1050, z: 850, kind: "landmark" },
  { name: "TETTEH QUARSHIE", x: 3650, z: 1750, kind: "transport" },
  { name: "EAST LEGON", x: 3900, z: 2100, kind: "district" },
  { name: "MADINA", x: 5000, z: 1750, kind: "market" },
  { name: "LABADI BEACH", x: 2750, z: -2100, kind: "beach" },
  { name: "SPINTEX", x: 5600, z: -1150, kind: "district" },
  { name: "TEMA", x: 8700, z: -850, kind: "district" }
];

const isHighway = (id: string) => /^(n1|n4|n6)-/.test(id);

/** Draws the compact live radar from the same authored roads and building bounds as the 3D world. */
export function drawAkwantuoMinimap(
  canvas: HTMLCanvasElement | null,
  center: MapPoint,
  facing: MapPoint,
  buildings: readonly MinimapBuilding[],
  roads: readonly MapRoadPath[],
  waypoint: MapPoint | null,
  route: GreaterAccraRoute | null
): void {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const radius = Math.min(width, height) * 0.465;
  const scale = radius / 1250;
  const cx = width / 2;
  const cy = height / 2;
  const plot = (point: MapPoint) => ({
    x: (point.x - center.x) * scale,
    y: -(point.z - center.z) * scale
  });

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07110f";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const ground = ctx.createRadialGradient(cx, cy, 3, cx, cy, radius);
  ground.addColorStop(0, "#263b30");
  ground.addColorStop(1, "#12231d");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, width, height);

  // Subtle range rings and north/south/east/west guides.
  ctx.strokeStyle = "rgba(219,231,213,.10)";
  ctx.lineWidth = 1;
  for (const fraction of [0.33, 0.66, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * fraction, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Nearby building footprints make the radar reflect the actual built world.
  for (const building of buildings) {
    const p = plot(building);
    const w = building.hx * 2 * scale;
    const h = building.hz * 2 * scale;
    const reach = Math.hypot(w, h) / 2;
    if (Math.abs(p.x) > radius + reach || Math.abs(p.y) > radius + reach) continue;
    ctx.save();
    ctx.translate(cx + p.x, cy + p.y);
    ctx.rotate((building.yaw * Math.PI) / 180);
    ctx.fillStyle = "#53675a";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Road casing first, then the road surface, to keep intersections readable.
  for (const road of roads) {
    if (!road.playableInFirstRelease || road.points.length < 2) continue;
    const highway = isHighway(road.roadSegmentId);
    ctx.beginPath();
    road.points.forEach((point, index) => {
      const p = plot(point);
      if (index === 0) ctx.moveTo(cx + p.x, cy + p.y);
      else ctx.lineTo(cx + p.x, cy + p.y);
    });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1712";
    ctx.lineWidth = highway ? 6 : 4;
    ctx.stroke();
    ctx.strokeStyle = highway ? "#d2b77d" : "#a5b2a6";
    ctx.lineWidth = highway ? 3.1 : 1.8;
    ctx.stroke();
  }

  // District and landmark labels are only drawn when there is room to read them.
  for (const place of LANDMARKS) {
    const p = plot(place);
    if (Math.hypot(p.x, p.y) > radius - 9) continue;
    const color = place.kind === "market" ? "#f1bd69"
      : place.kind === "beach" ? "#6bd0d4"
      : place.kind === "transport" ? "#a9c9ef"
      : place.kind === "landmark" ? "#e6d39c" : "#e7eee5";
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, place.kind === "landmark" || place.kind === "beach" ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (Math.hypot(p.x, p.y) < radius - 24) {
      ctx.font = "700 7px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#f5f2e8";
      ctx.shadowColor = "#07110f";
      ctx.shadowBlur = 3;
      ctx.fillText(place.name, cx + p.x, cy + p.y - 6);
      ctx.shadowBlur = 0;
    }
  }

  if (waypoint) {
    const target = plot(waypoint);
    const targetLength = Math.hypot(target.x, target.y) || 1;
    const visibleLength = Math.min(targetLength, radius - 15);
    const endX = target.x / targetLength * visibleLength;
    const endY = target.y / targetLength * visibleLength;
    const routePoints = route?.points ?? [center, waypoint];
    ctx.beginPath();
    routePoints.forEach((point, index) => {
      const p = plot(point);
      if (index === 0) ctx.moveTo(cx + p.x, cy + p.y);
      else ctx.lineTo(cx + p.x, cy + p.y);
    });
    ctx.strokeStyle = route ? "#ffe28b" : "#d5a65f";
    ctx.lineWidth = route ? 3.2 : 2.2;
    ctx.setLineDash(route ? [] : [5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(cx + endX, cy + endY);
    ctx.fillStyle = "#ffdf79";
    ctx.strokeStyle = "#302414";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -17); ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // Heading arrow: map stays north-up while the arrow follows the controlled actor.
  const length = Math.hypot(facing.x, facing.z) || 1;
  const fx = -facing.x / length;
  const fy = -facing.z / length;
  const px = -fy;
  const py = fx;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = "#06100c";
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(fx * 13, fy * 13);
  ctx.lineTo(-fx * 7 + px * 6, -fy * 7 + py * 6);
  ctx.lineTo(fx * 1, fy * 1);
  ctx.lineTo(-fx * 7 - px * 6, -fy * 7 - py * 6);
  ctx.closePath();
  ctx.fillStyle = "#f4c56f";
  ctx.fill();
  ctx.strokeStyle = "#fff5df";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#fff8e9"; ctx.fill();
  ctx.restore();

  // Compass labels and a crisp outer rim.
  ctx.font = "800 8px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e6eadf";
  ctx.fillText("N", cx, cy - radius + 10);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#e7c17c";
  ctx.lineWidth = 3;
  ctx.stroke();
}
