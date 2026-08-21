import type { SceneState } from "../model/types";

export function downloadScene(scene: SceneState) {
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = "APT_305_QUICK_SCENE.json"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readSceneFile(file: File): Promise<unknown> { return JSON.parse(await file.text()); }
