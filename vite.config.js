import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Kayibal Fotos: proyecto aparte (fotos.kayibal.com). Todo se procesa en el
// navegador del vendedor; el servidor solo entrega la página y el modelo.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@imgly/background-removal"] },
});
