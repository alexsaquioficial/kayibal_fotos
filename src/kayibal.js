// ==========================================================
// CONEXIÓN CON KAYIBAL (el panel abre esta página en otra pestaña)
//
// El panel abre fotos.kayibal.com/?origen=kayibal con window.open().
//   1. Esta página avisa que está lista:   { tipo: "kayibal-fotos:abierto" }
//   2. El panel puede mandar fotos:        { tipo: "kayibal-fotos:archivos", fotos: [File] }
//   3. Al terminar, esta página devuelve:  { tipo: "kayibal-fotos:listo", fotos: [File] }
//      y se cierra. El panel las sube como cualquier foto.
// Solo se habla con los dominios de Kayibal.
// ==========================================================

const PERMITIDOS = [/^https:\/\/(www\.)?kayibal\.com$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const permitido = (origen) => PERMITIDOS.some((r) => r.test(origen));

export const abiertoDesdeKayibal = () =>
  Boolean(window.opener) && new URLSearchParams(window.location.search).get("origen") === "kayibal";

// alRecibir(fotos): cuando el panel manda fotos para mejorar.
export function escucharKayibal(alRecibir) {
  if (!abiertoDesdeKayibal()) return () => {};

  const oir = (e) => {
    if (!permitido(e.origin) || e.data?.tipo !== "kayibal-fotos:archivos") return;
    const fotos = (e.data.fotos || []).filter((f) => f instanceof Blob);
    if (fotos.length) alRecibir(fotos);
  };
  window.addEventListener("message", oir);
  // No se sabe el dominio exacto del panel: se avisa a cada uno permitido.
  for (const origen of ["https://kayibal.com", "https://www.kayibal.com", "http://localhost:5173", "http://localhost:5301"]) {
    try { window.opener.postMessage({ tipo: "kayibal-fotos:abierto" }, origen); } catch { /* otro dominio */ }
  }
  return () => window.removeEventListener("message", oir);
}

export function enviarAKayibal(fotos) {
  for (const origen of ["https://kayibal.com", "https://www.kayibal.com", "http://localhost:5173", "http://localhost:5301"]) {
    try { window.opener.postMessage({ tipo: "kayibal-fotos:listo", fotos }, origen); } catch { /* otro dominio */ }
  }
  window.close();
}
