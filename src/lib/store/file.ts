import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProcessedPhoto } from "../images";
import { DATA_DIR, UPLOADS_DIR } from "../data-dir";
import { seedMenu } from "../seed";
import type { Dish, MenuData, Settings } from "../types";
import type { Store } from "./types";

/**
 * JSON file store for local development and demos.
 * Data lives in data/store.json (created from the seed on the first change); uploads go to data/uploads
 * and are served by src/app/uploads/[file]/route.ts. Also the store for a self-hosted server (docs/DEPLOY-SERVER.md).
 * On serverless hosts (Netlify, Vercel) the disk is read-only or not shared between requests,
 * so there it serves the seed and refuses writes — use Supabase.
 */
export class FileStore implements Store {
  readonly kind = "file" as const;
  // NETLIFY is set while building, AWS_LAMBDA_FUNCTION_NAME inside Netlify (and other Lambda-based) functions.
  readonly writable = !(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  private readonly file = path.join(DATA_DIR, "store.json");
  private readonly uploads = UPLOADS_DIR;
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

  async uploadPhoto(dishId: string, photo: ProcessedPhoto): Promise<string> {
    this.assertWritable();
    await fs.mkdir(this.uploads, { recursive: true });
    const name = `${dishId}-${Date.now()}.${photo.ext}`;
    await fs.writeFile(path.join(this.uploads, name), photo.data);
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
