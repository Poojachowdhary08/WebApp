import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { createUiPolish } from "../../utils/uiPolish";

const UiPolishContext = React.createContext(null);

export function UiPolishProvider({ config, children }) {
  const ui = React.useMemo(() => createUiPolish(config), [config]);

  return (
    <UiPolishContext.Provider value={ui}>
      {children}
      {ui.config.notifier.kind === "toastify" ? (
        <ToastContainer
          position={ui.config.notifier.position}
          autoClose={ui.config.notifier.autoCloseMs}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      ) : null}
    </UiPolishContext.Provider>
  );
}

export function useUiPolish() {
  const ctx = React.useContext(UiPolishContext);
  if (!ctx) {
    throw new Error("useUiPolish must be used within UiPolishProvider");
  }
  return ctx;
}

