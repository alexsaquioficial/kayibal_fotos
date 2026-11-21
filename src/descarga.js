// ==========================================================
// DESCARGA DEL RECORTADOR (con barra de avance)
// Baja por partes (de ~4 MB) lo que necesita el modelo, reintenta la parte
// que se corte (datos móviles) y lo guarda en el aparato (Cache, ver
// public/sw.js). La segunda vez ya no descarga nada.
// ==========================================================
export const CACHE_MODELO = "kayibal-modelo-v1";
const BASE = "/modelo/";
const REINTENTOS = 5;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export function registrarGuardado() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}

async function bajarParte(cache, ruta, alAvanzar) {
  for (let intento = 1; intento <= REINTENTOS; intento += 1) {
    let recibido = 0;
    try {
      const respuesta = await fetch(BASE + ruta, { cache: "no-store" });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const lector = respuesta.body.getReader();
      const pedazos = [];
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        pedazos.push(value);
        recibido += value.length;
        alAvanzar(value.length);
      }
      await cache.put(BASE + ruta, new Response(new Blob(pedazos), { headers: { "Content-Type": "application/octet-stream" } }));
      return;
    } catch (error) {
      alAvanzar(-recibido); // lo de este intento no cuenta
      if (intento === REINTENTOS) throw error;
      await espera(1500 * intento);
    }
  }
}

// calidad: "normal" | "alta". alProgreso({ bajado, total, porcentaje }).
// Devuelve true si tuvo que descargar algo.
export async function prepararRecortador(calidad, alProgreso) {
  if (!("caches" in window)) return false;
  const cache = await caches.open(CACHE_MODELO);
  const recursos = await (await fetch(BASE + "resources.json", { cache: "no-store" })).json();
  const claves = [calidad === "alta" ? "/models/medium" : "/models/small", "/onnxruntime-web/ort-wasm-simd.wasm"];

  const partes = claves.flatMap((c) => (recursos[c]?.chunks || []).map((p) => ({ ruta: p.hash, tamano: p.offsets[1] - p.offsets[0] })));
  const total = partes.reduce((s, p) => s + p.tamano, 0);
  const faltan = [];
  let bajado = 0;
  for (const p of partes) {
    if (await cache.match(BASE + p.ruta)) bajado += p.tamano;
    else faltan.push(p);
  }
  if (!faltan.length) return false;

  const avisar = () => alProgreso({ bajado, total, porcentaje: Math.min(100, Math.round((bajado / total) * 100)) });
  avisar();
  // De dos en dos: más rápido, sin ahogar la conexión del celular.
  const cola = [...faltan];
  const trabajador = async () => {
    while (cola.length) {
      const p = cola.shift();
      await bajarParte(cache, p.ruta, (n) => { bajado += n; avisar(); });
    }
  };
  await Promise.all([trabajador(), trabajador()]);
  return true;
}
