import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import "./globals.css";
import { registerSW } from "virtual:pwa-register";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rootElement = document.getElementById("root");
const queryClient = new QueryClient();

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

registerSW({ immediate: true });
