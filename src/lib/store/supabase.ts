import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProcessedPhoto } from "../images";
import { seedMenu } from "../seed";
import type { Category, Dish, MenuData, Settings } from "../types";
import type { Store } from "./types";

const BUCKET = "photos";

/**
 * Supabase store: three tables with a JSONB payload each (see supabase/schema.sql)
 * and a public Storage bucket for photos. Uses the secret (service-role) key, so it must only run on the server.
 * An empty database is filled with the built-in menu on first read.
 */
export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  readonly writable = true;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getMenu(seeded = false): Promise<MenuData> {
    const [cats, dishes, settings] = await Promise.all([
      this.db.from("categories").select("data").order("sort"),
      this.db.from("dishes").select("data").order("sort"),
      this.db.from("settings").select("data").eq("id", 1).maybeSingle(),
    ]);
    for (const r of [cats, dishes, settings]) if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    if (!settings.data) {
      if (seeded) throw new Error("Supabase: не удалось заполнить таблицы начальным меню");
      await this.seed();
      return this.getMenu(true);
    }
    return {
      categories: (cats.data ?? []).map((r) => r.data as Category),
      dishes: (dishes.data ?? []).map((r) => r.data as Dish),
      settings: settings.data.data as Settings,
    };
  }

  /**
   * First run: insert the built-in menu. ON CONFLICT DO NOTHING makes parallel first requests harmless,
   * and settings go last so a half-finished seed is simply repeated.
   */
  private async seed(): Promise<void> {
    const menu = seedMenu();
    const now = new Date().toISOString();
    const insert = (table: string, rows: object[]) =>
      this.db.from(table).upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    for (const r of await Promise.all([
      insert("categories", menu.categories.map((c) => ({ id: c.id, sort: c.sort, data: c }))),
      insert("dishes", menu.dishes.map((d) => ({ id: d.id, sort: d.sort, data: d, updated_at: now }))),
    ])) if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    const r = await insert("settings", [{ id: 1, data: menu.settings }]);
    if (r.error) throw new Error(`Supabase: ${r.error.message}`);
  }

  async saveDish(dish: Dish): Promise<void> {
    const { error } = await this.db
      .from("dishes")
      .upsert({ id: dish.id, sort: dish.sort, data: dish, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Supabase: ${error.message}`);
  }

  async deleteDish(id: string): Promise<void> {
    const { error } = await this.db.from("dishes").delete().eq("id", id);
    if (error) throw new Error(`Supabase: ${error.message}`);
  }

  async saveSettings(settings: Settings): Promise<void> {
    const { error } = await this.db.from("settings").upsert({ id: 1, data: settings });
    if (error) throw new Error(`Supabase: ${error.message}`);
  }

  async uploadPhoto(dishId: string, photo: ProcessedPhoto): Promise<string> {
    const key = `${dishId}-${Date.now()}.${photo.ext}`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(key, photo.data, { contentType: photo.contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Supabase Storage: ${error.message}`);
    return this.db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }
}
