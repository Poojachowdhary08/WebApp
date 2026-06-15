// InventoryRequestDialog.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../config";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  IconButton,
  Typography,
  Select,
  MenuItem,
  Box,
  TextField,
  Button,
  Snackbar,
  Alert,
  DialogActions,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Divider,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import { useTheme, useMediaQuery } from "@mui/material";

const InventoryRequestDialog = ({
  open = false,
  handleClose,
  selectedRequest,
  refreshRequests,
  refreshSelectedRequest,
  isInlineView = false,
}) => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [error, setError] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [availableMapping, setAvailableMapping] = useState({});
  const [warehouseLocations, setWarehouseLocations] = useState({});
  const [requestUpdates, setRequestUpdates] = useState([]);

  const [activeTab, setActiveTab] = useState(0); // 0 = Inventory Requested, 1 = All Requests

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessageDialog, setErrorMessageDialog] = useState("");

  const [closeRequestDialogOpen, setCloseRequestDialogOpen] = useState(false);
  const [closeRequestReason, setCloseRequestReason] = useState("");
  const [closingRequest, setClosingRequest] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [hasMultipleWarehouseLocations, setHasMultipleWarehouseLocations] = useState(false);

  // ✅ All Requests split UI states
  const [allReqSearch, setAllReqSearch] = useState("");
  const [allReqStatusFilter, setAllReqStatusFilter] = useState("ALL");
  const [selectedAllReqId, setSelectedAllReqId] = useState(null);

  // ✅ Chat input for All Requests panel
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // ✅ keep old dialog capability (optional)
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // (kept, but we won't use mobile UI branching)

  const roleString = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = roleString.includes("admin");

  const meCode = localStorage.getItem("employee_code") || "";

  const actorDisplayName = (() => {
    const fn = (localStorage.getItem("first_name") || "").trim();
    const ln = (localStorage.getItem("last_name") || "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    const email = localStorage.getItem("email");
    return email ? email.split("@")[0] : "User";
  })();

  const isRequestEditable =
    selectedRequest?.status === "requested" ||
    (selectedRequest?.status === "partially_issued" &&
      (selectedRequest?.requested_quantity ?? 0) > (selectedRequest?.issued_quantity ?? 0));

  const [selectedRequestState, setSelectedRequestState] = useState(selectedRequest);

  useEffect(() => {
    setSelectedRequestState(selectedRequest);
  }, [selectedRequest]);

  const hasRejectRow = useMemo(
    () => rowData.some((r) => (r.action === "request" ? "requested" : r.action) === "reject"),
    [rowData]
  );

  const toNumber = (val, defaultVal = 0) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : defaultVal;
  };

  const prettifyStatus = (s) => {
    const v = String(s || "").trim();
    if (!v) return "—";
    return v.replaceAll("_", " ").toUpperCase();
  };

  const statusChip = (statusRaw) => {
    const status = String(statusRaw || "").toLowerCase();
    const map = {
      requested: { label: "REQUESTED", bg: "#E9F2FF", color: "#1D4ED8", bd: "#BBD7FF" },
      raised: { label: "RAISED", bg: "#FFF7ED", color: "#C2410C", bd: "#FED7AA" },
      issued: { label: "ISSUED", bg: "#ECFDF3", color: "#047857", bd: "#BBF7D0" },
      rejected: { label: "REJECTED", bg: "#FEF2F2", color: "#B91C1C", bd: "#FECACA" },
      closed: { label: "CLOSED", bg: "#F3F4F6", color: "#374151", bd: "#E5E7EB" },
      partially_issued: { label: "PARTIALLY ISSUED", bg: "#F0FDFA", color: "#0F766E", bd: "#99F6E4" },
    };
    const cfg =
      map[status] || { label: prettifyStatus(statusRaw), bg: "#EEF2FF", color: "#3730A3", bd: "#C7D2FE" };

    return (
      <Chip
        label={cfg.label}
        size="small"
        sx={{
          fontWeight: 900,
          letterSpacing: 0.6,
          bgcolor: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.bd}`,
          height: 24,
        }}
      />
    );
  };

  const formatDateTime = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchInventoryData = async () => {
    if (!selectedRequest?.item_name) return;

    setLoading(true);
    setError("");
    setRowData([]);
    setHasMultipleWarehouseLocations(false);

    try {
      const itemNameEncoded = encodeURIComponent(selectedRequest.item_name);
      const response = await axios.get(`${API_BASE}/single/inventory/${itemNameEncoded}`);
      const inventoryData = response.data?.inventory;

      if (!inventoryData || inventoryData.length === 0) {
        const fallbackWarehouse = "New Item, Not in WareHouse";
        const fallbackLocation = selectedRequest.location || "UNKNOWN";

        setRowData([
          {
            item_name: selectedRequest.item_name,
            available_quantity: 0,
            warehouse: fallbackWarehouse,
            location: fallbackLocation,
            editableRequestedAmount: selectedRequest.requested_quantity,
            status: "requested",
            action: "raise",
          },
        ]);

        setWarehouses([fallbackWarehouse]);
        setAvailableMapping({ [fallbackWarehouse]: { [fallbackLocation]: 0 } });
        setWarehouseLocations({ [fallbackWarehouse]: [fallbackLocation] });
        setHasMultipleWarehouseLocations(false);
        return;
      }

      const availableMappingObj = {};
      inventoryData.forEach((item) => {
        if (!availableMappingObj[item.warehouse]) availableMappingObj[item.warehouse] = {};
        availableMappingObj[item.warehouse][item.location] = item.available_quantity;
      });
      setAvailableMapping(availableMappingObj);

      const warehouseList = Object.keys(availableMappingObj);
      setWarehouses(warehouseList);

      const locationMapping = {};
      warehouseList.forEach((warehouse) => {
        locationMapping[warehouse] = Object.keys(availableMappingObj[warehouse] || {});
      });
      setWarehouseLocations(locationMapping);

      const warehouseLocationPairCount = warehouseList.reduce(
        (n, wh) => n + Object.keys(availableMappingObj[wh] || {}).length,
        0
      );
      setHasMultipleWarehouseLocations(warehouseLocationPairCount > 1);

      // Default warehouse/location: avoid picking API row order (often first row = 0 qty).
      // 1) Use request's warehouse+location if present in map and quantity > 0
      // 2) Else use the warehouse+location pair with the highest available quantity
      const reqWh = String(selectedRequest.warehouse || "").trim();
      const reqLoc = String(selectedRequest.location || "").trim();
      const reqInMap =
        reqWh &&
        reqLoc &&
        availableMappingObj[reqWh] &&
        Object.prototype.hasOwnProperty.call(availableMappingObj[reqWh], reqLoc);
      const reqPairQty = reqInMap ? toNumber(availableMappingObj[reqWh][reqLoc], 0) : 0;

      let pickWh = "";
      let pickLoc = "";
      let availQty = 0;

      if (reqInMap && reqPairQty > 0) {
        pickWh = reqWh;
        pickLoc = reqLoc;
        availQty = reqPairQty;
      } else {
        let best = -1;
        for (const wh of warehouseList) {
          for (const loc of Object.keys(availableMappingObj[wh] || {})) {
            const q = toNumber(availableMappingObj[wh][loc], 0);
            if (q > best) {
              best = q;
              pickWh = wh;
              pickLoc = loc;
            }
          }
        }
        if (best >= 0) {
          availQty = best;
        }
        if (!pickWh || !pickLoc) {
          pickWh = inventoryData[0]?.warehouse || warehouseList[0] || "";
          pickLoc =
            (locationMapping[pickWh] && locationMapping[pickWh][0]) || selectedRequest.location || "";
          availQty = toNumber(availableMappingObj[pickWh]?.[pickLoc], 0);
        }
      }

      setRowData([
        {
          item_name: selectedRequest.item_name,
          available_quantity: availQty,
          warehouse: pickWh,
          location: pickLoc,
          editableRequestedAmount: selectedRequest.requested_quantity,
          status: "requested",
          action: toNumber(selectedRequest.requested_quantity, 0) > availQty ? "raise" : "issue",
        },
      ]);
    } catch (err) {
      const fallbackWarehouse = "New Item, Not in WareHouse";
      const fallbackLocation = selectedRequest.location || "UNKNOWN";

      setRowData([
        {
          item_name: selectedRequest.item_name,
          available_quantity: 0,
          warehouse: fallbackWarehouse,
          location: fallbackLocation,
          editableRequestedAmount: selectedRequest.requested_quantity,
          status: "requested",
          action: "raise",
        },
      ]);

      setWarehouses([fallbackWarehouse]);
      setAvailableMapping({ [fallbackWarehouse]: { [fallbackLocation]: 0 } });
      setWarehouseLocations({ [fallbackWarehouse]: [fallbackLocation] });
      setHasMultipleWarehouseLocations(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestUpdates = async () => {
    if (!selectedRequest?.item_name) return;

    setLoadingUpdates(true);
    try {
      const itemNameEncoded = encodeURIComponent(selectedRequest.item_name);
      const response = await axios.get(`${API_BASE}/request-item/${itemNameEncoded}`);

      if (response.data?.requests) {
        const sorted = response.data.requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRequestUpdates(sorted);
      } else {
        setRequestUpdates([]);
      }
    } catch (error) {
      console.error("Failed to fetch request updates:", error);
      setRequestUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  useEffect(() => {
    if (!selectedRequest) return;
    if (isInlineView) fetchInventoryData();
    else if (open) fetchInventoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest, open, isInlineView]);

  useEffect(() => {
    if (activeTab === 1 && selectedRequest?.item_name) fetchRequestUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedRequest?.item_name]);

  const handleFieldChange = (index, field, value) => {
    setRowData((prevRows) => {
      const newRows = [...prevRows];
      const row = { ...newRows[index] };

      if (field === "warehouse") {
        row.warehouse = value;

        const locationsForWarehouse = warehouseLocations[value] || [];
        const newLocation = locationsForWarehouse.length ? locationsForWarehouse[0] : "";
        row.location = newLocation;
        row.available_quantity = toNumber(availableMapping[value]?.[newLocation], 0);
      } else if (field === "location") {
        row.location = value;
        row.available_quantity = toNumber(availableMapping[row.warehouse]?.[value], 0);
      } else if (field === "editableRequestedAmount") {
        row.editableRequestedAmount = Math.max(0, toNumber(value, 0));
      } else {
        row[field] = value;
      }

      newRows[index] = row;
      return newRows;
    });
  };

  const handleActionChange = (index, value) => {
    setRowData((prevRows) => {
      const newRows = [...prevRows];
      newRows[index] = { ...newRows[index], action: value };
      return newRows;
    });
  };

  const handleDeleteRow = (index) => {
    setRowData((prevRows) => prevRows.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    if (!selectedRequest) return;
    setRowData((prevRows) => [
      ...prevRows,
      {
        item_name: selectedRequest.item_name,
        available_quantity: "",
        warehouse: "",
        location: "",
        editableRequestedAmount: selectedRequest.requested_quantity,
        status: "requested",
        action: "issue",
      },
    ]);
  };

  function formatProcessError(detail) {
    const d = String(detail || "").trim();
    if (!d) return "Unknown error occurred";

    // Backend error example: "Limit exceeded: limit=250.0 used=250.0 trying=17.0"
    const m = d.match(/Limit exceeded:\s*limit=([\d.]+)\s*used=([\d.]+)\s*trying=([\d.]+)/i);
    if (m) {
      const limit = Number(m[1]);
      const used = Number(m[2]);
      const trying = Number(m[3]);
      const remaining = Number.isFinite(limit) && Number.isFinite(used) ? Math.max(0, limit - used) : null;
      const remainingText = remaining === null ? "" : ` Remaining allowed: ${remaining}.`;
      return `Limit reached. Allowed: ${m[1]}, already used: ${m[2]}, trying to add: ${m[3]}.${remainingText}`;
    }

    return d;
  }

  const handleProcessAllRows = async () => {
    if (!selectedRequest || processing) return;

    if (rowData.length === 0) {
      setErrorMessageDialog("No rows to process.");
      setErrorDialogOpen(true);
      return;
    }

    const anyReject = rowData.some(
      (r) => (r.action === "request" ? "requested" : r.action) === "reject"
    );
    if (anyReject && !rejectReason.trim()) {
      setErrorMessageDialog("Please enter a rejection reason before processing.");
      setErrorDialogOpen(true);
      return;
    }

    const trimmedRejectReason = rejectReason.trim();

    for (const row of rowData) {
      const quantityValue = toNumber(row.editableRequestedAmount, 0);
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setErrorMessageDialog("Quantity must be a valid number greater than zero.");
        setErrorDialogOpen(true);
        return;
      }
    }

    setProcessing(true);
    try {
      for (const row of rowData) {
        const quantityValue = toNumber(row.editableRequestedAmount, 0);
        let actionType = row.action === "request" ? "requested" : row.action;
        let apiUrl = "";

        let payload = {
          request_id: selectedRequest.request_id,
          engineer_id: selectedRequest.engineer_id ?? "UNKNOWN",
          invoice_id: toNumber(selectedRequest.invoice_id, 0),
          item_name: selectedRequest.item_name ?? "Unknown Item",
          requested_quantity: toNumber(selectedRequest.requested_quantity, 0),
          status: row.status ?? "requested",
          warehouse: row.warehouse,
          location: row.location,
          performed_by: actorDisplayName,
          project_name: selectedRequest.project_name ?? "Unknown Project",
          property_name: selectedRequest.property_name ?? "Unknown Property",
          // Send canonical ids when available so backend resolves the *right* property_inventory row.
          project_id:
            selectedRequest.project_id ??
            selectedRequest.projectid ??
            selectedRequest.projectId ??
            selectedRequest.projectID ??
            null,
          property_id:
            selectedRequest.property_id ??
            selectedRequest.propertyid ??
            selectedRequest.propertyId ??
            selectedRequest.propertyID ??
            null,
          p_req_id: selectedRequest.p_req_id ?? selectedRequest.request_id,
          deli_date: selectedRequest.deli_date ?? new Date().toISOString().slice(0, 19) + "Z",
          item_type: selectedRequest.item_type ?? "general",
        };

        switch (actionType) {
          case "issue":
            apiUrl = `${API_BASE}/issue-stock-up`;
            payload.issued_quantity = quantityValue;
            payload.status = "issued";
            break;

          case "raise":
            apiUrl = `${API_BASE}/raise-stock`;
            payload.requested_quantity = quantityValue;
            payload.status = "raised";
            break;

          case "reject":
            apiUrl = `${API_BASE}/reject-stock`;
            payload.rejected_quantity = quantityValue;
            payload.rejection_reason = trimmedRejectReason;
            payload.status = "rejected";
            break;

          case "requested":
            apiUrl = `${API_BASE}/request-stock`;
            payload.status = "requested";
            payload.requested_quantity = quantityValue;
            break;

          default:
            console.error("Invalid action type:", actionType);
            continue;
        }

        try {
          await axios.post(apiUrl, payload);

          await axios.post(`${API_BASE}/send-whatsapp-update/`, null, {
            params: { request_id: selectedRequest.request_id },
          });
        } catch (error) {
          const errorDetail =
            error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message ||
            "Unknown error occurred";

          setErrorMessageDialog(`Failed to process ${row.item_name}:\n\n${formatProcessError(errorDetail)}`);
          setErrorDialogOpen(true);

          await fetchInventoryData();
          await fetchRequestUpdates();
          await refreshSelectedRequest?.();
          await refreshRequests?.();
          return;
        }
      }

      setRejectReason("");
      setSuccessMessage("Processing completed successfully for all rows!");
      setSuccessDialogOpen(true);

      await fetchInventoryData();
      await fetchRequestUpdates();
      await refreshSelectedRequest?.();
      await refreshRequests?.();

      setTimeout(() => setSuccessDialogOpen(false), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseRequest = async () => {
    if (!selectedRequest) return;

    if (!closeRequestReason || !closeRequestReason.trim()) {
      setErrorMessageDialog("Reason is required to close the request.");
      setErrorDialogOpen(true);
      return;
    }

    setClosingRequest(true);
    try {
      const employeeCode = localStorage.getItem("employee_code") || "";
      if (!employeeCode) throw new Error("Employee code not found. Please log in again.");

      const formData = new FormData();
      formData.append("request_id", selectedRequest.p_req_id || selectedRequest.request_id);
      formData.append("employee_code", employeeCode);
      formData.append("reason", closeRequestReason.trim());

      const response = await axios.post(`${API_BASE}/close-request-with-remaining-items/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMessage(response.data?.message || "Request closed successfully");
      setSuccessDialogOpen(true);
      setCloseRequestDialogOpen(false);
      setCloseRequestReason("");

      await fetchInventoryData();
      await fetchRequestUpdates();
      await refreshSelectedRequest?.();
      await refreshRequests?.();

      setTimeout(() => {
        setSuccessDialogOpen(false);
        handleClose?.();
      }, 3000);
    } catch (error) {
      const errorDetail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to close request";
      setErrorMessageDialog(`Failed to close request:\n\n${errorDetail}`);
      setErrorDialogOpen(true);
    } finally {
      setClosingRequest(false);
    }
  };

  /* ============================================================================
     ✅ ALL REQUESTS (split view) — derived data
  ============================================================================ */

  const groupedAllRequests = useMemo(() => {
    const groupsMap = new Map();

    (requestUpdates || []).forEach((r) => {
      const id = r?.p_req_id || r?.request_id;
      if (!id) return;

      const prev = groupsMap.get(id);
      if (!prev) {
        groupsMap.set(id, r);
      } else {
        const prevTime = new Date(prev?.created_at || prev?.updated_at || 0).getTime();
        const curTime = new Date(r?.created_at || r?.updated_at || 0).getTime();
        if (curTime > prevTime) groupsMap.set(id, r);
      }
    });

    return Array.from(groupsMap.entries())
      .map(([id, row]) => ({ id, row }))
      .sort((a, b) => {
        const ta = new Date(a.row?.created_at || a.row?.updated_at || 0).getTime();
        const tb = new Date(b.row?.created_at || b.row?.updated_at || 0).getTime();
        return tb - ta;
      });
  }, [requestUpdates]);

  const filteredAllRequests = useMemo(() => {
    const normalizedSearch = allReqSearch.trim().toLowerCase();

    return groupedAllRequests.filter(({ row }) => {
      const status = String(row?.status || "").toLowerCase();
      const okStatus = allReqStatusFilter === "ALL" ? true : status === allReqStatusFilter.toLowerCase();
      if (!okStatus) return false;

      if (!normalizedSearch) return true;

      const hay = [
        row?.request_id,
        row?.p_req_id,
        row?.item_name,
        row?.engineer_name,
        row?.project_name,
        row?.property_name,
        row?.warehouse,
        row?.location,
        row?.initial_remark,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(normalizedSearch);
    });
  }, [groupedAllRequests, allReqSearch, allReqStatusFilter]);

  const selectedAllRequestRow = useMemo(() => {
    const byFiltered = filteredAllRequests.find((x) => x.id === selectedAllReqId)?.row;
    if (byFiltered) return byFiltered;

    const byAll = groupedAllRequests.find((x) => x.id === selectedAllReqId)?.row;
    if (byAll) return byAll;

    return filteredAllRequests[0]?.row || groupedAllRequests[0]?.row || null;
  }, [filteredAllRequests, groupedAllRequests, selectedAllReqId]);

  // Auto-select first request once loaded
  useEffect(() => {
    if (activeTab !== 1) return;
    if (!selectedAllReqId && selectedAllRequestRow) {
      const id = selectedAllRequestRow?.p_req_id || selectedAllRequestRow?.request_id || null;
      if (id) setSelectedAllReqId(id);
    }
  }, [activeTab, selectedAllReqId, selectedAllRequestRow]);

  // Keep selection valid after filtering
  useEffect(() => {
    if (activeTab !== 1) return;
    if (!selectedAllRequestRow) return;
    const id = selectedAllRequestRow?.p_req_id || selectedAllRequestRow?.request_id || null;
    if (!id) return;
    if (selectedAllReqId !== id) setSelectedAllReqId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAllRequestRow]);

  const getChatMessages = useCallback((row) => {
    if (!row) return [];

    const rh = Array.isArray(row?.remarks_history) ? row.remarks_history : [];

    if (rh.length > 0) {
      return rh
        .map((x) => ({
          remark: x?.remark,
          created_at: x?.created_at || x?.timestamp || row?.updated_at || row?.created_at,
          by: x?.by || x?.performed_by || x?.employee_name || x?.engineer_name || "User",
          employee_code: x?.employee_code || x?.performed_by_code || "",
          attachments: x?.attachments || x?.files || [],
          formatted_time: x?.formatted_time,
        }))
        .filter((x) => x.remark || (x.attachments && x.attachments.length));
    }

    const fallback = [];
    if (row?.initial_remark && String(row.initial_remark).trim()) {
      fallback.push({
        remark: row.initial_remark,
        created_at: row?.created_at || row?.updated_at,
        by: row?.engineer_name || "Engineer",
        employee_code: row?.engineer_id || "",
        attachments: [],
      });
    }
    return fallback;
  }, []);

  const selectedMessages = useMemo(() => getChatMessages(selectedAllRequestRow), [getChatMessages, selectedAllRequestRow]);

  // ✅ refresh remarks for selected row from API
  const refreshRemarksForSelectedAll = useCallback(async (row) => {
    if (!row?.request_id) return;

    try {
      const remarksRes = await axios.get(`${API_BASE}/inventory-requests/${row.request_id}/remarks`);
      const fresh = Array.isArray(remarksRes.data) ? remarksRes.data : [];

      setRequestUpdates((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const idx = arr.findIndex((x) => x?.request_id === row.request_id);
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], remarks_history: fresh };
        }
        return arr;
      });
    } catch (e) {
      console.error("refreshRemarksForSelectedAll failed", e?.response?.data || e);
    }
  }, []);

  // ✅ Send remark from All Requests panel
  const handleSendRemarkAllRequests = useCallback(async () => {
    const row = selectedAllRequestRow;
    const text = String(chatInput || "").trim();

    if (!row?.request_id) return;
    if (!meCode) {
      setErrorMessageDialog("Employee code not found in localStorage. Please login again.");
      setErrorDialogOpen(true);
      return;
    }
    if (!text) return;
    if (sendingChat) return;

    setSendingChat(true);

    // optimistic bubble
    const optimistic = {
      remark: text,
      created_at: new Date().toISOString(),
      employee_code: meCode,
      employee_name: "You",
      by: "You",
      _optimistic: true,
    };

    setRequestUpdates((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.findIndex((x) => x?.request_id === row.request_id);
      if (idx >= 0) {
        const rh = Array.isArray(arr[idx]?.remarks_history) ? [...arr[idx].remarks_history] : [];
        rh.push(optimistic);
        arr[idx] = { ...arr[idx], remarks_history: rh };
      }
      return arr;
    });

    setChatInput("");

    try {
      const fd = new FormData();
      fd.append("employee_code", meCode);
      fd.append("remark", text);

      await axios.post(`${API_BASE}/inventory-requests/${row.request_id}/add-remark`, fd, {
        headers: { "Content-Type": "multipart/form-data", Accept: "application/json" },
      });

      await refreshRemarksForSelectedAll(row);
    } catch (err) {
      console.error("Send remark failed", err?.response?.data || err);

      setErrorMessageDialog(
        `Failed to send remark:\n\n${
          err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Unknown error"
        }`
      );
      setErrorDialogOpen(true);

      // rollback optimistic
      setRequestUpdates((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const idx = arr.findIndex((x) => x?.request_id === row.request_id);
        if (idx >= 0) {
          const rh = Array.isArray(arr[idx]?.remarks_history) ? [...arr[idx].remarks_history] : [];
          for (let i = rh.length - 1; i >= 0; i--) {
            if (rh[i]?._optimistic && rh[i]?.remark === text && String(rh[i]?.employee_code) === String(meCode)) {
              rh.splice(i, 1);
              break;
            }
          }
          arr[idx] = { ...arr[idx], remarks_history: rh };
        }
        return arr;
      });

      setChatInput(text);
    } finally {
      setSendingChat(false);
    }
  }, [chatInput, meCode, refreshRemarksForSelectedAll, selectedAllRequestRow, sendingChat]);

  // When selecting a request, clear composer and refresh remarks (latest)
  useEffect(() => {
    if (activeTab !== 1) return;
    setChatInput("");
    if (selectedAllRequestRow?.request_id) refreshRemarksForSelectedAll(selectedAllRequestRow);
  }, [activeTab, selectedAllRequestRow?.request_id, refreshRemarksForSelectedAll]);

  /* ============================================================================
     ✅ UI BLOCKS
  ============================================================================ */

  // ✅ Fixed heights for All Requests split panel (NO MOBILE VIEW)
  const ALL_REQ_PANEL_H = 520; // both left & right panels same height
  const TOP_BAR_H = 56; // left search/filter bar height
  const CHAT_BAR_H = 56; // right chat input bar height

  const SummaryCard = (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #EEF0F4",
        borderRadius: 3,
        p: 2,
        background: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Item</Typography>
              <Typography sx={{ fontWeight: 800, color: "#111827" }}>{selectedRequest?.item_name || "—"}</Typography>
              <Typography sx={{ fontSize: 11, color: "#9CA3AF" }}>
                {selectedRequest?.property_id || selectedRequest?.property_name || "—"}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={4} md={2}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Warehouse</Typography>
              <Typography sx={{ fontWeight: 800, color: "#111827" }}>{selectedRequest?.warehouse || "—"}</Typography>
            </Grid>

            <Grid item xs={6} sm={4} md={2}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Type</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                {String(selectedRequest?.item_type || "—").toUpperCase()}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Requested By</Typography>
              <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                {selectedRequest?.engineer_name || selectedRequest?.requested_by || "—"}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={4} md={1}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Qty</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                {String(selectedRequest?.quantity ?? selectedRequest?.requested_quantity ?? "—")}
              </Typography>
            </Grid>

            <Grid item xs={6} sm={4} md={1}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Requested Qty</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }}>
                {String(selectedRequest?.requested_quantity ?? "—")}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Initial Remark</Typography>
              <Typography sx={{ fontWeight: 700, color: "#111827" }} noWrap>
                {selectedRequest?.initial_remark && selectedRequest?.initial_remark !== "—"
                  ? selectedRequest.initial_remark
                  : "—"}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Latest Remark</Typography>
              <Typography sx={{ fontWeight: 700, color: "#111827" }} noWrap>
                {selectedRequest?.remarks_history && selectedRequest.remarks_history.length > 0
                  ? selectedRequest.remarks_history[selectedRequest.remarks_history.length - 1]?.remark || "—"
                  : "—"}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Status</Typography>
              <Box sx={{ mt: 0.5 }}>{statusChip(selectedRequest?.status)}</Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Paper>
  );

  // ✅ NO MOBILE VIEW: Always use table layout (your previous desktop table)
  const InventoryTable = (
    <>
      {loading ? (
        <Typography sx={{ p: 2 }}>Loading inventory data...</Typography>
      ) : error ? (
        <Typography color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      ) : rowData.length > 0 ? (
        <>
          {hasMultipleWarehouseLocations && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Multiple warehouses/locations — pick below if you need a different one.
            </Alert>
          )}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #EEF0F4",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <Table>
            <TableHead sx={{ backgroundColor: "#F3F4F6" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Stock Available</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Warehouse</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827", textAlign: "center" }}>Requested</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#111827" }}>Action</TableCell>
                <TableCell sx={{ width: 56 }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {rowData.map((row, index) => (
                <TableRow key={index} sx={{ "&:hover": { backgroundColor: "#FAFAFB" } }}>
                  <TableCell sx={{ fontWeight: 800 }}>{row.item_name}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{row.available_quantity}</TableCell>

                  <TableCell>
                    <Select
                      value={row.location || ""}
                      onChange={(e) => handleFieldChange(index, "location", e.target.value)}
                      size="small"
                      disabled={!isRequestEditable || processing}
                      sx={{ minWidth: 180, borderRadius: 2, bgcolor: "#F9FAFB" }}
                    >
                      {(warehouseLocations[row.warehouse] || []).map((loc) => (
                        <MenuItem key={loc} value={loc}>
                          {loc}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={row.warehouse || ""}
                      onChange={(e) => handleFieldChange(index, "warehouse", e.target.value)}
                      size="small"
                      disabled={!isRequestEditable || processing}
                      sx={{ minWidth: 140, borderRadius: 2, bgcolor: "#F9FAFB" }}
                    >
                      {warehouses.map((wh) => (
                        <MenuItem key={wh} value={wh}>
                          {wh}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <TextField
                      value={row.editableRequestedAmount}
                      onChange={(e) => handleFieldChange(index, "editableRequestedAmount", e.target.value)}
                      type="number"
                      size="small"
                      disabled={!isRequestEditable || processing}
                      sx={{
                        width: 90,
                        "& .MuiInputBase-root": { borderRadius: 2, bgcolor: "#F9FAFB" },
                        "& input": { textAlign: "center", fontWeight: 900 },
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      value={row.action || ""}
                      onChange={(e) => handleActionChange(index, e.target.value)}
                      size="small"
                      disabled={!isRequestEditable || processing}
                      sx={{ minWidth: 130, borderRadius: 2, bgcolor: "#F9FAFB" }}
                    >
                      <MenuItem value="issue" disabled={toNumber(row.available_quantity, 0) <= 0}>
                        Issue
                      </MenuItem>
                      <MenuItem value="raise">Raise</MenuItem>
                      <MenuItem value="reject">Reject</MenuItem>
                      {row.status === "raised" && <MenuItem value="requested">Revert to Requested</MenuItem>}
                    </Select>
                  </TableCell>

                  <TableCell>
                    {rowData.length > 1 && (
                      <IconButton
                        onClick={() => handleDeleteRow(index)}
                        color="error"
                        disabled={!isRequestEditable || processing}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      ) : (
        <Typography sx={{ p: 2 }}>No inventory data found.</Typography>
      )}

      {hasRejectRow && (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Rejection reason"
            placeholder="Required when any row uses Reject (applies to all Reject actions in this batch)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            minRows={2}
            required
            disabled={!isRequestEditable || processing}
            sx={{ "& .MuiInputBase-root": { borderRadius: 2, bgcolor: "#F9FAFB" } }}
          />
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleAddRow}
          disabled={!isRequestEditable || processing}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: "#2563EB",
            "&:hover": { bgcolor: "#1D4ED8" },
            borderRadius: 2,
            fontWeight: 900,
          }}
        >
          ADD INVENTORY
        </Button>

        <Box sx={{ flex: 1 }} />

        {selectedRequest?.status === "raised" && (
          <Button
            variant="outlined"
            color="warning"
            disabled={processing}
            startIcon={<ArrowUpwardIcon />}
            onClick={async () => {
              try {
                const payload = {
                  request_id: selectedRequest.request_id,
                  item_name: selectedRequest.item_name,
                  warehouse: selectedRequest.warehouse,
                  location: rowData?.[0]?.location ?? selectedRequest.location ?? "UNKNOWN",
                  performed_by: actorDisplayName,
                  engineer_id: selectedRequest.engineer_id ?? "UNKNOWN",
                  invoice_id: toNumber(selectedRequest.invoice_id, 0),
                  project_name: selectedRequest.project_name ?? "Unknown Project",
                  property_name: selectedRequest.property_name ?? "Unknown Property",
                  p_req_id: selectedRequest.p_req_id ?? selectedRequest.request_id,
                  deli_date: selectedRequest.deli_date ?? new Date().toISOString().slice(0, 19) + "Z",
                  item_type: selectedRequest.item_type ?? "general",
                  requested_quantity: toNumber(selectedRequest.requested_quantity, 0),
                  status: "requested",
                };

                await axios.post(`${API_BASE}/revert-stock`, payload);

                await fetchInventoryData();
                await fetchRequestUpdates();
                await refreshSelectedRequest?.();
                await refreshRequests?.();

                setSuccessMessage("Reverted to Requested");
                setSuccessDialogOpen(true);

                setTimeout(() => setSuccessDialogOpen(false), 3000);
              } catch (err) {
                setErrorMessageDialog("Failed to revert request.");
                setErrorDialogOpen(true);
                setTimeout(() => setErrorDialogOpen(false), 3000);
              }
            }}
            sx={{ borderRadius: 2, fontWeight: 900 }}
          >
            Roll Back
          </Button>
        )}

        <Button
          variant="contained"
          color="success"
          startIcon={processing ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : <CheckCircleIcon />}
          onClick={handleProcessAllRows}
          disabled={!isRequestEditable || processing}
          sx={{ borderRadius: 2, fontWeight: 900 }}
        >
          {processing ? "Processing…" : "Process"}
        </Button>
      </Box>
    </>
  );

  /* ✅ All Requests panel with fixed equal heights and equal top/bottom bars */
  const AllRequestsPanel = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: 2,
        height: `${ALL_REQ_PANEL_H}px`,
        minHeight: `${ALL_REQ_PANEL_H}px`,
      }}
    >
      {/* LEFT: LIST */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #EEF0F4",
          borderRadius: 3,
          overflow: "hidden",
          background: "#fff",
          height: `${ALL_REQ_PANEL_H}px`,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* ✅ Fixed height bar */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            height: `${TOP_BAR_H}px`,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #EEF0F4",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <TextField
              placeholder="Search"
              value={allReqSearch}
              onChange={(e) => setAllReqSearch(e.target.value)}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-root": { borderRadius: 2, bgcolor: "#F9FAFB" } }}
            />
            <Select
              size="small"
              value={allReqStatusFilter}
              onChange={(e) => setAllReqStatusFilter(e.target.value)}
              sx={{ minWidth: 140, borderRadius: 2, bgcolor: "#F9FAFB" }}
            >
              <MenuItem value="ALL">Status Filter</MenuItem>
              <MenuItem value="requested">Requested</MenuItem>
              <MenuItem value="raised">Raised</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="partially_issued">Partially Issued</MenuItem>
            </Select>
          </Box>
        </Box>

        {/* ✅ Scroll fills remaining height */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            height: `calc(${ALL_REQ_PANEL_H}px - ${TOP_BAR_H}px)`,
          }}
        >
          {loadingUpdates ? (
            <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : filteredAllRequests.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>No requests found</Typography>
            </Box>
          ) : (
            filteredAllRequests.map(({ id, row }) => {
              const selected = id === (selectedAllRequestRow?.p_req_id || selectedAllRequestRow?.request_id);

              return (
                <Box
                  key={id}
                  onClick={() => setSelectedAllReqId(id)}
                  sx={{
                    cursor: "pointer",
                    px: 2,
                    py: 1.6,
                    borderBottom: "1px solid #F1F5F9",
                    backgroundColor: selected ? "#F8FAFF" : "#fff",
                    borderLeft: selected ? "4px solid #2563EB" : "4px solid transparent",
                    "&:hover": { backgroundColor: selected ? "#F8FAFF" : "#FAFAFB" },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, color: "#111827", fontSize: 13 }} noWrap>
                      {id}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#6B7280" }} noWrap>
                      {row?.engineer_name || "—"} • {formatDateTime(row?.created_at || row?.updated_at)}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: "0 0 auto" }}>{statusChip(row?.status)}</Box>
                </Box>
              );
            })
          )}
        </Box>
      </Paper>

      {/* RIGHT: DETAILS + CHAT */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #EEF0F4",
          borderRadius: 3,
          overflow: "hidden",
          background: "#fff",
          height: `${ALL_REQ_PANEL_H}px`,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header summary row */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #EEF0F4",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: 1.6,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Request Name</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }} noWrap>
                {selectedAllRequestRow?.item_name || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Engineer</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }} noWrap>
                {selectedAllRequestRow?.engineer_name || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Date</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }} noWrap>
                {formatDateTime(selectedAllRequestRow?.created_at || selectedAllRequestRow?.updated_at)}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Status</Typography>
              <Box sx={{ mt: 0.4 }}>{statusChip(selectedAllRequestRow?.status)}</Box>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Warehouse</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }} noWrap>
                {selectedAllRequestRow?.warehouse || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>Qty</Typography>
              <Typography sx={{ fontWeight: 900, color: "#111827" }} noWrap>
                {String(selectedAllRequestRow?.quantity ?? selectedAllRequestRow?.requested_quantity ?? "—")}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, color: "#111827" }}>Remarks Chat</Typography>
        </Box>

        {/* ✅ Scrollable chat area takes all remaining space */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            overflow: "auto",
            background: "#FBFCFE",
            minHeight: 0,
          }}
        >
          {selectedMessages.length === 0 ? (
            <Typography sx={{ color: "#6B7280", fontWeight: 700 }}>No remarks yet.</Typography>
          ) : (
            selectedMessages.map((m, idx) => {
              const isMe = m?.employee_code && meCode && String(m.employee_code) === String(meCode);

              return (
                <Box
                  key={`${idx}-${m?.created_at || "t"}`}
                  sx={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    mb: 1.6,
                  }}
                >
                  <Box sx={{ maxWidth: "72%" }}>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#6B7280",
                        mb: 0.4,
                        textAlign: isMe ? "right" : "left",
                      }}
                    >
                      {isMe ? "You" : m?.by || "User"} • {formatDateTime(m?.created_at)}
                    </Typography>

                    <Box
                      sx={{
                        p: 1.4,
                        borderRadius: 2.5,
                        bgcolor: isMe ? "#E0ECFF" : "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                      }}
                    >
                      {m?.remark && (
                        <Typography sx={{ color: "#111827", fontWeight: 700, whiteSpace: "pre-line" }}>
                          {m.remark}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* ✅ Fixed height chat input bar (same height as left search/filter bar) */}
        <Box
          sx={{
            px: 2,
            height: `${CHAT_BAR_H}px`,
            borderTop: "1px solid #EEF0F4",
            display: "flex",
            alignItems: "center",
            gap: 1,
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <TextField
            placeholder="Type a message..."
            fullWidth
            size="small"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={!selectedAllRequestRow?.request_id || sendingChat}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendRemarkAllRequests();
              }
            }}
            sx={{ "& .MuiInputBase-root": { borderRadius: 3, bgcolor: "#F9FAFB" } }}
          />

          <Button
            variant="contained"
            onClick={handleSendRemarkAllRequests}
            disabled={!selectedAllRequestRow?.request_id || !chatInput.trim() || sendingChat}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1D4ED8" },
              minWidth: 44,
              px: 1.4,
            }}
          >
            {sendingChat ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "➤"}
          </Button>
        </Box>
      </Paper>

    </Box>
  );

  const Content = (
    <Box sx={{ padding: isInlineView ? 0 : 2.5, backgroundColor: "#F5F7FB" }}>
      {selectedRequest && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SummaryCard}

          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #EEF0F4", background: "#fff", overflow: "hidden" }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              sx={{ px: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 900 } }}
            >
              <Tab label="Inventory Requested" />
              <Tab label="All Requests" />
            </Tabs>
            <Divider />

            <Box sx={{ p: 2 }}>{activeTab === 0 ? InventoryTable : AllRequestsPanel}</Box>
          </Paper>

          <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
            <Alert severity={snackbarSeverity} sx={{ width: "100%" }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>

          <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: "#2e7d32", fontWeight: "bold" }}>✅ Success</DialogTitle>
            <DialogContent>
              <Typography sx={{ whiteSpace: "pre-line" }}>{successMessage}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSuccessDialogOpen(false)} color="success" variant="contained">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "#d32f2f", fontWeight: "bold" }}>⚠️ Error</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>{errorMessageDialog}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} color="error" variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeRequestDialogOpen} onClose={() => !closingRequest && setCloseRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "#d32f2f", fontWeight: "bold" }}>Close Request</DialogTitle>
        <DialogContent>
          <Typography sx={{ marginBottom: 2, color: "#666" }}>
            Please provide a reason for closing this request. This action will close the request even if there are remaining items.
          </Typography>

          <Box sx={{ marginBottom: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Request ID"
                  value={selectedRequest?.p_req_id || selectedRequest?.request_id || "N/A"}
                  disabled
                  sx={{ "& .MuiInputBase-input": { backgroundColor: "#f5f5f5", fontWeight: "bold" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email ID"
                  value={localStorage.getItem("email") || "N/A"}
                  disabled
                  sx={{ "& .MuiInputBase-input": { backgroundColor: "#f5f5f5", fontWeight: "bold" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee Code"
                  value={localStorage.getItem("employee_code") || "N/A"}
                  disabled
                  sx={{ "& .MuiInputBase-input": { backgroundColor: "#f5f5f5", fontWeight: "bold" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Reason for Closing"
                  value={closeRequestReason}
                  onChange={(e) => setCloseRequestReason(e.target.value)}
                  placeholder="Enter the reason for closing this request..."
                  disabled={closingRequest}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCloseRequestDialogOpen(false);
              setCloseRequestReason("");
            }}
            disabled={closingRequest}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCloseRequest}
            color="error"
            variant="contained"
            disabled={closingRequest || !closeRequestReason.trim()}
            startIcon={closingRequest ? <CircularProgress size={16} /> : <BlockIcon />}
          >
            {closingRequest ? "Closing..." : "Close Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  if (isInlineView) {
    return (
      <Paper elevation={0} sx={{  borderRadius: 3, overflow: "hidden", border: "1px solid #E5E7EB", background: "#fff",marginTop:"-37px",marginLeft:"-30px",marginRight:"-15px"}}>
        <Box
          sx={{
            color: "Black",
            fontWeight: "bold",
            background: "White",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid #E5E7EB",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>Request Details</Typography>

          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            {isAdmin && selectedRequest?.status !== "closed" && selectedRequest?.status !== "issued" && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setCloseRequestDialogOpen(true)}
                startIcon={<BlockIcon />}
                sx={{ borderWidth: 2, textTransform: "none", borderRadius: 2, fontWeight: 900, "&:hover": { borderWidth: 2 } }}
              >
                Close Request
              </Button>
            )}

<Button
    variant="text"
    onClick={handleClose}
    sx={{
      borderRadius: 2,
      border: "1px solid #FCA5A5",
      color: "#DC2626",
      backgroundColor: "rgba(220,38,38,0.06)",
      fontWeight: 900,
      px: 2,
      "&:hover": {
        backgroundColor: "rgba(220,38,38,0.10)",
        borderColor: "#EF4444",
      },
    }}
  >
    X&nbsp;Close
  </Button>
          </Box>
        </Box>

        <Box sx={{ maxHeight: "calc(100vh - 220px)", overflow: "auto" }}>{Content}</Box>
      </Paper>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="100%"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          width: "100%",
          height: "90vh",
          maxWidth: "none",
          borderRadius: "12px",
          marginTop: "120px",
        },
      }}
    >
      <DialogTitle
        sx={{
          color: "Black",
          fontWeight: "bold",
          background: "White",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        Request Details
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          {isAdmin && selectedRequest?.status !== "closed" && selectedRequest?.status !== "issued" && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCloseRequestDialogOpen(true)}
              startIcon={<BlockIcon />}
              sx={{ borderWidth: 2, textTransform: "none", borderRadius: 2, fontWeight: 900, "&:hover": { borderWidth: 2 } }}
            >
              Close Request
            </Button>
          )}

          <Button
            variant="outlined"
            color="error"
            onClick={handleClose}
            startIcon={<CloseIcon />}
            sx={{ borderWidth: 2, textTransform: "none", borderRadius: 2, fontWeight: 900, "&:hover": { borderWidth: 2 } }}
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: 0, backgroundColor: "#F5F7FB" }}>{Content}</DialogContent>
    </Dialog>
  );
};

export default InventoryRequestDialog;
