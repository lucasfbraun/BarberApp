"use client";

import { useId, useRef, useState } from "react";
import {
  ACCEPT_ATTRIBUTE,
  dataUrlSizeLabel,
  ImageUploadError,
  LOGO_MAX_DIMENSION,
  resizeImageToDataUrl,
} from "@/lib/image-upload";

/**
 * Campo de imagem do painel: upload com preview e, recolhido, a alternativa
 * de colar uma URL externa (compatibilidade com quem já hospeda a arte).
 *
 * O valor emitido em `onChange` é sempre uma string: data URL (upload) ou
 * a URL digitada. Quem consome não precisa saber a diferença.
 */

export default function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  maxDimension = LOGO_MAX_DIMENSION,
  rounded = "rounded-2xl",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxDimension?: number;
  rounded?: string;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const isDataUrl = value.startsWith("data:");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await resizeImageToDataUrl(file, { maxDimension }));
    } catch (err) {
      setError(
        err instanceof ImageUploadError
          ? err.message
          : "Não foi possível processar esta imagem.",
      );
    } finally {
      setBusy(false);
      // Permite reenviar o mesmo arquivo depois de um erro.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <span className="text-sm text-slate-300">{label}</span>

      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* Preview — img simples: o valor pode ser data URL, que o next/image não trata. */}
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden ${rounded} border border-white/10 bg-slate-950/60`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-500">sem imagem</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:opacity-60"
            >
              {busy ? "Processando..." : value ? "Trocar imagem" : "Enviar imagem"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setError("");
                }}
                className="rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200"
              >
                Remover
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            PNG, JPG ou WebP. A imagem é reduzida para {maxDimension}px antes de salvar.
            {isDataUrl && ` Atual: ${dataUrlSizeLabel(value)}.`}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          {showUrl ? "Ocultar" : "ou colar uma URL"}
        </button>

        {showUrl && (
          <input
            value={isDataUrl ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://.../logo.png"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
          />
        )}
      </div>
    </div>
  );
}
