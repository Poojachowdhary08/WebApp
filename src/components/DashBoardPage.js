// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, ChartTooltip, Legend);

function formatDateDDMMYYYY(raw) {
  if (raw == null || raw === "-") return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const COLORS = {
  cardBg: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  delayed: "#FF6B6B",
  onHold: "#FFB84C",
  onTime: "#3B82F6",
  completed: "#4ADE80",
  reviewChipBg: "rgba(34, 197, 94, 0.1)",
  reviewChipText: "#16A34A",
};

/* SUMMARY CARD */
function SummaryCard({ card, onClick }) {
  const clickable = typeof onClick === "function";

  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      sx={{
        borderRadius: 2,
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        border: "1px solid #F3F4F6",
        bgcolor: COLORS.cardBg,
        cursor: clickable ? "pointer" : "default",
        userSelect: "none",
        transition: clickable ? "transform 0.15s ease, box-shadow 0.15s ease" : "none",
        "&:hover": clickable
          ? {
              transform: "translateY(-2px)",
              boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
            }
          : undefined,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={1}
        >
          <Typography
            variant="body2"
            sx={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {card.label}
          </Typography>
          <Box
            sx={{
              height: 32,
              width: 32,
              borderRadius: 1.5,
              bgcolor: card.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {card.icon}
          </Box>
        </Stack>

        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
          {card.value}
        </Typography>

        {!!card.helperText && (
          <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontSize: 11 }}>
            {card.helperText}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* LEGEND ITEM */
function LegendItem({ color, label, value }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 0.5 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color }} />
      <Typography
        variant="caption"
        sx={{
          color: COLORS.textPrimary,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <Box component="span" sx={{ color: color, fontWeight: 700, mr: 0.5 }}>
          {value}
        </Box>
        {label}
      </Typography>
    </Stack>
  );
}

export default function Dashboard({ onNavigate }) {
  const [bills, setBills] = useState([]);
  const [billMonth, setBillMonth] = useState("All");

  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [totalProjects, setTotalProjects] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [totalVendors, setTotalVendors] = useState(0);
  const [costSpend, setCostSpend] = useState(0);
  const [warehouseInventoryValue, setWarehouseInventoryValue] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [projectStatus, setProjectStatus] = useState({
    total: 0,
    delayed: 0,
    onHold: 0,
    onTime: 0,
    completed: 0,
  });

  // ✅ Card click -> page + optional sub navigation payload
  const cardRouteMap = {
    "Total Projects": { page: "Projects" },
    "Total Properties": { page: "Projects" }, // change if you have Properties page
    "Total Vendors": { page: "ManPower", manpowerTab: "VENDOR" }, // ✅ opens Vendor tab
    "Total Invoices": { page: "Invoices" },
    "Low Stock Items": { page: "Inventory", inventoryTab: "lowStock" }, // ✅ opens Low Stock tab
  };

  const goTo = (label) => {
    const target = cardRouteMap[label];
    if (!target || typeof onNavigate !== "function") return;
    onNavigate(target.page, target);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const API_BASE = "http://localhost:8080";

      const [
        billsRes,
        statusRes,
        totalProjectsRes,
        totalPropertiesRes,
        totalVendorsRes,
        costSpendRes,
        warehouseInventoryRes,
        inventoryRes,
        lowStockRes,
        projectStatusRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/latest-ready-for-review-invoices`),
        fetch(`${API_BASE}/invoice-status-count`),
        fetch(`${API_BASE}/dashboard/total-projects`),
        fetch(`${API_BASE}/dashboard/total-properties`),
        fetch(`${API_BASE}/dashboard/total-vendors`),
        fetch(`${API_BASE}/dashboard/cost-spend`),
        fetch(`${API_BASE}/dashboard/warehouse-inventory-value`),
        fetch(`${API_BASE}/dashboard/inventory`),
        fetch(`${API_BASE}/dashboard/inventory/low-stock-items`),
        fetch(`${API_BASE}/dashboard/projects-status`),
      ]);

      const billsData = billsRes.ok ? await billsRes.json() : null;
      const statusData = statusRes.ok ? await statusRes.json() : null;

      setBills(billsData?.latest_ready_for_review_invoices ?? []);
      setStatusCounts(statusData?.bill_status_counts ?? {});
      if (!statusRes.ok) setError("Couldn't load invoice status.");

      if (totalProjectsRes.ok) {
        const data = await totalProjectsRes.json();
        setTotalProjects(data.total_projects || 0);
      }

      if (totalPropertiesRes.ok) {
        const data = await totalPropertiesRes.json();
        setTotalProperties(data.total_properties || 0);
      }

      if (totalVendorsRes.ok) {
        const data = await totalVendorsRes.json();
        setTotalVendors(data.total_vendors ?? data.count ?? 0);
      }

      if (costSpendRes.ok) {
        const data = await costSpendRes.json();
        const cost = Number(data.cost_spend) || 0;
        setCostSpend(cost.toLocaleString("en-IN", { maximumFractionDigits: 2 }));
      }

      if (warehouseInventoryRes.ok) {
        const data = await warehouseInventoryRes.json();
        const value =
          Number(data.warehouse_inventory_value ?? data.inventory_value ?? data.total_value) || 0;
        setWarehouseInventoryValue(value);
      }

      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setTotalInventory(data.inventory_count || 0);
      }

      if (lowStockRes.ok) {
        const data = await lowStockRes.json();
        setLowStockCount(data.count ?? (data.low_stock_items?.length ?? 0));
      }

      if (projectStatusRes.ok) {
        const data = await projectStatusRes.json();
        setProjectStatus({
          total: data.total_projects || 0,
          delayed: data.status_breakdown?.delayed || 0,
          onHold: data.status_breakdown?.onhold || 0,
          onTime: data.status_breakdown?.ontime || 0,
          completed: data.status_breakdown?.completed || 0,
        });
      }
    } catch (e) {
      console.error(e);
      setError("Couldn’t load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInvoices =
    Object.values(statusCounts || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || 0;

  const filteredBills = useMemo(() => {
    if (!billMonth || billMonth === "All" || !bills.length) return bills;
    return bills.filter((bill) => {
      const raw =
        bill.invoice_created_at ||
        bill.invoice_date ||
        bill.created_at ||
        bill.created_date;
      if (!raw) return false;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      const monthName = d.toLocaleString("en-US", { month: "long" });
      return monthName === billMonth;
    });
  }, [bills, billMonth]);

  const summaryCardsTop = [
    {
      label: "Total Projects",
      value: totalProjects,
      helperText: "Open Projects",
      iconBg: "#F0F2FF",
      icon: <FolderOpenOutlinedIcon sx={{ color: "#4F46E5" }} />,
    },
    {
      label: "Total Properties",
      value: totalProperties,
      helperText: "Open Projects",
      iconBg: "#FFF4E5",
      icon: <WorkOutlineOutlinedIcon sx={{ color: "#F97316" }} />,
    },
    {
      label: "Total Vendors",
      value: totalVendors,
      helperText: "Open Vendors",
      iconBg: "#E5F6FF",
      icon: <PeopleOutlineIcon sx={{ color: "#0EA5E9" }} />,
    },
  ];

  const summaryCardsBottom = [
    {
      label: "Total Invoices",
      value: totalInvoices,
      helperText: "Open Invoices",
      iconBg: "#FFF4E5",
      icon: <EventNoteOutlinedIcon sx={{ color: "#F97316" }} />,
    },
    {
      label: "Low Stock Items",
      value: lowStockCount,
      helperText: "Open Low Stock",
      iconBg: "#FFF4E5",
      icon: <WarningAmberOutlinedIcon sx={{ color: "#EA580C" }} />,
    },
  ];

  const pieData = {
    labels: ["Delayed", "On Hold", "On Time", "Completed"],
    datasets: [
      {
        data: [
          projectStatus?.delayed || 0,
          projectStatus?.onHold || 0,
          projectStatus?.onTime || 0,
          projectStatus?.completed || 0,
        ],
        backgroundColor: [COLORS.delayed, COLORS.onHold, COLORS.onTime, COLORS.completed],
        borderWidth: 0,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  const headerCellSx = {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    borderBottomColor: "#E5E7EB",
    py: 1.5,
  };

  const bodyCellSx = {
    fontSize: 14,
    color: COLORS.textPrimary,
    borderBottomColor: "#F3F4F6",
    py: 1.5,
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {summaryCardsTop.map((card) => (
              <Grid item xs={12} sm={4} key={card.label}>
                <SummaryCard card={card} onClick={() => goTo(card.label)} />
              </Grid>
            ))}
            {summaryCardsBottom.map((card) => (
              <Grid item xs={12} sm={4} key={card.label}>
                <SummaryCard card={card} onClick={() => goTo(card.label)} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              border: "1px solid #F3F4F6",
              height: "100%",
              bgcolor: COLORS.cardBg,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 2 }}>
                Projects Status
              </Typography>

              <Box sx={{ display: "flex", gap: 4, alignItems: "center", mt: 2 }}>
                <Box sx={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
                  <Pie data={pieData} options={pieOptions} />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>
                      {projectStatus?.total || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontSize: 11 }}>
                      Total Projects
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <LegendItem color={COLORS.delayed} label="Delayed" value={projectStatus?.delayed || 0} />
                  <LegendItem color={COLORS.onHold} label="Onhold" value={projectStatus?.onHold ?? 0} />
                  <LegendItem color={COLORS.onTime} label="Ontime" value={projectStatus?.onTime || 0} />
                  <LegendItem color={COLORS.completed} label="Completed" value={projectStatus?.completed || 0} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* BILL LIST */}
      <Card
        sx={{
          mt: 4,
          borderRadius: 2,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          border: "1px solid #F3F4F6",
          bgcolor: COLORS.cardBg,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
              Bill List
            </Typography>
            <Select
              size="small"
              value={billMonth}
              onChange={(e) => setBillMonth(e.target.value)}
              sx={{
                minWidth: 120,
                borderRadius: "999px",
                bgcolor: "#F7F8FA",
                fontSize: 14,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E5E7EB" },
              }}
            >
              <MenuItem value="All" sx={{ fontSize: 14 }}>
                All
              </MenuItem>
              {["October","September","August","July","June","May","April","March","February","January"].map((m) => (
                <MenuItem key={m} value={m} sx={{ fontSize: 14 }}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {error && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#B91C1C",
                fontSize: 13,
              }}
            >
              {error}
            </Box>
          )}

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Name</TableCell>
                <TableCell sx={headerCellSx}>Date</TableCell>
                <TableCell sx={headerCellSx}>Order type</TableCell>
                <TableCell sx={headerCellSx}>Piece</TableCell>
                <TableCell sx={headerCellSx}>Amount</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
                <TableCell sx={{ ...headerCellSx, textAlign: "right" }}>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: COLORS.textSecondary, fontSize: 14 }}>
                    Loading invoices…
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                filteredBills.map((bill, idx) => {
                  const id =
                    bill.avenue_created_invoice_id ||
                    bill.invoice_number ||
                    bill.invoice_id ||
                    `INV-${idx + 1}`;

                  const createdAtRaw =
                    bill.invoice_created_at ||
                    bill.invoice_date ||
                    bill.created_at ||
                    bill.created_date ||
                    "-";
                  const createdAt = formatDateDDMMYYYY(createdAtRaw);

                  const orderType = bill.order_type || bill.invoice_type || bill.source || "-";

                  const pieces = bill.total_pieces || bill.total_qty || bill.quantity || "-";

                  const amount =
                    bill.total_bill_amount ||
                    bill.total_amount ||
                    bill.net_amount ||
                    bill.amount ||
                    bill.amount_to_pay ||
                    bill.grand_total ||
                    "-";

                  const status = bill.bill_status || bill.status || "Ready for Review";

                  return (
                    <TableRow key={id} hover>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          borderBottomColor: "#F3F4F6",
                          fontSize: 14,
                          color: "#2A3663",
                        }}
                      >
                        <Box
                          sx={{
                            height: 30,
                            width: 30,
                            borderRadius: 1.5,
                            bgcolor: "#EEF2FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mr: 0.5,
                          }}
                        >
                          <ReceiptLongOutlinedIcon sx={{ fontSize: 18, color: "#4F46E5" }} />
                        </Box>
                        {id}
                      </TableCell>

                      <TableCell sx={bodyCellSx}>{createdAt}</TableCell>
                      <TableCell sx={bodyCellSx}>{orderType}</TableCell>
                      <TableCell sx={bodyCellSx}>{pieces}</TableCell>

                      <TableCell sx={bodyCellSx}>
                        <Box component="span" sx={{ fontWeight: 600, mr: 0.3 }}>
                          ₹
                        </Box>
                        {amount}
                      </TableCell>

                      <TableCell sx={bodyCellSx}>
                        <Chip
                          label={status}
                          size="small"
                          sx={{
                            bgcolor: COLORS.reviewChipBg,
                            color: COLORS.reviewChipText,
                            fontWeight: 500,
                            borderRadius: 1,
                            px: 1,
                            fontSize: 12,
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>
                        <IconButton size="small" sx={{ color: COLORS.textSecondary }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}

              {!loading && filteredBills.length === 0 && !error && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: COLORS.textSecondary, fontSize: 14 }}>
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}