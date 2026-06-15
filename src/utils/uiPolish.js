import React from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { toast } from "react-toastify";

const DEFAULT_EMPTY_MESSAGE = "No data found.";
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function safeGet(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  } catch {
    return undefined;
  }
}

/**
 * Config-based UI polish helpers (loading/empty/error + formatting + notifications).
 *
 * Usage:
 *   const ui = createUiPolish({
 *     appName: "a_nxt",
 *     locale: "en-IN",
 *     currency: "INR",
 *     notifier: { kind: "toastify" },
 *   });
 *
 *   const save = ui.useAsyncAction({
 *     actionName: "save property",
 *     messages: { success: "Saved", error: "Save failed" },
 *   });
 *
 *   <ui.AsyncState
 *     status={load.status}
 *     isEmpty={!rows?.length}
 *     error={load.error}
 *     onRetry={load.run}
 *   >
 *     ...
 *   </ui.AsyncState>
 */
export function createUiPolish(userConfig = {}) {
  const config = {
    appName: userConfig.appName,
    locale: userConfig.locale || "en-US",
    currency: userConfig.currency || "USD",
    notifier: {
      kind: userConfig.notifier?.kind || "toastify", // "toastify" | "none"
      position: userConfig.notifier?.position || "bottom-center",
      autoCloseMs: userConfig.notifier?.autoCloseMs ?? 3500,
    },
    messages: {
      empty: userConfig.messages?.empty || DEFAULT_EMPTY_MESSAGE,
      error: userConfig.messages?.error || DEFAULT_ERROR_MESSAGE,
    },
    errorPaths: userConfig.errorPaths || [
      "response.data.detail",
      "response.data.message",
      "response.data.error",
      "data.detail",
      "data.message",
      "message",
    ],
  };

  function formatDate(value, opts = {}) {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const fmt = new Intl.DateTimeFormat(config.locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      ...opts,
    });
    return fmt.format(d);
  }

  function formatCurrency(amount, opts = {}) {
    const n = typeof amount === "string" ? Number(amount) : amount;
    if (!Number.isFinite(n)) return "";
    const fmt = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      maximumFractionDigits: 2,
      ...opts,
    });
    return fmt.format(n);
  }

  function getErrorMessage(err, overrides = {}) {
    if (!err) return overrides.fallback || config.messages.error;
    if (isNonEmptyString(err)) return err;

    const paths = overrides.errorPaths || config.errorPaths;
    for (const p of paths) {
      const v = safeGet(err, p);
      if (isNonEmptyString(v)) return v.trim();
    }

    if (err instanceof Error && isNonEmptyString(err.message)) return err.message.trim();
    return overrides.fallback || config.messages.error;
  }

  function notify(severity, message, options = {}) {
    if (!isNonEmptyString(message)) return;
    if (config.notifier.kind === "none") return;

    const toastOptions = {
      position: options.position || config.notifier.position,
      autoClose: options.autoCloseMs ?? config.notifier.autoCloseMs,
    };

    // react-toastify supports these methods.
    if (severity === "success") toast.success(message, toastOptions);
    else if (severity === "error") toast.error(message, toastOptions);
    else if (severity === "warning") toast.warning(message, toastOptions);
    else toast.info(message, toastOptions);
  }

  function useAsyncAction(actionConfig = {}) {
    const {
      actionName,
      messages,
      successToast = true,
      errorToast = true,
      errorPaths,
      onSuccess,
      onError,
    } = actionConfig;

    const [status, setStatus] = React.useState("idle"); // idle | loading | success | error
    const [error, setError] = React.useState(null);
    const [result, setResult] = React.useState(null);

    const run = React.useCallback(
      async (fn, ...args) => {
        setStatus("loading");
        setError(null);
        try {
          const res = await fn(...args);
          setResult(res);
          setStatus("success");
          if (successToast && isNonEmptyString(messages?.success)) notify("success", messages.success);
          onSuccess?.(res);
          return res;
        } catch (e) {
          setStatus("error");
          setError(e);
          const msg =
            (isNonEmptyString(messages?.error) && messages.error) ||
            (actionName ? `Failed to ${actionName}` : null) ||
            config.messages.error;
          const detail = getErrorMessage(e, { fallback: msg, errorPaths });
          if (errorToast) notify("error", detail);
          onError?.(e);
          throw e;
        }
      },
      [actionName, errorPaths, errorToast, messages?.error, messages?.success, onError, onSuccess, successToast]
    );

    return {
      status,
      isLoading: status === "loading",
      isError: status === "error",
      isSuccess: status === "success",
      error,
      errorMessage: status === "error" ? getErrorMessage(error) : "",
      result,
      run,
      reset: () => {
        setStatus("idle");
        setError(null);
        setResult(null);
      },
    };
  }

  function AsyncState({
    status,
    isEmpty,
    emptyMessage,
    error,
    errorMessage,
    onRetry,
    loadingMessage = "Loading…",
    children,
    sx,
  }) {
    const resolvedErrorMessage =
      (isNonEmptyString(errorMessage) && errorMessage) ||
      (error ? getErrorMessage(error) : "") ||
      config.messages.error;

    if (status === "loading") {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2, ...sx }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {loadingMessage}
          </Typography>
        </Box>
      );
    }

    if (status === "error") {
      return (
        <Box sx={{ py: 1.5, ...sx }}>
          <Alert
            severity="error"
            action={
              typeof onRetry === "function" ? (
                <Button color="inherit" size="small" onClick={onRetry}>
                  Retry
                </Button>
              ) : null
            }
          >
            {resolvedErrorMessage}
          </Alert>
        </Box>
      );
    }

    if (isEmpty) {
      return (
        <Box sx={{ py: 2, ...sx }}>
          <Alert severity="info">{isNonEmptyString(emptyMessage) ? emptyMessage : config.messages.empty}</Alert>
        </Box>
      );
    }

    return <>{children}</>;
  }

  return {
    config,
    formatDate,
    formatCurrency,
    getErrorMessage,
    notify,
    useAsyncAction,
    AsyncState,
  };
}

