import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

async function jpeg(width: number, height: number): Promise<File> {
  const data = await sharp({ create: { width, height, channels: 3, background: "#84241E" } }).jpeg().toBuffer();
  return new File([new Uint8Array(data)], "dish.jpg", { type: "image/jpeg" });
}

describe("processDishPhoto", () => {
  afterEach(() => {
    vi.doUnmock("sharp");
    vi.resetModules();
  });

  it("turns a photo into a 1200 px square WebP", async () => {
    const { processDishPhoto } = await import("./images");
    const out = await processDishPhoto(await jpeg(1600, 1200));
    expect(out.contentType).toBe("image/webp");
    const meta = await sharp(out.data).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 1200, 1200]);
  });

  it("stores the browser-shrunk photo unchanged when sharp cannot load", async () => {
    const file = await jpeg(800, 600);
    vi.doMock("sharp", () => {
      throw new Error("native module missing");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { processDishPhoto } = await import("./images");
    const out = await processDishPhoto(file);
    expect(out.contentType).toBe("image/jpeg");
    expect(out.ext).toBe("jpg");
    expect(out.data.equals(Buffer.from(await file.arrayBuffer()))).toBe(true);
  });

  it("rejects files that are not images", async () => {
    const { processDishPhoto } = await import("./images");
    await expect(processDishPhoto(new File(["hello"], "a.txt", { type: "text/plain" }))).rejects.toThrow("не изображение");
  });
});

describe("admin password rules", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("refuses a missing password in production and a short one anywhere", async () => {
    const { passwordProblem } = await import("./auth");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(passwordProblem()).toBe("missing");
    vi.stubEnv("ADMIN_PASSWORD", "plov2024");
    expect(passwordProblem()).toBe("short");
    vi.stubEnv("ADMIN_PASSWORD", "plov-kencha-shurpa");
    expect(passwordProblem()).toBeNull();
  });

  it("allows the built-in dev password only on a computer without the real database", async () => {
    const { adminPassword } = await import("./auth");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(adminPassword()).toBe("khushbakhti");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret");
    expect(adminPassword()).toBeNull();
  });
});
