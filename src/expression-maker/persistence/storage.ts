import { createDefaultLibrary } from "../model/defaults";
import type { ExpressionLibraryExport } from "../model/types";
import { parseExpressionLibraryJson, serializeExpressionLibrary } from "../model/validation";

export const EXPRESSION_LIBRARY_STORAGE_KEY = "trapstar-expression-maker:marcus:library:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadLibraryFromStorage(storage: StorageLike): { library: ExpressionLibraryExport; warnings: string[] } {
  try {
    const stored = storage.getItem(EXPRESSION_LIBRARY_STORAGE_KEY);
    if (stored === null) return { library: createDefaultLibrary(), warnings: [] };
    return parseExpressionLibraryJson(stored);
  } catch (error) {
    return {
      library: createDefaultLibrary(),
      warnings: [`Stored library was not loaded: ${error instanceof Error ? error.message : "unknown error"}`],
    };
  }
}

export function saveLibraryToStorage(storage: StorageLike, library: ExpressionLibraryExport): void {
  storage.setItem(EXPRESSION_LIBRARY_STORAGE_KEY, serializeExpressionLibrary(library));
}
