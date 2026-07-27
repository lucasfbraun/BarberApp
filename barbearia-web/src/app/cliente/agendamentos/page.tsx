"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClienteBottomNav from "@/components/ClienteBottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import { LABEL, MUTED, STATUS_TONE, TITLE } from "@/lib/ui";

/* Meus agendamentos. A data vira coluna à esquerda (dia grande + mês),
   no lugar do cartão com etiqueta colorida. Ver src/lib/ui.ts. */

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  barbershop: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null };
  professional: { id: string; name: string } | null;
  service: { id: string; name: string; price: number; durationMinutes: number } | null;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  // Marcado pelo barbeiro quando o cliente chega ao salão.
  ARRIVED: "Você chegou",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
  RESCHEDULED: "Remarcado",
};

function ApptRow({ a, onCancel, canceling }: { a: Appt; onCancel?: (id: string) => void; canceling: string }) {
  const starts = new Date(a.startsAt);
  const cancellable = onCancel && ["SCHEDULED", "CONFIRMED"].includes(a.status) && starts > new Date();
  const done = ["COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status);

  return (
    <li className="border-b border-slate-200 py-5">
      <div className="flex gap-5">
        {/* Coluna da data */}
        <div className={`w-12 shrink-0 text-center ${done ? "text-slate-400" : "text-slate-900"}`}>
          <p className="text-2xl font-semibold leading-none tabular-nums">{starts.getDate()}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
            {starts.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-base font-medium tracking-tight ${done ? "text-slate-500" : "text-slate-900"}`}>
            {a.barbershop.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {a.service?.name ?? "Serviço"}
            {a.professional ? ` · ${a.professional.name}` : ""}
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-900">
            {starts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            <span className={`ml-3 text-xs ${STATUS_TONE[a.status] ?? "text-slate-500"}`}>
              {STATUS_LABELS[a.status] ?? a.status}
            </span>
          </p>

          <div className="mt-3 flex gap-5">
            <Link
              href={`/s/${a.barbershop.slug}/agendar`}
              className="text-xs text-slate-500 underline underline-offset-4 transition hover:text-slate-900"
            >
              Agendar de novo
            </Link>
            {cancellable && (
              <button
                disabled={canceling === a.id}
                onClick={() => onCancel(a.id)}
                className="text-xs text-red-600 underline underline-offset-4 transition hover:text-red-700 disabled:opacity-40"
              >
                {canceling === a.id ? "Cancelando…" : "Cancelar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
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
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <div className="mx-auto max-w-lg px-5">
        <header className="pt-10">
          <Link href="/cliente" className={`${LABEL} transition hover:text-slate-900`}>
            ← Barbearias
          </Link>
          <h1 className={`${TITLE} mt-3`}>Meus agendamentos</h1>
        </header>

        {error && (
          <p className="mt-6 border-l-2 border-red-600 py-1 pl-4 text-sm text-red-600">{error}</p>
        )}

        {loading ? (
          <p className={`${MUTED} mt-8`}>Carregando…</p>
        ) : (
          <>
            <section className="mt-10">
              <h2 className={LABEL}>Próximos</h2>
              {upcoming.length === 0 ? (
                <p className="mt-4 border-l-2 border-blue-600 py-1 pl-4 text-sm text-slate-500">
                  Nenhum agendamento futuro.{" "}
                  <Link href="/cliente" className="text-slate-900 underline underline-offset-4">
                    Agendar agora
                  </Link>
                </p>
              ) : (
                <ul className="mt-2 border-t border-slate-200">
                  {upcoming.map((a) => (
                    <ApptRow key={a.id} a={a} onCancel={cancel} canceling={canceling} />
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-12">
              <h2 className={LABEL}>Histórico</h2>
              {past.length === 0 ? (
                <p className={`${MUTED} mt-4`}>Sem histórico ainda.</p>
              ) : (
                <ul className="mt-2 border-t border-slate-200">
                  {past.map((a) => <ApptRow key={a.id} a={a} canceling={canceling} />)}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <InstallPrompt />
      <ClienteBottomNav active="agendamentos" />
    </div>
  );
}
