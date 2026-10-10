import "server-only";
import { supabaseEnv } from "../env";
import { FileStore } from "./file";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

let store: Store | undefined;

/** Supabase when its env vars are set, otherwise the local JSON file. */
export function getStore(): Store {
  if (!store) {
    const supabase = supabaseEnv();
    store = supabase ? new SupabaseStore(supabase.url, supabase.key) : new FileStore();
  }
  return store;
}

export async function getMenu() {
  const menu = await getStore().getMenu();
  return {
    ...menu,
    categories: [...menu.categories].sort((a, b) => a.sort - b.sort),
    dishes: [...menu.dishes].sort((a, b) => a.sort - b.sort),
  };
}

export type { Store } from "./types";
