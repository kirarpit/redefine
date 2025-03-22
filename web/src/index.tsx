import React from "react";
import ReactDOM from "react-dom/client";
// import MyApp from "./App";
import Redefine from "./redefine";
import "./css/tailwind.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Redefine />
  </React.StrictMode>
);
