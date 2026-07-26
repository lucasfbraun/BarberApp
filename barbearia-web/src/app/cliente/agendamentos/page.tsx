"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  barbershop: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null };
  professional: { id: string; name: string } | null;
  service: { id: string; name: string; price: number; durationMinutes: number } | null;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  SCHEDULED:   { label: "Agendado",   cls: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20" },
  CONFIRMED:   { label: "Confirmado", cls: "bg-green-400/10 text-green-300 border-green-400/20" },
  IN_PROGRESS: { label: "Em atendimento", cls: "bg-amber-400/10 text-amber-300 border-amber-400/20" },
  COMPLETED:   { label: "Concluído",  cls: "bg-white/10 text-slate-300 border-white/10" },
  CANCELLED:   { label: "Cancelado",  cls: "bg-red-400/10 text-red-300 border-red-400/20" },
  NO_SHOW:     { label: "Não compareceu", cls: "bg-red-400/10 text-red-300 border-red-400/20" },
  RESCHEDULED: { label: "Remarcado",  cls: "bg-white/10 text-slate-400 border-white/10" },
};

function ApptCard({ a, onCancel, canceling }: { a: Appt; onCancel?: (id: string) => void; canceling: string }) {
  const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: "bg-white/10 text-slate-400 border-white/10" };
  const starts = new Date(a.startsAt);
  const cancellable = onCancel && ["SCHEDULED", "CONFIRMED"].includes(a.status) && starts > new Date();
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{a.barbershop.name}</p>
          <p className="mt-0.5 text-sm text-slate-300">
            {a.service?.name ?? "Serviço"} {a.professional ? `· ${a.professional.name}` : ""}
          </p>
          <p className="mt-1 text-sm text-cyan-300">
            {starts.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}{" "}
            às {starts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/s/${a.barbershop.slug}/agendar`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
          Agendar de novo
        </Link>
        {cancellable && (
          <button
            disabled={canceling === a.id}
            onClick={() => onCancel(a.id)}
            className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-400/10 disabled:opacity-50">
            {canceling === a.id ? "Cancelando..." : "Cancelar"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClienteAgendamentosPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [past, setPast] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/cliente/agendamentos");
    if (res.status === 401) {
      router.push("/login?callbackUrl=/cliente/agendamentos");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setUpcoming(data.upcoming);
      setPast(data.past);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function cancel(id: string) {
    setCanceling(id);
    setError("");
    const res = await fetch(`/api/cliente/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Erro ao cancelar.");
    await load();
    setCanceling("");
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/cliente" className="text-xs text-slate-500 hover:text-slate-300">← Barbearias</Link>
            <h1 className="mt-1 text-2xl font-bold text-white">Meus agendamentos</h1>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-sm text-red-300">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((a) => <ApptCard key={a.id} a={a} onCancel={cancel} canceling={canceling} />)}
                {upcoming.length === 0 && (
                  <p className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-500">
                    Nenhum agendamento futuro.{" "}
                    <Link href="/cliente" className="text-cyan-300 hover:underline">Agendar agora</Link>
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Histórico</h2>
              <div className="space-y-3">
                {past.map((a) => <ApptCard key={a.id} a={a} canceling={canceling} />)}
                {past.length === 0 && <p className="text-sm text-slate-600">Sem histórico ainda.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
