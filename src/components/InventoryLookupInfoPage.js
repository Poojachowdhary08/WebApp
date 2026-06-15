import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { API_BASE } from "../config";
import { StatusBox } from "../ui/StatusBox";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search || ""), [search]);
}

function safeString(v) {
  return String(v ?? "").trim();
}

export default function InventoryLookupInfoPage() {
  const q = useQuery();

  const parsed_item_name = safeString(q.get("parsed_item_name"));
  const parsed_location = safeString(q.get("parsed_location"));
  const parsed_warehouse = safeString(q.get("parsed_warehouse"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const canLookup = !!(parsed_item_name && parsed_location && parsed_warehouse);

  const displayItemName = useMemo(() => {
    if (parsed_item_name) return parsed_item_name;
    const fromData =
      data?.parsed_item_name ||
      data?.item_name ||
      data?.item?.item_name ||
      data?.item?.name ||
      data?.inventory?.item_name;
    return safeString(fromData) || "—";
  }, [data, parsed_item_name]);

  const runLookup = async () => {
    setError("");
    setData(null);

    if (!canLookup) {
      setError("Missing QR params. Expected parsed_item_name, parsed_location, parsed_warehouse.");
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/lookup/inventory`);
      url.searchParams.set("parsed_item_name", parsed_item_name);
      url.searchParams.set("parsed_location", parsed_location);
      url.searchParams.set("parsed_warehouse", parsed_warehouse);

      const res = await fetch(url.toString());
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.detail || json?.message || `Lookup failed (status ${res.status})`);
      setData(json);
    } catch (e) {
      setError(String(e?.message || "Lookup failed."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed_item_name, parsed_location, parsed_warehouse]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: "#F3F4F6", minHeight: "100vh" }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #E5E7EB", bgcolor: "#fff" }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#111827" }}>
          Inventory Lookup
        </Typography>

        <Typography sx={{ mt: 0.5, fontSize: 12, color: "#6B7280" }}>
          This page shows a basic lookup only. For full details and actions, please use the <b>mobile app</b>.
        </Typography>

        <Box sx={{ mt: 1.5 }}>
          <StatusBox
            variant="info"
            title="Item"
            actions={
              <Button
                variant="outlined"
                size="small"
                onClick={runLookup}
                disabled={loading}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
              >
                Refresh
              </Button>
            }
          >
            {displayItemName}
          </StatusBox>
        </Box>

        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <StatusBox
              variant="error"
              title="Lookup failed"
              actions={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={runLookup}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </StatusBox>
          ) : data ? null : null}
        </Box>
      </Paper>
    </Box>
  );
}

