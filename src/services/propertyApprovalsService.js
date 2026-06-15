import axios from "axios";

import { API_BASE } from "../config";

/**
 * Property approvals — HTTP client for `/property-approvals` on API_BASE.
 * Attachments JSON stores metadata (name, size, type, optional `url`); binary upload is separate.
 */

const paClient = axios.create({ baseURL: API_BASE });

/** Normalize API field names on each row (frontend uses camelCase). */
function normalizeApprovalRow(row) {
  if (!row || typeof row !== "object") return row;
  const approvalType = row.approvalType ?? row.approval_type ?? "";
  return { ...row, approvalType };
}

function mapApiApproval(row) {
  if (!row || typeof row !== "object") return row;
  return normalizeApprovalRow({
    ...row,
    id: row.id != null ? String(row.id) : row.id,
  });
}

function compactBody(obj) {
  if (!obj || typeof obj !== "object") return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function listApprovals(propertyId) {
  const { data } = await paClient.get("/property-approvals", {
    params: { property_id: propertyId },
  });
  const rows = data?.approvals ?? [];
  return Array.isArray(rows) ? rows.map((r) => mapApiApproval(r)) : [];
}

export async function createApproval(propertyId, payload) {
  const { data } = await paClient.post("/property-approvals", {
    propertyId: String(propertyId ?? ""),
    ...payload,
  });
  return mapApiApproval(data?.approval);
}

/**
 * Append file metadata; server merges JSONB.
 * Pass `{ id?, name, size, type?, url? }[]`.
 */
export async function appendAttachments(approvalId, fileMetas) {
  if (!Array.isArray(fileMetas) || fileMetas.length === 0) {
    throw new Error("appendAttachments: fileMetas must be a non-empty array");
  }
  const { data } = await paClient.post(`/property-approvals/${approvalId}/attachments`, {
    attachments: fileMetas,
  });
  return mapApiApproval(data?.approval);
}

export async function updateApproval(approvalId, patch) {
  const { data } = await paClient.patch(
    `/property-approvals/${approvalId}`,
    compactBody(patch ?? {})
  );
  return mapApiApproval(data?.approval);
}

export async function cancelApproval(approvalId, note) {
  return updateApproval(approvalId, { status: "archived", note, by: "Admin" });
}

export async function approveApproval(approvalId, note) {
  return updateApproval(approvalId, { status: "approved", note, by: "Admin" });
}

export async function rejectApproval(approvalId, note) {
  return updateApproval(approvalId, { status: "rejected", note, by: "Admin" });
}

export async function addComment(approvalId, text, by = "Admin") {
  const { data } = await paClient.post(`/property-approvals/${approvalId}/comments`, {
    text,
    by,
  });
  return mapApiApproval(data?.approval);
}

export async function deleteApproval(approvalId) {
  await paClient.delete(`/property-approvals/${approvalId}`);
  return { ok: true };
}

export async function getApproval(approvalId) {
  const { data } = await paClient.get(`/property-approvals/${approvalId}`);
  return mapApiApproval(data?.approval);
}
