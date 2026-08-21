import { assetManifest, findPose } from "../assets/manifest";
import type { EnvironmentLayer, SceneState } from "../model/types";
import { findZone } from "../placement/zones";
import { orderedLayers } from "./layerOrdering";

const WIDTH = 1448, HEIGHT = 1086;
const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
async function drawEnvironment(ctx: CanvasRenderingContext2D, layer: EnvironmentLayer) {
  const image = await load(layer.file); const w = image.width * layer.scale, h = image.height * layer.scale; ctx.drawImage(image, layer.x - w / 2, layer.y - h, w, h);
}
export async function exportScenePng(scene: SceneState) {
  const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas export is unavailable.");
  const background = assetManifest.backgrounds.find(item => item.id === scene.backgroundId) ?? assetManifest.backgrounds.find(item => item.view === scene.view)!;
  ctx.drawImage(await load(background.file), 0, 0, WIDTH, HEIGHT);
  for (const item of orderedLayers(scene.actors, background.layers)) {
    if (item.kind === "environment") { await drawEnvironment(ctx, item.layer); continue; }
    const actor = item.actor; const pose = findPose(actor.characterId, scene.view, actor.poseId); const zone = findZone(actor.zoneId)?.views[scene.view]; if (!pose || !zone) continue;
    const image = await load(pose.file); const x = zone.x + actor.offsetX - pose.pivotX * pose.defaultScale; const y = zone.y + actor.offsetY - pose.pivotY * pose.defaultScale;
    ctx.drawImage(image, x, y, pose.width * pose.defaultScale, pose.height * pose.defaultScale);
  }
  const link = document.createElement("a"); link.download = "APT_305_QUICK_SCENE.png"; link.href = canvas.toDataURL("image/png"); document.body.appendChild(link); link.click(); link.remove();
}
