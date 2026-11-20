# Kayibal Fotos

Proyecto aparte de Kayibal (`fotos.kayibal.com`): deja lista la foto de un producto.

- Quita el fondo y pone uno blanco (o gris claro / crema).
- Recorta, centra y deja un margen parejo, en formato cuadrado (1000 × 1000).
- Mejora la luz si salió oscura. Sombra suave opcional.
- Varias fotos a la vez. Antes / después deslizando, y el vendedor elige: mejorada u original.
- Sale en WebP liviano (JPEG si el navegador no puede).

**Todo se procesa en el aparato del vendedor.** Las fotos no se suben a ningún servidor
para procesarse. La primera vez se descarga el recortador (~44 MB; queda guardado).

## Cómo funciona

| Archivo | Qué hace |
|---|---|
| `src/procesar.js` | `quitarFondo()` (modelo de `@imgly/background-removal`) y `componer()` (fondo, recorte, centro, luz, sombra) |
| `src/App.jsx` | Subir, opciones, cola (de una en una), elegir y descargar / enviar a Kayibal |
| `src/Comparador.jsx` | Antes / después |
| `src/kayibal.js` | Conexión con el panel de Kayibal (ver abajo) |
| `scripts/copiar-modelo.mjs` | Copia el modelo a `public/modelo/` antes de `dev` y `build` (no va en git) |

El modelo se sirve desde esta misma página (`/modelo/`), sin depender de otros servidores.

## Conexión con el panel de Kayibal

El panel abre `https://fotos.kayibal.com/?origen=kayibal` con `window.open()`:

1. Esta página avisa: `{ tipo: "kayibal-fotos:abierto" }`.
2. El panel puede mandar fotos: `{ tipo: "kayibal-fotos:archivos", fotos: [File] }`.
3. Al dar «Usar en mi producto» devuelve `{ tipo: "kayibal-fotos:listo", fotos: [File] }` y se cierra.

Solo habla con `kayibal.com` (y `localhost` para pruebas).

## Publicar (Cloudflare Pages)

- Comando de build: `npm run build` · Carpeta: `dist`
- Dominio: `fotos.kayibal.com`

## Licencia

Este proyecto es **público y libre (AGPL-3.0, ver `LICENSE.md`)**, porque usa
`@imgly/background-removal`, que tiene esa licencia. La página muestra el enlace
«Código fuente», como pide la licencia.

**Está separado a propósito del resto de Kayibal** (API, panel, admin y tienda web,
que siguen privados):

- No comparte código con ellos ni los importa.
- No tiene contraseñas, llaves ni datos de tiendas: todo pasa en el navegador.
- Con el panel solo se comunica enviando y recibiendo fotos (`postMessage`,
  ver arriba), como dos programas distintos.

No agregues aquí código del sistema principal ni datos privados.
