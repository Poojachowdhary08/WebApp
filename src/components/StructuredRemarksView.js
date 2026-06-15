// // This has 1 for mobile, 2 for tab, 3 for laptop...
// import React, { useState, useEffect } from "react";
// import { Grid } from "@mui/material"; // Add this import

// import {
//   Box,
//   Typography,
//   Collapse,
//   IconButton,
//   TextField,
//   Chip,
//   Paper,
//   Button,
// } from "@mui/material";
// import ExpandLessIcon from "@mui/icons-material/ExpandLess";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import SendIcon from "@mui/icons-material/Send";
// import axios from "axios";
// import SearchIcon from "@mui/icons-material/Search";
// import InputAdornment from "@mui/material/InputAdornment";


// const statusColors = {
//   requested: "#FFC107",
//   issued: "#4CAF50",
//   rejected: "#F44336",
//   delayed: "#D32F2F",
//   raised: "#607D8B",
// };

// const StructuredRemarksView = ({ requestUpdates = [], refreshUpdates, refreshRequests }) => {
//     const [openBlocks, setOpenBlocks] = useState({});
//   const [searchQuery, setSearchQuery] = useState("");
//   const [newRemark, setNewRemark] = useState({});
//   const [employeeCode, setEmployeeCode] = useState("");
//   const [isRefreshing, setIsRefreshing] = useState(false);


//   // ✅ Initially collapse all blocks
//   useEffect(() => {
//     const initialOpen = {};
//     requestUpdates.forEach((req) => (initialOpen[req.request_id] = false));
//     setOpenBlocks(initialOpen);
//   }, [requestUpdates]);

//   // ✅ Fetch employee_code using email
//   useEffect(() => {
//     const email = localStorage.getItem("email");
//     if (!email) return;

//     const fetchEmployee = async () => {
//       try {
//         const res = await axios.get(`${API_BASE}/employees`);
//         const employee = res.data.find((emp) => emp.email === email);
//         if (employee) setEmployeeCode(employee.employee_code);
//       } catch (error) {
//         console.error("Failed to fetch employee code:", error);
//       }
//     };

//     fetchEmployee();
//   }, []);

//   const toggleBlock = (requestId) => {
//     setOpenBlocks((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
//   };

//   const normalizedSearch = searchQuery.toLowerCase();

//   const highlightText = (text, highlight) => {
//     const index = text.toLowerCase().indexOf(highlight.toLowerCase());
//     if (index === -1 || highlight === "") return text;
//     return (
//       <>
//         {text.substring(0, index)}
//         <span style={{ backgroundColor: "#FFFF00", fontWeight: 600 }}>
//           {text.substring(index, index + highlight.length)}
//         </span>
//         {text.substring(index + highlight.length)}
//       </>
//     );
//   };

//   const filteredRequests = requestUpdates.filter((req) => {
//     const engineerMatch = req.employee_name?.toLowerCase().includes(normalizedSearch);
//     const remarkMatch = req.remarks_history?.some((remark) =>
//       remark.employee_name?.toLowerCase().includes(normalizedSearch)
//     );
//     return engineerMatch || remarkMatch;
//   });

//   const handlePostRemark = async (requestId) => {
//     const remarkText = newRemark[requestId];
//     if (!remarkText || !employeeCode) return;
  
//     try {
//       setIsRefreshing(true); // Start loading state
//       await axios.post(
//         `${API_BASE}/inventory-requests/${requestId}/add-remark`,
//         {
//           remark: remarkText,
//           employee_code: employeeCode,
//         }
//       );
//       setNewRemark((prev) => ({ ...prev, [requestId]: "" }));
//       refreshUpdates && refreshUpdates(); // This updates just the remarks
//       refreshRequests && refreshRequests(); // This updates the main request list ✅

//       await refreshUpdates(); // Ensure awaited
//     } catch (error) {
//       console.error("Failed to post remark:", error);
//     } finally {
//       setIsRefreshing(false); // Stop loading
//     }
//   };


  
//   return (
//     <Box>


// <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={5}>
//   {/* Left heading */}
//   <Typography variant="h6" fontWeight="bold" sx={{ ml: 1 }}>
//     Request Comments
//   </Typography>

//   {/* Right Search Field */}
//   <TextField
//     variant="outlined"
//     size="small"
//     placeholder="Search Engineer Name"
//     value={searchQuery}
//     onChange={(e) => setSearchQuery(e.target.value)}
//     sx={{
//       width: 300,
//       borderRadius: 3,
//       "& .MuiOutlinedInput-root": {
//         borderRadius: 3,
//         backgroundColor: "white",
//       },
//     }}
//     InputProps={{
//       startAdornment: (
//         <InputAdornment position="start">
//           <SearchIcon sx={{ opacity: 0.5 }} />
//         </InputAdornment>
//       ),
//     }}
//   />
// </Box>


// <Grid container spacing={2}>
//   {filteredRequests.map((req) => {
//     const showRemarks = openBlocks[req.request_id];

//     return (
//       <Grid item xs={12} sm={6} md={4} key={req.request_id}>
//         <Paper
//           sx={{
//             height: "100%",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//             borderRadius: 2,
//           }}
//         >
//           <Box
//             onClick={() => toggleBlock(req.request_id)}
//             sx={{
//               p: 2,
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               cursor: "pointer",
//               "&:hover": { backgroundColor: "#f5f5f5" },
//             }}
//           >
//             <Box>
//               <Typography variant="subtitle2">
//                 <strong>Request ID:</strong> {req.request_id}
//               </Typography>
//               <Typography variant="subtitle2">
//                 <strong>Engineer Requested:</strong>{" "}
//                 {highlightText(req.employee_name, normalizedSearch)}
//               </Typography>
//               <Typography variant="subtitle2">
//                 <strong>Time:</strong>{" "}
//                 {new Date(req.created_at).toLocaleString()}
//               </Typography>
//             </Box>
//             <Box display="flex" alignItems="center" gap={1}>
//               <Chip
//                 label={req.status.toUpperCase()}
//                 sx={{
//                   backgroundColor: statusColors[req.status] || "#607D8B",
//                   color: "#fff",
//                   fontWeight: 600,
//                   borderRadius: 2,
//                 }}
//               />
//               {showRemarks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
//             </Box>
//           </Box>

//           <Collapse in={showRemarks} timeout="auto" unmountOnExit>
//             <Box p={2}>
//               {req.remarks_history?.length ? (
//                 req.remarks_history.map((remark, idx) => (
//                   <Paper
//                     key={idx}
//                     sx={{
//                       mb: 1,
//                       p: 1.5,
//                       borderLeft: "4px solid #1976d2",
//                       backgroundColor: "#f9f9f9",
//                     }}
//                   >
//                     <Typography variant="body2" fontWeight="bold">
//                       {highlightText(remark.employee_name, normalizedSearch)}
//                     </Typography>
//                     <Typography variant="body2">{remark.remark}</Typography>
//                     <Typography variant="caption" color="text.secondary">
//                       {remark.formatted_time}
//                     </Typography>
//                   </Paper>
//                 ))
//               ) : (
//                 <Typography variant="body2" color="text.secondary">
//                   No remarks available.
//                 </Typography>
//               )}

//               <Box display="flex" gap={1} mt={2}>
//                 <TextField
//                   fullWidth
//                   placeholder="Type a remark..."
//                   value={newRemark[req.request_id] || ""}
//                   onClick={(e) => e.stopPropagation()}
//                   onChange={(e) =>
//                     setNewRemark((prev) => ({
//                       ...prev,
//                       [req.request_id]: e.target.value,
//                     }))
//                   }
//                 />
//                 <Button
//                   variant="contained"
//                   endIcon={<SendIcon />}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handlePostRemark(req.request_id);
//                   }}
//                   disabled={!newRemark[req.request_id] || !employeeCode}
//                 >
//                   Post
//                 </Button>
//               </Box>
//             </Box>
//           </Collapse>
//         </Paper>
//       </Grid>
//     );
//   })}
// </Grid>


//     </Box>

//   );
// };

// export default StructuredRemarksView;







// Only ONE per line and mobile friendly..

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  TextField,
  Chip,
  Paper,
  Button,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";


const statusColors = {
  requested: "#FFC107",
  issued: "#4CAF50",
  rejected: "#F44336",
  delayed: "#D32F2F",
  raised: "#607D8B",
};

const StructuredRemarksView = ({ requestUpdates = [], refreshUpdates, refreshRequests }) => {
    const [openBlocks, setOpenBlocks] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [newRemark, setNewRemark] = useState({});
  const [employeeCode, setEmployeeCode] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);


  // ✅ Initially collapse all blocks
  useEffect(() => {
    const initialOpen = {};
    requestUpdates.forEach((req) => (initialOpen[req.request_id] = false));
    setOpenBlocks(initialOpen);
  }, [requestUpdates]);

  // ✅ Fetch employee_code using email
  useEffect(() => {
    const email = localStorage.getItem("email");
    if (!email) return;

    const fetchEmployee = async () => {
      try {
        const res = await axios.get(`${API_BASE}/employees`);
        const employee = res.data.find((emp) => emp.email === email);
        if (employee) setEmployeeCode(employee.employee_code);
      } catch (error) {
        console.error("Failed to fetch employee code:", error);
      }
    };

    fetchEmployee();
  }, []);

  const toggleBlock = (requestId) => {
    setOpenBlocks((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  const normalizedSearch = searchQuery.toLowerCase();

  const highlightText = (text, highlight) => {
    const index = text.toLowerCase().indexOf(highlight.toLowerCase());
    if (index === -1 || highlight === "") return text;
    return (
      <>
        {text.substring(0, index)}
        <span style={{ backgroundColor: "#FFFF00", fontWeight: 600 }}>
          {text.substring(index, index + highlight.length)}
        </span>
        {text.substring(index + highlight.length)}
      </>
    );
  };

  const filteredRequests = requestUpdates.filter((req) => {
    const engineerMatch = req.employee_name?.toLowerCase().includes(normalizedSearch);
    const remarkMatch = req.remarks_history?.some((remark) =>
      remark.employee_name?.toLowerCase().includes(normalizedSearch)
    );
    return engineerMatch || remarkMatch;
  });

  const handlePostRemark = async (requestId) => {
    const remarkText = newRemark[requestId];
    if (!remarkText || !employeeCode) return;
  
    try {
      setIsRefreshing(true); // Start loading state
      await axios.post(
        `${API_BASE}/inventory-requests/${requestId}/add-remark`,
        {
          remark: remarkText,
          employee_code: employeeCode,
        }
      );
      setNewRemark((prev) => ({ ...prev, [requestId]: "" }));
      refreshUpdates && refreshUpdates(); // This updates just the remarks
      refreshRequests && refreshRequests(); // This updates the main request list ✅

      await refreshUpdates(); // Ensure awaited
    } catch (error) {
      console.error("Failed to post remark:", error);
    } finally {
      setIsRefreshing(false); // Stop loading
    }
  };


  
  return (
    <Box>


<Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={5}>
  {/* Left heading */}
  <Typography variant="h6" fontWeight="bold" sx={{ ml: 1 }}>
    Request Comments
  </Typography>

  {/* Right Search Field */}
  <TextField
    variant="outlined"
    size="small"
    placeholder="Search Engineer Name"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    sx={{
      width: 300,
      borderRadius: 3,
      "& .MuiOutlinedInput-root": {
        borderRadius: 3,
        backgroundColor: "white",
      },
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ opacity: 0.5 }} />
        </InputAdornment>
      ),
    }}
  />
</Box>


      {filteredRequests.map((req) => {
        const showRemarks = openBlocks[req.request_id];

        return (
          <Paper key={req.request_id} sx={{ mb: 2, borderRadius: 2 }}>
            {/* ✅ Only the header toggles */}
            <Box
              onClick={() => toggleBlock(req.request_id)}
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              <Box>
                <Typography variant="subtitle2">
                  <strong>Request ID:</strong> {req.request_id}
                </Typography>
                <Typography variant="subtitle2">
                  <strong>Engineer Requested:</strong>{" "}
                  {highlightText(req.employee_name, normalizedSearch)}
                </Typography>
                <Typography variant="subtitle2">
                  <strong>Time:</strong>{" "}
                  {new Date(req.created_at).toLocaleString()}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  label={req.status.toUpperCase()}
                  sx={{
                    backgroundColor: statusColors[req.status] || "#607D8B",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                />
                {showRemarks ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
            </Box>

            <Collapse in={showRemarks} timeout="auto" unmountOnExit>
              <Box p={2}>
                {req.remarks_history?.length ? (
                  req.remarks_history.map((remark, idx) => (
                    <Paper
                      key={idx}
                      sx={{
                        mb: 1,
                        p: 1.5,
                        borderLeft: "4px solid #1976d2",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {highlightText(remark.employee_name, normalizedSearch)}
                      </Typography>
                      <Typography variant="body2">{remark.remark}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {remark.formatted_time}
                      </Typography>
                    </Paper>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No remarks available.
                  </Typography>
                )}

                {/* ✅ Post remark area */}
                <Box display="flex" gap={1} mt={2}>
                  <TextField
                    fullWidth
                    placeholder="Type a remark..."
                    value={newRemark[req.request_id] || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setNewRemark((prev) => ({
                        ...prev,
                        [req.request_id]: e.target.value,
                      }))
                    }
                  />
                  {isRefreshing && <Typography variant="caption" color="text.secondary">Updating...</Typography>}

                  <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostRemark(req.request_id);
                    }}
                    disabled={!newRemark[req.request_id] || !employeeCode}
                  >
                    Post
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
};

export default StructuredRemarksView;