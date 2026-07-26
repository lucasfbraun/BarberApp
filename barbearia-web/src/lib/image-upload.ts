/**
 * Preparo de imagem no NAVEGADOR antes de salvar.
 *
 * O projeto ainda nao tem storage de arquivos (S3/Blob). A imagem e
 * reduzida aqui e guardada como data URL na propria coluna do Postgres.
 * Isso so se sustenta com imagem pequena — por isso os limites abaixo sao
 * rigidos. Ver UPLOADS.md para a decisao e o caminho de migracao.
 *
 * Todas as funcoes dependem de `document`/`canvas`: uso exclusivo no client.
 */

/** Lado maior da imagem final, em pixels. */
export const LOGO_MAX_DIMENSION = 256;

/**
 * Teto do arquivo escolhido pelo usuario, ANTES de redimensionar.
 * Nao afeta o que vai para o banco: a imagem e reduzida para
 * LOGO_MAX_DIMENSION de qualquer forma.
 */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

/**
 * Teto de resolucao do arquivo de origem. Decodificar no canvas custa
 * ~4 bytes por pixel, entao uma imagem gigante derruba a aba em celular
 * fraco. Melhor recusar com mensagem do que travar.
 */
export const MAX_SOURCE_DIMENSION = 8000;

/** Teto da data URL gravada no banco (~150 KB de texto). */
export const MAX_STORED_CHARS = 150_000;

/** Formatos aceitos. SVG fica de fora de proposito (ver UPLOADS.md). */
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

export class ImageUploadError extends Error {}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Decodifica o arquivo, preferindo createImageBitmap (respeita EXIF). */
async function decode(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // cai no fallback
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ImageUploadError("Não foi possível ler esta imagem."));
      element.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Redimensiona mantendo a proporcao (nunca amplia) e devolve uma data URL.
 * Tenta WebP; se o navegador nao suportar, cai para PNG (preserva
 * transparencia, que e o que importa numa logo).
 */
export async function resizeImageToDataUrl(
  file: File,
  { maxDimension = LOGO_MAX_DIMENSION, quality = 0.85 } = {},
): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageUploadError("Envie um arquivo PNG, JPG ou WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageUploadError(
      `Imagem muito grande (${formatBytes(file.size)}). O limite é ${formatBytes(MAX_SOURCE_BYTES)}.`,
    );
  }

  const { source, width, height, release } = await decode(file);

  try {
    if (!width || !height) {
      throw new ImageUploadError("Não foi possível ler as dimensões desta imagem.");
    }
    if (Math.max(width, height) > MAX_SOURCE_DIMENSION) {
      throw new ImageUploadError(
        `Imagem com resolução muito alta (${width}×${height}). O limite é ${MAX_SOURCE_DIMENSION}px de lado.`,
      );
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageUploadError("Seu navegador não conseguiu processar a imagem.");

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    // Vai reduzindo a qualidade se o resultado ainda ficar acima do teto.
    for (const attempt of [quality, 0.7, 0.55]) {
      let dataUrl = canvas.toDataURL("image/webp", attempt);
      // Navegador sem WebP devolve PNG silenciosamente.
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/png");
      }
      if (dataUrl.length <= MAX_STORED_CHARS) return dataUrl;
    }

    throw new ImageUploadError(
      "Não foi possível comprimir esta imagem o suficiente. Tente uma imagem mais simples.",
    );
  } finally {
    release();
  }
}

/** Rotulo curto do peso final, para mostrar ao usuario. */
export function dataUrlSizeLabel(dataUrl: string): string {
  const base64 = dataUrl.split(",")[1] ?? "";
  return formatBytes(Math.round((base64.length * 3) / 4));
}
