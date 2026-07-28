import Link from "next/link";

/**
 * Marca do BarvioApp.
 *
 * DUAS VARIANTES, e o motivo é concreto: o logo foi desenhado sobre fundo
 * escuro, com sombreado 3D e brilho. Em fundo claro o "B" branco e o wordmark
 * simplesmente somem — e recolorir por código deixa halo, porque a peça tem
 * sombra difusa embutida.
 *
 *  - `dark`  → lockup completo (símbolo + nome + tagline), a arte original.
 *              Usada no painel, no admin, na landing e nas telas de acesso.
 *  - `light` → símbolo sobre azulejo escuro (como ícone de app) + o nome
 *              renderizado em TEXTO. Parece proposital, fica nítido em
 *              qualquer tamanho e não depende de imagem que pode falhar.
 *
 * O nome em texto na variante clara também resolve acessibilidade: leitores
 * de tela leem "Barvio App" sem depender de `alt`.
 */

type Tamanho = "sm" | "md" | "lg" | "xl";

/**
 * Escala da marca.
 *
 * O arquivo tem 560px de largura, o que cobre 3x de densidade até `xl`
 * (~130px de altura exibida). Passar disso exige regerar o asset maior,
 * senão fica borrado em tela retina.
 */
const AZULEJO: Record<Tamanho, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

const NOME: Record<Tamanho, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

const LOCKUP: Record<Tamanho, string> = {
  sm: "h-12",
  md: "h-16",
  lg: "h-28",
  xl: "h-36",
};

export function Logo({
  variant = "dark",
  size = "md",
  showName = true,
  className = "",
}: {
  variant?: "dark" | "light";
  size?: Tamanho;
  /** Só afeta a variante clara — no lockup o nome já faz parte da arte. */
  showName?: boolean;
  className?: string;
}) {
  if (variant === "dark") {
    return (
      // `img` puro em vez de next/image: é um asset fixo e pequeno (15 KB em
      // WebP), e o Image traria layout shift e um wrapper desnecessário aqui.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/barvioapp-lockup.webp"
        alt="BarvioApp — gestão completa para barbearias"
        className={`${LOCKUP[size]} w-auto ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/barvioapp-tile.webp"
        alt=""
        aria-hidden="true"
        className={`${AZULEJO[size]} shrink-0 rounded-xl`}
      />
      {showName && (
        <span className={`${NOME[size]} font-semibold tracking-tight text-slate-900`}>
          Barvio<span className="text-blue-600">App</span>
        </span>
      )}
    </span>
  );
}

/** Marca clicável que leva à home. Atalho para o uso mais comum. */
export function LogoLink({
  href = "/",
  ...props
}: React.ComponentProps<typeof Logo> & { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center transition hover:opacity-80">
      <Logo {...props} />
    </Link>
  );
}
