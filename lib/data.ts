import raw from "@/data/studios.json";
import type { StudioData } from "@/lib/types";

export const data = raw as StudioData;

export function getStudios() {
  return data.studios;
}

/** Today's date as YYYY-MM-DD (Singapore is UTC+8; server may be elsewhere, so keep simple). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
