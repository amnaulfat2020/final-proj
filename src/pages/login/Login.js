import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, getUserIdByEmail, db } from "../../utils/constants/Firebase";
import { Col, Row, Typography, Input, Checkbox } from "antd";
import { QuestionCircleFilled, UserOutlined, KeyOutlined } from "@ant-design/icons";
import Button from "@mui/material/Button";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import Line from "../../assets/images/Line 7.png";
import { LoginSchema } from "../../Schema/LoginSchema";
import { useUserContext } from "../../contexts/SearchContext";
import { doc, getDoc } from "firebase/firestore";

function MouseOver(event) {
  event.target.style.color = "black";
}

function MouseOut(event) {
  event.target.style.color = "#4743E0";
}

const Login = () => {
  const navigate = useNavigate();
  const [errMsg, setErrMsg] = useState("");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { updateUser } = useUserContext();

  const { values, errors, handleBlur, touched, handleChange, handleSubmit } = useFormik({
    initialValues: {
      email: '',
      password: "",
    },
    validationSchema: LoginSchema,
    onSubmit: async (values) => {
      if (!values.email || !values.password) {
        setErrMsg("Fill all fields");
        return;
      }

      // Admin Login
      if (values.email === "admin1@gmail.com" && values.password === "!@#$%^&*(Amna)") {
        localStorage.setItem("adminEmail", values.email);
        navigate("/admin-dashboard");
        return;
      }

      setErrMsg("");
      setSubmitButtonDisabled(true);

      try {
        // First, sign in with Firebase Auth
        const res = await signInWithEmailAndPassword(auth, values.email, values.password);
        
        // Then, check user status in Firestore
        const userRef = doc(db, "users", values.email);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check user type and approval status
          if (userData.userType === "coach") {
            // Coach workflow
            if (userData.status === "pending") {
              // Coach is pending approval
              navigate("/pending-request");
              setSubmitButtonDisabled(false);
              return;
            } else if (userData.status === "declined") {
              // Coach was declined
              navigate("/request-declined");
              setSubmitButtonDisabled(false);
              return;
            }
          } else if (userData.userType === "player") {
            // Player workflow - check if at least one game is approved
            const approvedGames = userData.approvedGames || [];
            
            if (approvedGames.length === 0) {
              // No games approved yet
              navigate("/pending-game-approval");
              setSubmitButtonDisabled(false);
              return;
            }
          }
          
          // If all checks pass, proceed to dashboard
          setSubmitButtonDisabled(false);
          const userId = userData.uniqueId;
          
          if (userId) {
            navigate(`/dashboard/${userId}`);
            updateUser({
              displayName: `${userData.firstName} ${userData.lastName}`,
              email: userData.email || values.email,
              photoURL: userData.photoURL || null,
              userType: userData.userType,
              approvedGames: userData.approvedGames || []
            });
          } else {
            setErrMsg("User ID not found.");
          }
        } else {
          setSubmitButtonDisabled(false);
          setErrMsg("User not found in database.");
        }
      } catch (err) {
        console.error("Firebase authentication error:", err);
        setSubmitButtonDisabled(false);
        setErrMsg(err.message);
      }
    },
  });

  useEffect(() => {
    const userLoggedIn = localStorage.getItem('userLoggedIn');
    if (userLoggedIn === 'true') {
      navigate('/');
    } else {
      setSessionExpired(true);
    }
  }, [navigate]);

  return (
    <div className="login-boxStyle">
      <div className="column1">
        <div className="login-heading">
          <h1>Login</h1>
          <p>Please input your information in the fields below to enter your journey platform.</p>
        </div>

        <img src={Line} alt="line" className="line" />

        <form onSubmit={handleSubmit} className="form-area">
          <div className="inputs">
            <div className="account">
              <label>Account</label>
              <QuestionCircleFilled className="mark" />
            </div>

            <div className="formContainer">
              <Input
                type="email"
                name="email"
                value={values.email}
                id="email"
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Email Address"
                className={errors.email && touched.email ? "input-error login-input" : "login-input"}
                size="large"
                prefix={<UserOutlined />}
              />
              {errors.email && touched.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="formContainer">
              <Input
                type="password"
                name="password"
                id="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Password"
                className={errors.password && touched.password ? "input-error login-input" : "login-input"}
                size="large"
                prefix={<KeyOutlined />}
                autoComplete="current-password"
              />
              {errors.password && touched.password && <p className="error">{errors.password}</p>}
            </div>
          </div>

          <div className="nav-area">
            <Typography
              level={4}
              onMouseOver={MouseOver}
              onMouseOut={MouseOut}
              onClick={() => navigate("/forget-password")}
              className="forgot-pwd"
            >
              Forgot Your password?
            </Typography>
          </div>

          <img src={Line} alt="line" className="line" />
          <div className="login-flex">
            <p className="error">{errMsg}</p>
          </div>

          <div className="btn-area">
            <div className="checked">
              <Checkbox onChange={() => console.log("checked")}>Remember Me</Checkbox>
            </div>
            <div className="button-log">
              <Button
                type="submit"
                disabled={submitButtonDisabled}
                variant="contained"
                className="log-btn"
                sx={{ mt: 3, mb: 2 }}
              >
                Login
              </Button>
            </div>
          </div>
        </form>

        <div className="footer-area">
          <Typography varient="body1" component="span" align="center" style={{ marginTop: "10px" }}>
            Don't have an account yet?
          </Typography>
          <Typography
            style={{ color: "#4743E0", cursor: "pointer" }}
            align="center"
            onMouseOver={MouseOver}
            onMouseOut={MouseOut}
            onClick={() => navigate("/register")}
          >
            Register Here
          </Typography>
        </div>
      </div>

      <div className="column2"></div>
    </div>
  );
};

export default Login;