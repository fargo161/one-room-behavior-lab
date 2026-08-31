/**
 * Compatibility exports for the original Marcus-only module path.
 * New application code resolves assets through character-packs/registry.
 */
export {
  assetsForMarcusSlot as assetsForSlot,
  findMarcusAsset,
  marcusAssetManifest,
  marcusAssets,
  marcusAssetsById,
} from "../character-packs/marcus";
