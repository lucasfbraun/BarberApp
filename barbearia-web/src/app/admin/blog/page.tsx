"use client";

import { useCallback, useEffect, useState } from "react";

/* Revisão e publicação dos posts.

   É a tela que dá sentido ao padrão DRAFT da API: o n8n cria o rascunho, você
   lê aqui e decide. Sem ela, "rascunho como padrão" seria só uma forma de o
   post nunca aparecer. */

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  publishedAt: string | null;
  source: string;
  views: number;
  updatedAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
};

const STATUS_COR: Record<string, string> = {
  DRAFT: "bg-slate-700/60 text-slate-300",
  SCHEDULED: "bg-amber-400/15 text-amber-200",
  PUBLISHED: "bg-emerald-400/15 text-emerald-200",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "DRAFT" | "PUBLISHED">("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Rota de admin: devolve TODOS os posts, inclusive rascunho — a rota
      // pública `/api/blog` filtra por publicado e não serviria aqui.
      const res = await fetch("/api/admin/blog");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.error ?? "Não foi possível carregar os posts.");
        return;
      }
      setPosts((await res.json()).posts ?? []);
      setErro(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alterar(id: string, payload: Record<string, unknown>) {
    setOcupado(id);
    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(body.error ?? "Não foi possível atualizar.");
        return;
      }
      setErro(null);
      await carregar();
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(id: string, titulo: string) {
    if (!window.confirm(`Excluir "${titulo}"? Não dá para desfazer.`)) return;
    setOcupado(id);
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErro(body.error ?? "Não foi possível excluir.");
        return;
      }
      await carregar();
    } finally {
      setOcupado(null);
    }
  }

  const visiveis = filtro === "todos" ? posts : posts.filter((p) => p.status === filtro);
  const rascunhos = posts.filter((p) => p.status === "DRAFT").length;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Blog</h1>
        <p className="mt-1 text-sm text-slate-400">
          Revise o que a automação criou antes de publicar.
          {rascunhos > 0 && (
            <span className="ml-2 text-amber-300">
              {rascunhos} {rascunhos === 1 ? "rascunho aguardando" : "rascunhos aguardando"}.
            </span>
          )}
        </p>
      </header>

      {erro && (
        <p className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        {(
          [
            ["todos", "Todos"],
            ["DRAFT", "Rascunhos"],
            ["PUBLISHED", "Publicados"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor)}
            className={`rounded-xl border px-4 py-2 text-xs transition ${
              filtro === valor
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Nenhum post aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiveis.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_COR[post.status]
                      }`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                    {post.source === "n8n" && (
                      <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs text-blue-200">
                        automação
                      </span>
                    )}
                    {post.tags.map((t) => (
                      <span key={t} className="text-xs text-slate-500">
                        {t}
                      </span>
                    ))}
                  </div>

                  <h2 className="mt-2 font-semibold text-white">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-1 text-sm text-slate-400">{post.excerpt}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-600">
                    /blog/{post.slug}
                    {post.status === "PUBLISHED" && ` · ${post.views} visualizações`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => setAberto(aberto === post.id ? null : post.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                  >
                    {aberto === post.id ? "Fechar" : "Ler"}
                  </button>

                  {post.status === "PUBLISHED" ? (
                    <>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                      >
                        Ver no site
                      </a>
                      <button
                        onClick={() => alterar(post.id, { status: "DRAFT" })}
                        disabled={ocupado === post.id}
                        className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-40"
                      >
                        Despublicar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => alterar(post.id, { status: "PUBLISHED" })}
                      disabled={ocupado === post.id}
                      className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
                    >
                      Publicar
                    </button>
                  )}

                  <button
                    onClick={() => excluir(post.id, post.title)}
                    disabled={ocupado === post.id}
                    className="rounded-xl border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10 disabled:opacity-40"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {aberto === post.id && (
                <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                  {post.content}
                </pre>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
