import { useState } from "react";

// Antes / después: se desliza para comparar la foto original con la mejorada.
export default function Comparador({ antes, despues }) {
  const [corte, setCorte] = useState(50);

  return (
    <div className="comparador">
      <img src={despues} alt="Foto mejorada" />
      <div className="comparador__antes" style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}>
        <img src={antes} alt="Foto original" />
      </div>
      <div className="comparador__linea" style={{ left: `${corte}%` }} aria-hidden="true" />
      <span className="comparador__etiqueta comparador__etiqueta--izq">Antes</span>
      <span className="comparador__etiqueta comparador__etiqueta--der">Después</span>
      <input type="range" min="0" max="100" value={corte} onChange={(e) => setCorte(Number(e.target.value))} aria-label="Comparar antes y después" />
    </div>
  );
}
