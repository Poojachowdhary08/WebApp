// propertyFloorsService.js
// Service for all property floors related API calls
import axios from "axios";

const BASE_URL = "http://localhost:8080";

/**
 * Create a new floor for a property
 * @param {string} propertyId - Property ID
 * @param {Object} floorData - Floor data object
 * @returns {Promise} API response
 */
export const createFloor = async (propertyId, floorData) => {
  const formData = new FormData();
  
  // Required fields
  formData.append("floor_name", floorData.floor_name || "");
  formData.append("floor_order", floorData.floor_order ?? 0);
  
  // Optional fields
  if (floorData.dimensions !== undefined) formData.append("dimensions", floorData.dimensions || "");
  if (floorData.wall_height !== undefined && floorData.wall_height !== null) {
    formData.append("wall_height", floorData.wall_height);
  }
  
  // Area fields (default to 0.0)
  formData.append("slab_area_regular", floorData.slab_area_regular ?? 0.0);
  formData.append("brick_work_regular", floorData.brick_work_regular ?? 0.0);
  formData.append("plastering_area_regular", floorData.plastering_area_regular ?? 0.0);
  formData.append("slab_area_customer_add_on", floorData.slab_area_customer_add_on ?? 0.0);
  formData.append("brick_work_customer_add_on", floorData.brick_work_customer_add_on ?? 0.0);
  formData.append("plastering_area_customer_add_on", floorData.plastering_area_customer_add_on ?? 0.0);
  formData.append("slab_area_avenue_add_on", floorData.slab_area_avenue_add_on ?? 0.0);
  formData.append("brick_work_avenue_add_on", floorData.brick_work_avenue_add_on ?? 0.0);
  formData.append("plastering_area_avenue_add_on", floorData.plastering_area_avenue_add_on ?? 0.0);

  const response = await axios.post(
    `${BASE_URL}/property/${propertyId}/floors`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Create multiple floors for a property (batch create)
 * @param {string} propertyId - Property ID
 * @param {Array} floors - Array of floor data objects
 * @returns {Promise} API response
 */
export const createFloorsBatch = async (propertyId, floors) => {
  // Create floors one by one since API accepts single floor per request
  const results = [];
  const errors = [];

  for (let i = 0; i < floors.length; i++) {
    try {
      const result = await createFloor(propertyId, {
        ...floors[i],
        floor_order: i, // Ensure proper ordering
      });
      results.push(result);
    } catch (error) {
      errors.push({
        index: i,
        floor: floors[i],
        error: error?.response?.data || error?.message || "Unknown error",
      });
    }
  }

  return {
    success: errors.length === 0,
    created: results.length,
    failed: errors.length,
    results,
    errors,
  };
};

/**
 * Get all floors for a property
 * @param {string} propertyId - Property ID
 * @returns {Promise} API response with floors array
 */
export const getPropertyFloors = async (propertyId) => {
  const response = await axios.get(`${BASE_URL}/property/${propertyId}/floors`);
  return response.data;
};

/**
 * Get a single floor by ID
 * @param {number} floorId - Floor ID
 * @returns {Promise} API response with floor data
 */
export const getFloorById = async (floorId) => {
  const response = await axios.get(`${BASE_URL}/property/floors/${floorId}`);
  return response.data;
};

/**
 * Get a single floor by property ID and floor ID
 * @param {string} propertyId - Property ID
 * @param {number} floorId - Floor ID
 * @returns {Promise} API response with floor data
 */
export const getFloorByPropertyAndId = async (propertyId, floorId) => {
  const response = await axios.get(`${BASE_URL}/property/${propertyId}/floors/${floorId}`);
  return response.data;
};

/**
 * Update floor details
 * @param {number} floorId - Floor ID
 * @param {Object} floorData - Updated floor data
 * @returns {Promise} API response
 */
export const updateFloor = async (floorId, floorData) => {
  const formData = new FormData();

  // Only append fields that are provided (not undefined)
  if (floorData.floor_name !== undefined) formData.append("floor_name", floorData.floor_name);
  if (floorData.dimensions !== undefined) formData.append("dimensions", floorData.dimensions || "");
  if (floorData.wall_height !== undefined && floorData.wall_height !== null) {
    formData.append("wall_height", floorData.wall_height);
  }
  if (floorData.floor_order !== undefined) formData.append("floor_order", floorData.floor_order);
  if (floorData.slab_area_regular !== undefined) formData.append("slab_area_regular", floorData.slab_area_regular);
  if (floorData.brick_work_regular !== undefined) formData.append("brick_work_regular", floorData.brick_work_regular);
  if (floorData.plastering_area_regular !== undefined) {
    formData.append("plastering_area_regular", floorData.plastering_area_regular);
  }

  const response = await axios.put(
    `${BASE_URL}/property/floors/${floorId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Add customer add-on area to a floor
 * @param {number} floorId - Floor ID
 * @param {string} areaType - 'slab', 'brick_work', or 'plastering'
 * @param {number} adjustmentAmount - Amount to add
 * @param {string} adjustmentNotes - Notes about the adjustment
 * @param {string} adjustedBy - Who made the adjustment
 * @returns {Promise} API response
 */
export const addCustomerAddOn = async (floorId, areaType, adjustmentAmount, adjustmentNotes = null, adjustedBy = null) => {
  const formData = new FormData();
  formData.append("area_type", areaType);
  formData.append("adjustment_amount", adjustmentAmount);
  if (adjustmentNotes) formData.append("adjustment_notes", adjustmentNotes);
  if (adjustedBy) formData.append("adjusted_by", adjustedBy);

  const response = await axios.post(
    `${BASE_URL}/property/floors/${floorId}/add-ons/customer`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Add avenue add-on area to a floor
 * @param {number} floorId - Floor ID
 * @param {string} areaType - 'slab', 'brick_work', or 'plastering'
 * @param {number} adjustmentAmount - Amount to add
 * @param {string} adjustmentNotes - Notes about the adjustment
 * @param {string} adjustedBy - Who made the adjustment
 * @returns {Promise} API response
 */
export const addAvenueAddOn = async (floorId, areaType, adjustmentAmount, adjustmentNotes = null, adjustedBy = null) => {
  const formData = new FormData();
  formData.append("area_type", areaType);
  formData.append("adjustment_amount", adjustmentAmount);
  if (adjustmentNotes) formData.append("adjustment_notes", adjustmentNotes);
  if (adjustedBy) formData.append("adjusted_by", adjustedBy);

  const response = await axios.post(
    `${BASE_URL}/property/floors/${floorId}/add-ons/avenue`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

/**
 * Delete a floor (soft delete)
 * @param {number} floorId - Floor ID
 * @returns {Promise} API response
 */
export const deleteFloor = async (floorId) => {
  const response = await axios.delete(`${BASE_URL}/property/floors/${floorId}`);
  return response.data;
};

/**
 * Get adjustment history for a floor
 * @param {number} floorId - Floor ID
 * @returns {Promise} API response with adjustments array
 */
export const getFloorAdjustments = async (floorId) => {
  const response = await axios.get(`${BASE_URL}/property/floors/${floorId}/adjustments`);
  return response.data;
};

/**
 * Get property floor totals summary
 * @param {string} propertyId - Property ID
 * @returns {Promise} API response with summary data
 */
export const getPropertyFloorsSummary = async (propertyId) => {
  const response = await axios.get(`${BASE_URL}/property/${propertyId}/floors/summary`);
  return response.data;
};


