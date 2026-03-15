"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/admin";

const MAX_DIMENSION = 800;
const WEBP_QUALITY = 0.85;

/** Resize image (longest side ≤ MAX_DIMENSION) and convert to WebP. Returns null if not an image or on error. */
function resizeAndConvertToWebP(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/i, "").trim() || "image";
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        WEBP_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function ImageSamplesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMultiple = selectedCount > 1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setError("Selecione um ou mais ficheiros.");
      return;
    }
    const files = Array.from(input.files);
    const total = files.length;
    setLoading(true);
    setUploadProgress(total > 1 ? { current: 0, total } : null);
    const errors: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        if (total > 1) setUploadProgress({ current: i + 1, total });
        const file = files[i];
        const processed = await resizeAndConvertToWebP(file);
        const fileToUpload = processed ?? file;

        const formData = new FormData();
        formData.set("file", fileToUpload);
        if (total === 1 && name.trim()) formData.set("name", name.trim());

        const res = await fetch("/api/portal-admin/settings/image-samples/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data.error ?? res.statusText ?? "Erro ao carregar";
          errors.push(`${file.name}: ${msg}`);
        }
      }
      if (errors.length > 0) {
        setError(errors.length === 1 ? errors[0] : `${errors.length} falhas: ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "…" : ""}`);
      }
      setName("");
      input.value = "";
      setSelectedCount(0);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="image-sample-file" className="block text-sm font-medium text-slate-300 mb-1">
          Ficheiro(s) (JPG, PNG ou WebP, máx. 10 MB cada) — a app redimensiona e converte para WebP. Pode seleccionar vários.
        </label>
        <input
          ref={fileInputRef}
          id="image-sample-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200"
          onChange={() => setSelectedCount(fileInputRef.current?.files?.length ?? 0)}
        />
      </div>
      {!isMultiple && (
        <div>
          <label htmlFor="image-sample-name" className="block text-sm font-medium text-slate-300 mb-1">
            Nome (opcional)
          </label>
          <input
            id="image-sample-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Bebidas"
            className="w-full min-w-[12rem] rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}
      <Button type="submit" variant="primary" disabled={loading}>
        {loading
          ? uploadProgress
            ? `A carregar ${uploadProgress.current} de ${uploadProgress.total}…`
            : "A carregar…"
          : "Carregar sample(s)"}
      </Button>
      {error && (
        <div className="w-full mt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </form>
  );
}
