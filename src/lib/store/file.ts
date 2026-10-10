import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { seedMenu } from "../seed";
import type { Dish, MenuData, Settings } from "../types";
import type { Store } from "./types";

/**
 * JSON file store for local development and demos.
 * Data lives in data/store.json (created from the seed on the first change); uploads go to public/uploads.
 * On read-only hosts such as Vercel it serves the seed and refuses writes — use Supabase there.
 */
export class FileStore implements Store {
  readonly kind = "file" as const;
  readonly writable = !process.env.VERCEL;
  private readonly file = path.join(process.cwd(), "data", "store.json");
  private readonly uploads = path.join(process.cwd(), "public", "uploads");
  private queue: Promise<unknown> = Promise.resolve();

  /** Reading never writes: until the first change the seed is served from memory. */
  async getMenu(): Promise<MenuData> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as MenuData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return seedMenu();
    }
  }

  saveDish(dish: Dish): Promise<void> {
    return this.update((menu) => {
      const i = menu.dishes.findIndex((d) => d.id === dish.id);
      if (i === -1) menu.dishes.push(dish);
      else menu.dishes[i] = dish;
    });
  }

  deleteDish(id: string): Promise<void> {
    return this.update((menu) => {
      menu.dishes = menu.dishes.filter((d) => d.id !== id);
    });
  }

  saveSettings(settings: Settings): Promise<void> {
    return this.update((menu) => {
      menu.settings = settings;
    });
  }

  async uploadPhoto(dishId: string, webp: Buffer): Promise<string> {
    this.assertWritable();
    await fs.mkdir(this.uploads, { recursive: true });
    const name = `${dishId}-${Date.now()}.webp`;
    await fs.writeFile(path.join(this.uploads, name), webp);
    return `/uploads/${name}`;
  }

  /** Serialises read-modify-write cycles so parallel saves don't lose changes. */
  private update(change: (menu: MenuData) => void): Promise<void> {
    this.assertWritable();
    const run = this.queue.then(async () => {
      const menu = await this.getMenu();
      change(menu);
      await this.write(menu);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async write(menu: MenuData): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(menu, null, 2));
    await fs.rename(tmp, this.file);
  }

  private assertWritable(): void {
    if (!this.writable) {
      throw new Error("Хранилище только для чтения: подключите Supabase (см. docs/DEPLOY.md).");
    }
  }
}
