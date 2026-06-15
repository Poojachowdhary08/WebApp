import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Autocomplete,
  CircularProgress,
  Grid,
} from "@mui/material";
import axios from "axios";
import CreateItemDialog from "./CreateItemDialog"; // You'll create this

const ItemDropDown = ({ onSelect, value }) => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [pendingNewItemName, setPendingNewItemName] = useState("");


  // Fetch items from API with parallel batch loading
  const fetchItems = async () => {
    setLoading(true);
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

      // Map first page items immediately
      const apiItems = allItems.map((item) => ({
        id: item.id,
        name: item.item_name,
        item_type: item.item_type,
        quantity: item.quantity,
        baseprice: item.base_price,
        presentprice: item.present_price,
      }));

      setItems(apiItems);
      setLoading(false); // Allow UI to show data while loading more in background

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

              const allApiItems = allMerged.map((item) => ({
                id: item.id,
                name: item.item_name,
                item_type: item.item_type,
                quantity: item.quantity,
                baseprice: item.base_price,
                presentprice: item.present_price,
              }));

              setItems(allApiItems);
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
      const finalApiItems = allItems.map((item) => ({
        id: item.id,
        name: item.item_name,
        item_type: item.item_type,
        quantity: item.quantity,
        baseprice: item.base_price,
        presentprice: item.present_price,
      }));

      setItems(finalApiItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateNew = () => {
    setOpenCreateDialog(true);
  };
  const handleNewItemSubmit = (newItem) => {
    setItems((prev) => [...prev, newItem]);
    onSelect(newItem);
    setOpenCreateDialog(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (inputValue.trim() === "") {
      setFilteredItems(items);
    } else {
      const matches = items.filter((item) =>
        item.name.toLowerCase().includes(inputValue.toLowerCase())
      );

      if (!matches.some((item) => item.name.toLowerCase() === inputValue.toLowerCase())) {
        setFilteredItems([{ id: "create_new", name: `Create New Item "${inputValue}"` }, ...matches]);
      } else {
        setFilteredItems(matches);
      }
    }
  }, [items, inputValue]);

  return (

    <>
    <Autocomplete
      options={filteredItems}
      value={value || null} // ✅ Keep selection independent
      getOptionLabel={(option) => option.name || ""}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      onChange={(event, newValue) => {
        if (newValue && newValue.id === "create_new") {
          handleCreateNew(); // ✅ Show dialog instead of selecting
          setPendingNewItemName(inputValue);
        } else if (newValue) {
          onSelect(newValue);
        } else {
          if (inputValue.trim()) {
            onSelect({ id: "custom", name: inputValue });
          }
        }
      }}
      
      loading={loading}
      onOpen={fetchItems}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Items"
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
        <Box component="li" {...props} sx={{ padding: 2 }}>
          {option.id === "create_new" ? (
            <Typography sx={{ color: "#2A3663", fontWeight: "bold" }}>
              + {option.name}
            </Typography>
          ) : (
            <Grid container spacing={2} alignItems="center">
<Grid container spacing={2} alignItems="center">
  <Grid item xs>
  <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 3,textTransform: 'uppercase' }}>
          {option.name}
        </Typography>
    {/* <Typography variant="body2" sx={{ color: "gray" }}>
      Type: {option.itemType}
    </Typography>
    <Typography variant="body2" sx={{ color: "gray" }}>
      Base Price: ₹{option.baseprice ?? "N/A"}
    </Typography>
    <Typography variant="body2" sx={{ color: "gray" }}>
      Present Price: ₹{option.presentprice ?? "N/A"}
    </Typography> */}
    <Grid container spacing={1} sx={{ mt: 0.5 }}>
          <Grid item xs={5}>
            <Typography variant="body2" color="text.secondary">
              Type: {option.item_type}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="body2" color="text.secondary">
              ₹ Base: {option.baseprice ?? "0"}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">
              ₹ Present: {option.presentprice ?? "0"}
            </Typography>
          </Grid>
        </Grid>

  </Grid>
</Grid>

            </Grid>
          )}
        </Box>

        
      )}
      
      
    />
    
    {openCreateDialog && (
      <CreateItemDialog
        open={openCreateDialog}
        itemName={pendingNewItemName}
        onClose={() => setOpenCreateDialog(false)}
        onSubmit={handleNewItemSubmit}
      />
      )}
  </>
  );
};

export default ItemDropDown;