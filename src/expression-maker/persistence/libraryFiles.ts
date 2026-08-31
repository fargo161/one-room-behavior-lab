import type { ExpressionLibraryExport } from "../model/types";
import { parseExpressionLibraryJson, serializeExpressionLibrary } from "../model/validation";

export function downloadExpressionLibrary(library: ExpressionLibraryExport): void {
  const blob = new Blob([serializeExpressionLibrary(library)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "trapstar-expression-library-v2.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function readExpressionLibraryFile(file: File): Promise<ReturnType<typeof parseExpressionLibraryJson>> {
  return parseExpressionLibraryJson(await file.text());
}
