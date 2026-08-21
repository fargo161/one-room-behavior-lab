import type { ViewFamily, ZoneDefinition } from "../model/types";

const bounds = { xMin: -110, xMax: 110, yMin: -45, yMax: 55 };
export const zones: ZoneDefinition[] = [
  { id: "left", label: "Left", views: { iso: { x: 390, y: 800, defaultDepth: 40, offsetBounds: bounds }, "2d": { x: 350, y: 960, defaultDepth: 40, offsetBounds: bounds } } },
  { id: "center", label: "Center", views: { iso: { x: 720, y: 800, defaultDepth: 50, offsetBounds: bounds }, "2d": { x: 720, y: 960, defaultDepth: 50, offsetBounds: bounds } } },
  { id: "right", label: "Right", views: { iso: { x: 1030, y: 790, defaultDepth: 45, offsetBounds: bounds }, "2d": { x: 1080, y: 960, defaultDepth: 45, offsetBounds: bounds } } },
  { id: "table", label: "Table", views: { iso: { x: 700, y: 605, defaultDepth: 30, offsetBounds: { xMin: -95, xMax: 95, yMin: -35, yMax: 40 } }, "2d": { x: 720, y: 885, defaultDepth: 30, offsetBounds: bounds } } },
  { id: "door", label: "Door", views: { iso: { x: 1110, y: 675, defaultDepth: 25, offsetBounds: { xMin: -70, xMax: 70, yMin: -30, yMax: 35 } }, "2d": { x: 1120, y: 900, defaultDepth: 25, offsetBounds: bounds } } },
  { id: "couch", label: "Couch", views: { iso: { x: 930, y: 540, defaultDepth: 20, offsetBounds: { xMin: -75, xMax: 75, yMin: -25, yMax: 35 } }, "2d": { x: 430, y: 900, defaultDepth: 20, offsetBounds: bounds } } },
];

export const findZone = (id: string) => zones.find(zone => zone.id === id);
export function clampOffset(zoneId: string, view: ViewFamily, x: number, y: number) {
  const placement = findZone(zoneId)?.views[view];
  if (!placement) return { x: 0, y: 0 };
  const b = placement.offsetBounds;
  return { x: Math.min(b.xMax, Math.max(b.xMin, x)), y: Math.min(b.yMax, Math.max(b.yMin, y)) };
}
