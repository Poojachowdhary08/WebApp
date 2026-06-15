import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Autocomplete,
  Avatar,
  Grid,
  CircularProgress,
  Tooltip,
} from "@mui/material";

const VendorDropdown = ({ onSelect, onCreateVendor, value }) => {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/get-all-vendors");
      if (response.ok) {
        const data = await response.json();
        const apiVendors = data.vendors.map((vendor) => ({
          id: vendor.vendor_id || `vendor_${Math.random()}`,
          name: vendor.vendor_display_name || "Unnamed Vendor",
          vendorId: vendor.vendor_id || "N/A",
          contactName: vendor.vendor_display_name || "N/A",
          bankName: vendor.vendor_bank_name || "N/A",
          gstNumber: vendor.vendor_gst_number || "N/A",
          avatar: "https://via.placeholder.com/40",
        }));
        setVendors(apiVendors);
      } else {
        console.error("Failed to fetch vendors:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on component mount
    fetchVendors();
  }, []);

  useEffect(() => {
    // Dynamically filter vendors based on inputValue
    if (inputValue.trim() === "") {
      setFilteredVendors(vendors);
    } else {
      const matches = vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(inputValue.toLowerCase())
      );

      // Include "Create New" option if no exact match is found
      if (!matches.some((vendor) => vendor.name.toLowerCase() === inputValue.toLowerCase())) {
        setFilteredVendors([
          { id: "create_new", name: `Create New Vendor "${inputValue}"` },
          ...matches,
        ]);
      } else {
        setFilteredVendors(matches);
      }
    }
  }, [vendors, inputValue]);

  return (
    <Autocomplete
      options={filteredVendors} // Use dynamically filtered vendors
      value={value}
      getOptionLabel={(option) => option.name || ""}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      onChange={(event, newValue) => {
        if (newValue && newValue.id === "create_new") {
          onCreateVendor(inputValue);
        } else if (newValue) {
          onSelect(newValue);
        }
      }}
      loading={loading}
      onOpen={fetchVendors} // Fetch vendors each time the dropdown opens
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Vendors"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            border: "1px solid #E0E0E0",
            borderRadius: "8px",
            padding: 2,
            marginBottom: 1,
            maxWidth: "100%",
          }}
        >
          {option.id === "create_new" ? (
            <Typography sx={{ color: "#2A3663", fontWeight: "bold" }}>
              + {option.name}
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Avatar src={option.avatar} alt={option.name} />
              </Grid>
              <Grid item xs>
                <Tooltip title={`GST: ${option.gstNumber} | Bank: ${option.bankName}`}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {option.name}
                  </Typography>
                </Tooltip>
                <Typography variant="caption" sx={{ color: "#6E7E8B" }}>
                  ID: {option.vendorId}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
      sx={{
        "& .MuiAutocomplete-popupIndicator": {
          color: "#2A3663",
        },
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",
        },
      }}
    />
  );
};

export default VendorDropdown;