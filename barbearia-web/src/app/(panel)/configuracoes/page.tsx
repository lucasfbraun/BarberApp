"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ThemeState = {
  name: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
};

const defaultTheme: ThemeState = {
  name: "Barbearia do João",
  description: "Um sistema com identidade própria para barbearias modernas.",
  logoUrl: "",
  coverImageUrl: "",
  primaryColor: "#38bdf8",
  secondaryColor: "#0f172a",
  accentColor: "#f59e0b",
  backgroundColor: "#020617",
  textColor: "#e2e8f0",
  borderRadius: "18px",
  fontFamily: "Inter",
};

const highlights = [
  ["Tenant", "As configurações são salvas por barbearia."],
  ["Identidade", "Logo, cores, capa e tipografia são editáveis."],
  ["Tema", "A página pública e o painel podem refletir a marca."],
];

const presets = [
  {
    name: "Barbearia urbana",
    value: {
      primaryColor: "#22c55e",
      secondaryColor: "#0f172a",
      accentColor: "#f97316",
      backgroundColor: "#020617",
      textColor: "#e5e7eb",
      borderRadius: "20px",
      fontFamily: "Inter",
    },
  },
  {
    name: "Clube premium",
    value: {
      primaryColor: "#c084fc",
      secondaryColor: "#312e81",
      accentColor: "#facc15",
      backgroundColor: "#111827",
      textColor: "#faf5ff",
      borderRadius: "26px",
      fontFamily: "Inter",
    },
  },
  {
    name: "Tradicional clean",
    value: {
      primaryColor: "#38bdf8",
      secondaryColor: "#0f172a",
      accentColor: "#f59e0b",
      backgroundColor: "#f8fafc",
      textColor: "#0f172a",
      borderRadius: "14px",
      fontFamily: "Inter",
    },
  },
];

export default function ConfiguracoesPage() {
  const [theme, setTheme] = useState<ThemeState>(defaultTheme);
  const [status, setStatus] = useState<string>("Carregando dados do tenant...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await fetch("/api/theme");
        if (!response.ok) {
          setStatus("Tenant nao encontrado ainda. Use o onboarding para criar a barbearia.");
          return;
        }

        const payload = (await response.json()) as { barbershop?: Partial<ThemeState> };
        if (payload.barbershop) {
          setTheme((current) => ({
            ...current,
            ...Object.fromEntries(
              Object.entries(payload.barbershop ?? {}).filter(([, value]) => value !== null && value !== undefined),
            ),
          }));
          setStatus("Tema carregado com sucesso.");
        }
      } catch {
        setStatus("Nao foi possivel carregar o tema agora.");
      }
    };

    loadTheme();
  }, []);

  const previewStyle = useMemo(
    () => ({
      backgroundColor: theme.backgroundColor,
      color: theme.textColor,
      borderRadius: theme.borderRadius,
      fontFamily: theme.fontFamily,
    }),
    [theme],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Salvando identidade visual...");

    const response = await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme),
    });

    if (!response.ok) {
      setStatus("Falha ao salvar o tema.");
      setSaving(false);
      return;
    }

    setStatus("Tema salvo com sucesso no tenant.");
    setSaving(false);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Configurações</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Identidade da barbearia</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        Esta área concentra a personalização visual do tenant. O objetivo desta sprint é permitir que a
        barbearia sinta o sistema como sendo dela.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {highlights.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
          </article>
        ))}
      </div>

      <form className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Campos da identidade</h3>
            <p className="mt-1 text-sm text-slate-400">Edite a marca sem precisar mexer no código.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Nome público</span>
              <input
                value={theme.name}
                onChange={(event) => setTheme((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Descrição</span>
              <textarea
                value={theme.description}
                onChange={(event) => setTheme((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Logo por URL</span>
              <input
                value={theme.logoUrl}
                onChange={(event) => setTheme((current) => ({ ...current, logoUrl: event.target.value }))}
                placeholder="https://.../logo.png"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Imagem de capa por URL</span>
              <input
                value={theme.coverImageUrl}
                onChange={(event) => setTheme((current) => ({ ...current, coverImageUrl: event.target.value }))}
                placeholder="https://.../cover.jpg"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </label>

            {[
              ["primaryColor", "Cor primária"],
              ["secondaryColor", "Cor secundária"],
              ["accentColor", "Cor de destaque"],
              ["backgroundColor", "Cor de fundo"],
              ["textColor", "Cor do texto"],
              ["borderRadius", "Raio de borda"],
              ["fontFamily", "Fonte"],
            ].map(([key, label]) => (
              <label key={key} className="space-y-2">
                <span className="text-sm text-slate-300">{label}</span>
                <input
                  value={theme[key as keyof ThemeState]}
                  onChange={(event) =>
                    setTheme((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setTheme((current) => ({ ...current, ...preset.value }))}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar identidade"}
          </button>

          <p className="text-sm text-slate-400">{status}</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h3 className="text-lg font-semibold text-white">Preview ao vivo</h3>
          <div
            className="overflow-hidden border border-white/10 shadow-2xl"
            style={previewStyle}
          >
            <div
              className="h-28 bg-cover bg-center"
              style={{
                backgroundImage: theme.coverImageUrl ? `url(${theme.coverImageUrl})` : undefined,
                backgroundColor: theme.secondaryColor,
              }}
            />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xs font-semibold">
                  {theme.logoUrl ? (
                    <Image
                      src={theme.logoUrl}
                      alt="Logo da barbearia"
                      width={48}
                      height={48}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Logo"
                  )}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em]" style={{ color: theme.primaryColor }}>
                    {theme.name}
                  </p>
                  <p className="text-sm opacity-80">{theme.description}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Agenda", theme.primaryColor],
                  ["Clientes", theme.secondaryColor],
                  ["Servicos", theme.accentColor],
                ].map(([label, color]) => (
                  <div
                    key={label}
                    className="rounded-2xl px-4 py-3 text-sm font-semibold"
                    style={{ backgroundColor: String(color), color: theme.textColor }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 p-4 text-sm leading-6 opacity-90">
                URL pública: <span className="font-semibold">/s/[slug]</span>
                <br />
                O tema acima será aplicado tanto no painel quanto na página pública quando o próximo passo
                conectar o renderer do tenant.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            A sprint de identidade já entrega uma personalização visual funcional, salva por tenant, com
            preview imediato e estrutura pronta para evoluir para upload real de arquivos.
          </div>
        </div>
      </form>
    </section>
  );
}
