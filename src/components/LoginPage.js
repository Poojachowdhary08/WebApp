import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { createFrontendJwt, decodeJwtPayload, storeJwtToken } from "../utils/jwtAuth";

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  const logEventToDynamoDB = async (data) => {
    try {
      // await fetch("http://localhost:8080/log", {
      await fetch(`${API_BASE}/log`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Error logging event to DynamoDB:", error);
    }
  };

  const handleLogin = async (response) => {
    if (response && response.credential) {
      try {
        const decoded = decodeJwtPayload(response.credential);
        const userEmail = decoded?.email;
        if (!userEmail) {
          throw new Error("Google login did not return an email address");
        }

        const loginJwt = await createFrontendJwt({
          email: userEmail,
          role: [],
          firstName: decoded?.given_name || "",
          lastName: decoded?.family_name || "",
          googleSubject: decoded?.sub,
        });
        storeJwtToken(loginJwt);

        // Log the login attempt to the backend
        const roleResponse = await fetch(
          // `http://localhost:8080/roles?email=${userEmail}`
          `${API_BASE}/roles?email=${encodeURIComponent(userEmail)}`
        );
        if (!roleResponse.ok) {
          throw new Error("Failed to fetch role from backend");
        }

        const roleData = await roleResponse.json();
        const userRole = roleData.role;

        if (userRole) {
          // Log the login event
          const loginData = {
            email: userEmail,
            action: "login",
            page: "/",
          };
          await logEventToDynamoDB(loginData);

          // Callback to update the parent component state
          await onLoginSuccess(userEmail, navigate, {
            googleCredential: response.credential,
            googleProfile: decoded,
            roleData,
          });

          // Redirect user based on their role
          if (userRole === "admin") {
            navigate("/home");
          } else {
            navigate("/home");
          }
        } else {
          // If no role is found, navigate to the coming soon page
          navigate("/comingsoon");
        }
      } catch (error) {
        console.error("Login failed: ", error);
      }
    } else {
      console.error("Invalid response from Google Login.");
    }
  };

  return (
    
    <div style={styles.container}>
       
      <div style={styles.loginBox}>
        <h2 style={styles.loginText}>Login via Google</h2>
        <GoogleLogin
          onSuccess={handleLogin}
          onError={() => console.log("Login failed")}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f5f5f5",
  },
  loginBox: {
    textAlign: "center",
    backgroundColor: "#ffffff",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
  },
  loginText: {
    color: "#6200ea",
    textAlign: "center",
    marginBottom: "1rem",
  },
};
  
export default LoginPage;
