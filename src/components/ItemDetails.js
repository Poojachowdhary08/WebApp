import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Alert,
} from '@mui/material';

// API Base URL
const API_BASE_URL = 'http://localhost:8080'; // Replace with your backend URL

// Utility function for API requests
const apiRequest = async (url, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Something went wrong');
  }

  return await response.json();
};

const warehouses = ['Warehouse 1', 'Warehouse 2', 'Warehouse 3']; // Static list of warehouses

const ItemDetails = () => {
  const location = useLocation(); // Access the current location object
  const queryParams = new URLSearchParams(location.search); // Parse query parameters

  // Extract query parameter values
  const parsedItemName = queryParams.get('parsed_item_name');
  const parsedLocation = queryParams.get('parsed_location');
  const parsedWarehouse = queryParams.get('parsed_warehouse');

  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form inputs
  const [operation, setOperation] = useState('');
  const [count, setCount] = useState('');
  const [warehouse, setWarehouse] = useState(parsedWarehouse || '');
  const [employeeId, setEmployeeId] = useState('');

  // Status messages
  const [operationError, setOperationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch item details
  useEffect(() => {
    const fetchItemDetails = async () => {
      setLoading(true);
      setError(null);

      // Check if required query parameters are present
      if (!parsedItemName || !parsedLocation || !parsedWarehouse) {
        setError('Missing required query parameters.');
        setLoading(false);
        return;
      }

      try {
        // Construct the API URL with query parameters
        const apiUrl = `${API_BASE_URL}/inventory/?parsed_item_name=${parsedItemName}&parsed_location=${parsedLocation}&parsed_warehouse=${parsedWarehouse}`;
        console.log("API Request URL:", apiUrl); // Debugging log

        const data = await apiRequest(apiUrl); // Call the backend API
        setItemDetails(data);
      } catch (err) {
        setError(err.message || 'Unable to fetch item details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [parsedItemName, parsedLocation, parsedWarehouse]);

  // Handle the PATCH request to update the item details

  const handleSubmit = async () => {
    setOperationError('');
    setSuccessMessage('');

    if (!operation || !count || count <= 0 || !employeeId) {
      setOperationError('Please fill all required fields with valid values.');
      return;
    }

    const payload = {
      operation,
      count: parseInt(count, 10),
      location: parsedLocation || 'Unknown',
      warehouse, // Use the default warehouse directly
      employee_no: employeeId,
    };

    try {
      const apiUrl = `${API_BASE_URL}/inventory/${parsedItemName}`;
      const response = await apiRequest(apiUrl, 'PATCH', payload);
      setItemDetails((prev) => ({
        ...prev,
        quantity: response.operation_details.new_quantity,
      }));
      setOperation('');
      setCount('');
      setEmployeeId('');
      setSuccessMessage(response.message || 'Operation successful.');
    } catch (err) {
      setOperationError(err.message || 'Failed to perform the operation.');
    }
  };

  // Render loading spinner
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', marginTop: 4 }}>
        <CircularProgress />
        <Typography>Loading item details...</Typography>
      </Box>
    );
  }

  // Render error message
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', marginTop: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Render the main UI
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f0f0f0', padding: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 500 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
          Item Details
        </Typography>
        <Typography><strong>Item Name:</strong> {parsedItemName}</Typography>
        <Typography><strong>Location:</strong> {parsedLocation || 'Unknown'}</Typography>
        <Typography><strong>Quantity:</strong> {itemDetails?.quantity}</Typography>
        <Typography><strong>Warehouse:</strong> {parsedWarehouse || 'Not Specified'}</Typography>

        {/* Operation Selection */}
        <FormControl fullWidth variant="outlined" sx={{ mt: 3, mb: 2 }}>
          <InputLabel id="operation-label">Select Operation</InputLabel>
          <Select
            labelId="operation-label"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            label="Select Operation"
          >
            <MenuItem value="add">Add Inventory</MenuItem>
            <MenuItem value="reduce">Issue Inventory</MenuItem>
          </Select>
        </FormControl>

        {/* Count Input */}
        <TextField
          fullWidth
          label="Count"
          type="number"
          variant="outlined"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Warehouse Selection */}
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel id="warehouse-label">Select Warehouse</InputLabel>
          <Select
            labelId="warehouse-label"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            label="Select Warehouse"
          >
            {warehouses.map((wh) => (
              <MenuItem key={wh} value={wh}>
                {wh}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Employee ID Input */}
        <TextField
          fullWidth
          label="Employee ID"
          variant="outlined"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Error and Success Messages */}
        {operationError && <Alert severity="error" sx={{ mb: 2 }}>{operationError}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        {/* Submit Button */}
        <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
          Submit Operation
        </Button>
      </Paper>
    </Box>
  );
};

export default ItemDetails;