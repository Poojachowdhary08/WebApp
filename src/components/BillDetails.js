import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DataGrid } from "@mui/x-data-grid";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

const columns = [
  { field: "id", headerName: "ID", width: 50 },
  { field: "itemDetails", headerName: "Item Details", width: 150 },
  { field: "account", headerName: "Account", width: 100 },
  { field: "quantity", headerName: "Quantity", type: "number", width: 100 },
  { field: "tax", headerName: "Tax", width: 100 },
  { field: "ratePerUnit", headerName: "Rate Per Unit", width: 150 },
  { field: "amount", headerName: "Amount", width: 100 },
];

const BillDetails = ({ invoiceData }) => {
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);

  useEffect(() => {
    if (invoiceData) {
      setInvoiceDate(invoiceData.invoiceDate || null);
      setDueDate(invoiceData.dueDate || null);
    }
  }, [invoiceData]);

  return (
    <Card sx={{ width: "100%", height: "auto", borderRadius: 2 }}>
      <Typography
        sx={{
          border: 0.5,
          borderRadius: 0.5,
          height: 72,
          textAlign: "center",
          fontSize: "25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
        }}
      >
        Invoice Details #{invoiceData?.invoiceNumber || "N/A"}
        <Box>
          <Button
            startIcon={<CheckIcon />}
            sx={{
              backgroundColor: "#2A3663",
              color: "#FFFFFF",
              borderRadius: "4px",
              textTransform: "none",
              padding: "8px 16px",
              fontSize: "14px",
              mr: 2,
              "&:hover": {
                backgroundColor: "#3B4A7A",
              },
            }}
          >
            Ready For Payment
          </Button>
          <Button
            startIcon={<ClearIcon />}
            sx={{
              backgroundColor: "rgb(242, 210, 189)",
              color: "red",
              borderRadius: "4px",
              textTransform: "none",
              padding: "8px 16px",
              fontSize: "14px",
            }}
          >
            Reject
          </Button>
        </Box>
      </Typography>

      <CardContent>
        <Typography sx={{ fontSize: "20px", marginLeft: "35px" }}>
          Invoice Overview
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Card>
                <CardContent>
                  <object
                    data={invoiceData?.pdfUrl || ""}
                    type="application/pdf"
                    width="100%"
                    height="493"
                  >
                    PDF Preview
                  </object>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Item>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      size="small"
                      placeholder="Invoice Number"
                      value={invoiceData?.invoiceNumber || ""}
                      fullWidth
                      disabled
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Invoice Date"
                        value={invoiceDate}
                        onChange={(newValue) => setInvoiceDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={6}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Due Date"
                        value={dueDate}
                        onChange={(newValue) => setDueDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      size="small"
                      placeholder="GST Number"
                      value={invoiceData?.gstNumber || ""}
                      fullWidth
                      disabled
                    />
                  </Grid>
                </Grid>
              </Item>
            </Grid>
          </Grid>

          <Box sx={{ height: 300, mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Invoice Items
            </Typography>
            <DataGrid
              rows={invoiceData?.items || []}
              columns={columns}
              pageSize={3}
              rowsPerPageOptions={[3]}
              checkboxSelection
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BillDetails;
