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
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setError("Selecione um ficheiro.");
      return;
    }
    const file = input.files[0];
    setLoading(true);
    try {
      const processed = await resizeAndConvertToWebP(file);
      const fileToUpload = processed ?? file;

      const formData = new FormData();
      formData.set("file", fileToUpload);
      if (name.trim()) formData.set("name", name.trim());

      const res = await fetch("/api/portal-admin/settings/image-samples/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? res.statusText ?? "Erro ao carregar");
        return;
      }
      setName("");
      input.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="image-sample-file" className="block text-sm font-medium text-slate-300 mb-1">
          Ficheiro (JPG, PNG ou WebP, máx. 10 MB) — a app redimensiona e converte para WebP
        </label>
        <input
          ref={fileInputRef}
          id="image-sample-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200"
        />
      </div>
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
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "A carregar…" : "Carregar sample"}
      </Button>
      {error && (
        <div className="w-full mt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </form>
  );
}
