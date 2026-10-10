// Static GitHub Pages build only: there is no image server, so images are served as is under the base path.
export default function pagesImageLoader({ src, width }: { src: string; width: number }): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${src.startsWith("/") ? base + src : src}?w=${width}`;
}
