
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "katex/dist/katex.min.css";
  import "./styles/index.css";
  import "./styles/katex-overrides.css";

  createRoot(document.getElementById("root")!).render(<App />);
  