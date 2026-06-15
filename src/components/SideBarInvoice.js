import React, { useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import CardActions from "@material-ui/core/CardActions";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
export default function SideBarInvoice
    () {
    return (
        <div style={{}}>
            <Card>
                <CardContent>
                    <Box>
                        <Grid container>
                            <Grid item xs={2}>
                                <input type="checkbox" />
                            </Grid>
                            <Grid item xs={7}>
                                <Typography sx={{
                                    fontSize:"8px"
                                }}>JKProviders</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography sx={{
                                    fontSize:"10px"
                                }}>Rs.457</Typography>
                            </Grid>
                        </Grid>
                        <Button startIcon={<PersonIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"
                            }}>Ramesh Sharma</Button>
                              <Button startIcon={<CalendarMonthIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"

                            }}>24th Nov 2023</Button>

<Button
          sx={{
            backgroundColor: "rgb(242, 210, 189)",
            color: "red",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}>Ready For Review</Button>
                    </Box>
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <Box>
                        <Grid container>
                            <Grid item xs={2}>
                                <input type="checkbox" />
                            </Grid>
                            <Grid item xs={7}>
                                <Typography sx={{
                                    fontSize:"8px"
                                }}>JKProviders</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography sx={{
                                    fontSize:"10px"
                                }}>Rs.457</Typography>
                            </Grid>
                        </Grid>
                        <Button startIcon={<PersonIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"
                            }}>Ramesh Sharma</Button>
                              <Button startIcon={<CalendarMonthIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"

                            }}>24th Nov 2023</Button>

<Button
          sx={{
            backgroundColor: "rgb(242, 210, 189)",
            color: "red",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}>Ready For Review</Button>
                    </Box>
                </CardContent>
            </Card>
            <Card>
                <CardContent>
                    <Box>
                        <Grid container>
                            <Grid item xs={2}>
                                <input type="checkbox" />
                            </Grid>
                            <Grid item xs={7}>
                                <Typography sx={{
                                    fontSize:"8px"
                                }}>JKProviders</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography sx={{
                                    fontSize:"10px"
                                }}>Rs.457</Typography>
                            </Grid>
                        </Grid>
                        <Button startIcon={<PersonIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"
                            }}>Ramesh Sharma</Button>
                              <Button startIcon={<CalendarMonthIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"

                            }}>24th Nov 2023</Button>
                            
<Button
          sx={{
            backgroundColor: "rgb(242, 210, 189)",
            color: "red",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}>Ready For Review</Button>
                    </Box>
                </CardContent>
            </Card> 
             {/* <Card>
                <CardContent>
                    <Box>
                        <Grid container>
                            <Grid item xs={2}>
                                <input type="checkbox" />
                            </Grid>
                            <Grid item xs={7}>
                                <Typography sx={{
                                    fontSize:"8px"
                                }}>JKProviders</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <Typography sx={{
                                    fontSize:"10px"
                                }}>Rs.457</Typography>
                            </Grid>
                        </Grid>
                        <Button startIcon={<PersonIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"
                            }}>Ramesh Sharma</Button>
                              <Button startIcon={<CalendarMonthIcon />}
                            sx={{
                                fontSize: "10px",
                                color:"black"

                            }}>24th Nov 2023</Button>

<Button
          sx={{
            backgroundColor: "rgb(242, 210, 189)",
            color: "red",
            borderRadius: "4px",
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}>Ready For Review</Button>
                    </Box>
                </CardContent>
            </Card> */}
        </div>
    );
}