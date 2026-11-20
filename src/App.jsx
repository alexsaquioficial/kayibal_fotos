import { useCallback, useEffect, useRef, useState } from "react";
import { OPCIONES_INICIALES, aArchivo, cargarImagen, componer, quitarFondo } from "./procesar";
import { abiertoDesdeKayibal, enviarAKayibal, escucharKayibal } from "./kayibal";
import Comparador from "./Comparador";

let siguienteId = 1;

// Kayibal Fotos: subir fotos de productos, quitar el fondo, ponerlo blanco,
// recortar y centrar. Todo en este aparato. El vendedor ve el antes y el
// después y decide qué foto usar.
export default function App() {
  const [fotos, setFotos] = useState([]);
  const [opciones, setOpciones] = useState(OPCIONES_INICIALES);
  const [progreso, setProgreso] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const ocupado = useRef(false);
  const conKayibal = abiertoDesdeKayibal();

  const cambiarFoto = (id, cambios) => setFotos((lista) => lista.map((f) => (f.id === id ? { ...f, ...cambios } : f)));

  const agregar = useCallback((archivos) => {
    const nuevas = [...archivos].filter((a) => a.type.startsWith("image/")).map((archivo) => ({
      id: siguienteId++,
      nombre: archivo.name || `foto-${siguienteId}.jpg`,
      archivo,
      urlOriginal: URL.createObjectURL(archivo),
      estado: "esperando",
      usar: "mejorada",
    }));
    setFotos((lista) => [...lista, ...nuevas]);
  }, []);

  useEffect(() => escucharKayibal(agregar), [agregar]);

  // De una en una: quitar el fondo es pesado para el aparato.
  useEffect(() => {
    if (ocupado.current) return;
    const siguiente = fotos.find((f) => f.estado === "esperando");
    if (!siguiente) return;
    ocupado.current = true;
    cambiarFoto(siguiente.id, { estado: "procesando" });

    (async () => {
      try {
        const original = await cargarImagen(siguiente.archivo);
        let producto = original;
        if (opciones.quitarFondo) {
          const sinFondo = await quitarFondo(siguiente.archivo, opciones.calidad, (texto, porcentaje) => setProgreso({ texto, porcentaje }));
          producto = await cargarImagen(sinFondo);
        }
        cambiarFoto(siguiente.id, { estado: "listo", original, producto, recortado: opciones.quitarFondo });
      } catch (error) {
        console.error(error);
        cambiarFoto(siguiente.id, { estado: "error", usar: "original", error: "No se pudo mejorar esta foto en este aparato. Puedes usar la original.", detalle: String(error?.message || error).slice(0, 160) });
      } finally {
        setProgreso(null);
        ocupado.current = false;
        setFotos((lista) => [...lista]); // sigue con la próxima
      }
    })();
  }, [fotos, opciones.quitarFondo, opciones.calidad]);

  // Cada vez que cambia una opción, se vuelve a armar el resultado (rápido).
  useEffect(() => {
    let vigente = true;
    fotos.filter((f) => f.estado === "listo" && f.opcionesUsadas !== opciones).forEach(async (f) => {
      const lienzo = componer(f.producto, opciones, f.recortado);
      const archivo = await aArchivo(lienzo, f.nombre);
      if (!vigente) return;
      if (f.urlResultado) URL.revokeObjectURL(f.urlResultado);
      cambiarFoto(f.id, { resultado: archivo, urlResultado: URL.createObjectURL(archivo), opcionesUsadas: opciones });
    });
    return () => { vigente = false; };
  }, [fotos, opciones]);

  const cambiarOpcion = (campo, valor) => {
    setOpciones((o) => ({ ...o, [campo]: valor }));
    // Quitar fondo o la calidad cambian el recorte: se vuelven a procesar.
    if (campo === "quitarFondo" || campo === "calidad") {
      setFotos((lista) => lista.map((f) => (f.estado === "listo" || f.estado === "error" ? { ...f, estado: "esperando", opcionesUsadas: null, usar: "mejorada" } : f)));
    }
  };

  const quitar = (id) => setFotos((lista) => lista.filter((f) => f.id !== id));
  const elegidas = () => fotos.filter((f) => f.estado === "listo" || f.estado === "error")
    .map((f) => (f.usar === "original" || !f.resultado ? f.archivo : f.resultado));

  const descargarTodas = () => {
    for (const archivo of elegidas()) {
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(archivo), download: archivo.name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  };

  const pendientes = fotos.filter((f) => f.estado === "esperando" || f.estado === "procesando").length;
  const listas = fotos.length - pendientes;

  return (
    <main className="app">
      <header className="app__cabecera">
        <img src="/icono.svg" alt="" width="36" height="36" />
        <div>
          <h1>Kayibal Fotos</h1>
          <p>Fondo blanco, recortada y centrada. Se procesa en tu aparato: tus fotos no se suben a ningún lado.</p>
        </div>
      </header>

      <label
        className={`subir${arrastrando ? " subir--encima" : ""}${fotos.length ? " subir--chico" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files); }}
      >
        <input type="file" accept="image/*" multiple onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
        <span className="subir__icono" aria-hidden="true">＋</span>
        <strong>{fotos.length ? "Agregar más fotos" : "Elige o arrastra las fotos de tus productos"}</strong>
        {!fotos.length && <small>Puedes elegir varias a la vez. Tómalas con buena luz y el producto completo.</small>}
      </label>

      {fotos.length > 0 && (
        <section className="opciones" aria-label="Opciones">
          <label className="opcion"><input type="checkbox" checked={opciones.quitarFondo} onChange={(e) => cambiarOpcion("quitarFondo", e.target.checked)} /> Quitar el fondo</label>
          <label className="opcion"><input type="checkbox" checked={opciones.sombra} disabled={!opciones.quitarFondo} onChange={(e) => cambiarOpcion("sombra", e.target.checked)} /> Sombra suave</label>
          <label className="opcion"><input type="checkbox" checked={opciones.mejorarLuz} onChange={(e) => cambiarOpcion("mejorarLuz", e.target.checked)} /> Mejorar la luz</label>
          <label className="opcion opcion--rango">Margen
            <input type="range" min="0" max="0.2" step="0.01" value={opciones.margen} onChange={(e) => cambiarOpcion("margen", Number(e.target.value))} />
          </label>
          <label className="opcion">Fondo
            <select value={opciones.fondo} onChange={(e) => cambiarOpcion("fondo", e.target.value)}>
              <option value="#ffffff">Blanco</option>
              <option value="#f3f4f6">Gris claro</option>
              <option value="#fff7ed">Crema</option>
            </select>
          </label>
          <label className="opcion">Recorte
            <select value={opciones.calidad} disabled={!opciones.quitarFondo} onChange={(e) => cambiarOpcion("calidad", e.target.value)}>
              <option value="normal">Rápido</option>
              <option value="alta">Alta calidad (más lento)</option>
            </select>
          </label>
        </section>
      )}

      {progreso && (
        <div className="progreso" role="status">
          <span>{progreso.texto}… {progreso.porcentaje}%</span>
          <div className="progreso__barra"><div style={{ width: `${progreso.porcentaje}%` }} /></div>
        </div>
      )}

      <ul className="fotos">
        {fotos.map((f) => (
          <li key={f.id} className="foto">
            {f.estado === "listo" && f.urlResultado ? (
              <Comparador antes={f.urlOriginal} despues={f.urlResultado} />
            ) : (
              <div className="foto__espera">
                <img src={f.urlOriginal} alt="" />
                <span>{f.estado === "error" ? "⚠️" : f.estado === "procesando" ? "Mejorando…" : "En espera"}</span>
              </div>
            )}
            <div className="foto__pie">
              <small title={f.nombre}>{f.nombre}</small>
              {f.error && <p className="foto__error">{f.error}{f.detalle && <small className="foto__detalle">Detalle: {f.detalle}</small>}</p>}
              {(f.estado === "listo" || f.estado === "error") && (
                <div className="elegir" role="radiogroup" aria-label="Qué foto usar">
                  {f.estado === "listo" && (
                    <button type="button" className={f.usar === "mejorada" ? "activo" : ""} onClick={() => cambiarFoto(f.id, { usar: "mejorada" })}>✓ Mejorada</button>
                  )}
                  <button type="button" className={f.usar === "original" ? "activo" : ""} onClick={() => cambiarFoto(f.id, { usar: "original" })}>Original</button>
                  <button type="button" className="quitar" onClick={() => quitar(f.id)} aria-label="Quitar">✕</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="app__pie">
        Kayibal Fotos es software libre (AGPL-3.0).{" "}
        <a href="https://github.com/alexsaquioficial/kayibal_fotos" target="_blank" rel="noreferrer">Código fuente</a>
      </p>

      {listas > 0 && (
        <footer className="acciones">
          <span>{pendientes ? `Faltan ${pendientes}…` : `${listas} ${listas === 1 ? "foto lista" : "fotos listas"}`}</span>
          {conKayibal ? (
            <button type="button" className="boton" disabled={pendientes > 0} onClick={() => enviarAKayibal(elegidas())}>Usar en mi producto</button>
          ) : (
            <button type="button" className="boton" disabled={pendientes > 0} onClick={descargarTodas}>Descargar {listas === 1 ? "foto" : "todas"}</button>
          )}
        </footer>
      )}
    </main>
  );
}
