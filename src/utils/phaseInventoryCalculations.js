/**
 * Pure calculation functions for PropertyPhaseInventoryTab.
 * Extracted for testability and to document expected formulas.
 */

/**
 * Compute forecasted quantity for calculated mode (area × rate with wastage).
 * Formula: baseQty = areaValue * consumptionRate; forecasted = baseQty * (1 + wastagePct/100)
 */
export function computeForecastedQuantity(areaValue, consumptionRate, wastagePct = 0) {
  const baseQty = Number(areaValue) * Number(consumptionRate);
  const wastageQty = baseQty * (Number(wastagePct) / 100);
  return baseQty + wastageQty;
}

/**
 * Compute forecast cost: quantity × unit cost.
 */
export function computeForecastCost(quantity, unitCost) {
  return Number(quantity) * Number(unitCost);
}

/**
 * Aggregate forecast list by item_name (current behavior).
 * Note: Same item in different units is merged - may be incorrect.
 */
export function aggregateItemSummary(forecasts) {
  const map = new Map();
  (forecasts || []).forEach((f) => {
    const key = (f.item_name ?? "").trim() || "—";
    const existing = map.get(key) || { item_name: key, unit: f.unit ?? "", quantity: 0, required_order: 0, forecast_cost: 0 };
    existing.quantity += Number(f.forecasted_quantity) || 0;
    existing.required_order += Number(f.required_order) || 0;
    existing.forecast_cost += Number(f.forecast_cost) || 0;
    map.set(key, existing);
  });
  return Array.from(map.values());
}

/**
 * Aggregate by item_name + unit (recommended fix for mixed-units bug).
 */
export function aggregateItemSummaryByItemAndUnit(forecasts) {
  const map = new Map();
  (forecasts || []).forEach((f) => {
    const name = (f.item_name ?? "").trim() || "—";
    const unit = (f.unit ?? "").trim() || "";
    const key = `${name}|${unit}`;
    const existing = map.get(key) || { item_name: name, unit, quantity: 0, required_order: 0, forecast_cost: 0 };
    existing.quantity += Number(f.forecasted_quantity) || 0;
    existing.required_order += Number(f.required_order) || 0;
    existing.forecast_cost += Number(f.forecast_cost) || 0;
    map.set(key, existing);
  });
  return Array.from(map.values());
}

/**
 * Sum total cost from item summary.
 */
export function totalVillaCostFromSummary(itemSummary) {
  return (itemSummary || []).reduce((s, r) => s + (Number(r.forecast_cost) || 0), 0);
}

/**
 * Get property area for area type. Handles both _sqft and non-_sqft key naming.
 */
export function getPropertyAreaForType(areaType, propertyAreas) {
  if (!propertyAreas) return 0;
  const a = propertyAreas;
  const mappings = [
    ["construction_area", ["construction_area", "construction_area_sqft"]],
    ["slab_area", ["total_slab_area", "total_slab_area_sqft"]],
    ["total_slab_area", ["total_slab_area", "total_slab_area_sqft"]],
    ["brick_work_area", ["total_brick_work_area", "total_brick_work_area_sqft"]],
    ["total_brick_work_area", ["total_brick_work_area", "total_brick_work_area_sqft"]],
    ["plastering_area", ["total_plastering_area", "total_plastering_area_sqft"]],
    ["total_plastering_area", ["total_plastering_area", "total_plastering_area_sqft"]],
  ];
  const keys = mappings.find(([k]) => k === areaType)?.[1] || [];
  for (const k of keys) {
    const v = Number(a[k]);
    if (!isNaN(v) && v > 0) return v;
  }
  return 0;
}
