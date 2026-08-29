"use client";

/* eslint-disable @next/next/no-img-element -- registered Marcus PNG crops must bypass image optimization */

import { useEffect, useMemo, useRef, useState } from "react";
import { marcusAssetManifest, marcusAssets, findMarcusAsset } from "./assets/manifest";
import { cloneLayers, createDefaultLibrary, createSourceVisibleLayers } from "./model/defaults";
import {
  addAssetLayer,
  createGroup,
  deleteEmptyGroup,
  deletePreset,
  duplicatePreset,
  groupLabel,
  loadPreset,
  moveLayer,
  movePresetToGroup,
  removeLayer,
  renameGroup,
  renamePreset,
  reorderLayer,
  replaceAssetInSlot,
  saveNewPreset,
  updateLayer,
  updatePreset,
} from "./model/library";
import type { ExpressionLayer, ExpressionLibraryExport, MarcusSlotId } from "./model/types";
import { downloadExpressionLibrary, readExpressionLibraryFile } from "./persistence/libraryFiles";
import { loadLibraryFromStorage, saveLibraryToStorage } from "./persistence/storage";
import { exportExpressionPng, renderExpressionToCanvas } from "./rendering/compositor";

const INITIAL_PRESET_ID = "suspicious-02";

function initialPresetLayers(): ExpressionLayer[] {
  return loadPreset(createDefaultLibrary(), INITIAL_PRESET_ID).layers;
}

function NumberControl({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="transform-control">
      <span>{label}</span>
      <div>
        <button type="button" disabled={disabled} onClick={() => onChange(Number((value - step).toFixed(3)))} aria-label={`Decrease ${label}`}>−</button>
        <input type="number" value={value} step={step} disabled={disabled} onChange={event => onChange(Number(event.target.value))}/>
        <button type="button" disabled={disabled} onClick={() => onChange(Number((value + step).toFixed(3)))} aria-label={`Increase ${label}`}>+</button>
      </div>
    </label>
  );
}

export default function ExpressionMakerApp() {
  const [library, setLibrary] = useState<ExpressionLibraryExport>(() => createDefaultLibrary());
  const [layers, setLayers] = useState<ExpressionLayer[]>(initialPresetLayers);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(INITIAL_PRESET_ID);
  const [presetName, setPresetName] = useState("Suspicious 02");
  const [presetGroupId, setPresetGroupId] = useState<string | null>("suspicious");
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>("acceptance-lower-face");
  const [assetSearch, setAssetSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState<"ALL" | MarcusSlotId>("ALL");
  const [browseGroupId, setBrowseGroupId] = useState("ALL");
  const [manageGroupId, setManageGroupId] = useState("suspicious");
  const [groupDraft, setGroupDraft] = useState("Suspicious");
  const [notice, setNotice] = useState("Marcus acceptance fixture loaded. Layer order is stored per expression.");
  const [renderIssues, setRenderIssues] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggedLayerId = useRef<string | null>(null);
  const pointerDraggedLayerId = useRef<string | null>(null);
  const pointerTargetIndex = useRef<number | null>(null);
  const renderCycle = useRef(0);

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId) ?? null;
  const selectedAsset = findMarcusAsset(selectedLayer?.assetId);
  const filteredAssets = useMemo(() => {
    const search = assetSearch.trim().toLowerCase();
    return marcusAssets.filter(asset => {
      const inSlot = slotFilter === "ALL" || asset.slotId === slotFilter;
      const matches = !search || `${asset.label} ${asset.id} ${asset.canonicalSemanticState ?? ""}`.toLowerCase().includes(search);
      return inSlot && matches;
    });
  }, [assetSearch, slotFilter]);
  const browsedPresets = useMemo(() => library.presets.filter(preset => {
    if (browseGroupId === "ALL") return true;
    if (browseGroupId === "UNGROUPED") return preset.groupId === null;
    return preset.groupId === browseGroupId;
  }), [browseGroupId, library.presets]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let loaded: ReturnType<typeof loadLibraryFromStorage>;
      try {
        loaded = loadLibraryFromStorage(window.localStorage);
      } catch (error) {
        loaded = {
          library: createDefaultLibrary(),
          warnings: [`Browser storage was not loaded: ${error instanceof Error ? error.message : "unavailable"}`],
        };
      }
      setLibrary(loaded.library);
      setBrowseGroupId("ALL");
      const firstGroup = loaded.library.groups[0];
      setManageGroupId(firstGroup?.id ?? "");
      setGroupDraft(firstGroup?.name ?? "");
      const preset = loaded.library.presets.find(candidate => candidate.id === INITIAL_PRESET_ID) ?? loaded.library.presets[0];
      if (preset) {
        setLayers(cloneLayers(preset.layers));
        setCurrentPresetId(preset.id);
        setPresetName(preset.name);
        setPresetGroupId(preset.groupId);
        setSelectedLayerId([...preset.layers].reverse().find(layer => !layer.locked)?.id ?? preset.layers.at(-1)?.id ?? null);
      } else {
        const sourceLayers = createSourceVisibleLayers();
        setLayers(sourceLayers);
        setCurrentPresetId(null);
        setPresetName("Untitled Expression");
        setPresetGroupId(null);
        setSelectedLayerId(sourceLayers.at(-1)?.id ?? null);
      }
      if (loaded.warnings.length) setNotice(loaded.warnings.join(" "));
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    try {
      saveLibraryToStorage(window.localStorage, library);
    } catch {
      queueMicrotask(() => {
        if (active) setNotice("Browser storage is unavailable. Export Library JSON to keep your expressions.");
      });
    }
    return () => { active = false; };
  }, [hydrated, library]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cycle = ++renderCycle.current;
    void renderExpressionToCanvas(canvas, layers, () => renderCycle.current === cycle).then(result => {
      if (renderCycle.current !== cycle || !result.committed) return;
      const issues = [
        ...result.missingAssetIds.map(id => `Missing reference: ${id}`),
        ...result.failedAssets.map(failure => `Load failed: ${failure.assetId} (${failure.path})`),
      ];
      setRenderIssues(issues);
    }).catch(error => {
      if (renderCycle.current === cycle) setRenderIssues([error instanceof Error ? error.message : "Preview failed"]);
    });
  }, [layers]);

  const reportError = (error: unknown) => setNotice(error instanceof Error ? error.message : "That action could not be completed");

  const applyAsset = (assetId: string, add: boolean) => {
    try {
      if (add) {
        const next = addAssetLayer(layers, assetId);
        setLayers(next);
        setSelectedLayerId(next.at(-1)!.id);
        setNotice("Asset added as a new layer");
      } else {
        const next = replaceAssetInSlot(layers, assetId);
        setLayers(next.layers);
        setSelectedLayerId(next.selectedId);
        setNotice("Slot asset replaced; registration preserved");
      }
    } catch (error) { reportError(error); }
  };

  const patchSelected = (patch: Partial<Omit<ExpressionLayer, "id" | "assetId">>) => {
    if (!selectedLayerId) return;
    setLayers(current => updateLayer(current, selectedLayerId, patch));
  };

  const openExpression = (presetId: string, source = library) => {
    try {
      const preset = loadPreset(source, presetId);
      setCurrentPresetId(preset.id);
      setPresetName(preset.name);
      setPresetGroupId(preset.groupId);
      setLayers(preset.layers);
      setSelectedLayerId([...preset.layers].reverse().find(layer => !layer.locked)?.id ?? preset.layers.at(-1)?.id ?? null);
      setNotice(`${preset.name} opened with its saved layer order`);
    } catch (error) { reportError(error); }
  };

  const saveNew = () => {
    try {
      const result = saveNewPreset(library, presetName, presetGroupId, layers);
      setLibrary(result.library);
      setCurrentPresetId(result.preset.id);
      setPresetName(result.preset.name);
      setNotice(`${result.preset.name} saved as a new expression`);
    } catch (error) { reportError(error); }
  };

  const updateCurrent = () => {
    if (!currentPresetId) return setNotice("Use Save New before updating this expression");
    try {
      setLibrary(updatePreset(library, currentPresetId, layers, presetGroupId));
      setNotice(`${presetName} updated with the current ordered stack`);
    } catch (error) { reportError(error); }
  };

  const duplicateCurrent = () => {
    if (!currentPresetId) return setNotice("Open or save an expression before duplicating it");
    try {
      const result = duplicatePreset(library, currentPresetId, {
        name: presetName,
        groupId: presetGroupId,
        layers,
      });
      setLibrary(result.library);
      setCurrentPresetId(result.preset.id);
      setPresetName(result.preset.name);
      setPresetGroupId(result.preset.groupId);
      setLayers(result.preset.layers);
      setNotice("Independent duplicate created");
    } catch (error) { reportError(error); }
  };

  const renameCurrent = () => {
    if (!currentPresetId) return setNotice("Open or save an expression before renaming it");
    try {
      setLibrary(renamePreset(library, currentPresetId, presetName));
      setNotice("Expression renamed");
    } catch (error) { reportError(error); }
  };

  const deleteCurrent = () => {
    if (!currentPresetId) return;
    const next = deletePreset(library, currentPresetId);
    setLibrary(next);
    const fallback = next.presets[0];
    if (fallback) openExpression(fallback.id, next);
    else {
      setCurrentPresetId(null);
      setPresetName("Untitled Expression");
      setNotice("Expression deleted; working layers were kept");
    }
  };

  const createNewGroup = () => {
    try {
      const next = createGroup(library, groupDraft);
      const group = next.groups.at(-1)!;
      setLibrary(next);
      setManageGroupId(group.id);
      setPresetGroupId(group.id);
      setBrowseGroupId(group.id);
      setGroupDraft(group.name);
      setNotice(`${group.name} group created`);
    } catch (error) { reportError(error); }
  };

  const renameSelectedGroup = () => {
    if (!manageGroupId) return;
    try {
      setLibrary(renameGroup(library, manageGroupId, groupDraft));
      setNotice("Group renamed");
    } catch (error) { reportError(error); }
  };

  const deleteSelectedGroup = () => {
    if (!manageGroupId) return;
    try {
      const deletedGroupId = manageGroupId;
      const next = deleteEmptyGroup(library, deletedGroupId);
      setLibrary(next);
      const fallback = next.groups[0];
      setManageGroupId(fallback?.id ?? "");
      setGroupDraft(fallback?.name ?? "");
      if (presetGroupId === deletedGroupId) setPresetGroupId(null);
      if (browseGroupId === deletedGroupId) setBrowseGroupId("ALL");
      setNotice("Empty group deleted");
    } catch (error) { reportError(error); }
  };

  const moveCurrentToGroup = () => {
    if (!currentPresetId) return setNotice("Open an expression before moving it");
    try {
      setLibrary(movePresetToGroup(library, currentPresetId, presetGroupId));
      setNotice(`Expression moved to ${groupLabel(library.groups, presetGroupId)}`);
    } catch (error) { reportError(error); }
  };

  const importLibrary = async (file?: File) => {
    if (!file) return;
    try {
      const result = await readExpressionLibraryFile(file);
      setLibrary(result.library);
      setBrowseGroupId("ALL");
      const firstGroup = result.library.groups[0];
      setManageGroupId(firstGroup?.id ?? "");
      setGroupDraft(firstGroup?.name ?? "");
      const first = result.library.presets[0];
      if (first) {
        openExpression(first.id, result.library);
      } else {
        const sourceLayers = createSourceVisibleLayers();
        setLayers(sourceLayers);
        setCurrentPresetId(null);
        setPresetName("Untitled Expression");
        setPresetGroupId(null);
        setSelectedLayerId(sourceLayers.at(-1)?.id ?? null);
      }
      setNotice(result.warnings.length ? `Library imported. ${result.warnings.join(" ")}` : "Expression library imported");
    } catch (error) {
      reportError(error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportPng = async () => {
    try {
      const result = await exportExpressionPng(layers, groupLabel(library.groups, presetGroupId), presetName);
      const issueCount = result.missingAssetIds.length + result.failedAssets.length;
      setNotice(issueCount ? `PNG exported with ${issueCount} unresolved layer warning(s)` : "Transparent Marcus PNG exported");
    } catch (error) { reportError(error); }
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, select, textarea, button, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        updateCurrent();
        return;
      }
      if (!selectedLayerId) return;
      if (event.key === "Delete") {
        event.preventDefault();
        setLayers(current => removeLayer(current, selectedLayerId));
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
      const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
      setLayers(current => {
        const layer = current.find(candidate => candidate.id === selectedLayerId);
        return layer ? updateLayer(current, selectedLayerId, { x: layer.x + dx, y: layer.y + dy }) : cloneLayers(current);
      });
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!pointerDraggedLayerId.current) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-layer-source-index]");
      const targetIndex = Number(target?.dataset.layerSourceIndex);
      if (Number.isInteger(targetIndex)) pointerTargetIndex.current = targetIndex;
    };
    const handleMouseUp = () => {
      const draggedId = pointerDraggedLayerId.current;
      const targetIndex = pointerTargetIndex.current;
      pointerDraggedLayerId.current = null;
      pointerTargetIndex.current = null;
      if (draggedId && targetIndex !== null) setLayers(current => reorderLayer(current, draggedId, targetIndex));
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <main className="expression-maker">
      <header className="expression-header">
        <div className="expression-brand"><span className="expression-kicker">TRAPSTAR / MARCUS / AUTHORING TOOL</span><h1>Expression Maker <i>v0.1</i></h1><p>Build a reproducible face from the registered 62-layer Marcus library.</p></div>
        <div className="expression-source"><span>CANONICAL FACE</span><strong>1187 × 1484</strong><small>PRESET ORDER · BACK → FRONT</small></div>
        <div className="expression-actions">
          <input ref={fileInputRef} className="expression-file-input" type="file" accept="application/json,.json" onChange={event => void importLibrary(event.target.files?.[0])}/>
          <button onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <button onClick={() => downloadExpressionLibrary(library)}>Export Library</button>
          <button className="primary" onClick={() => void exportPng()}>Export PNG</button>
        </div>
      </header>

      <section className="expression-workspace">
        <aside className="expression-panel asset-panel">
          <div className="panel-heading"><div><span>01 / ASSET LIBRARY</span><h2>Marcus parts</h2></div><b>{filteredAssets.length}</b></div>
          <div className="asset-filters">
            <input type="search" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Search 62 assets…" aria-label="Search Marcus assets"/>
            <select value={slotFilter} onChange={event => setSlotFilter(event.target.value as "ALL" | MarcusSlotId)} aria-label="Filter assets by slot">
              <option value="ALL">All slots</option>
              {marcusAssetManifest.slots.map(slot => <option value={slot.id} key={slot.id}>{slot.label} · {slot.assetCount}</option>)}
            </select>
          </div>
          <div className="asset-list">
            {filteredAssets.map(asset => <article className="asset-card" key={asset.id}>
              <button className="asset-thumb" onClick={() => applyAsset(asset.id, false)} aria-label={`Use ${asset.label}`}><img src={asset.src} alt="" draggable={false}/></button>
              <div><span>{asset.slotId}</span><strong>{asset.label}</strong><small>{asset.anatomicalSide ? `Anatomical ${asset.anatomicalSide.toLowerCase()}` : asset.mask ? "Registered macro + mask" : "Registered crop"}</small></div>
              <div className="asset-card-actions"><button onClick={() => applyAsset(asset.id, false)}>Use</button><button onClick={() => applyAsset(asset.id, true)} aria-label={`Add ${asset.label} as another layer`}>＋</button></div>
            </article>)}
          </div>
        </aside>

        <section className="expression-preview-column">
          <div className="expression-panel preview-panel">
            <div className="panel-heading"><div><span>02 / LIVE COMPOSITE</span><h2>{presetName || "Untitled Expression"}</h2></div><b>{layers.filter(layer => layer.visible).length} VISIBLE</b></div>
            <div className="face-stage"><canvas ref={canvasRef} aria-label="Live Marcus expression preview" tabIndex={0} width={marcusAssetManifest.canonicalFaceSpace.width} height={marcusAssetManifest.canonicalFaceSpace.height}/><div className="face-stage-meta"><span>MARCUS_FACE_SPACE</span><b>{selectedAsset?.slotId ?? "NO SELECTION"}</b></div></div>
            {renderIssues.length > 0 && <div className="render-warning" role="alert">{renderIssues.join(" · ")}</div>}
          </div>

          <div className="expression-panel transform-panel">
            <div className="panel-heading compact"><div><span>SELECTED LAYER</span><h2>{selectedAsset?.label ?? selectedLayer?.assetId ?? "Choose a layer"}</h2></div><button disabled={!selectedLayer || selectedLayer.locked} onClick={() => selectedLayerId && patchSelected({ x: 0, y: 0, scale: 1, rotation: 0 })}>Reset transform</button></div>
            <div className="transform-grid">
              <NumberControl label="X offset" value={selectedLayer?.x ?? 0} step={1} disabled={!selectedLayer || selectedLayer.locked} onChange={value => patchSelected({ x: value })}/>
              <NumberControl label="Y offset" value={selectedLayer?.y ?? 0} step={1} disabled={!selectedLayer || selectedLayer.locked} onChange={value => patchSelected({ y: value })}/>
              <NumberControl label="Scale" value={selectedLayer?.scale ?? 1} step={0.01} disabled={!selectedLayer || selectedLayer.locked} onChange={value => patchSelected({ scale: value })}/>
              <NumberControl label="Rotation" value={selectedLayer?.rotation ?? 0} step={1} disabled={!selectedLayer || selectedLayer.locked} onChange={value => patchSelected({ rotation: value })}/>
            </div>
            <p className="shortcut-hint">Arrow keys nudge · Shift + Arrow nudges 10px · Delete removes unlocked layer · Ctrl/Cmd + S updates</p>
          </div>
        </section>

        <aside className="expression-panel layer-panel">
          <div className="panel-heading"><div><span>03 / LAYER STACK</span><h2>Front to back</h2></div><b>{layers.length}</b></div>
          <p className="stack-rule">Drag unlocked rows. The saved array—not the slot—owns render order.</p>
          <div className="layer-stack">
            {[...layers].map((layer, sourceIndex) => ({ layer, sourceIndex })).reverse().map(({ layer, sourceIndex }) => {
              const asset = findMarcusAsset(layer.assetId);
              const selected = layer.id === selectedLayerId;
              return <article
                className={`layer-row ${selected ? "selected" : ""} ${!asset ? "missing" : ""}`}
                key={layer.id}
                data-layer-source-index={sourceIndex}
                onDragOver={event => { if (draggedLayerId.current) event.preventDefault(); }}
                onDrop={event => { event.preventDefault(); if (draggedLayerId.current) setLayers(current => reorderLayer(current, draggedLayerId.current!, sourceIndex)); draggedLayerId.current = null; }}
              >
                <button
                  type="button"
                  className="drag-handle"
                  aria-label={`Drag ${asset?.label ?? layer.assetId}`}
                  disabled={layer.locked}
                  draggable={!layer.locked}
                  onDragStart={event => { draggedLayerId.current = layer.id; event.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { draggedLayerId.current = null; }}
                  onMouseDown={event => {
                    if (layer.locked) return;
                    event.preventDefault();
                    event.stopPropagation();
                    pointerDraggedLayerId.current = layer.id;
                    pointerTargetIndex.current = sourceIndex;
                    setSelectedLayerId(layer.id);
                  }}
                >⋮⋮</button>
                <span className="layer-thumb">{asset ? <img src={asset.src} alt="" draggable={false}/> : "!"}</span>
                <button type="button" className="layer-copy" onClick={() => setSelectedLayerId(layer.id)}><strong>{asset?.label ?? layer.assetId}</strong><small>{asset?.slotId ?? "MISSING ASSET"}</small></button>
                <div className="layer-toggles">
                  <label title="Show or hide"><input type="checkbox" checked={layer.visible} onChange={event => { event.stopPropagation(); setLayers(current => updateLayer(current, layer.id, { visible: event.target.checked })); }}/><span>◉</span></label>
                  <button className={layer.locked ? "active" : ""} onClick={event => { event.stopPropagation(); setLayers(current => updateLayer(current, layer.id, { locked: !layer.locked })); }} title={layer.locked ? "Unlock layer" : "Lock layer"}>{layer.locked ? "▣" : "□"}</button>
                </div>
                <div className="layer-order-actions">
                  <button disabled={layer.locked} onClick={event => { event.stopPropagation(); setLayers(current => moveLayer(current, layer.id, "FRONT")); }} title="Move to front">⇈</button>
                  <button disabled={layer.locked} onClick={event => { event.stopPropagation(); setLayers(current => moveLayer(current, layer.id, "UP")); }} title="Move up">↑</button>
                  <button disabled={layer.locked} onClick={event => { event.stopPropagation(); setLayers(current => moveLayer(current, layer.id, "DOWN")); }} title="Move down">↓</button>
                  <button disabled={layer.locked} onClick={event => { event.stopPropagation(); setLayers(current => moveLayer(current, layer.id, "BACK")); }} title="Move to back">⇊</button>
                  <button disabled={layer.locked} onClick={event => { event.stopPropagation(); setLayers(current => removeLayer(current, layer.id)); }} title="Remove layer">×</button>
                </div>
              </article>;
            })}
          </div>
          <button className="reset-source" onClick={() => { const source = createSourceVisibleLayers(); setLayers(source); setSelectedLayerId(source.at(-1)?.id ?? null); setCurrentPresetId(null); setPresetName("Untitled Expression"); setPresetGroupId(null); setNotice("Source-visible Marcus composition restored"); }}>Reset to PXZ visible state</button>
        </aside>
      </section>

      <section className="expression-panel library-panel">
        <div className="save-strip">
          <div><span>04 / EXPRESSION PRESET</span><input value={presetName} onChange={event => setPresetName(event.target.value)} aria-label="Expression name"/></div>
          <label><span>GROUP</span><select value={presetGroupId ?? ""} onChange={event => setPresetGroupId(event.target.value || null)}><option value="">Ungrouped</option>{library.groups.map(group => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
          <div className="save-actions"><button className="primary" onClick={saveNew}>Save New</button><button onClick={updateCurrent} disabled={!currentPresetId}>Update</button><button onClick={duplicateCurrent} disabled={!currentPresetId}>Duplicate</button><button onClick={renameCurrent} disabled={!currentPresetId}>Rename</button><button onClick={moveCurrentToGroup} disabled={!currentPresetId}>Move Here</button><button className="danger" onClick={deleteCurrent} disabled={!currentPresetId}>Delete</button></div>
        </div>

        <div className="library-browser">
          <div className="group-manager">
            <div className="panel-heading compact"><div><span>GROUPS</span><h2>Organize</h2></div><b>{library.groups.length}</b></div>
            <select value={manageGroupId} onChange={event => { const id = event.target.value; setManageGroupId(id); setGroupDraft(library.groups.find(group => group.id === id)?.name ?? ""); }}><option value="">Select group</option>{library.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
            <input value={groupDraft} onChange={event => setGroupDraft(event.target.value)} placeholder="Custom group name" aria-label="Group name"/>
            <div><button className="primary" onClick={createNewGroup}>Create</button><button onClick={renameSelectedGroup} disabled={!manageGroupId}>Rename</button><button onClick={deleteSelectedGroup} disabled={!manageGroupId}>Delete empty</button></div>
          </div>

          <div className="preset-browser">
            <div className="preset-browser-heading"><div><span>SAVED EXPRESSIONS</span><h2>Open and edit</h2></div><select value={browseGroupId} onChange={event => setBrowseGroupId(event.target.value)}><option value="ALL">All groups</option><option value="UNGROUPED">Ungrouped</option>{library.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
            <div className="preset-list">{browsedPresets.length ? browsedPresets.map(preset => <button className={preset.id === currentPresetId ? "active" : ""} key={preset.id} onClick={() => openExpression(preset.id)}><span>{groupLabel(library.groups, preset.groupId)}</span><strong>{preset.name}</strong><small>{preset.layers.length} layers · updated {new Date(preset.updatedAt).toLocaleDateString()}</small></button>) : <p>No saved expressions in this group.</p>}</div>
          </div>
        </div>
      </section>

      <footer className="expression-footer"><p role="status">{notice}</p><p>Marcus-only identity-bound art · 62 preserved source assets · local browser persistence</p></footer>
    </main>
  );
}
