// ==========================================================
// PROCESAR UNA FOTO (todo en el navegador del vendedor)
//   1. quitarFondo(): el modelo (@imgly/background-removal) deja solo el
//      producto, con fondo transparente. Es lo lento: se hace una vez por foto.
//   2. componer(): pone el producto sobre el fondo, recortado, centrado, con
//      margen parejo, luz mejorada y sombra opcional. Es rápido: se repite
//      cada vez que el vendedor cambia una opción.
// El modelo se sirve desde esta misma página (/modelo/, scripts/copiar-modelo.mjs).
// ==========================================================
import { removeBackground } from "@imgly/background-removal";

export const OPCIONES_INICIALES = {
  quitarFondo: true,
  fondo: "#ffffff",
  lado: 1000,
  margen: 0.08,
  sombra: false,
  mejorarLuz: true,
  calidad: "normal", // "normal" (rápido) | "alta" (más lento, mejor borde)
};

// Devuelve el producto con fondo transparente (Blob PNG).
// alProgreso(texto, porcentaje): la primera vez descarga el modelo.
export async function quitarFondo(archivo, calidad, alProgreso) {
  return removeBackground(archivo, {
    publicPath: `${window.location.origin}/modelo/`,
    model: calidad === "alta" ? "medium" : "small",
    output: { format: "image/png" },
    progress: (clave, actual, total) => {
      if (!total) return;
      const descargando = clave.startsWith("fetch:");
      alProgreso?.(descargando ? "Descargando el recortador (solo la primera vez)" : "Quitando el fondo", Math.round((actual / total) * 100));
    },
  });
}

export const cargarImagen = (blob) => createImageBitmap(blob);

// Rectángulo que ocupa el producto (píxeles no transparentes).
function bordesDelProducto(imagen) {
  const { width: w, height: h } = imagen;
  const lienzo = new OffscreenCanvas(w, h);
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, suma = 0, cuenta = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if ((x + y) % 7 === 0) { suma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; cuenta += 1; }
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h, luz: 128 };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, luz: cuenta ? suma / cuenta : 128 };
}

// producto: ImageBitmap (con fondo quitado, o la foto original).
// Devuelve un canvas cuadrado listo para guardar.
export function componer(producto, opciones, recortado = true) {
  const lado = opciones.lado;
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const ctx = lienzo.getContext("2d");
  ctx.fillStyle = opciones.fondo;
  ctx.fillRect(0, 0, lado, lado);

  const caja = recortado ? bordesDelProducto(producto) : { x: 0, y: 0, w: producto.width, h: producto.height, luz: 128 };
  const espacio = lado * (1 - 2 * opciones.margen);
  const escala = Math.min(espacio / caja.w, espacio / caja.h);
  const w = caja.w * escala;
  const h = caja.h * escala;
  const x = (lado - w) / 2;
  const y = (lado - h) / 2;

  // Sombra suave debajo del producto (solo con el fondo quitado).
  if (opciones.sombra && recortado) {
    ctx.save();
    ctx.filter = `blur(${Math.round(lado * 0.018)}px)`;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(lado / 2, Math.min(lado - lado * 0.03, y + h), w * 0.42, Math.max(6, lado * 0.025), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Luz: si el producto salió oscuro se aclara un poco (sin pasarse).
  if (opciones.mejorarLuz) {
    const brillo = Math.min(1.35, Math.max(1, 140 / Math.max(caja.luz, 1)));
    ctx.filter = `brightness(${brillo.toFixed(2)}) contrast(1.06) saturate(1.06)`;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(producto, caja.x, caja.y, caja.w, caja.h, x, y, w, h);
  ctx.filter = "none";

  return lienzo;
}

// Canvas → archivo liviano (WebP; si el navegador no puede, JPEG).
export async function aArchivo(lienzo, nombre) {
  const blob = await new Promise((r) => lienzo.toBlob(r, "image/webp", 0.88));
  const final = blob && blob.type === "image/webp" ? blob : await new Promise((r) => lienzo.toBlob(r, "image/jpeg", 0.9));
  const extension = final.type === "image/webp" ? "webp" : "jpg";
  return new File([final], `${nombre.replace(/\.[^.]+$/, "")}.${extension}`, { type: final.type });
}
