import type { CharacterPackAsset, ExpressionCharacterPack } from "../character-packs/types";
import type { ExpressionLayer } from "../model/types";

export interface RenderPlanEntry {
  layerId: string;
  assetId: string;
  asset: CharacterPackAsset;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface RenderPlan {
  entries: RenderPlanEntry[];
  missingAssetIds: string[];
}

export interface RenderFailure {
  assetId: string;
  path: string;
  message: string;
}

export interface RenderResult {
  missingAssetIds: string[];
  failedAssets: RenderFailure[];
  committed: boolean;
}

export function buildRenderPlan(pack: ExpressionCharacterPack, layers: readonly ExpressionLayer[]): RenderPlan {
  const entries: RenderPlanEntry[] = [];
  const missingAssetIds: string[] = [];
  for (const layer of layers) {
    if (!layer.visible) continue;
    const asset = pack.assetsById.get(layer.assetId);
    if (!asset) {
      missingAssetIds.push(layer.assetId);
      continue;
    }
    entries.push({
      layerId: layer.id,
      assetId: asset.id,
      asset,
      x: asset.faceRect.x + layer.x,
      y: asset.faceRect.y + layer.y,
      width: asset.faceRect.width,
      height: asset.faceRect.height,
      scale: layer.scale,
      rotation: layer.rotation,
      opacity: asset.opacity,
    });
  }
  return { entries, missingAssetIds };
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const maskedAssetCache = new Map<string, Promise<HTMLCanvasElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

async function loadRenderableAsset(pack: ExpressionCharacterPack, asset: CharacterPackAsset): Promise<CanvasImageSource> {
  const content = await loadImage(asset.src);
  if (!asset.mask) return content;
  const cacheKey = `${pack.id}:${asset.id}:${asset.mask.sha256}`;
  const cached = maskedAssetCache.get(cacheKey);
  if (cached) return cached;
  const pending = (async () => {
    const mask = await loadImage(asset.mask!.src);
    const local = document.createElement("canvas");
    local.width = asset.faceRect.width;
    local.height = asset.faceRect.height;
    const context = local.getContext("2d");
    if (!context) throw new Error("Canvas 2D rendering is unavailable");
    context.clearRect(0, 0, local.width, local.height);
    context.drawImage(content, 0, 0, local.width, local.height);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(mask, 0, 0, local.width, local.height);
    context.globalCompositeOperation = "source-over";
    return local;
  })();
  maskedAssetCache.set(cacheKey, pending);
  return pending;
}

export async function renderExpressionToCanvas(
  canvas: HTMLCanvasElement,
  pack: ExpressionCharacterPack,
  layers: readonly ExpressionLayer[],
  shouldCommit: () => boolean = () => true,
): Promise<RenderResult> {
  const stagedCanvas = document.createElement("canvas");
  stagedCanvas.width = pack.canonicalFaceSpace.width;
  stagedCanvas.height = pack.canonicalFaceSpace.height;
  const context = stagedCanvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D rendering is unavailable");
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, stagedCanvas.width, stagedCanvas.height);
  context.imageSmoothingEnabled = true;

  const plan = buildRenderPlan(pack, layers);
  const failedAssets: RenderFailure[] = [];
  for (const entry of plan.entries) {
    try {
      const source = await loadRenderableAsset(pack, entry.asset);
      const centerX = entry.x + entry.width / 2;
      const centerY = entry.y + entry.height / 2;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(entry.rotation * Math.PI / 180);
      context.scale(entry.scale, entry.scale);
      context.globalAlpha = entry.opacity;
      context.drawImage(source, -entry.width / 2, -entry.height / 2, entry.width, entry.height);
      context.restore();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown image load failure";
      const prefix = "Unable to load image: ";
      failedAssets.push({
        assetId: entry.assetId,
        path: message.startsWith(prefix) ? message.slice(prefix.length) : entry.asset.src,
        message,
      });
    }
  }

  const committed = shouldCommit();
  if (committed) {
    canvas.width = stagedCanvas.width;
    canvas.height = stagedCanvas.height;
    const targetContext = canvas.getContext("2d");
    if (!targetContext) throw new Error("Canvas 2D rendering is unavailable");
    targetContext.setTransform(1, 0, 0, 1, 0, 0);
    targetContext.globalCompositeOperation = "source-over";
    targetContext.globalAlpha = 1;
    targetContext.clearRect(0, 0, canvas.width, canvas.height);
    targetContext.drawImage(stagedCanvas, 0, 0);
  }

  return { missingAssetIds: plan.missingAssetIds, failedAssets, committed };
}

export function sanitizeExpressionFilename(value: string): string {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "expression";
}

export async function exportExpressionPng(
  pack: ExpressionCharacterPack,
  layers: readonly ExpressionLayer[],
  groupName: string,
  expressionName: string,
): Promise<RenderResult> {
  const canvas = document.createElement("canvas");
  const result = await renderExpressionToCanvas(canvas, pack, layers);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(candidate => candidate ? resolve(candidate) : reject(new Error("PNG export failed")), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pack.id}__${sanitizeExpressionFilename(groupName)}__${sanitizeExpressionFilename(expressionName)}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return result;
}
