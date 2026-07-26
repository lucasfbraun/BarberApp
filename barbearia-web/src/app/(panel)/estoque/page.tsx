"use client";
import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string; name: string; description: string | null; sku: string | null;
  category: string | null; unit: string; costPrice: number; salePrice: number;
  stockQuantity: number; minStock: number; expiresAt: string | null;
  sellable: boolean; active: boolean;
  lowStock: boolean; expired: boolean; expiringSoon: boolean; stockValue: number;
};

type Movement = {
  id: string; type: string; quantity: number; balanceAfter: number;
  unitCost: number | null; unitPrice: number | null; reason: string | null;
  createdAt: string; product: { id: string; name: string; unit: string };
};

type Resumo = {
  inventory: {
    totalProducts: number; stockValue: number; potentialValue: number;
    lowStockCount: number; expiredCount: number; expiringSoonCount: number;
    lowStock: { id: string; name: string; stockQuantity: number; minStock: number; unit: string }[];
    expired: { id: string; name: string; expiresAt: string; stockQuantity: number }[];
    expiringSoon: { id: string; name: string; expiresAt: string; stockQuantity: number }[];
  };
  sales: {
    totalRevenue: number; totalCost: number; totalProfit: number;
    byProduct: { productId: string; name: string; quantitySold: number; revenue: number; cost: number; profit: number }[];
  };
};

const MOVEMENT_LABELS: Record<string, { label: string; cls: string }> = {
  PURCHASE:       { label: "Compra",       cls: "text-green-400" },
  RETURN:         { label: "Devolução",    cls: "text-green-400" },
  ADJUSTMENT_IN:  { label: "Ajuste (+)",   cls: "text-green-400" },
  SALE:           { label: "Venda",        cls: "text-cyan-300" },
  CONSUMPTION:    { label: "Uso interno",  cls: "text-amber-300" },
  LOSS:           { label: "Perda",        cls: "text-red-400" },
  ADJUSTMENT_OUT: { label: "Ajuste (−)",   cls: "text-red-400" },
};

const emptyForm = {
  name: "", sku: "", category: "", unit: "un", costPrice: "", salePrice: "",
  minStock: "", expiresAt: "", initialQuantity: "", sellable: true,
};

function money(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function EstoquePage() {
  const [tab, setTab] = useState<"produtos" | "movimentacoes" | "alertas">("produtos");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [movProduct, setMovProduct] = useState("");
  const [movType, setMovType] = useState("PURCHASE");
  const [movQty, setMovQty] = useState("");
  const [movCost, setMovCost] = useState("");
  const [movReason, setMovReason] = useState("");
  const [movUpdateCost, setMovUpdateCost] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const [pRes, mRes, rRes] = await Promise.all([
      fetch(`/api/produtos?${params}`),
      fetch("/api/estoque/movimentacoes?take=100"),
      fetch("/api/estoque/resumo"),
    ]);
    if (pRes.ok) setProducts((await pRes.json()).products);
    if (mRes.ok) setMovements((await mRes.json()).movements);
    if (rRes.ok) setResumo(await rRes.json());
    if (!pRes.ok) setError("Não foi possível carregar o estoque.");
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku ?? "", category: p.category ?? "", unit: p.unit,
      costPrice: String(p.costPrice), salePrice: String(p.salePrice),
      minStock: String(p.minStock),
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : "",
      initialQuantity: "", sellable: p.sellable,
    });
    setShowForm(true);
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      category: form.category || undefined,
      unit: form.unit || "un",
      costPrice: form.costPrice ? Number(form.costPrice) : 0,
      salePrice: form.salePrice ? Number(form.salePrice) : 0,
      minStock: form.minStock ? Number(form.minStock) : 0,
      expiresAt: form.expiresAt || null,
      sellable: form.sellable,
      ...(editingId ? {} : { initialQuantity: form.initialQuantity ? Number(form.initialQuantity) : 0 }),
    };
    const res = await fetch(editingId ? `/api/produtos/${editingId}` : "/api/produtos", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await load();
    } else {
      setError((await res.json()).error ?? "Erro ao salvar produto.");
    }
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/produtos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    await load();
  }

  async function registerMovement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/estoque/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: movProduct,
        type: movType,
        quantity: Number(movQty),
        unitCost: movCost ? Number(movCost) : undefined,
        reason: movReason || undefined,
        updateProductCost: movUpdateCost,
      }),
    });
    if (res.ok) {
      setMovQty(""); setMovCost(""); setMovReason(""); setMovUpdateCost(false);
      await load();
    } else {
      setError((await res.json()).error ?? "Erro ao registrar movimentação.");
    }
  }

  const inv = resumo?.inventory;
  const sales = resumo?.sales;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Estoque</h2>
          <p className="mt-1 text-sm text-slate-400">Produtos, movimentações, alertas e inventário.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); }}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
        >
          {showForm && !editingId ? "Fechar" : "+ Novo produto"}
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Produtos ativos", value: inv?.totalProducts ?? "—", cls: "text-white" },
          { label: "Valor em estoque", value: inv ? money(inv.stockValue) : "—", cls: "text-white" },
          { label: "Valor potencial", value: inv ? money(inv.potentialValue) : "—", cls: "text-cyan-300" },
          { label: "Lucro (30d)", value: sales ? money(sales.totalProfit) : "—", cls: "text-green-400" },
          { label: "Abaixo do mínimo", value: inv?.lowStockCount ?? "—", cls: (inv?.lowStockCount ?? 0) > 0 ? "text-amber-300" : "text-slate-400" },
          { label: "Vencidos / vencendo", value: inv ? `${inv.expiredCount} / ${inv.expiringSoonCount}` : "—", cls: (inv?.expiredCount ?? 0) > 0 ? "text-red-400" : "text-slate-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-sm text-red-300">{error}</p>
      )}

      {/* Form produto */}
      {showForm && (
        <form onSubmit={saveProduct} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Nome do produto *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 lg:col-span-2" />
          <input placeholder="SKU / código" value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <input placeholder="Categoria (bar, cosmético...)" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <input type="number" step="0.01" min="0" placeholder="Custo unitário (R$)" value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <input type="number" step="0.01" min="0" placeholder="Preço de venda (R$)" value={form.salePrice}
            onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <input type="number" min="0" placeholder="Estoque mínimo (alerta)" value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Validade</label>
            <input type="date" value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40" />
          </div>
          {!editingId && (
            <input type="number" min="0" placeholder="Qtd. inicial em estoque" value={form.initialQuantity}
              onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.sellable}
              onChange={(e) => setForm({ ...form, sellable: e.target.checked })} />
            Disponível para venda na comanda
          </label>
          <div className="flex items-end gap-2 lg:col-span-4">
            <button type="submit" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20">
              {editingId ? "Salvar alterações" : "Cadastrar produto"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([["produtos", "Produtos"], ["movimentacoes", "Movimentações"], ["alertas", "Alertas"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={[
              "rounded-xl border px-4 py-2 text-sm transition",
              tab === key
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
            ].join(" ")}>
            {label}
            {key === "alertas" && ((inv?.lowStockCount ?? 0) + (inv?.expiredCount ?? 0) + (inv?.expiringSoonCount ?? 0)) > 0 && (
              <span className="ml-2 rounded-full bg-amber-400/20 px-2 text-xs text-amber-300">
                {(inv?.lowStockCount ?? 0) + (inv?.expiredCount ?? 0) + (inv?.expiringSoonCount ?? 0)}
              </span>
            )}
          </button>
        ))}
        {tab === "produtos" && (
          <input placeholder="Buscar produto ou SKU..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 sm:w-60" />
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : tab === "produtos" ? (
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-slate-400">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Custo</th>
                <th className="px-4 py-3">Venda</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Em estoque</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`border-b border-white/5 transition hover:bg-white/5 ${!p.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku ?? ""}{!p.sellable ? " · uso interno" : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={p.lowStock ? "font-semibold text-amber-300" : "text-white"}>
                      {p.stockQuantity} {p.unit}
                    </span>
                    {p.lowStock && <span className="ml-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">mín. {p.minStock}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{money(p.costPrice)}</td>
                  <td className="px-4 py-3 text-slate-300">{money(p.salePrice)}</td>
                  <td className="px-4 py-3">
                    {p.expiresAt ? (
                      <span className={p.expired ? "text-red-400" : p.expiringSoon ? "text-amber-300" : "text-slate-400"}>
                        {new Date(p.expiresAt).toLocaleDateString("pt-BR")}
                        {p.expired ? " · vencido" : p.expiringSoon ? " · vence em breve" : ""}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{money(p.stockValue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:text-white">Editar</button>
                      <button onClick={() => toggleActive(p)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 hover:text-white">
                        {p.active ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Nenhum produto cadastrado. Clique em “+ Novo produto”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === "movimentacoes" ? (
        <div className="space-y-4">
          {/* Form movimentação */}
          <form onSubmit={registerMovement} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-6">
            <select required value={movProduct} onChange={(e) => setMovProduct(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40 lg:col-span-2">
              <option value="">Produto...</option>
              {products.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} (saldo: {p.stockQuantity})</option>
              ))}
            </select>
            <select value={movType} onChange={(e) => setMovType(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40">
              <option value="PURCHASE">Compra (entrada)</option>
              <option value="RETURN">Devolução (entrada)</option>
              <option value="ADJUSTMENT_IN">Ajuste (+)</option>
              <option value="CONSUMPTION">Uso interno (saída)</option>
              <option value="LOSS">Perda / quebra (saída)</option>
              <option value="ADJUSTMENT_OUT">Ajuste (−)</option>
            </select>
            <input required type="number" min="1" placeholder="Quantidade" value={movQty}
              onChange={(e) => setMovQty(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            <input type="number" step="0.01" min="0" placeholder="Custo unit. (R$)" value={movCost}
              onChange={(e) => setMovCost(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            <input placeholder="Motivo (opcional)" value={movReason}
              onChange={(e) => setMovReason(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            <label className="flex items-center gap-2 text-xs text-slate-400 lg:col-span-3">
              <input type="checkbox" checked={movUpdateCost} onChange={(e) => setMovUpdateCost(e.target.checked)} />
              Atualizar custo do produto com este valor (só gestor)
            </label>
            <button type="submit" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20 lg:col-start-6">
              Registrar
            </button>
          </form>

          {/* Histórico */}
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-slate-400">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Saldo após</th>
                  <th className="px-4 py-3">Custo/Preço</th>
                  <th className="px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const t = MOVEMENT_LABELS[m.type] ?? { label: m.type, cls: "text-slate-400" };
                  return (
                    <tr key={m.id} className="border-b border-white/5 transition hover:bg-white/5">
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-white">{m.product.name}</td>
                      <td className={`px-4 py-3 ${t.cls}`}>{t.label}</td>
                      <td className={`px-4 py-3 font-medium ${m.quantity > 0 ? "text-green-400" : "text-red-400"}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{m.balanceAfter}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {m.unitCost != null && `custo ${money(Number(m.unitCost))}`}
                        {m.unitPrice != null && ` · venda ${money(Number(m.unitPrice))}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.reason ?? "—"}</td>
                    </tr>
                  );
                })}
                {movements.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhuma movimentação registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5">
            <h3 className="font-semibold text-amber-300">Abaixo do mínimo ({inv?.lowStockCount ?? 0})</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {inv?.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-300">
                  <span>{p.name}</span>
                  <span className="text-amber-300">{p.stockQuantity}/{p.minStock} {p.unit}</span>
                </li>
              ))}
              {(inv?.lowStock.length ?? 0) === 0 && <li className="text-slate-500">Tudo certo por aqui.</li>}
            </ul>
          </div>
          <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-5">
            <h3 className="font-semibold text-red-400">Vencidos ({inv?.expiredCount ?? 0})</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {inv?.expired.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-300">
                  <span>{p.name} ({p.stockQuantity} un.)</span>
                  <span className="text-red-400">{new Date(p.expiresAt).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
              {(inv?.expired.length ?? 0) === 0 && <li className="text-slate-500">Nenhum produto vencido.</li>}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white">Vencendo em 30 dias ({inv?.expiringSoonCount ?? 0})</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {inv?.expiringSoon.map((p) => (
                <li key={p.id} className="flex justify-between text-slate-300">
                  <span>{p.name} ({p.stockQuantity} un.)</span>
                  <span className="text-amber-300">{new Date(p.expiresAt).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
              {(inv?.expiringSoon.length ?? 0) === 0 && <li className="text-slate-500">Nada vencendo no período.</li>}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 lg:col-span-3">
            <h3 className="font-semibold text-green-400">Lucro por produto (últimos 30 dias)</h3>
            {sales && sales.byProduct.length > 0 ? (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="py-1">Produto</th><th className="py-1">Qtd. vendida</th>
                    <th className="py-1">Receita</th><th className="py-1">Custo</th><th className="py-1">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.byProduct.map((p) => (
                    <tr key={p.productId} className="border-t border-white/5 text-slate-300">
                      <td className="py-2 text-white">{p.name}</td>
                      <td className="py-2">{p.quantitySold}</td>
                      <td className="py-2">{money(p.revenue)}</td>
                      <td className="py-2">{money(p.cost)}</td>
                      <td className={`py-2 font-medium ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}>{money(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Nenhuma venda de produto no período.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
