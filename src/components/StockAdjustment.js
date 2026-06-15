import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Tune as TuneIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import axios from "axios";

const toCamelCase = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());

const StockAdjustment = ({ open, onClose, inventory, onSuccess }) => {
  // State variables
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemName, setItemName] = useState(""); // For new items
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentLocation, setAdjustmentLocation] = useState("");
  const [adjustmentWarehouse, setAdjustmentWarehouse] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  
  // Location dropdown state
  const [locations, setLocations] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [employeeCode, setEmployeeCode] = useState("");
  const [userEmail, setUserEmail] = useState("");
  
  // Master items state
  const [masterItems, setMasterItems] = useState([]);
  const [masterItemsLoading, setMasterItemsLoading] = useState(false);

  // Debug: Log inventory data
  useEffect(() => {
    if (open && inventory) {
      console.log("StockAdjustment - Inventory data:", inventory);
      console.log("StockAdjustment - Inventory length:", inventory.length);
    }
  }, [open, inventory]);

  // Load employee info on component mount
  useEffect(() => {
    const firstName = localStorage.getItem("first_name") || "Admin";
    const lastName = localStorage.getItem("last_name") || "User";
    const email = localStorage.getItem("email") || "admin@system.com";
    const empCode = localStorage.getItem("employee_code") || "EMP001";
    setEmployeeCode(empCode);
    setUserEmail(email);
    console.log("StockAdjustment - User info:", { firstName, lastName, email, employeeCode: empCode });
    console.log("StockAdjustment - Email validation:", { 
      email, 
      isValidEmail: email.includes("@"), 
      emailLength: email.length 
    });
  }, []);

  // Function to fetch real-time current stock from backend for validation
  const fetchCurrentStockForValidation = async (itemName, location, warehouse) => {
    try {
      console.log("Stock validation - fetching real-time data for:", { itemName, location, warehouse });
      
      // Use localhost for validation (same as your local changes)
      const response = await axios.get(
        `http://localhost:8080/inventory/?parsed_item_name=${encodeURIComponent(itemName)}&parsed_location=${encodeURIComponent(location)}&parsed_warehouse=${encodeURIComponent(warehouse)}`
      );
      
      const currentStock = response.data?.quantity || 0;
      console.log("Stock validation - real-time stock from backend:", currentStock);
      
      return currentStock;
    } catch (error) {
      console.error("Error fetching real-time stock for validation:", error);
      return 0;
    }
  };

  // Function to fetch locations/projects
  const fetchLocations = async () => {
    setLocationLoading(true);
    try {
      const response = await fetch("http://localhost:8080/projects_ids");
      const data = await response.json();
      if (response.ok && Array.isArray(data.projects)) {
        const seen = new Map();
        data.projects.forEach((p) => {
          const name = (p.project_name || "").trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!seen.has(key)) seen.set(key, name);
        });
        setLocations(Array.from(seen.values()).sort((a, b) => a.localeCompare(b)));
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Function to fetch master items with parallel batch loading
  const fetchMasterItems = async () => {
    setMasterItemsLoading(true);
    try {
      // First request to get total count and show initial data immediately
      const firstResponse = await axios.get("http://localhost:8080/get-all-masteritems-new-non-paginated", {
        params: { limit: 100, offset: 0 }
      });

      const firstData = firstResponse.data;
      let allItems = firstData.items || [];
      const total = firstData.total || (firstData.items ? firstData.items.length : 0);
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      // Format and show first page immediately
      const formattedMasterItems = allItems.map(item => ({
        ...item,
        item_name: item.item_name,
        item_type: item.item_type,
        base_price: item.base_price,
        present_price: item.present_price,
        isMasterItem: true,
        quantity: 0,
        location: null,
        warehouse: null
      }));

      setMasterItems(formattedMasterItems);
      setMasterItemsLoading(false); // Allow UI to show data while loading more in background

      // Continue loading remaining pages in the background - parallel batches
      if (firstData.has_more && totalPages > 1) {
        const batchSize = 10;
        const remainingPages = totalPages - 1;
        const pageResults = new Map();
        let completedCount = 1;

        const allBatchPromises = [];
        for (let batchStart = 1; batchStart <= remainingPages; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, remainingPages);
          const batchPromises = [];

          for (let page = batchStart; page <= batchEnd; page++) {
            const offset = page * limit;
            batchPromises.push(
              axios.get("http://localhost:8080/get-all-masteritems-new-non-paginated", {
                params: { limit, offset }
              }).then(response => ({ page, items: response.data.items || [] }))
            );
          }

          allBatchPromises.push(
            Promise.all(batchPromises).then(batchResults => {
              batchResults.forEach(({ page, items }) => {
                pageResults.set(page, items);
              });

              const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
              const mergedItems = [];
              sortedPages.forEach(pageNum => {
                const pageItems = pageResults.get(pageNum);
                if (Array.isArray(pageItems)) {
                  mergedItems.push(...pageItems);
                }
              });

              const allMerged = [...firstData.items, ...mergedItems];
              completedCount = pageResults.size + 1;

              const allFormattedItems = allMerged.map(item => ({
                ...item,
                item_name: item.item_name,
                item_type: item.item_type,
                base_price: item.base_price,
                present_price: item.present_price,
                isMasterItem: true,
                quantity: 0,
                location: null,
                warehouse: null
              }));

              setMasterItems(allFormattedItems);
              return batchResults;
            })
          );
        }

        await Promise.all(allBatchPromises);

        // Final merge
        const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
        sortedPages.forEach(pageNum => {
          const pageItems = pageResults.get(pageNum);
          if (Array.isArray(pageItems)) {
            allItems = [...allItems, ...pageItems];
          }
        });
      }

      // Final update with all data
      const finalFormattedItems = allItems.map(item => ({
        ...item,
        item_name: item.item_name,
        item_type: item.item_type,
        base_price: item.base_price,
        present_price: item.present_price,
        isMasterItem: true,
        quantity: 0,
        location: null,
        warehouse: null
      }));

      setMasterItems(finalFormattedItems);
      console.log("StockAdjustment - Master items loaded:", finalFormattedItems.length);
    } catch (error) {
      console.error("Failed to fetch master items:", error);
      setMasterItems([]);
    } finally {
      setMasterItemsLoading(false);
    }
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedItem(null);
      setItemName("");
      setAdjustmentType("add");
      setAdjustmentQuantity("");
      setAdjustmentLocation("");
      setAdjustmentWarehouse("");
      setAdjustmentReason("");
      setUnitPrice("");
      // Fetch locations and master items when modal opens
      fetchLocations();
      fetchMasterItems();
    }
  }, [open]);

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    // Get the item name - either from selected item or manual input
    const currentItemName = selectedItem ? selectedItem.item_name : itemName.trim();
    
    if (!currentItemName || !adjustmentQuantity || !adjustmentLocation || !adjustmentWarehouse) {
      setSnackbarMessage("Please fill in all required fields");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let validatedUnitPrice;

    if (adjustmentType === "add") {
      const sanitizedUnitPrice = typeof unitPrice === "string" ? unitPrice.trim() : unitPrice;
      validatedUnitPrice = parseFloat(sanitizedUnitPrice);

      if (!sanitizedUnitPrice || Number.isNaN(validatedUnitPrice) || validatedUnitPrice <= 0) {
        setSnackbarMessage("Unit price is required and must be greater than 0 when adding stock");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    }

    // Enhanced validation for remove operations
    if (adjustmentType === "remove") {
      // Additional validation: prevent removal if quantity is 0 or negative
      if (parseFloat(adjustmentQuantity) <= 0) {
        setSnackbarMessage("Removal quantity must be greater than 0");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
      }
      
      // Real-time stock validation for remove operations
      if (adjustmentLocation && adjustmentWarehouse) {
        const currentStock = await fetchCurrentStockForValidation(currentItemName, adjustmentLocation, adjustmentWarehouse);
        console.log("Stock validation - real-time current stock:", currentStock, "trying to remove:", adjustmentQuantity);
        
        if (parseFloat(adjustmentQuantity) > currentStock) {
          setSnackbarMessage(`Cannot remove more stock than available. Current stock: ${currentStock} units, trying to remove: ${adjustmentQuantity} units`);
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
      } else {
        setSnackbarMessage("Location and warehouse are required for stock validation");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    }

    setAdjustmentLoading(true);

    try {
      let response;
      
      // Use dedicated endpoints for both operations to get proper logging
      // ADD: Use add-stock endpoint (has proper logging and audit trail)
      // REMOVE: Use remove-stock endpoint (handles FIFO batch processing)
      if (adjustmentType === "add") {
        // For ADD operations: Use dedicated add-stock endpoint for proper logging
        const addPayload = {
          count: parseFloat(adjustmentQuantity),
          location: adjustmentLocation,
          warehouse: adjustmentWarehouse,
          employee_code: employeeCode,
          avenue_created_invoice_id: "STOCK_ADJUSTMENT",
          email: userEmail || "admin@system.com", // Ensure email is never empty
          adjustment_reason: adjustmentReason || null,
          unit_price: validatedUnitPrice,
        };

        console.log("StockAdjustment - ADD operation payload:", addPayload);
        console.log("StockAdjustment - Email field check:", { 
          userEmail, 
          emailInPayload: addPayload.email, 
          emailType: typeof addPayload.email,
          emailLength: addPayload.email?.length,
          localStorageEmail: localStorage.getItem("email"),
          allPayloadFields: Object.keys(addPayload)
        });
        
        // Validate payload fields for AddStockPayload
        console.log("StockAdjustment - Payload validation:", {
          count: { value: addPayload.count, type: typeof addPayload.count, valid: typeof addPayload.count === 'number' && addPayload.count > 0 },
          location: { value: addPayload.location, type: typeof addPayload.location, valid: typeof addPayload.location === 'string' && addPayload.location.trim() !== '' },
          warehouse: { value: addPayload.warehouse, type: typeof addPayload.warehouse, valid: typeof addPayload.warehouse === 'string' && addPayload.warehouse.trim() !== '' },
          employee_code: { value: addPayload.employee_code, type: typeof addPayload.employee_code, valid: typeof addPayload.employee_code === 'string' && addPayload.employee_code.trim() !== '' },
          avenue_created_invoice_id: { value: addPayload.avenue_created_invoice_id, type: typeof addPayload.avenue_created_invoice_id, valid: typeof addPayload.avenue_created_invoice_id === 'string' },
          email: { value: addPayload.email, type: typeof addPayload.email, valid: typeof addPayload.email === 'string' && addPayload.email.includes('@') },
          adjustment_reason: { value: addPayload.adjustment_reason, type: typeof addPayload.adjustment_reason, valid: addPayload.adjustment_reason === null || typeof addPayload.adjustment_reason === 'string' },
          unit_price: { value: addPayload.unit_price, type: typeof addPayload.unit_price, valid: typeof addPayload.unit_price === 'number' && addPayload.unit_price > 0 }
        });
        
        const endpoint = `http://localhost:8080/add-stock/${encodeURIComponent(currentItemName)}`;
        console.log("StockAdjustment - API Endpoint:", endpoint);
        
        try {
          response = await axios.patch(endpoint, addPayload);
          console.log("StockAdjustment - add-stock response:", response.data);
        } catch (error) {
          console.error("StockAdjustment - add-stock error:", error.response?.data || error.message);
          console.error("StockAdjustment - Full error object:", error);
          console.error("StockAdjustment - Error response:", error.response);
          console.error("StockAdjustment - Error status:", error.response?.status);
          console.error("StockAdjustment - Error headers:", error.response?.headers);
          throw error; // Let the error bubble up - we want to see what's happening
        }
        
      } else {
        // For REMOVE operations: Use dedicated remove-stock endpoint
        const removePayload = {
          count: parseFloat(adjustmentQuantity),
          location: adjustmentLocation,
          warehouse: adjustmentWarehouse,
          employee_code: employeeCode,
          avenue_created_invoice_id: "STOCK_ADJUSTMENT",
          email: userEmail || "admin@system.com", // Ensure email is never empty
          adjustment_reason: adjustmentReason || null
        };

        console.log("StockAdjustment - REMOVE operation payload:", removePayload);
        console.log("StockAdjustment - Email field check (REMOVE):", { 
          userEmail, 
          emailInPayload: removePayload.email, 
          emailType: typeof removePayload.email,
          emailLength: removePayload.email?.length 
        });
        
        const endpoint = `http://localhost:8080/remove-stock/${encodeURIComponent(currentItemName)}`;
        console.log("StockAdjustment - API Endpoint:", endpoint);
        
        try {
          response = await axios.patch(endpoint, removePayload);
          console.log("StockAdjustment - remove-stock response:", response.data);
        } catch (error) {
          console.error("StockAdjustment - remove-stock error:", error.response?.data || error.message);
          throw error; // Re-throw remove errors as they should work correctly
        }
      }

      console.log("StockAdjustment - User performing adjustment:", { employeeCode, userEmail });
      console.log("StockAdjustment - Adjustment details:", {
        itemName: currentItemName,
        adjustmentType, 
        quantity: adjustmentQuantity,
        location: adjustmentLocation,
        warehouse: adjustmentWarehouse
      });
      
      // Extract response data based on operation type
      const baseMessage = response.data.message || "Stock adjusted successfully!";
      
      let enhancedMessage = baseMessage;
      
      if (adjustmentType === "add") {
        // Handle add-stock response (or fallback update-inventory-up response)
        if (response.data.operation_details) {
          // This is from add-stock endpoint - has proper logging
          const operationDetails = response.data.operation_details || {};
          const requestId = operationDetails.request_id || "N/A";
          const oldQuantity = operationDetails.old_quantity || 0;
          const newQuantity = operationDetails.new_quantity || 0;
          const unitPrice = operationDetails.unit_price || 0;
          const totalValue = operationDetails.total_value || 0;
          
          enhancedMessage += ` | Old: ${oldQuantity} → New: ${newQuantity}`;
          if (unitPrice > 0) {
            enhancedMessage += ` | Unit Price: ₹${unitPrice.toFixed(2)} | Total Value: ₹${totalValue.toFixed(2)}`;
          }
          enhancedMessage += ` | Request ID: ${requestId}`;
        } else {
          // This is from update-inventory-up fallback
          const details = response.data.details || {};
          if (Object.keys(details).length > 0) {
            const detailMessages = Object.values(details);
            enhancedMessage += ` | ${detailMessages.join(", ")}`;
          }
        }
      } else {
        // Handle remove-stock response
      const operationDetails = response.data.operation_details || {};
        const requestId = operationDetails.request_id || "N/A";
      const oldQuantity = operationDetails.old_quantity || 0;
      const newQuantity = operationDetails.new_quantity || 0;
      
        enhancedMessage += ` | Old: ${oldQuantity} → New: ${newQuantity} | Request ID: ${requestId}`;
      }
      
      setSnackbarMessage(enhancedMessage);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
      // Call success callback to refresh inventory
      if (onSuccess) {
        onSuccess();
      }
      
      // Close dialog after success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error("Stock adjustment error:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      let errorMessage = "Failed to adjust stock";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 500) {
        errorMessage = "Server error: The backend service encountered an issue. Please check the console for details.";
      } else if (error.response?.status === 404) {
        errorMessage = "API endpoint not found. Please contact support.";
      } else if (error.response?.status === 400) {
        // Enhanced 400 error handling for stock validation
        if (error.response?.data?.error?.includes("negative") || error.response?.data?.error?.includes("insufficient")) {
          errorMessage = `Stock validation failed: ${error.response.data.error}. Please check current stock levels.`;
        } else {
        errorMessage = "Invalid request data. Please check your input values.";
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setSnackbarMessage(`${errorMessage} (Status: ${error.response?.status || 'Unknown'})`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setAdjustmentLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!adjustmentLoading) {
      onClose();
    }
  };

  // Combine inventory items with master items
  // Show all inventory items + master items that don't exist in inventory
  const combinedItems = useMemo(() => {
    const inventoryItems = inventory || [];
    const inventoryItemNames = new Set(inventoryItems.map(item => item.item_name?.toLowerCase()));
    
    // Add inventory items (mark them as in stock)
    const itemsWithStock = inventoryItems.map(item => ({
      ...item,
      inStock: true,
      isMasterItem: false
    }));
    
    // Add master items that don't exist in inventory
    const masterOnlyItems = masterItems.filter(masterItem => 
      !inventoryItemNames.has(masterItem.item_name?.toLowerCase())
    ).map(item => ({
      ...item,
      inStock: false,
      isMasterItem: true
    }));
    
    const combined = [...itemsWithStock, ...masterOnlyItems];
    console.log('Combined items:', {
      inventory: itemsWithStock.length,
      masterOnly: masterOnlyItems.length,
      total: combined.length
    });
    
    return combined;
  }, [inventory, masterItems]);

  const isAddOperation = adjustmentType === "add";
  const unitPriceValue = typeof unitPrice === "string" ? unitPrice.trim() : unitPrice;
  const parsedUnitPriceNumber = parseFloat(unitPriceValue);
  const hasValidUnitPrice =
    !isAddOperation ||
    (unitPriceValue !== "" && !Number.isNaN(parsedUnitPriceNumber) && parsedUnitPriceNumber > 0);
  const isSubmitDisabled =
    adjustmentLoading ||
    (!selectedItem && !itemName.trim()) ||
    !adjustmentQuantity ||
    !adjustmentLocation ||
    !adjustmentWarehouse ||
    !hasValidUnitPrice;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: '50%', 
              backgroundColor: adjustmentType === 'add' ? '#e8f5e8' : '#ffeaea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {adjustmentType === 'add' ? 
                <AddIcon color="success" /> : 
                <RemoveIcon color="error" />
              }
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Stock Adjustment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {adjustmentType === 'add' ? 'Add stock to inventory' : 'Remove stock from inventory'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* User Information Display - Commented out for production */}
            {/* 
            <Paper elevation={1} sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom color="primary">
                User Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Employee ID:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {employeeNo || 'Loading...'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Email:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {userEmail || 'Loading...'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Adjustment Type:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color={adjustmentType === 'add' ? 'success.main' : 'error.main'}>
                    {adjustmentType === 'add' ? '➕ Add Stock' : '➖ Remove Stock'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
            */}
            {/* End of User Information Display - Commented out for production */}

            <Grid container spacing={3}>
              {/* Left Column - Form */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Adjustment Details
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Item Selection - Support both existing and new items */}
                    <Autocomplete
                      freeSolo
                      options={combinedItems}
                      getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option.item_name || '';
                      }}
                      value={selectedItem || itemName}
                      onChange={(event, newValue) => {
                        console.log('Selected item:', newValue);
                        if (typeof newValue === 'string') {
                          // User typed a new item name
                          setItemName(newValue);
                          setSelectedItem(null);
                          setUnitPrice("");
                        } else if (newValue && newValue.item_name) {
                          // User selected an existing item (from inventory or master items)
                          setSelectedItem(newValue);
                          setItemName("");
                          setAdjustmentLocation(newValue.location || '');
                          setAdjustmentWarehouse(newValue.warehouse || '');
                          
                          // If it's a master item (not in stock), pre-fill the price
                          if (newValue.isMasterItem && newValue.present_price) {
                            setUnitPrice(newValue.present_price.toString());
                          } else if (newValue.inStock && newValue.unit_price) {
                            setUnitPrice(newValue.unit_price.toString());
                          }
                        } else {
                          // Clear selection
                          setSelectedItem(null);
                          setItemName("");
                          setUnitPrice("");
                        }
                      }}
                      onInputChange={(event, newInputValue) => {
                        if (event && event.type === 'input') {
                          setItemName(newInputValue);
                          setSelectedItem(null);
                        }
                      }}
                      filterOptions={(options, { inputValue }) => {
                        console.log('Filtering with inputValue:', inputValue);
                        console.log('Total options:', options.length);
                        
                        if (!inputValue || inputValue.trim() === '') {
                          return options.slice(0, 100); // Show first 100 items when no search
                        }
                        
                        const searchTerm = inputValue.toLowerCase().trim();
                        
                        // Split search term into words for multi-word search
                        const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
                        
                        const filtered = options.filter((option) => {
                          const itemName = (option.item_name || '').toLowerCase();
                          const location = (option.location || '').toLowerCase();
                          const warehouse = (option.warehouse || '').toLowerCase();
                          const projectName = (option.project_name || '').toLowerCase();
                          const propertyName = (option.property_name || '').toLowerCase();
                          const quantity = (option.quantity || '').toString();
                          const itemType = (option.item_type || '').toLowerCase();
                          const price = (option.present_price || option.unit_price || '').toString();
                          
                          // Check if all search words match any field
                          return searchWords.every(word => 
                            itemName.includes(word) ||
                            location.includes(word) ||
                            warehouse.includes(word) ||
                            projectName.includes(word) ||
                            propertyName.includes(word) ||
                            quantity.includes(word) ||
                            itemType.includes(word) ||
                            price.includes(word)
                          );
                        });
                        
                        console.log('Filtered results:', filtered.length);
                        
                        // Sort by relevance - prioritize exact matches in item name
                        const sorted = filtered.sort((a, b) => {
                          const aItemName = (a.item_name || '').toLowerCase();
                          const bItemName = (b.item_name || '').toLowerCase();
                          
                          const aStartsWith = aItemName.startsWith(searchTerm);
                          const bStartsWith = bItemName.startsWith(searchTerm);
                          
                          if (aStartsWith && !bStartsWith) return -1;
                          if (!aStartsWith && bStartsWith) return 1;
                          
                          return aItemName.localeCompare(bItemName);
                        });
                        
                        return sorted.slice(0, 100); // Limit to 100 results for performance
                      }}
                      isOptionEqualToValue={(option, value) => {
                        if (typeof option === 'string' && typeof value === 'string') {
                          return option === value;
                        }
                        if (option && value && option.item_name && value.item_name) {
                          return option.item_name === value.item_name;
                        }
                        return false;
                      }}
                      disabled={combinedItems.length === 0 && !masterItemsLoading}
                      clearOnEscape
                      selectOnFocus
                      handleHomeEndKeys
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search and Select Item *"
                          placeholder="Search by name, location, warehouse, project..."
                          variant="outlined"
                          helperText={
                            combinedItems.length === 0 
                              ? "Loading items... Please wait."
                              : `${combinedItems.length} items available (${inventory?.length || 0} in stock + ${masterItems.length} from master items)`
                          }
                          error={combinedItems.length === 0 && !masterItemsLoading}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%', py: 1 }}>
                            <InventoryIcon 
                              color={option.inStock ? "primary" : "disabled"} 
                              fontSize="small" 
                              sx={{ mt: 0.5 }} 
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="medium" noWrap>
                                  {option.item_name}
                                </Typography>
                                {option.isMasterItem && (
                                  <Chip 
                                    label="From Master Items" 
                                    size="small" 
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontSize: '0.65rem', height: 18 }}
                                  />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                {option.inStock ? (
                                  <>
                                    <Chip 
                                      label={`In Stock: ${option.quantity || 0}`} 
                                      size="small" 
                                      color="success" 
                                      variant="filled"
                                    />
                                    {option.location && (
                                      <Chip 
                                        label={option.location} 
                                        size="small" 
                                        color="secondary" 
                                        variant="outlined"
                                      />
                                    )}
                                    {option.warehouse && (
                                      <Chip 
                                        label={`WH: ${option.warehouse}`} 
                                        size="small" 
                                        color="info" 
                                        variant="outlined"
                                      />
                                    )}
                                    {option.project_name && (
                                      <Chip 
                                        label={`Proj: ${option.project_name}`} 
                                        size="small" 
                                        color="default" 
                                        variant="outlined"
                                      />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Chip 
                                      label="Not in Stock" 
                                      size="small" 
                                      color="error" 
                                      variant="outlined"
                                    />
                                    {option.present_price && (
                                      <Chip 
                                        label={`Price: ₹${option.present_price}`} 
                                        size="small" 
                                        color="default" 
                                        variant="outlined"
                                      />
                                    )}
                                    {option.item_type && (
                                      <Chip 
                                        label={option.item_type} 
                                        size="small" 
                                        color="default" 
                                        variant="outlined"
                                      />
                                    )}
                                  </>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      noOptionsText={
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <InventoryIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            No items found matching your search
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Try searching by:
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            • Item name • Location • Warehouse • Project • Type • Price
                          </Typography>
                        </Box>
                      }
                      loading={!inventory || masterItemsLoading}
                      loadingText={masterItemsLoading ? "Loading master items..." : "Loading inventory..."}
                    />

                    {/* Adjustment Type */}
                    <FormControl fullWidth>
                      <InputLabel>Adjustment Type *</InputLabel>
                      <Select
                        value={adjustmentType}
                        onChange={(e) => setAdjustmentType(e.target.value)}
                        label="Adjustment Type *"
                      >
                        <MenuItem value="add">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AddIcon color="success" />
                            <Typography>Add Stock</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="remove">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RemoveIcon color="error" />
                            <Typography>Remove Stock</Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {/* Quantity */}
                    <TextField
                      label="Quantity *"
                      type="number"
                      value={adjustmentQuantity}
                      onChange={(e) => setAdjustmentQuantity(e.target.value)}
                      fullWidth
                      inputProps={{ min: 0.01, step: 0.01 }}
                      placeholder="e.g., 10.5"
                      helperText={
                        adjustmentType === 'remove' && selectedItem ? 
                        `Available: ${selectedItem.quantity || 0} units` : 
                        'Enter the quantity to adjust (supports decimal values)'
                      }
                    />

                    {/* Unit Price - Only for Add Stock */}
                    {adjustmentType === "add" && (
                      <TextField
                        label="Unit Price (₹) *"
                        type="number"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        fullWidth
                        required
                        error={unitPriceValue !== "" && !hasValidUnitPrice}
                        inputProps={{ min: 0.01, step: 0.01 }}
                        placeholder="e.g., 25.50"
                        helperText={
                          unitPriceValue === ""
                            ? "Unit price is required when adding stock"
                            : !hasValidUnitPrice
                              ? "Enter a value greater than 0"
                              : "Enter the unit price for the stock being added"
                        }
                      />
                    )}

                    {/* Location */}
                    <Autocomplete
                      freeSolo
                      options={locations}
                      getOptionLabel={(opt) => (typeof opt === "string" ? toCamelCase(opt) : opt)}
                      value={adjustmentLocation}
                      onChange={(event, newValue) => setAdjustmentLocation(newValue || '')}
                      onInputChange={(event, newInputValue) => {
                        if (event?.type === "change") setAdjustmentLocation(newInputValue);
                      }}
                      loading={locationLoading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Location *"
                          fullWidth
                          placeholder="e.g., Warehouse A, Storage Room 1"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {locationLoading ? <CircularProgress size={18} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    {/* Warehouse */}
                    <TextField
                      label="Warehouse *"
                      value={adjustmentWarehouse}
                      onChange={(e) => setAdjustmentWarehouse(e.target.value)}
                      fullWidth
                      placeholder="e.g., WH001, Main Warehouse"
                    />

                    {/* Adjustment Reason */}
                    <TextField
                      label="Reason for Adjustment"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="e.g., Stock replenishment, Damaged goods, Inventory correction..."
                      helperText="Optional: Provide a reason for this stock adjustment"
                    />
                  </Box>
                </Paper>
              </Grid>

              {/* Right Column - Summary */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Adjustment Summary
                  </Typography>
                  
                  {selectedItem ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Card variant="outlined" sx={{ 
                        backgroundColor: selectedItem.isMasterItem ? '#fff3e0' : 'inherit',
                        borderColor: selectedItem.isMasterItem ? '#ff9800' : 'inherit'
                      }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Selected Item
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {selectedItem.item_name}
                          </Typography>
                          {selectedItem.isMasterItem ? (
                            <>
                              <Chip 
                                label="From Master Items - Not Currently in Stock" 
                                size="small" 
                                color="warning"
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                Item Type: {selectedItem.item_type || 'N/A'}
                              </Typography>
                              {selectedItem.present_price && (
                                <Typography variant="body2" color="text.secondary">
                                  Master Price: ₹{selectedItem.present_price}
                                </Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Current Stock: {selectedItem.quantity || 0} units
                            </Typography>
                          )}
                        </CardContent>
                      </Card>

                      {adjustmentQuantity && (
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Adjustment Details
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {adjustmentType === 'add' ? 
                                <AddIcon color="success" /> : 
                                <RemoveIcon color="error" />
                              }
                              <Typography variant="body2">
                                {adjustmentType === 'add' ? 'Adding' : 'Removing'}: {adjustmentQuantity} units
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Location: {adjustmentLocation || 'Not specified'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Warehouse: {adjustmentWarehouse || 'Not specified'}
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                      {adjustmentQuantity && (
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            backgroundColor: adjustmentType === 'add' ? '#e8f5e8' : '#ffeaea',
                            borderColor: adjustmentType === 'add' ? '#4caf50' : '#f44336'
                          }}
                        >
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              New Stock Level
                            </Typography>
                            <Typography variant="h6" color={adjustmentType === 'add' ? 'success.main' : 'error.main'}>
                              {adjustmentType === 'add' 
                                ? (selectedItem.quantity || 0) + parseFloat(adjustmentQuantity || 0)
                                : (selectedItem.quantity || 0) - parseFloat(adjustmentQuantity || 0)
                              } units
                            </Typography>
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Select an item to see adjustment summary
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleClose}
            disabled={adjustmentLoading}
            size="large"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStockAdjustment}
            variant="contained"
            disabled={isSubmitDisabled}
            startIcon={adjustmentLoading ? <CircularProgress size={20} /> : null}
            size="large"
            color={adjustmentType === 'add' ? 'success' : 'error'}
          >
            {adjustmentLoading ? 'Processing...' : `${adjustmentType === 'add' ? 'Add' : 'Remove'} Stock`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default StockAdjustment;