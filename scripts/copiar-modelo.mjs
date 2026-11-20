// Copia a public/modelo/ el "cerebro" que quita el fondo (@imgly/background-removal-data).
// No se guarda en git (pesa ~150 MB): se copia antes de "dev" y de "build".
// Solo lo que se usa: modelos small y medium y los motores WebAssembly.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const origen = "node_modules/@imgly/background-removal-data/dist";
const destino = "public/modelo";
const recursos = JSON.parse(readFileSync(join(origen, "resources.json"), "utf8"));
const usar = Object.keys(recursos).filter((k) => !k.includes("training"));

mkdirSync(destino, { recursive: true });
const elegidos = {};
for (const clave of usar) {
  elegidos[clave] = recursos[clave];
  for (const pedazo of recursos[clave].chunks) {
    const archivo = pedazo.hash;
    if (!existsSync(join(destino, archivo))) cpSync(join(origen, archivo), join(destino, archivo));
  }
}
writeFileSync(join(destino, "resources.json"), JSON.stringify(elegidos));
console.log(`Modelo listo en ${destino} (${usar.length} recursos).`);
