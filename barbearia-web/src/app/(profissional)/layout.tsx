import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import ProBottomNav from "@/components/ProBottomNav";

/**
 * Layout do Portal do Profissional.
 *
 * Tema CLARO, ao contrario do painel administrativo (escuro): o portal e usado
 * no salao, muitas vezes perto da vitrine com luz do dia, onde fundo escuro
 * reflete e some. A area do cliente ja tomou essa decisao — o portal segue.
 *
 * O `bg-slate-50` precisa vir daqui porque o `body` no layout raiz e escuro
 * (`bg-slate-950`), herdado do painel.
 */
export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Primeira barreira. O proxy.ts ja barra o nao autenticado, mas a checagem
  // aqui protege contra alguem chegar por um caminho que o matcher nao cubra.
  if (!session?.user) {
    redirect("/login?callbackUrl=/profissional");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-lg px-5 pb-28">{children}</div>
      <ProBottomNav />
    </div>
  );
}
