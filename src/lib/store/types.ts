import type { Dish, MenuData, Settings } from "../types";

export interface Store {
  readonly kind: "file" | "supabase";
  /** False when changes cannot be saved (e.g. file store on a read-only host). */
  readonly writable: boolean;
  getMenu(): Promise<MenuData>;
  saveDish(dish: Dish): Promise<void>;
  deleteDish(id: string): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  /** Stores an already processed WebP image and returns its public URL. */
  uploadPhoto(dishId: string, webp: Buffer): Promise<string>;
}
