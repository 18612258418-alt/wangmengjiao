
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { DemoAccessGate } from "./features/demo/DemoAccessGate.tsx";
  import "katex/dist/katex.min.css";
  import "./styles/index.css";
  import "./styles/katex-overrides.css";

  createRoot(document.getElementById("root")!).render(
    <DemoAccessGate>
      <App />
    </DemoAccessGate>,
  );
  