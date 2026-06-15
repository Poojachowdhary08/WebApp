import React, { useState } from "react";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button'
import { Typography } from '@mui/material';
import Avenue from './assets/Avenue_bill.pdf'
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Dropdown from 'react-dropdown';
import { DataGrid } from '@mui/x-data-grid';
import 'react-dropdown/style.css';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

import {
  gridClasses,
} from '@mui/x-data-grid-premium';
import SideBarInvoice from './SideBarInvoice';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const options = [
  'Vendor', 'JK Group', 'three'
];
const options1 = [
  'Online', 'offline'
];
const defaultOption = options[0];
const defaultOption1 = options1[0];


const columns = [
  {
    field: 'id', headerName: 'ID', width: 20,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
  {
    field: 'itemDetails',
    headerName: 'Item Details',
    width: 100,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',
  
},
  {
    field: 'account',
    headerName: 'Account',
    width: 90,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    width: 80,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
  {
    field: 'tax',
    headerName: 'Tax',
    type: 'number',
    width: 80,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
  {
    field: 'ratePerUnit',
    headerName: 'Rate Per Unit',
    width: 140,
    type: 'number',

    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
  {
    field: 'amount',
    headerName: 'Amount',
    type: 'number',
    width: 80,
    headerClassName: 'super-app-theme--header',
    headerAlign: 'center',
    cellClassName: 'super-app-theme--cell',

  },
];

const rows = [
  { id: 1, itemDetails: 'item', account: 'Primary', quantity: 24, ratePerUnit: 'Rs.456', tax: 'GST', amount: '2344' },
  { id: 2, itemDetails: 'Cement', account: 'Primary', quantity: 31, ratePerUnit: 'Rs.456', tax: 'GST', amount: '2344' },
  { id: 3, itemDetails: 'Cement', account: 'Primary', quantity: 31, ratePerUnit: 'Rs.456', tax: 'GST', amount: '2344' },
  { id: 4, itemDetails: 'Cement', account: 'Primary', quantity: 11, ratePerUnit: 'Rs.456', tax: 'GST', amount: '2344' },

];

const InvoicePdf = () => {
  const [isVisible, setIsVisible] = useState(false); // State to track visibility

  const toggleVisibility = () => {
    setIsVisible(!isVisible); // Toggle the visibility state
  };
  const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
    ...theme.applyStyles('dark', {
      backgroundColor: '#1A2027',
    }),
  }));

  return (
    <Card sx={{ width: 1400, height: 669, borderRadius: 2 }}>
      <Typography sx={{
        border: 0.5, borderRadius: 0.5, height: 72, textAlign: "center",
        fontSize: "25px"
      }} >Invoice Details    #9877789
        <Button startIcon={<CheckIcon />}
          sx={{
            backgroundColor: "#2A3663",
            color: "#FFFFFF",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
            marginLeft: "670px",
            marginTop: "12px",
            "&:hover": {
              backgroundColor: "#3B4A7A",
            },
          }}>Ready For Payment</Button>
        <Button startIcon={<ClearIcon />}
          sx={{
            backgroundColor: "rgb(242, 210, 189)",
            marginLeft: "20px",
            marginTop: "12px",
            color: "red",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}>Reject</Button>
      </Typography>

      <CardContent>
        <Typography sx={{
          fontSize: "20px", marginLeft: "35px"
        }}>Invoice Overview</Typography>

        <Box sx={{ flexGrow: 1 }}>

          {isVisible && (
            <>
              <Button startIcon={<ChevronRightIcon sx={{fontSize:"2.5rem"}}/>}
                onClick={toggleVisibility}
                size="3em"
                sx={{
                  color: "black",
                  fontSize: "24px",
                  marginTop: "-20px"
                }}>
                {/* {isVisible } */}
              </Button>
            </>
          )}
          {!isVisible && (
            <>
              <Button startIcon={<KeyboardArrowLeftIcon sx={{fontSize:"2.5rem"}} />}
                onClick={toggleVisibility}
                size="3em"
                sx={{
                  color: "black",
                  fontSize: "24px",
                  marginTop: "-20px",
                  backgroundColor:"transparent",
                  border:"2px",
                  borderRadius:"20px",
                  width:"10px"
                }}>
                {!isVisible}
              </Button>

            </>
          )}

          <Grid container spacing={3}>
            {isVisible && (
              <>
                <Grid item xs={2}>
                  <SideBarInvoice />
                </Grid>
              </>
            )}
            <Grid item xs={4} >
              <Card >
                <CardContent >
                  <object data={Avenue} type="application/pdf" width="557px" height="493">
                  </object>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sx={{ height: 393, width: 600 }}>
              <Grid size={6} >
                <Item>
                  <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6} >
                      <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Invoice number"
                        sx={{
                          width: "320px",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "4px",
                          marginBottom: "10px",
                          marginLeft: "30px"
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Order number"
                        sx={{
                          width: "320px",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "4px",
                          marginLeft: "10px"

                        }}
                      />
                    </Grid>
                    <Grid size={6} sx={{ marginLeft: "30px", marginBottom: "15px", }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={['DatePicker']}>
                          <DatePicker label="Invoice Date" sx={{
                            width: "320px",
                            backgroundColor: "#FFFFFF",
                            borderRadius: "4px",

                          }} />
                        </DemoContainer>
                      </LocalizationProvider>  </Grid>
                    <Grid size={6} sx={{ marginLeft: "10px", marginBottom: "15px" }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={['DatePicker']}>
                          <DatePicker label="Due Date" sx={{
                            width: "320px",
                            backgroundColor: "#FFFFFF",
                            borderRadius: "4px",
                          }} />
                        </DemoContainer>
                      </LocalizationProvider>  </Grid>
                    <Grid size={6}>
                      <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Payment Terms"
                        sx={{
                          width: "320px",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "4px",
                          marginLeft: "30px",
                          marginBottom: "10px",

                        }}
                      />  </Grid>
                    <Grid size={6}>
                      <TextField
                        variant="outlined"
                        size="small"
                        placeholder="GST Number"
                        sx={{
                          width: "320px",
                          backgroundColor: "#FFFFFF",
                          borderRadius: "4px",
                          marginLeft: "10px",
                          marginBottom: "10px",

                        }}
                      />  </Grid>
                    <Grid size={2} sx={{
                      width: "320px",
                      marginLeft: "30px",

                    }}>
                      <Dropdown options={options}

                        value={defaultOption} placeholder="Select an option" /> </Grid>
                    <Grid size={2} sx={{
                      width: "320px",
                      marginLeft: "10px",

                    }}>
                      <Dropdown options={options1}
                        value={defaultOption1} placeholder="Select an option" /> </Grid>
                  </Grid>
                </Item>

                <Box sx={{
                  height: 300,
                  width: 'auto',
                  border: 1,
                  '& .super-app-theme--header': {
                    backgroundColor: '#5F6887',
                  },
                  [`.${gridClasses.cell}`]: {
                    color: '#1a3e72',
                    // border:1,
                    // height:"40px",
                    // borderRadius:1,
                    // paddingBottom:"10px",
                    // marginLeft:"5px",
                    // marginRight:"5px"


                  },
                }} >



                  <DataGrid
                    sx={{
                      boxShadow: 2,
                      border: 2,
                      marginTop: 2,
                      borderColor: "white"
                    }}
                    rows={rows}
                    columns={columns}
                    initialState={{
                      pagination: {
                        paginationModel: {
                          pageSize: 3,
                        },
                      },
                    }}
                    pageSizeOptions={[3]}
                    checkboxSelection
                    disableRowSelectionOnClick
                  />
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InvoicePdf
  ;