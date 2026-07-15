import { loadJson, saveJson, fileExists } from "./io.js";
import { SCHEMA_VERSION } from "./paths.js";
import { extractOperator } from "../../utils/url.js";
import type { GameSlug, RegistryMeta, RegistryStore } from "./types.js";

export const meta: RegistryStore<RegistryMeta> = {
  load: (slug) => loadJson<RegistryMeta>(slug, "meta"),
  save: (slug, data) => saveJson(slug, "meta", data),
  exists: (slug) => fileExists(slug, "meta"),
};

export async function initMeta(
  slug: GameSlug,
  gameUrl: string,
  extra: Partial<Omit<RegistryMeta, "schemaVersion" | "createdAt" | "gameUrl">> = {},
): Promise<RegistryMeta> {
  const m: RegistryMeta = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    gameUrl,
    // Auto-derive the operator ("oc") so per-operator rule overrides can be
    // scoped without manual tagging. A caller may override via `extra`.
    operator: extractOperator(gameUrl),
    ...extra,
  };
  await meta.save(slug, m);
  return m;
}

/** Resolve a game's operator ("oc") code for rule scoping. Prefers the stored
 *  `_meta.json` value; for older metas written before the field existed, falls
 *  back to re-deriving from the persisted gameUrl. Null when unknown. */
export async function operatorForSlug(slug: GameSlug): Promise<string | null> {
  const m = await meta.load(slug).catch(() => null);
  if (!m) return null;
  return m.operator ?? extractOperator(m.gameUrl);
}

export async function touchValidated(slug: GameSlug): Promise<void> {
  const current = await meta.load(slug);
  if (!current) return;
  current.lastValidatedAt = new Date().toISOString();
  await meta.save(slug, current);
}
