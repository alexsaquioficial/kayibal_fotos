import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./estilos.css";
import { registrarGuardado } from "./descarga";

registrarGuardado();

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
