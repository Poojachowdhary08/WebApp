// CustomNodeWithAddButton.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Handle, Position, NodeToolbar, useStore } from "@xyflow/react";
import {
  TextField,
  Tooltip,
  IconButton,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Avatar,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CloseIcon from "@mui/icons-material/Close";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import axios from "axios";

const STATUS_OPTIONS = ["pending", "in progress", "on hold", "completed"];

// read current zoom from ReactFlow store
const zoomSelector = (state) => state.transform?.[2] ?? 1;

const sendPropertyChatUpdate = async ({
  property_id,
  employee_code,
  engineer_name,
  message_text,
  files = [],
}) => {
  try {
    const formData = new FormData();
    formData.append("property_id", property_id);
    formData.append("engineer_name", engineer_name);
    formData.append("employee_code", employee_code);
    formData.append("message_text", message_text);

    files.forEach((file) => {
      formData.append("files", file);
    });

    const res = await axios.post(
      "http://localhost:8080/property-chat/send",
      formData
    );
    return res.data;
  } catch (error) {
    console.error("❌ Failed to send property chat update", error);
  }
};

const formatForDisplay = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const formatForInput = (ddmmyyyy) => {
  if (!ddmmyyyy || !ddmmyyyy.includes("/")) return ddmmyyyy || "";
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month}-${day}`;
};

const friendlyStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "in progress") return "In Progress";
  if (s === "on hold") return "On Hold";
  if (s === "pending") return "Pending";
  if (s === "completed") return "Completed";
  return status;
};

const getStatusBackground = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return " #E8DFFF66";
  if (s === "in progress") return "#e3f2fd";
  if (s === "on hold") return " #FFD6D666";
  if (s === "completed") return "#DFF9E766";
  return "#FFFFFF";
};

const getStatusBorder = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "#F2C9A4";
  if (s === "in progress") return "#c2dcf2";
  if (s === "on hold") return "#B2CBF7";
  if (s === "completed") return "#8AD4A1";
  return "rgba(0,0,0,0.08)";
};

const CustomNodeWithAddButton = ({ id, data, selected }) => {
  const currentUserEmail = localStorage.getItem("email") || "anonymous@system";
  const { setNodes, setEdges } = data;

  const [editedField, setEditedField] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [phaseName, setPhaseName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [percentage, setPercentage] = useState(data.percentage || 0);
  const [expectedStartDate, setExpectedStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [actualEndDate, setActualEndDate] = useState("");

  const clickCount = useRef(0);
  const clickTimeout = useRef(null);

  const isDiamond = data.style?.transform === "rotate(45deg)";
  const isTextOnly = data.isTextOnly;
  const isCommentNode = isTextOnly;
  const contentRef = useRef(null);

  // ───────── Toolbar visibility: stable hover + delay ─────────
  const zoom = useStore(zoomSelector);
  const toolbarScale = Math.min(Math.max(zoom, 0.4), 2);

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const hideToolbarTimeoutRef = useRef(null);

  const showToolbar = () => {
    if (hideToolbarTimeoutRef.current) {
      clearTimeout(hideToolbarTimeoutRef.current);
      hideToolbarTimeoutRef.current = null;
    }
    setToolbarVisible(true);
  };

  const scheduleHideToolbar = () => {
    if (hideToolbarTimeoutRef.current) {
      clearTimeout(hideToolbarTimeoutRef.current);
    }
    hideToolbarTimeoutRef.current = setTimeout(() => {
      setToolbarVisible(false);
      hideToolbarTimeoutRef.current = null;
    }, 200); // enough time to move from node → toolbar
  };

  useEffect(() => {
    if (selected) {
      showToolbar();
    }
  }, [selected]);

  useEffect(() => {
    return () => {
      if (hideToolbarTimeoutRef.current) {
        clearTimeout(hideToolbarTimeoutRef.current);
      }
    };
  }, []);

  // ===== Toolbar actions from parent (DiagramContent) =====
  const toolbarActions = data.toolbarActions || {};
  const onEdit = toolbarActions.onEdit || data.onEdit;
  const onDelete = toolbarActions.onDelete || data.onDelete;
  const onInfo = toolbarActions.onInfo || data.onInfo;
  const onAddPhase = toolbarActions.onAddPhase || data.onAddPhase;
  const onAddComment = toolbarActions.onAddComment || data.onAddComment;

  // New explicit hold / resume actions from parent
  const onHold = toolbarActions.onHold || data.onHold;
  const onResume = toolbarActions.onResume || data.onResume;

  // Backwards compatibility: single toggle handler if parent uses it
  const onHoldOrResume = toolbarActions.onHoldOrResume || data.onHoldOrResume;

  const hasHold = !!onHold || !!onResume || !!onHoldOrResume;
  const hasEdit = !!onEdit;
  const hasDelete = !!onDelete;
  const hasInfo = !!onInfo || !!data.handleTaskManagerOpen;
  const hasAddPhase = !!onAddPhase || !!data.openAddNodeDialog;
  const hasAddComment = !!onAddComment || !!data.openAddCommentDialog;

  const isBlockedByHold = data.isBlockedByHold;
  const isOnHold = data.isOnHold || (data.status?.toLowerCase() === "on hold");

  useEffect(() => {
    if (isOnHold) {
      console.log(`🔍 Node ${id} is on hold:`, {
        isOnHold: data.isOnHold,
        status: data.status,
        hold_date: data.hold_date,
        resume_date: data.resume_date,
        computedIsOnHold: isOnHold,
      });
    }
  }, [isOnHold, id, data.isOnHold, data.status]);

  // dialog-style edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStatus, setDraftStatus] = useState(data.status || "pending");
  const [draftPercentage, setDraftPercentage] = useState(
    data.percentage || 0
  );
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);

  // Inline add phase form state
  const [isAddPhaseMode, setIsAddPhaseMode] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDuration, setNewPhaseDuration] = useState(3);
  const [newPhaseStatus, setNewPhaseStatus] = useState("pending");
  const [newPhasePercentage, setNewPhasePercentage] = useState(0);
  const [newPhaseStatusOpen, setNewPhaseStatusOpen] = useState(false);
  const [isAddPhaseLoading, setIsAddPhaseLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Hold / Resume / Delete dialogs
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdType, setHoldType] = useState("Customer");
  const [holdReason, setHoldReason] = useState("");
  const [resumeReason, setResumeReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [holdLoading, setHoldLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Generic error dialog instead of alert()
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "",
    message: "",
  });

  const openErrorDialog = (title, message) => {
    setErrorDialog({
      open: true,
      title: title || "Something went wrong",
      message: message || "",
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog((prev) => ({ ...prev, open: false }));
  };

  const statusBg = getStatusBackground(data.status);
  const statusBorder = getStatusBorder(data.status);

  const daysLeftLabel = useMemo(() => {
    if (!expectedEndDate) return "";
    const parts = expectedEndDate.split("/");
    if (parts.length !== 3) return "";
    const [dd, mm, yyyy] = parts;
    const end = new Date(`${yyyy}-${mm}-${dd}`);
    if (isNaN(end)) return "";

    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diff > 0) return `${diff}d left`;
    if (diff === 0) return "Today";
    return `${Math.abs(diff)}d delay`;
  }, [expectedEndDate]);

  useEffect(() => {
    if (!contentRef.current) return;
    setTimeout(() => {}, 0);
  }, [phaseName, startDate, endDate, data.status, data.remarks]);

  useEffect(() => {
    const [labelLine, dateLine] = (data.label || "").split("\n");
    if (isTextOnly) {
      setPhaseName(data.label || "");
    } else {
      const matches = dateLine?.match(/\((.*?) to (.*?)\)/);
      setPhaseName(labelLine || "");
      setStartDate(matches?.[1] || "");
      setEndDate(matches?.[2] || "");
    }
    setPercentage(parseFloat(data.percentage || 0));
  }, [data.label, isTextOnly, data.percentage]);

  useEffect(() => {
    const start = data?.exp_startdate || "";
    const end = data?.exp_enddate || "";
    const actual = data?.enddate || "";

    setExpectedStartDate(start);
    setExpectedEndDate(end);
    setActualEndDate(actual);
  }, [data?.exp_startdate, data?.exp_enddate, data?.enddate]);

  useEffect(() => {
    if (!data || !Array.isArray(data.schedule)) return;
    if (data.schedule.length === 0) return;
  }, [data?.schedule]);

  const handleSaveInline = async () => {
    if (isTextOnly) {
      const updatedLabel = phaseName;
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, label: updatedLabel } }
            : node
        )
      );

      fetch(`http://localhost:8080/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail,
        },
        body: JSON.stringify({
          note_text: phaseName,
          x: data?.x || 0,
          y: data?.y || 0,
        }),
      }).catch((err) => console.error("Error updating note:", err));
    } else {
      let finalStartDate = formatForInput(startDate);
      let finalEndDate = formatForInput(endDate);

      const parsedStart = new Date(finalStartDate);

      if (editedField === "start") {
        const newEnd = new Date(parsedStart);
        newEnd.setDate(parsedStart.getDate() + (data.duration || 0));
        finalEndDate = newEnd.toISOString().split("T")[0];
        setEndDate(formatForDisplay(finalEndDate));
      }

      const updatedLabel = `${phaseName}\n(${formatForDisplay(
        finalStartDate
      )} to ${formatForDisplay(finalEndDate)})`;

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, label: updatedLabel } }
            : node
        )
      );

      const payload = {
        phasename: phaseName,
        startdate: finalStartDate,
        enddate: finalEndDate,
        status: data.status || "pending",
        percentage: percentage,
        applyToAll: true,
      };

      fetch(`http://localhost:8080/update-schedule/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then(async () => {
          try {
            await sendPropertyChatUpdate({
              property_id: data.propertyId,
              employee_code: localStorage.getItem("employee_code"),
              engineer_name: `${localStorage.getItem(
                "first_name"
              )} ${localStorage.getItem("last_name")}`.trim(),
              message_text: `🔄 Phase *${phaseName}* status changed to *${
                data.status || "pending"
              }*.`,
            });
          } catch (err) {
            // ignore
          }
          data.refreshSchedule && data.refreshSchedule();
        })
        .catch((err) => {
          console.error("❌ Failed to update schedule:", err);
          openErrorDialog(
            "Update failed",
            "Failed to update schedule. Please try again."
          );
        });
    }

    setEditingField(null);
    setEditedField(null);
  };

  const handleOpenEditMode = () => {
    if (isCommentNode) {
      setEditingField("phase");
      return;
    }

    setDraftTitle(phaseName || "");
    setDraftStatus(data.status || "pending");
    setDraftStartDate(startDate || "");
    setDraftEndDate(endDate || "");
    setIsEditMode(true);
  };

  const handleConfirmEdit = async () => {
    if (isEditLoading) return;

    setIsEditLoading(true);

    try {
      const finalStartDate = formatForInput(draftStartDate);
      const finalEndDate = formatForInput(draftEndDate);

      const updatedLabel = `${draftTitle}\n(${draftStartDate || "—"} to ${
        draftEndDate || "—"
      })`;

      const newBg = getStatusBackground(draftStatus);
      const newBorder = getStatusBorder(draftStatus);

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: updatedLabel,
                  status: draftStatus,
                  style: {
                    ...node.data.style,
                    background: newBg,
                    border: `1px solid ${newBorder}`,
                  },
                },
              }
            : node
        )
      );

      const payload = {
        phasename: draftTitle,
        startdate: finalStartDate,
        enddate: finalEndDate,
        status: draftStatus,
        applyToAll: true,
      };

      const res = await fetch(`http://localhost:8080/update-schedule/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        try {
          await sendPropertyChatUpdate({
            property_id: data.propertyId || data.property_id,
            employee_code: localStorage.getItem("employee_code"),
            engineer_name: `${localStorage.getItem(
              "first_name"
            )} ${localStorage.getItem("last_name")}`.trim(),
            message_text: `🔄 Phase *${draftTitle}* updated to *${friendlyStatus(
              draftStatus
            )}* (${draftStartDate} → ${draftEndDate}).`,
          });
        } catch {
          // ignore
        }

        if (data.refreshSchedule) {
          data.refreshSchedule();
        }
        window.dispatchEvent(new CustomEvent("schedule-refresh"));

        setIsEditMode(false);
        setStatusOpen(false);
      } else {
        const errorData = await res.json();
        openErrorDialog(
          "Update failed",
          errorData.detail || errorData.message || "Unknown error"
        );
      }
    } catch (err) {
      console.error("❌ Failed to update schedule (dialog confirm):", err);
      openErrorDialog("Update failed", err.message);
    } finally {
      setIsEditLoading(false);
    }
  };

  const safePercent = Math.max(
    0,
    Math.min(100, percentage || data.percentage || 0)
  );

  const handleSingleDoubleClickTitle = (e) => {
    e.stopPropagation();
    clickCount.current++;

    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        setEditingField("phase");
        clickCount.current = 0;
      }, 200);
    } else {
      clearTimeout(clickTimeout.current);
      clickCount.current = 0;
      data?.handleTaskManagerOpen?.({ nodeId: id, ...data });
    }
  };

  const handleAddPhaseNode = (e) => {
    e?.stopPropagation?.();
    setIsAddPhaseMode(true);
    setNewPhaseName("");
    setNewPhaseDuration(3);
    setNewPhaseStatus("pending");
    setNewPhasePercentage(0);
  };

  const handleAddCommentNode = (e) => {
    e?.stopPropagation?.();
    if (onAddComment) {
      onAddComment(id);
    } else {
      data.openAddCommentDialog?.(id);
    }
  };

  const engineerName =
    data.engineerName ||
    data.assigned_to ||
    `${localStorage.getItem("first_name") || ""} ${
      localStorage.getItem("last_name") || ""
    }`.trim() ||
    "H";

  const avatarInitial = engineerName?.trim()?.charAt(0)?.toUpperCase() || "H";

  const canToggleHold =
    !isCommentNode &&
    hasHold &&
    !isBlockedByHold &&
    (onHold || onResume || onHoldOrResume) &&
    (isOnHold ? true : data.status?.toLowerCase() !== "completed");

  const canDelete = isCommentNode
    ? true
    : hasDelete && !isBlockedByHold && data.status !== "completed";

  const handleHoldIconClick = () => {
    if (!canToggleHold) return;
    if (isOnHold) {
      setResumeReason("");
      setResumeDialogOpen(true);
      return;
    }
    setHoldType("Customer");
    setHoldReason("");
    setHoldDialogOpen(true);
  };

  const handleConfirmHold = async () => {
    if (!canToggleHold) return;

    if (!holdType || !holdReason.trim()) {
      openErrorDialog("Missing details", "Please fill all fields.");
      return;
    }

    setHoldLoading(true);
    const reason = holdReason.trim();

    try {
      const propertyId = data.propertyId || data.property_id;

      if (!propertyId) {
        console.error("❌ Missing propertyId");
        openErrorDialog(
          "Missing property",
          "Unable to hold task: missing property ID"
        );
        setHoldLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("scheduleid", id);
      formData.append("propertyid", propertyId);
      formData.append("hold_type", holdType);
      formData.append("hold_reason", reason);
      formData.append("hold_by_email", currentUserEmail);

      const res = await fetch("http://localhost:8080/hold-schedule", {
        method: "POST",
        body: formData,
      });

      const responseData = await res.json();

      if (res.ok) {
        setHoldDialogOpen(false);
        setHoldReason("");
        setHoldType("Customer");

        try {
          const payload = {
            property_id: propertyId,
            engineer_name: localStorage.getItem("first_name") || "System",
            employee_code: localStorage.getItem("employee_code") || "SYS001",
            message_text: `⏸️ *${
              data.label?.split("\n")[0] || "Phase"
            }* has been put on hold by *${
              localStorage.getItem("first_name") || "Unknown"
            }*.\n📝 Reason: _${reason}_`,
          };

          await fetch("http://localhost:8080/property-chat/send", {
            method: "POST",
            body: Object.entries(payload).reduce((form, [key, val]) => {
              form.append(key, val);
              return form;
            }, new FormData()),
          });
        } catch (err) {
          console.error("❌ Failed to send system message:", err);
        }

        try {
          const taskIdRes = await fetch(
            `http://localhost:8080/get-task-id/${id}`
          );
          const taskIdData = await taskIdRes.json();
          const task_id = taskIdData?.task_id;

          if (task_id) {
            const updateForm = new FormData();
            updateForm.append("task_id", task_id);
            updateForm.append("property_id", propertyId);
            updateForm.append("schedule_id", id);
            updateForm.append("engineer_name", currentUserEmail);
            updateForm.append(
              "update_text",
              `⏸️ Phase held by ${
                currentUserEmail.split("@")[0]
              } – Reason: "${reason}"`
            );

            await fetch("http://localhost:8080/task-updates", {
              method: "POST",
              body: updateForm,
            });
          }
        } catch (err) {
          console.error("❌ Failed to post hold message:", err);
        }

        if (data.refreshSchedule) {
          data.refreshSchedule();
        } else if (data.onRefresh) {
          data.onRefresh();
        }
        window.dispatchEvent(new CustomEvent("schedule-refresh"));
      } else {
        console.error("❌ Hold API failed:", responseData);
        openErrorDialog(
          "Hold failed",
          responseData.detail || responseData.message || "Unknown error"
        );
      }
    } catch (err) {
      console.error("❌ Failed to hold task:", err);
      openErrorDialog("Hold failed", err.message);
    } finally {
      setHoldLoading(false);
    }
  };

  const handleConfirmResume = async () => {
    if (!canToggleHold) return;

    if (!resumeReason.trim()) {
      openErrorDialog("Missing reason", "Please enter a resume reason.");
      return;
    }

    setResumeLoading(true);
    const reason = resumeReason.trim();

    try {
      const propertyId = data.propertyId || data.property_id;

      if (!propertyId) {
        console.error("❌ Missing propertyId");
        openErrorDialog(
          "Missing property",
          "Unable to resume task: missing property ID"
        );
        setResumeLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("scheduleid", id);
      formData.append("propertyid", propertyId);
      formData.append("resume_reason", reason);
      formData.append(
        "resumed_by_email",
        localStorage.getItem("email") || "system@datso.io"
      );

      const res = await fetch("http://localhost:8080/resume-schedule", {
        method: "POST",
        body: formData,
      });

      const responseData = await res.json();

      if (res.ok) {
        setResumeDialogOpen(false);
        setResumeReason("");

        try {
          const payload = {
            property_id: propertyId,
            engineer_name: localStorage.getItem("first_name") || "System",
            employee_code: localStorage.getItem("employee_code") || "SYS001",
            message_text: `✅ *${
              data.label?.split("\n")[0] || "Phase"
            }* has been resumed by *${
              localStorage.getItem("first_name") || "Unknown"
            }*.\n🔁 Resume Reason: _${reason}_`,
          };

          await fetch("http://localhost:8080/property-chat/send", {
            method: "POST",
            body: Object.entries(payload).reduce((form, [key, val]) => {
              form.append(key, val);
              return form;
            }, new FormData()),
          });
        } catch (err) {
          console.error("❌ Failed to send system message:", err);
        }

        try {
          const taskIdRes = await fetch(
            `http://localhost:8080/get-task-id/${id}`
          );
          const taskIdData = await taskIdRes.json();
          const task_id = taskIdData?.task_id;

          if (task_id) {
            const updateForm = new FormData();
            updateForm.append("task_id", task_id);
            updateForm.append("property_id", propertyId);
            updateForm.append("schedule_id", id);
            updateForm.append("engineer_name", currentUserEmail);
            updateForm.append(
              "update_text",
              `✅ Phase resumed by ${
                currentUserEmail.split("@")[0]
              } – Reason: "${reason}"`
            );

            await fetch("http://localhost:8080/task-updates", {
              method: "POST",
              body: updateForm,
            });
          }
        } catch (err) {
          console.error("❌ Failed to post resume message:", err);
        }

        if (data.refreshSchedule) {
          data.refreshSchedule();
        } else if (data.onRefresh) {
          data.onRefresh();
        }
        window.dispatchEvent(new CustomEvent("schedule-refresh"));
      } else {
        console.error("❌ Resume API failed:", responseData);
        openErrorDialog(
          "Resume failed",
          responseData.detail || responseData.message || "Unknown error"
        );
      }
    } catch (err) {
      console.error("❌ Failed to resume task:", err);
      openErrorDialog("Resume failed", err.message);
    } finally {
      setResumeLoading(false);
    }
  };

  const handleDeleteIconClick = () => {
    if (!canDelete) return;
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete) return;

    if (!isCommentNode && !deleteReason.trim()) {
      openErrorDialog(
        "Missing reason",
        "Please provide a reason for deletion."
      );
      return;
    }

    setDeleteLoading(true);
    const reason = deleteReason.trim();

    try {
      if (isCommentNode || isTextOnly) {
        // Use PUT endpoint to update note (no DELETE endpoint available)
        console.log("🗑️ Deleting note node:", id);
        const res = await fetch(`http://localhost:8080/notes/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": currentUserEmail,
          },
          body: JSON.stringify({
            note_text: data.label || "", // Required field for PUT
            x: data.x || 0,
            y: data.y || 0,
          }),
        });

        let result = {};
        try {
          result = await res.json();
          console.log("📝 Note API response:", result);
        } catch (err) {
          console.error("❌ Failed to parse note API response:", err);
        }

        if (res.ok) {
          // Remove the node from UI after successful API call
          setNodes((nodes) => nodes.filter((n) => n.id !== id));
          // Remove all edges connected to this note node
          if (setEdges) {
            setEdges((edges) => 
              edges.filter((e) => e.source !== id && e.target !== id)
            );
          }
          setDeleteDialogOpen(false);
          setDeleteReason("");
        } else {
          openErrorDialog(
            "Delete failed",
            result.detail || result.message || "Failed to delete note"
          );
        }
      } else {
        const propertyId = data.propertyId || data.property_id;

        if (!propertyId) {
          openErrorDialog(
            "Missing property",
            "Unable to delete task: missing property ID"
          );
          setDeleteLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("reason", reason);
        formData.append(
          "deleted_by",
          localStorage.getItem("email") || "system@datso.io"
        );

        const res = await fetch(`http://localhost:8080/delete-schedule/${id}`, {
          method: "DELETE",
          body: formData,
        });

        const result = await res.json();

        if (res.ok) {
          try {
            await sendPropertyChatUpdate({
              property_id: propertyId,
              employee_code: localStorage.getItem("employee_code"),
              engineer_name: `${localStorage.getItem(
                "first_name"
              )} ${localStorage.getItem("last_name")}`.trim(),
              message_text: `🗑️ Phase deleted: Node ID ${id}. Reason: ${reason}`,
            });
          } catch (err) {
            console.error("❌ Failed to send chat update:", err);
          }

          setNodes((nodes) => nodes.filter((n) => n.id !== id));

          if (data.refreshSchedule) {
            data.refreshSchedule();
          } else if (data.onRefresh) {
            data.onRefresh();
          }
          window.dispatchEvent(new CustomEvent("schedule-refresh"));

          setDeleteDialogOpen(false);
          setDeleteReason("");
        } else {
          openErrorDialog(
            "Delete failed",
            result.detail || result.message || "Unknown error"
          );
        }
      }
    } catch (err) {
      console.error("❌ Failed to delete task/note:", err);
      openErrorDialog("Delete failed", err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // helper for icon styles
  const baseIconSx = (_isPrimary, disabled) => ({
    width: 32,
    height: 32,
    borderRadius: 2,
    padding: 0.5,
    border: "1px solid #2563EB",
    backgroundColor: disabled ? "#E5E7EB" : "#2563EB",
    color: disabled ? "#9CA3AF" : "#FFFFFF",
    boxShadow: disabled ? "none" : "0 6px 18px rgba(37, 99, 235, 0.35)",
    opacity: disabled ? 0.6 : 1,
    "&:hover": {
      backgroundColor: disabled ? "#E5E7EB" : "#1D4ED8",
    },
  });

  return (
    <>
      {/* ───────────────────── TOOLBAR AROUND NODE ───────────────────── */}
      <NodeToolbar isVisible={toolbarVisible} position="top" offset={0}>
        {/* SCALE TOOLBAR WITH ZOOM */}
        <Box
          sx={{
            transform: `scale(${toolbarScale})`,
            transformOrigin: "top right",
          }}
          onMouseEnter={showToolbar}
          onMouseLeave={scheduleHideToolbar}
          onClick={(e) => e.stopPropagation()}
        >
          {/* anchor that we can offset from */}
          <Box
            sx={{
              position: "relative",
              width: 0,
              height: 0,
            }}
          >
            {/* TOP-RIGHT HORIZONTAL PILL */}
            <Box
              sx={{
                position: "absolute",
                top: -54, // a bit above the card
                right: -264, // just outside the right edge
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 0.75,
                borderRadius: 999,
                padding: "4px 8px",
                transform: toolbarVisible
                  ? "translateY(0px)"
                  : "translateY(-4px)",
                opacity: toolbarVisible ? 1 : 0,
                transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
                pointerEvents: "auto",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(15,23,42,0.25)",
              }}
            >
              {/* Edit */}
              <Tooltip title="Edit">
                <span>
                  <IconButton
                    size="small"
                    disabled={
                      !hasEdit ||
                      (!isCommentNode &&
                        (isBlockedByHold ||
                          data.status?.toLowerCase() === "completed"))
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditMode();
                    }}
                    sx={baseIconSx(
                      true,
                      !hasEdit ||
                        (!isCommentNode &&
                          (isBlockedByHold ||
                            data.status?.toLowerCase() === "completed"))
                    )}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Delete - Hidden for notes/comment nodes */}
              {!isCommentNode && (
                <Tooltip title="Delete Phase">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!canDelete}
                      onClick={handleDeleteIconClick}
                      sx={baseIconSx(false, !canDelete)}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {/* Info */}
              {!isCommentNode && (
                <Tooltip title="Info / Tasks">
                  <span>
                    <IconButton
                      size="small"
                      disabled={!hasInfo || isBlockedByHold}
                      onClick={() => {
                        if (onInfo) {
                          onInfo(id);
                        } else if (data.handleTaskManagerOpen) {
                          data.handleTaskManagerOpen({ nodeId: id, ...data });
                        }
                      }}
                      sx={baseIconSx(true, !hasInfo || isBlockedByHold)}
                    >
                      <InfoOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>

            {/* MID-RIGHT VERTICAL STACK */}
            <Box
              sx={{
                position: "absolute",
                top: -8, // roughly mid-height of card
                right: -280,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
                transform: toolbarVisible
                  ? "translateY(0px)"
                  : "translateY(4px)",
                opacity: toolbarVisible ? 1 : 0,
                transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
                pointerEvents: "auto",
              }}
            >
              {/* Hold / Resume */}
              {!isCommentNode && (
                <Tooltip title={isOnHold ? "Resume" : "Hold"}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!canToggleHold}
                      onClick={handleHoldIconClick}
                      sx={baseIconSx(false, !canToggleHold)}
                    >
                      {isOnHold ? (
                        <PlayArrowIcon fontSize="inherit" />
                      ) : (
                        <PauseIcon fontSize="inherit" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {/* Add Phase */}
              {!isCommentNode && (
                <Tooltip title="Add Phase Node">
                  <span>
                    <IconButton
                      size="small"
                      disabled={
                        (!hasAddPhase && !data.openAddNodeDialog) ||
                        isBlockedByHold ||
                        data.status === "completed"
                      }
                      onClick={handleAddPhaseNode}
                      sx={baseIconSx(
                        false,
                        (!hasAddPhase && !data.openAddNodeDialog) ||
                          isBlockedByHold ||
                          data.status === "completed"
                      )}
                    >
                      <AddIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {/* Add Comment */}
              {!isCommentNode && (
                <Tooltip title="Add Comment Node">
                  <span>
                    <IconButton
                      size="small"
                      disabled={
                        (!hasAddComment && !data.openAddCommentDialog) ||
                        isBlockedByHold
                      }
                      onClick={handleAddCommentNode}
                      sx={baseIconSx(
                        false,
                        (!hasAddComment && !data.openAddCommentDialog) ||
                          isBlockedByHold
                      )}
                    >
                      <ChatBubbleOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </NodeToolbar>

      {/* MAIN NODE */}
      <Tooltip
        title={
          data.isOnHold
            ? `Hold Reason: ${data.hold_reason}\nHeld by: ${data.hold_by_email}`
            : ""
        }
        arrow
      >
        <Box
          className={`custom-node-box ${isTextOnly ? "comment" : ""}`}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-start",
            width: isTextOnly ? 360 : 482,
            height: "auto",
            minHeight: isTextOnly ? 100 : 220,
            borderRadius: "12px",
            backgroundColor: isTextOnly ? data.style?.background : statusBg,
            border: isTextOnly
              ? data.style?.border || "1px solid rgba(0,0,0,0.08)"
              : `1px solid ${statusBorder}`,
            boxShadow: isTextOnly
              ? "none"
              : "0 6px 18px rgba(15, 23, 42, 0.08)",
            transform: data.style?.transform,
          }}
          onClick={(e) => {
            e.stopPropagation();
            clearTimeout(clickTimeout.current);
            clickTimeout.current = setTimeout(() => {}, 200);
            showToolbar();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            clearTimeout(clickTimeout.current);
            clickCount.current = 0;
            data?.handleTaskManagerOpen?.({ nodeId: id, ...data });
          }}
          onMouseEnter={showToolbar}
          onMouseLeave={scheduleHideToolbar}
        >
          <Handle type="target" position={Position.Top} />
          {isDiamond && (
            <Handle type="source" position={Position.Left} id="left" />
          )}

          {isTextOnly && <span className="node-comment-icon">💬</span>}
          <div
            ref={contentRef}
            className="node-inner"
            style={{
              width: "100%",
              padding: "14px 18px 14px 18px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "stretch",
              textAlign: "left",
            }}
          >
            {/* HEADER */}
            <div
              className="node-header"
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                className="node-header-text"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {editingField === "phase" ? (
                  <TextField
                    value={phaseName}
                    onChange={(e) => setPhaseName(e.target.value)}
                    onBlur={handleSaveInline}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveInline()}
                    size="small"
                    fullWidth
                    autoFocus
                    variant="standard"
                    multiline
                    minRows={1}
                    maxRows={3}
                    InputProps={{
                      disableUnderline: true,
                      style: {
                        fontWeight: 600,
                        fontSize: "16px",
                      },
                    }}
                  />
                ) : (
                  <div
                    className="node-title"
                    onClick={handleSingleDoubleClickTitle}
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#111827",
                      cursor: "pointer",
                    }}
                  >
                    {phaseName || (isTextOnly ? "New Comment" : "Untitled Phase")}
                  </div>
                )}

                {!isTextOnly && data.duration != null && Number(data.duration) >= 0 && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    {Number(data.duration) === 1 ? "1 day" : `${Number(data.duration)} days`}
                  </div>
                )}

              </div>

              {!isTextOnly && (
                <div
                  className="node-status-chip"
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#374151",
                    background: "rgba(255,255,255,0.9)",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.3)",
                  }}
                >
                  {friendlyStatus(data.status)}
                </div>
              )}
            </div>

            {/* PROGRESS ROW */}
            {!isTextOnly && (
              <>
                <div
                  className="node-progress-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span
                    className="node-progress-left"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1F2933",
                    }}
                  >
                    {safePercent.toFixed(0)} of 100%
                  </span>
                  <span
                    className="node-progress-right"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#6B7280",
                    }}
                  >
                    {daysLeftLabel || ""}
                  </span>
                </div>

                <div
                  className="node-progress-track"
                  style={{
                    width: "100%",
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.9)",
                    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="node-progress-fill"
                    style={{
                      width: `${safePercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "#2563EB",
                      transition: "width 0.2s ease-out",
                    }}
                  />
                </div>
              </>
            )}

            {/* ACTUAL DATES */}
            {!isTextOnly && (
              <div
                className="node-actual-dates"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  marginBottom: 2,
                }}
              >
                {/* Actual Start */}
                {editingField === "start" ? (
                  <TextField
                    type="date"
                    value={formatForInput(startDate)}
                    onChange={(e) => {
                      const inputDate = e.target.value;
                      setStartDate(formatForDisplay(inputDate));
                      setEditedField("start");
                    }}
                    onBlur={handleSaveInline}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveInline()}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="node-inline-date"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTimeout(clickTimeout.current);
                      clickTimeout.current = setTimeout(() => {
                        setEditingField("start");
                      }, 200);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span
                      className="node-inline-label"
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                      }}
                    >
                      Actual Start
                    </span>
                    <span
                      className="node-inline-value"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#111827",
                      }}
                    >
                      {startDate || "—"}
                    </span>
                  </div>
                )}

                {/* Actual End */}
                {editingField === "end" ? (
                  <TextField
                    type="date"
                    value={formatForInput(endDate)}
                    onChange={(e) => {
                      setEndDate(formatForDisplay(e.target.value));
                      setEditedField("end");
                    }}
                    onBlur={handleSaveInline}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveInline()}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    autoFocus
                  />
                ) : (
                  <div
                    className="node-inline-date"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTimeout(clickTimeout.current);
                      clickTimeout.current = setTimeout(() => {
                        setEditingField("end");
                      }, 200);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      textAlign: "right",
                    }}
                  >
                    <span
                      className="node-inline-label"
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                      }}
                    >
                      Actual End
                    </span>
                    <span
                      className="node-inline-value"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#111827",
                      }}
                    >
                      {endDate || "—"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* REMARKS */}
            {data.remarks && (
              <div
                className="node-remarks"
                style={{
                  fontSize: 11,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                {data.remarks}
              </div>
            )}

            {/* PLANNED DATES */}
            {!isTextOnly && (
              <div
                className="node-planned-row"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: data.remarks ? 6 : 10,
                }}
              >
                <div
                  className="node-planned-col"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div
                    className="node-planned-label"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#9CA3AF",
                    }}
                  >
                    Planned Start Date
                  </div>
                  <div
                    className="node-planned-value"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {expectedStartDate || "—"}
                  </div>
                </div>
                <div
                  className="node-planned-col"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    textAlign: "right",
                  }}
                >
                  <div
                    className="node-planned-label"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#9CA3AF",
                    }}
                  >
                    Planned End Date
                  </div>
                  <div
                    className="node-planned-value"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {expectedEndDate || "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* INLINE EDIT OVERLAY – only for schedule nodes */}
          {isEditMode && !isTextOnly && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(255,255,255,0.96)",
                borderRadius: "12px",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                zIndex: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Title
                  </div>
                  <TextField
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Phase name"
                  />
                </Box>

                <Box sx={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Status
                  </div>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setStatusOpen((prev) => !prev)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "space-between",
                      borderRadius: 1.2,
                      fontSize: 13,
                      height: 40,
                    }}
                  >
                    {friendlyStatus(draftStatus) || "Select status"}
                    <ArrowDropDownIcon fontSize="small" />
                  </Button>

                  {statusOpen && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        mt: 0.5,
                        backgroundColor: "#fff",
                        borderRadius: 1,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                        overflow: "hidden",
                        zIndex: 40,
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <Box
                          key={opt}
                          onClick={() => {
                            setDraftStatus(opt);
                            setStatusOpen(false);
                          }}
                          sx={{
                            padding: "6px 10px",
                            fontSize: 13,
                            cursor: "pointer",
                            "&:hover": { backgroundColor: "#F3F4F6" },
                          }}
                        >
                          {friendlyStatus(opt)}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Actual Start Date
                  </div>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={formatForInput(draftStartDate)}
                    onChange={(e) =>
                      setDraftStartDate(formatForDisplay(e.target.value))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Actual End Date
                  </div>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={formatForInput(draftEndDate)}
                    onChange={(e) =>
                      setDraftEndDate(formatForDisplay(e.target.value))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 2,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditMode(false);
                    setStatusOpen(false);
                  }}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmEdit}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  Confirm
                </Button>
              </Box>
            </Box>
          )}

          {/* INLINE ADD PHASE FORM */}
          {isAddPhaseMode && !isTextOnly && (
            <Box
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 1,
                backgroundColor: "rgba(255,255,255,0.98)",
                borderRadius: "12px",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                zIndex: 1000,
                boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
                border: "1px solid #E5E7EB",
                minWidth: 482,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Phase Name
                  </div>
                  <TextField
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Enter phase name"
                    autoFocus
                  />
                </Box>

                <Box sx={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Status
                  </div>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setNewPhaseStatusOpen((prev) => !prev)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "space-between",
                      borderRadius: 1.2,
                      fontSize: 13,
                      height: 40,
                    }}
                  >
                    {friendlyStatus(newPhaseStatus) || "Pending"}
                    <ArrowDropDownIcon fontSize="small" />
                  </Button>

                  {newPhaseStatusOpen && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        mt: 0.5,
                        backgroundColor: "#fff",
                        borderRadius: 1,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                        overflow: "hidden",
                        zIndex: 40,
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <Box
                          key={opt}
                          onClick={() => {
                            setNewPhaseStatus(opt);
                            setNewPhaseStatusOpen(false);
                          }}
                          sx={{
                            padding: "6px 10px",
                            fontSize: 13,
                            cursor: "pointer",
                            "&:hover": { backgroundColor: "#F3F4F6" },
                          }}
                        >
                          {friendlyStatus(opt)}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <Box sx={{ width: 100 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Duration (days)
                  </div>
                  <TextField
                    size="small"
                    type="number"
                    value={newPhaseDuration}
                    onChange={(e) =>
                      setNewPhaseDuration(parseInt(e.target.value) || 3)
                    }
                  />
                </Box>

                <Box sx={{ width: 100 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Percentage
                  </div>
                  <TextField
                    size="small"
                    type="number"
                    value={newPhasePercentage}
                    onChange={(e) =>
                      setNewPhasePercentage(
                        isNaN(parseFloat(e.target.value))
                          ? 0
                          : parseFloat(e.target.value)
                      )
                    }
                    InputProps={{
                      endAdornment: (
                        <span style={{ fontSize: 11 }}>%</span>
                      ),
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  mt: 2,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsAddPhaseMode(false);
                    setNewPhaseStatusOpen(false);
                  }}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={isAddPhaseLoading}
                  onClick={async () => {
                    if (isAddPhaseLoading) return;

                    if (!newPhaseName.trim()) {
                      openErrorDialog(
                        "Missing phase name",
                        "Please enter a phase name."
                      );
                      return;
                    }

                    const propertyId = data.propertyId || data.property_id;
                    if (!propertyId) {
                      openErrorDialog(
                        "Missing property",
                        "Missing property ID for new phase."
                      );
                      return;
                    }

                    setIsAddPhaseLoading(true);

                    try {
                      const allNodes = [];
                      if (data.setNodes) {
                        data.setNodes((nodes) => {
                          allNodes.push(...nodes);
                          return nodes;
                        });
                      }

                      const existingPhases = allNodes.filter(
                        (node) =>
                          !node.data?.isTextOnly &&
                          node.id !== id &&
                          node.data?.percentage !== undefined
                      );

                      const newPercentage = parseFloat(
                        newPhasePercentage || "0"
                      );
                      const remainingPercentage = 100 - newPercentage;
                      const scaled_updates = existingPhases.map((node) => {
                        const current = node.data.percentage || 0;
                        const scaled =
                          (current * remainingPercentage) / 100;
                        return {
                          scheduleid: parseInt(node.id),
                          updated_percentage: parseFloat(
                            scaled.toFixed(2)
                          ),
                        };
                      });

                      let propertyscheduleid = data.propertyscheduleid;
                      if (!propertyscheduleid && data.schedule) {
                        const parentSchedule = data.schedule.find(
                          (s) => s.scheduleid == id
                        );
                        propertyscheduleid =
                          parentSchedule?.propertyscheduleid;
                      }

                      const payload = {
                        propertyscheduleid: propertyscheduleid,
                        propertyid: propertyId,
                        phasename: newPhaseName,
                        duration: parseInt(newPhaseDuration),
                        status: newPhaseStatus,
                        depends_on_scheduleid: parseInt(id),
                        remarks: `Inserted from ${id}`,
                        is_text_only: false,
                        percentage: parseFloat(newPhasePercentage),
                        createdby: currentUserEmail,
                        scaled_updates: scaled_updates,
                      };

                      const res = await fetch(
                        "http://localhost:8080/add-schedule-node",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        }
                      );

                      const result = await res.json();

                      if (res.ok) {
                        setIsAddPhaseMode(false);
                        setNewPhaseName("");
                        setNewPhaseDuration(3);
                        setNewPhaseStatus("pending");
                        setNewPhasePercentage(0);

                        if (data.refreshSchedule) {
                          data.refreshSchedule();
                          setTimeout(() => {
                            if (data.refreshSchedule) {
                              data.refreshSchedule();
                            }
                          }, 500);
                        }
                        window.dispatchEvent(
                          new CustomEvent("schedule-refresh")
                        );
                      } else {
                        openErrorDialog(
                          "Add phase failed",
                          result.detail || "Unknown error"
                        );
                      }
                    } catch (err) {
                      console.error("❌ Failed to add phase:", err);
                      openErrorDialog("Add phase failed", err.message);
                    } finally {
                      setIsAddPhaseLoading(false);
                    }
                  }}
                  sx={{
                    borderRadius: 999,
                    px: 3,
                    bgcolor: "#4F46E5",
                    "&:hover": { bgcolor: "#4338CA" },
                  }}
                  startIcon={
                    isAddPhaseLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  {isAddPhaseLoading ? "Creating..." : "Create"}
                </Button>
              </Box>
            </Box>
          )}

          <Handle type="source" position={Position.Bottom} />
        </Box>
      </Tooltip>

      {/* HOLD TASK DIALOG */}
      <Dialog
        open={holdDialogOpen}
        onClose={() => !holdLoading && setHoldDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 3,
            position: "relative",
            overflow: "visible",
          },
        }}
      >
        <IconButton
          size="small"
          onClick={() => !holdLoading && setHoldDialogOpen(false)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            position: "absolute",
            top: -1,
            left: "50%",
            transform: "translateX(-50%)",
            width: 56,
            height: 56,
            borderRadius: "999px",
            backgroundColor: "#FFF8D9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(15,23,42,0.18)",
          }}
        >
          <PauseCircleFilledIcon sx={{ fontSize: 32, color: "#FACC15" }} />
        </Box>

        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 600,
            mt: 2,
            mb: 0.1,
          }}
        >
          Set Task to On-Hold?
        </DialogTitle>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "#6B7280", mb: 0.2 }}
        >
          You can resume this task anytime.
        </Typography>

        <DialogContent sx={{ pb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "#9CA3AF", mb: 0.5, display: "block", mt: 1 }}
          >
            Hold Type
          </Typography>
          <TextField
            select
            fullWidth
            variant="outlined"
            size="small"
            value={holdType}
            onChange={(e) => setHoldType(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="Avenue">Avenue</MenuItem>
            <MenuItem value="Customer">Customer</MenuItem>
          </TextField>
          <Typography
            variant="caption"
            sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
          >
            Reason for Hold
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Enter reason for hold"
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>

        {/* avatar on right bottom like design */}
        <Box
          sx={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-10%)",
          }}
        >
          <Avatar
            sx={{
              width: 52,
              height: 52,
              boxShadow: "0 8px 20px rgba(15,23,42,0.35)",
            }}
          >
            {avatarInitial}
          </Avatar>
        </Box>

        <DialogActions
          sx={{
            mt: 3,
            pt: 0,
            px: 3,
            pb: 1,
            display: "flex",
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            disabled={holdLoading}
            onClick={() => setHoldDialogOpen(false)}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#F9FAFB",
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            disabled={holdLoading}
            onClick={handleConfirmHold}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#FACC15",
              "&:hover": { bgcolor: "#EAB308" },
              color: "#111827",
              fontWeight: 600,
            }}
          >
            {holdLoading ? "Holding..." : "Hold Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESUME TASK DIALOG */}
      <Dialog
        open={resumeDialogOpen}
        onClose={() => !resumeLoading && setResumeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 3,
            position: "relative",
            overflow: "visible",
          },
        }}
      >
        <IconButton
          size="small"
          onClick={() => !resumeLoading && setResumeDialogOpen(false)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            position: "absolute",
            top: -28,
            left: "50%",
            transform: "translateX(-50%)",
            width: 56,
            height: 56,
            borderRadius: "999px",
            backgroundColor: "#D1FAE5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(15,23,42,0.18)",
          }}
        >
          <PlayCircleFilledIcon sx={{ fontSize: 32, color: "#10B981" }} />
        </Box>

        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 600,
            mt: 3,
            mb: 0.5,
          }}
        >
          Resume Task?
        </DialogTitle>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "#6B7280", mb: 3 }}
        >
          This task will be resumed and work can continue.
        </Typography>

        <DialogContent sx={{ pb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
          >
            Resume Reason
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Enter reason for resuming"
            value={resumeReason}
            onChange={(e) => setResumeReason(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>

        <Box
          sx={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-10%)",
          }}
        >
          <Avatar
            sx={{
              width: 52,
              height: 52,
              boxShadow: "0 8px 20px rgba(15,23,42,0.35)",
            }}
          >
            {avatarInitial}
          </Avatar>
        </Box>

        <DialogActions
          sx={{
            mt: 3,
            pt: 0,
            px: 3,
            pb: 1,
            display: "flex",
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            disabled={resumeLoading}
            onClick={() => setResumeDialogOpen(false)}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#F9FAFB",
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            disabled={resumeLoading}
            onClick={handleConfirmResume}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#10B981",
              "&:hover": { bgcolor: "#059669" },
              color: "#FFFFFF",
              fontWeight: 600,
            }}
          >
            {resumeLoading ? "Resuming..." : "Resume Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE TASK / COMMENT DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 3,
            position: "relative",
            overflow: "visible",
          },
        }}
      >
        <IconButton
          size="small"
          onClick={() => !deleteLoading && setDeleteDialogOpen(false)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            position: "absolute",
            top: -1,
            left: "50%",
            transform: "translateX(-50%)",
            width: 56,
            height: 56,
            borderRadius: "999px",
            backgroundColor: "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(15,23,42,0.18)",
          }}
        >
          <DeleteOutlineRoundedIcon sx={{ fontSize: 32, color: "#EF4444" }} />
        </Box>

        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 600,
            mt: 3,
            mb: 0.5,
          }}
        >
          {isCommentNode ? "Delete Comment?" : "Delete Task ?"}
        </DialogTitle>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "#6B7280", mb: 1 }}
        >
          This action cannot be undone.
        </Typography>

        <DialogContent sx={{ pb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "#9CA3AF", mb: 0.5, display: "block" }}
          >
            {isCommentNode ? "Optional reason" : "Reason for Delete"}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={isCommentNode ? "Reason (optional)" : "Demo Name"}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </DialogContent>

        <Box
          sx={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-10%)",
          }}
        >
          <Avatar
            sx={{
              width: 52,
              height: 52,
              boxShadow: "0 8px 20px rgba(15,23,42,0.35)",
            }}
          >
            {avatarInitial}
          </Avatar>
        </Box>

        <DialogActions
          sx={{
            mt: 3,
            pt: 0,
            px: 3,
            pb: 1,
            display: "flex",
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            disabled={deleteLoading}
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#F9FAFB",
            }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            disabled={deleteLoading}
            onClick={handleConfirmDelete}
            sx={{
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#EF4444",
              "&:hover": { bgcolor: "#DC2626" },
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {deleteLoading
              ? isCommentNode
                ? "Deleting..."
                : "Deleting..."
              : isCommentNode
              ? "Delete Comment"
              : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GENERIC ERROR DIALOG (replaces alert) */}
      <Dialog
        open={errorDialog.open}
        onClose={closeErrorDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 16,
            fontWeight: 600,
            pb: 1,
          }}
        >
          {errorDialog.title || "Notice"}
        </DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Typography
            variant="body2"
            sx={{ color: "#4B5563", whiteSpace: "pre-line" }}
          >
            {errorDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pt: 1.5, pr: 2, pb: 2 }}>
          <Button
            variant="contained"
            onClick={closeErrorDialog}
            sx={{ borderRadius: 999, textTransform: "none", px: 3 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomNodeWithAddButton;