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
          position="top-center"
          richColors
          expand={false}
          visibleToasts={3}
          duration={3000}
          toastOptions={{
            duration: 3000,
            className: "!bg-white !border-gray-200 !shadow-xl !rounded-xl !text-gray-900 !py-3.5 !px-4",
            actionButton: {
              className: "!bg-primary-600 !text-white !font-bold !px-4 !py-2 !rounded-lg hover:!bg-primary-700 !transition-all !shadow-sm !text-sm"
            },
            descriptionClassName: "!text-gray-700 !font-medium !mt-1 !text-sm"
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
