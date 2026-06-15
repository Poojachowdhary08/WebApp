// components/EstimatePreview.js
import React from "react";
import { Box, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

const EstimatePreview = ({ estimate }) => {
  return (
    <Box p={4}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        🧾 Estimate Summary
      </Typography>

      <Typography variant="subtitle1">
        <b>Estimate ID:</b> {estimate.estimate_id}
      </Typography>
      <Typography variant="subtitle1">
        <b>Property:</b> {estimate.property_name}
      </Typography>
      <Typography variant="subtitle1">
        <b>Title:</b> {estimate.estimate_title}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell><b>Item</b></TableCell>
            <TableCell><b>Unit Price</b></TableCell>
            <TableCell><b>Quantity</b></TableCell>
            <TableCell><b>Total</b></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {estimate.items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.item_name}</TableCell>
              <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>₹{(item.unit_price * item.quantity).toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={3}><b>Grand Total</b></TableCell>
            <TableCell><b>₹{parseFloat(estimate.total_amount).toFixed(2)}</b></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};

export default EstimatePreview;
