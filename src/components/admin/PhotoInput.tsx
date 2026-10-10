"use client";

import { useEffect, useState } from "react";

const MAX_SIDE = 1600;
const KEEP_BELOW_BYTES = 1.5 * 1024 * 1024;
/** Hosts reject requests above ~4.5 MB; a file we could not shrink must stay below that. */
const MAX_UNSHRUNK_BYTES = 4 * 1024 * 1024;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;

/**
 * Shrinks a phone photo in the browser before the form is sent: free hosts cap a request at 4.5–6 MB,
 * while phone cameras produce 3–10 MB. Drawing through <img> keeps the EXIF rotation.
 * If the browser cannot decode the file, the original is sent and the server reports any problem.
 */
async function shrink(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size <= KEEP_BELOW_BYTES) return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`, { type: "image/jpeg" }) : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoInput({ label, className }: { label: React.ReactNode; className?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    setNote(null);
    setPreview(null);
    if (!original) return;
    setBusy(true);
    // Blocks «Сохранить» until the shrunk file is in place, so the original never gets sent by accident.
    input.setCustomValidity("Подождите, фото готовится…");
    try {
      const small = await shrink(original);
      if (small) {
        const dt = new DataTransfer();
        dt.items.add(small);
        input.files = dt.files;
        setNote(`Фото уменьшено: ${mb(original.size)} → ${mb(small.size)}`);
      }
    } catch {
      if (original.size > MAX_UNSHRUNK_BYTES) {
        input.value = "";
        setNote(`Это фото (${mb(original.size)}) не открывается в браузере и слишком большое для загрузки. Выберите другое фото или снимите заново.`);
        return;
      }
    } finally {
      input.setCustomValidity("");
      setBusy(false);
    }
    const chosen = input.files?.[0];
    if (chosen) setPreview(URL.createObjectURL(chosen));
  }

  return (
    <>
      <label htmlFor="photo" className="font-bold">{label}</label>
      <input id="photo" name="photo" type="file" accept="image/*" onChange={onChange} className={className} />
      {busy ? <span role="status" className="text-[14px]">Готовлю фото…</span> : null}
      {preview ? (
        // A local blob preview: next/image cannot optimise it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Новое фото" className="size-28 border-[3px] border-turq object-cover" />
      ) : null}
      {note ? <span role="status" className="text-[14px]">{note}</span> : null}
    </>
  );
}
