import { requireAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The whole menu as a JSON file: the free Supabase plan has no downloadable backups. */
export async function GET() {
  await requireAdmin();
  const menu = await getMenu();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...menu }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="khushbakhti-menu-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
