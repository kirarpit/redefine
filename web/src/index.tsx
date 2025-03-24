import React from "react";
import ReactDOM from "react-dom/client";
import Redefine from "./components/Redefine";
import "./css/tailwind.css";
import "./css/custom.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Redefine />
  </React.StrictMode>
);
