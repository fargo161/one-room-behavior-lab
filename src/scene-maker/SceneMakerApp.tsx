"use client";

import { useMemo, useRef, useState } from "react";
import { assetManifest, compatibleBackgrounds, findCharacter, findPose } from "./assets/manifest";
import { createDefaultScene } from "./model/defaults";
import type { ActorPlacement, CharacterId, SceneState, SlotId } from "./model/types";
import { switchView, validateScene } from "./model/validation";
import { downloadScene, readSceneFile } from "./persistence/sceneFiles";
import { applyPreset, presets } from "./placement/presets";
import { clampOffset, findZone, zones } from "./placement/zones";
import { exportScenePng } from "./rendering/exportImage";
import { orderedLayers } from "./rendering/layerOrdering";
import { SCENE_CANVAS, scaledEnvironmentSize } from "./rendering/renderMetrics";

const SLOT_LABEL: Record<SlotId, string> = { slot_a: "A", slot_b: "B", slot_c: "C" };

export default function SceneMakerApp() {
  const [scene, setScene] = useState<SceneState>(createDefaultScene);
  const [selected, setSelected] = useState<SlotId | null>("slot_b");
  const [notice, setNotice] = useState("APT_305_QUICK_SCENE loaded");
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ slotId: SlotId; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const background = assetManifest.backgrounds.find(item => item.id === scene.backgroundId) ?? compatibleBackgrounds(scene.view)[0];
  const layers = useMemo(() => orderedLayers(scene.actors, background.layers), [scene.actors, background.layers]);

  const setActor = (slotId: SlotId, change: Partial<ActorPlacement>) => setScene(current => ({ ...current, presetId: null, actors: current.actors.map(actor => actor.slotId === slotId ? { ...actor, ...change } : actor) }));
  const chooseCharacter = (actor: ActorPlacement, value: string) => {
    const characterId = value ? value as CharacterId : null; const character = findCharacter(characterId);
    const poseId = character?.representations[scene.view].some(p => p.id === actor.poseId) ? actor.poseId : character?.representations[scene.view][0]?.id ?? null;
    setActor(actor.slotId, { characterId, poseId });
  };
  const resetActorPosition = (actor: ActorPlacement) => setActor(actor.slotId, { offsetX: 0, offsetY: 0, depth: findZone(actor.zoneId)?.views[scene.view]?.defaultDepth ?? actor.depth });
  const moveDepth = (actor: ActorPlacement, amount: number) => setActor(actor.slotId, { depth: Math.max(0, Math.min(99, actor.depth + amount)) });
  const randomizePoses = () => setScene(current => ({ ...current, presetId: null, actors: current.actors.map(actor => {
    const poses = findCharacter(actor.characterId)?.representations[current.view] ?? []; return { ...actor, poseId: poses[Math.floor(Math.random() * poses.length)]?.id ?? null };
  }) }));
  const randomizeBlocking = () => setScene(current => ({ ...current, presetId: null, actors: current.actors.map((actor, index) => {
    const available = zones.filter(zone => zone.views[current.view]); const zone = available[(Math.floor(Math.random() * available.length) + index) % available.length];
    return { ...actor, zoneId: zone.id, offsetX: 0, offsetY: 0, depth: zone.views[current.view]!.defaultDepth };
  }) }));
  const randomizeScene = () => { randomizePoses(); randomizeBlocking(); setNotice("Valid poses and authored blocking randomized"); };

  const loadFile = async (file?: File) => {
    if (!file) return;
    try { const result = validateScene(await readSceneFile(file)); setScene(result.scene); setNotice(result.warnings.length ? result.warnings.join(" ") : "Scene JSON loaded"); }
    catch { setNotice("That file is not valid scene JSON."); }
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, actor: ActorPlacement) => {
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(actor.slotId);
    drag.current = { slotId: actor.slotId, x: event.clientX, y: event.clientY, offsetX: actor.offsetX, offsetY: actor.offsetY };
  };
  const updateDrag = (event: React.PointerEvent<HTMLButtonElement>, actor: ActorPlacement) => {
    if (!drag.current || drag.current.slotId !== actor.slotId) return;
    const box = event.currentTarget.parentElement!.getBoundingClientRect();
    const bounded = clampOffset(actor.zoneId, scene.view, drag.current.offsetX + (event.clientX - drag.current.x) * SCENE_CANVAS.width / box.width, drag.current.offsetY + (event.clientY - drag.current.y) * SCENE_CANVAS.height / box.height);
    setActor(actor.slotId, { offsetX: Math.round(bounded.x), offsetY: Math.round(bounded.y) });
  };

  return (
    <main className="scene-maker">
      <header className="scene-header">
        <div><span className="scene-kicker">TRAPSTAR / VISUAL AUTHORING</span><h1>Quick Scene Maker</h1></div>
        <div className="view-switch" aria-label="View family">{(["iso", "2d"] as const).map(view => <button key={view} className={scene.view === view ? "active" : ""} onClick={() => { setScene(current => switchView(current, view)); setNotice(`${view.toUpperCase()} representation loaded — cast and zones preserved`); }}>{view.toUpperCase()}</button>)}</div>
        <div className="header-actions">
          <input ref={fileInput} className="hidden-input" type="file" accept="application/json,.json" onChange={event => void loadFile(event.target.files?.[0])}/>
          <button onClick={() => fileInput.current?.click()}>Load JSON</button><button onClick={() => { downloadScene(scene); setNotice("Scene JSON downloaded"); }}>Save Scene</button>
          <button className="hot" onClick={() => void exportScenePng(scene).then(() => setNotice("Clean PNG exported")).catch(() => setNotice("PNG export failed"))}>Export PNG</button>
        </div>
      </header>

      <section className="scene-workspace">
        <aside className="scene-sidebar left-panel">
          <p className="panel-label">APT. 305</p><h2>Stage</h2>
          <label>Background<select value={scene.backgroundId} onChange={event => setScene(current => ({ ...current, backgroundId: event.target.value }))}>{compatibleBackgrounds(scene.view).map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <label>Visual preset<select value={scene.presetId ?? ""} onChange={event => { if (event.target.value) setScene(current => applyPreset(current, event.target.value)); }}><option value="">Custom</option>{presets.map(preset => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select></label>
          <div className="zone-list"><span>Authored positions</span>{zones.filter(zone => zone.views[scene.view]).map(zone => <button key={zone.id} onClick={() => selected && setActor(selected, { zoneId: zone.id, offsetX: 0, offsetY: 0, depth: zone.views[scene.view]!.defaultDepth })}>{zone.label.toUpperCase()}</button>)}</div>
        </aside>

        <div className="canvas-column">
          <div className="scene-canvas" aria-label="Apt. 305 scene canvas" onPointerDown={event => { if (event.currentTarget === event.target) setSelected(null); }}>
            <img className="room-plate" src={background.file} alt={`${background.label}, Apt. 305 ${scene.view.toUpperCase()}`} draggable={false}/>
            {layers.map(item => {
              if (item.kind === "environment") {
                const size = scaledEnvironmentSize(item.layer);
                return <img key={item.id} className="environment-layer" src={item.layer.file} alt="" draggable={false} style={{ left: `${item.layer.x / SCENE_CANVAS.width * 100}%`, top: `${item.layer.y / SCENE_CANVAS.height * 100}%`, width: `${size.width / SCENE_CANVAS.width * 100}%`, zIndex: item.depth }}/>;
              }
              const actor = item.actor; const pose = findPose(actor.characterId, scene.view, actor.poseId); const zone = findZone(actor.zoneId)?.views[scene.view]; if (!pose || !zone) return null;
              const left = (zone.x + actor.offsetX) / SCENE_CANVAS.width * 100; const top = (zone.y + actor.offsetY) / SCENE_CANVAS.height * 100; const width = pose.width * pose.defaultScale / SCENE_CANVAS.width * 100;
              return <button key={actor.slotId} className={`canvas-actor ${selected === actor.slotId ? "selected" : ""}`} style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, zIndex: actor.depth, transform: `translate(${-pose.pivotX / pose.width * 100}%, ${-pose.pivotY / pose.height * 100}%)` }} aria-label={`Select Slot ${SLOT_LABEL[actor.slotId]}, ${findCharacter(actor.characterId)?.label}`} onPointerDown={event => startDrag(event, actor)} onPointerMove={event => updateDrag(event, actor)} onPointerUp={() => { drag.current = null; }}>
                <img src={pose.file} alt="" draggable={false}/><span>{SLOT_LABEL[actor.slotId]}</span>
              </button>;
            })}
            <div className="canvas-status"><span>APT_305_QUICK_SCENE</span><b>{scene.actors.filter(a => a.visible && a.characterId).length} ACTORS · {scene.view.toUpperCase()}</b></div>
          </div>
          <div className="quick-actions"><button onClick={randomizePoses}>Randomize Poses</button><button onClick={randomizeBlocking}>Randomize Blocking</button><button onClick={randomizeScene}>Randomize Scene</button><button onClick={() => { setScene(createDefaultScene()); setNotice("Acceptance fixture restored"); }}>Reset Scene</button></div>
          <p className="scene-notice" role="status">{notice}</p>
        </div>

        <aside className="scene-sidebar actor-panel">
          <div className="panel-heading"><div><p className="panel-label">CAST</p><h2>Actor slots</h2></div><span>{scene.actors.filter(a => a.characterId).length} / 3</span></div>
          {scene.actors.map(actor => {
            const character = findCharacter(actor.characterId); const actorPoses = character?.representations[scene.view] ?? [];
            return <article className={`slot-card ${selected === actor.slotId ? "selected" : ""}`} key={actor.slotId}>
              <header><button className="slot-select" onClick={() => setSelected(actor.slotId)}>SLOT {SLOT_LABEL[actor.slotId]}</button><label className="visible-toggle"><input type="checkbox" checked={actor.visible} onChange={event => setActor(actor.slotId, { visible: event.target.checked })}/> Visible</label></header>
              <div className="slot-fields">
                <label>Character<select value={actor.characterId ?? ""} onChange={event => chooseCharacter(actor, event.target.value)}><option value="">Empty</option>{assetManifest.characters.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label>Pose<select value={actor.poseId ?? ""} disabled={!character} onChange={event => setActor(actor.slotId, { poseId: event.target.value })}>{actorPoses.map(pose => <option key={pose.id} value={pose.id}>{pose.label}</option>)}</select></label>
                <label>Position<select value={actor.zoneId} onChange={event => { const placement = findZone(event.target.value)?.views[scene.view]; setActor(actor.slotId, { zoneId: event.target.value, offsetX: 0, offsetY: 0, depth: placement?.defaultDepth ?? actor.depth }); }}>{zones.filter(zone => zone.views[scene.view]).map(zone => <option value={zone.id} key={zone.id}>{zone.label}</option>)}</select></label>
              </div>
              <footer><button onClick={() => moveDepth(actor, -10)}>Move Back</button><button onClick={() => resetActorPosition(actor)}>Reset Position</button><button onClick={() => moveDepth(actor, 10)}>Move Front</button></footer>
              <small className="depth-readout">Depth {actor.depth} · Offset {actor.offsetX}, {actor.offsetY}{findPose(actor.characterId, scene.view, actor.poseId)?.phoneIncluded ? " · Phone included" : ""}</small>
            </article>;
          })}
        </aside>
      </section>
    </main>
  );
}
