import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
import { registerSW } from "virtual:pwa-register";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Navbar />
    <App />
    <Footer />
  </React.StrictMode>,
);

registerSW({ immediate: true });

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
