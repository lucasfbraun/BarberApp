const items = [
  ["Cadastro", "Próximo passo: criar entidade cliente por barbearia."],
  ["Histórico", "Lista de atendimentos e comandas será conectada depois."],
  ["Status", "Estrutura pronta para crescimento incremental."],
];

export default function ClientesPage() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Clientes</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Base de clientes</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        O módulo de clientes já tem seu espaço no app. A próxima etapa é persistência, busca e
        histórico por tenant.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
