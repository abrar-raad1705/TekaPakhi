import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SiteHeaderProvider } from "./context/SiteHeaderContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteHeaderProvider>
          <App />
        </SiteHeaderProvider>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          visibleToasts={3}
          duration={3000}
          closeButton
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
