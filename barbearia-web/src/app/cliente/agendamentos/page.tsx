"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClienteBottomNav from "@/components/ClienteBottomNav";

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
  SCHEDULED:   { label: "Agendado",   cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  CONFIRMED:   { label: "Confirmado", cls: "bg-green-50 text-green-700 border-green-200" },
  IN_PROGRESS: { label: "Em atendimento", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  COMPLETED:   { label: "Concluído",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED:   { label: "Cancelado",  cls: "bg-red-50 text-red-600 border-red-200" },
  NO_SHOW:     { label: "Não compareceu", cls: "bg-red-50 text-red-600 border-red-200" },
  RESCHEDULED: { label: "Remarcado",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function ApptCard({ a, onCancel, canceling }: { a: Appt; onCancel?: (id: string) => void; canceling: string }) {
  const st = STATUS_LABELS[a.status] ?? { label: a.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  const starts = new Date(a.startsAt);
  const cancellable = onCancel && ["SCHEDULED", "CONFIRMED"].includes(a.status) && starts > new Date();
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{a.barbershop.name}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {a.service?.name ?? "Serviço"} {a.professional ? `· ${a.professional.name}` : ""}
          </p>
          <p className="mt-1 text-sm text-cyan-700">
            {starts.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}{" "}
            às {starts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/s/${a.barbershop.slug}/agendar`}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:text-slate-900">
          Agendar de novo
        </Link>
        {cancellable && (
          <button
            disabled={canceling === a.id}
            onClick={() => onCancel(a.id)}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50">
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
      router.push("/cliente/login?callbackUrl=/cliente/agendamentos");
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
    <div className="min-h-screen bg-slate-100 px-4 py-8 pb-24 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/cliente" className="text-xs text-slate-400 hover:text-slate-600">← Barbearias</Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Meus agendamentos</h1>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-700">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((a) => <ApptCard key={a.id} a={a} onCancel={cancel} canceling={canceling} />)}
                {upcoming.length === 0 && (
                  <p className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-400">
                    Nenhum agendamento futuro.{" "}
                    <Link href="/cliente" className="text-cyan-700 hover:underline">Agendar agora</Link>
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Histórico</h2>
              <div className="space-y-3">
                {past.map((a) => <ApptCard key={a.id} a={a} canceling={canceling} />)}
                {past.length === 0 && <p className="text-sm text-slate-400">Sem histórico ainda.</p>}
              </div>
            </section>
          </>
        )}
      </div>
      <ClienteBottomNav active="agendamentos" />
    </div>
  );
}
