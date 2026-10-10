import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Category, Dish, MenuData, Settings } from "../types";
import type { Store } from "./types";

const BUCKET = "photos";

/**
 * Supabase store: three tables with a JSONB payload each (see supabase/schema.sql)
 * and a public Storage bucket for photos. Uses the service-role key, so it must only run on the server.
 */
export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  readonly writable = true;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getMenu(): Promise<MenuData> {
    const [cats, dishes, settings] = await Promise.all([
      this.db.from("categories").select("data").order("sort"),
      this.db.from("dishes").select("data").order("sort"),
      this.db.from("settings").select("data").eq("id", 1).maybeSingle(),
    ]);
    for (const r of [cats, dishes, settings]) if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    if (!settings.data) throw new Error("Supabase: таблицы пустые — выполните npm run seed:supabase");
    return {
      categories: (cats.data ?? []).map((r) => r.data as Category),
      dishes: (dishes.data ?? []).map((r) => r.data as Dish),
      settings: settings.data.data as Settings,
    };
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

  async uploadPhoto(dishId: string, webp: Buffer): Promise<string> {
    const key = `${dishId}-${Date.now()}.webp`;
    const { error } = await this.db.storage
      .from(BUCKET)
      .upload(key, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Supabase Storage: ${error.message}`);
    return this.db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }
}
