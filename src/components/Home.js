import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  TextField,
  Autocomplete,
  Typography,
  IconButton,
  Avatar,
} from '@mui/material';
import { ArrowBackIos, Notifications } from '@mui/icons-material';

export default function SearchBarPage() {
  const [inputValue, setInputValue] = useState(''); // Input value from search box
  const [formType, setFormType] = useState(''); // Selected form type

  // Options for the search bar
  const options = [
    'Create New Land Deal',
    'View Land Deals',
    'Inventory Management',
    'Create New Template',
    'View Inventory List',
    'Create New Bill',
    'View Bills List',
    'View Vendors'
  ];

  // Handle input change in the autocomplete search bar
  const handleInputChange = (event, newValue) => {
    setInputValue(newValue || '');
    if (newValue) {
      setFormType(newValue); // Set the form type to the selected value
    }
  };

  // Handle back button click to reset the formType and input value
  const handleBackClick = () => {
    setFormType('');
    setInputValue('');
  };

  return (
    <Box sx={{ minHeight: '98vh', bgcolor: '#f5f5f5' }}>
      {/* AppBar always visible */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'black', boxShadow: 'none' }}>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* AvenueNxt title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#2575fc',
              mr: 4,
            }}
          >
            AvenueNxt
          </Typography>

          {/* Search bar in the menu bar when formType is active */}
          {formType && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Autocomplete
                freeSolo
                options={options}
                value={inputValue}
                onInputChange={handleInputChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search..."
                    variant="outlined"
                    size="small"
                    sx={{
                      width: '1000vh', // Set width to 70vh
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '16px',
                        background: 'rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  />
                )}
              />

              {/* Back button */}
              <IconButton
                onClick={handleBackClick}
                sx={{
                  ml: 0,
                  color: '#2575fc',
                }}
              >
                <ArrowBackIos />
              </IconButton>
            </Box>
          )}

          {/* Bell Icon and User Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Notifications Bell Icon */}
            <IconButton
              sx={{
                color: '#2575fc',
                '&:hover': {
                  color: '#003366',
                },
              }}
            >
              <Notifications />
            </IconButton>

            {/* User Avatar */}
            <Avatar
              sx={{
                bgcolor: '#2575fc',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#003366',
                },
              }}
            >
              U
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content for when formType is NOT active */}
      {!formType && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 64px)', // Full height minus AppBar height
          }}
        >
          {/* Search bar in the middle of the screen */}
          <Autocomplete
            freeSolo
            options={options}
            value={inputValue}
            onInputChange={handleInputChange}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="What would you like to do?"
                variant="outlined"
                sx={{
                  width: '80vh',
                  bgcolor: 'white',
                  borderRadius: '16px', // Slightly rounded rectangle
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px', // Slightly rounded rectangle
                    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                    paddingLeft: '10px', // Add padding inside the input
                  },
                  '& .MuiInputBase-input': {
                    padding: '10px 12px', // Input text padding
                  },
                }}
              />
            )}
          />
        </Box>
      )}

      {/* Placeholder for when formType is active */}
      {formType && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '98vh',
          }}
        >
          
        </Box>
      )}
    </Box>
  );
}