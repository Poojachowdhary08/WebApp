// src/components/ItemTypeDropDown.js
import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import axios from "axios";

// API returns something like: [{ id: "ELECTRICAL", name: "ELECTRICAL" }, ...]
const API_URL = "http://localhost:8080/get-all-item-types"; // or test if needed

// Normalizes anything into a string type
const asTypeString = (v) => {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") return (v.name || v.id || v.value || "").trim();
  return "";
};

export default function ItemTypeDropDown({ value, onSelect, label = "Item Type", disabled = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // This tracks what user is typing (important for create-new)
  const [inputValue, setInputValue] = useState("");

  // ✅ Keep the text box in sync with current value (otherwise it can look blank)
  useEffect(() => {
    const v = asTypeString(value);
    setInputValue(v);
  }, [value]);

  // fetch list
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_URL);
        // Accept multiple shapes safely
        const raw =
          res?.data?.item_types ||
          res?.data?.data ||
          res?.data?.types ||
          res?.data ||
          [];
        const normalized = Array.isArray(raw)
          ? raw.map((x) => ({
              id: asTypeString(x.id || x.name || x),
              name: asTypeString(x.name || x.id || x),
            }))
          : [];

        // de-dupe
        const seen = new Set();
        const deduped = [];
        for (const t of normalized) {
          const key = (t.name || "").toUpperCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(t);
        }

        if (mounted) setItems(deduped);
      } catch (e) {
        console.error("Failed to load item types:", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // Convert incoming value (string) to option object, if it exists
  const selectedOption = useMemo(() => {
    const v = asTypeString(value);
    if (!v) return null;
    const found = items.find((it) => it.name.toUpperCase() === v.toUpperCase());
    // If not found, still allow it (freeSolo) by returning string later
    return found || null;
  }, [value, items]);

  return (
    <Autocomplete
      options={items}
      loading={loading}
      freeSolo
      disabled={disabled}
      value={selectedOption || (asTypeString(value) ? asTypeString(value) : null)}
      inputValue={inputValue}
      onInputChange={(_, newInput) => {
        setInputValue(newInput);
      }}
      getOptionLabel={(opt) => {
        // opt can be object or string (freeSolo)
        if (typeof opt === "string") return opt;
        return opt?.name || "";
      }}
      isOptionEqualToValue={(opt, val) => {
        const o = asTypeString(opt);
        const v = asTypeString(val);
        return o.toUpperCase() === v.toUpperCase();
      }}
      filterOptions={(opts, state) => {
        const typed = (state.inputValue || "").trim();
        const filtered = opts.filter((o) =>
          o.name.toUpperCase().includes(typed.toUpperCase())
        );

        // Add "Create" option if typed doesn't exist
        const exists = opts.some((o) => o.name.toUpperCase() === typed.toUpperCase());
        if (typed && !exists) {
          filtered.unshift({ id: "__create__", name: `Create "${typed}"`, __create: typed });
        }
        return filtered;
      }}
      onChange={(_, newValue) => {
        // newValue can be:
        // - string (freeSolo enter)
        // - existing object {id,name}
        // - create object {__create: "typed"}
        if (!newValue) {
          onSelect?.("");
          return;
        }

        if (typeof newValue === "string") {
          onSelect?.(newValue.trim());
          return;
        }

        if (newValue.__create) {
          onSelect?.(String(newValue.__create).trim());
          return;
        }

        onSelect?.(asTypeString(newValue));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Select or type to create..."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
