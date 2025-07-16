import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../utils/constants/Firebase";
import { v4 as uuidv4 } from "uuid";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { getUserIdByEmail } from "../../utils/constants/Firebase";
import { RegistrationSchema } from "../../Schema/RegistrationSchema";
import HelpIcon from "@mui/icons-material/Help";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";
import "./registration.css";

import { 
  Checkbox, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Divider from "../../assets/images/Line 7.png";
import { InputLabel, MenuItem, Select } from "@mui/material";

// List of available games
const AVAILABLE_GAMES = [
  "Football",
  "Cricket",
  "Basketball",
  "Volleyball",
  "Tennis",
  "Badminton",
  "Table Tennis",
  "Swimming"
];

// Game Selection Popup Component
const GameSelectionPopup = ({ open, onClose, userType, onSelectGames, availableGames }) => {
  const [selectedGames, setSelectedGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [error, setError] = useState("");

  const isPlayer = userType === "player";
  const maxSelections = isPlayer ? 2 : 1;

  const handleGameSelection = (game) => {
    if (isPlayer) {
      if (selectedGames.includes(game)) {
        setSelectedGames(selectedGames.filter(item => item !== game));
        setError("");
      } else {
        if (selectedGames.length < maxSelections) {
          setSelectedGames([...selectedGames, game]);
          setError("");
        } else {
          setError(`You can only select ${maxSelections} games`);
        }
      }
    } else {
      setSelectedGame(game);
      setError("");
    }
  };

  const handleSubmit = () => {
    if (isPlayer && selectedGames.length === 0) {
      setError("Please select at least one game");
      return;
    }
    
    if (!isPlayer && !selectedGame) {
      setError("Please select a game");
      return;
    }
    
    onSelectGames(isPlayer ? selectedGames : [selectedGame]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isPlayer ? "Select Games You Want to Play" : "Select Game You Want to Coach"}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {isPlayer 
            ? "As a player, you can select up to 2 games you're interested in." 
            : "As a coach, please select one game you specialize in."}
        </Typography>
        
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
        
        {isPlayer ? (
          <FormControl component="fieldset">
            {availableGames.map((game) => (
              <FormControlLabel
                key={game}
                control={
                  <Checkbox
                    checked={selectedGames.includes(game)}
                    onChange={() => handleGameSelection(game)}
                  />
                }
                label={game}
              />
            ))}
          </FormControl>
        ) : (
          <FormControl component="fieldset">
            <RadioGroup value={selectedGame} onChange={(e) => handleGameSelection(e.target.value)}>
              {availableGames.map((game) => (
                <FormControlLabel
                  key={game}
                  value={game}
                  control={<Radio />}
                  label={game}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const initialValues = {
  firstName: "",
  lastName: "",
  company: "",
  workEmail: "",
  employees: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  userType: "player",
  selectedGames: []
};

const Registration = () => {
  const navigate = useNavigate();
  const [errMsg, setErrMsg] = useState("");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [userType, setUserType] = useState("player");
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [selectedGames, setSelectedGames] = useState([]);
  const [availableGamesForPlayers, setAvailableGamesForPlayers] = useState([]);
  const [availableGamesForCoaches, setAvailableGamesForCoaches] = useState([]);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const coachesRef = collection(db, "users");
        const q = query(coachesRef, where("userType", "==", "coach"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        
        const coachedGames = [];
        querySnapshot.forEach((doc) => {
          const coachData = doc.data();
          if (coachData.selectedGames) {
            coachedGames.push(...coachData.selectedGames);
          }
        });
        
        setAvailableGamesForPlayers(coachedGames);
        setAvailableGamesForCoaches(AVAILABLE_GAMES.filter(game => !coachedGames.includes(game)));
      } catch (error) {
        console.error("Error fetching coaches:", error);
      }
    };
    
    fetchCoaches();
  }, []);

  const isStrongPassword = (password) => {
    return (
      password.length >= 8 && /[!@#$%^&*]/.test(password) && /\d/.test(password)
    );
  };

  const handleCheckboxChange = (event) => {
    setAgreeTerms(event.target.checked);
    setErrMsg("");
  };

  const handleUserTypeChange = (event) => {
    const newUserType = event.target.value;
    setUserType(newUserType);
    values.userType = newUserType;
    setSelectedGames([]);
    setShowGameSelection(true);
  };

  const handleGameSelection = (games) => {
    setSelectedGames(games);
    values.selectedGames = games;
  };

  const createApprovalRequests = async (playerEmail, selectedGames) => {
    try {
      const coachesRef = collection(db, "users");
      const q = query(coachesRef, 
        where("userType", "==", "coach"),
        where("status", "==", "approved"),
        where("selectedGames", "array-contains-any", selectedGames)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((coachDoc) => {
        const coachData = coachDoc.data();
        const commonGames = coachData.selectedGames.filter(game => 
          selectedGames.includes(game)
        );
        
        commonGames.forEach(game => {
          const requestId = uuidv4();
          const requestRef = doc(collection(db, "approvalRequests"), requestId);
          batch.set(requestRef, {
            playerEmail: playerEmail,
            coachEmail: coachData.email,
            game: game,
            status: "pending",
            createdAt: Timestamp.now(),
            requestId: requestId
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error creating approval requests:", error);
      throw error;
    }
  };

  const inputs = [
    {
      id: 1,
      htmlFor: "firstName",
      name: "firstName",
      type: "text",
      placeholder: "John",
      label: "First name"
    },
    {
      id: 2,
      htmlFor: "lastName",
      name: "lastName",
      type: "text",
      placeholder: "Smith",
      label: "Last name",
      required: true
    },
    {
      id: 3,
      htmlFor: "company",
      name: "Company",
      type: "text",
      placeholder: "O+",
      label: "Blood Group"
    },
    {
      id: 4,
      htmlFor: "email",
      name: "email",
      type: "email",
      placeholder: "test@example.com",
      label: "Work Email",
      required: true
    },
    {
      id: 5,
      htmlFor: "password",
      name: "password",
      type: "password",
      placeholder: "Password",
      label: "Password"
    },
    {
      id: 6,
      htmlFor: "confirmPassword",
      name: "confirmPassword",
      type: "password",
      placeholder: "Confirm Password",
      label: "Confirm Password"
    }
  ];
  
  const { values, errors, handleBlur, touched, handleChange, handleSubmit } =
    useFormik({
      initialValues,
      validationSchema: RegistrationSchema,
      onSubmit: async () => {
        if (!values.firstName || !values.email || !values.password) {
          setErrMsg("Fill all Fields");
          return;
        }
        if (!isStrongPassword(values.password)) {
          setErrMsg(
            "Password is not strong enough. It must contain at least 8 characters, special characters, and numbers."
          );
          return;
        }
        if (!agreeTerms) {
          setErrMsg("Please agree to the terms and conditions.");
          return;
        }
        if (selectedGames.length === 0) {
          setErrMsg("Please select at least one game");
          return;
        }
      
        setErrMsg("");
        setSubmitButtonDisabled(true);
      
        try {
          const uniqueId = uuidv4();
          const status = userType === "coach" ? "pending" : "pending"; // Both players and coaches need approval now

          const userRef = doc(collection(db, "users"), values.email);
          await setDoc(userRef, {
            firstName: values.firstName,
            lastName: values.lastName,
            uniqueId: uniqueId,
            userType: userType,
            selectedGames: selectedGames,
            status: status,
            createdAt: Timestamp.now(),
            email: values.email,
            pendingApprovals: selectedGames.map(game => ({
              game: game,
              status: "pending",
              requestedAt: Timestamp.now()
            }))
          });

          // Create approval requests for players
          if (userType === "player") {
            await createApprovalRequests(values.email, selectedGames);
          }

          await createUserWithEmailAndPassword(
            auth,
            values.email,
            values.password
          );
      
          setSubmitButtonDisabled(false);
          
          // Redirect based on user type
          if (userType === "coach") {
            navigate("/pending-request");
          } else {
            navigate("/pending-approval");
          }
        } catch (err) {
          setSubmitButtonDisabled(false);
          setErrMsg(err.message);
          console.error(err);
        }
      }
    });

  return (
    <>
      <section className="register-container">
        <div className="form-container">
          <div className="head reg-typography reg-link">
            <Link to="/" className="reg-link">
              Already a member?
            </Link>
            <PersonIcon />
          </div>

          <form onSubmit={handleSubmit} className="registration-form">
            <div className="heading">
              <h1 className="main-heading">Input your information</h1>
              <p className="reg-info reg-typography">
                We need you to help us with some basic information for your
                account creation. Here are our{" "}
                <span
                  className="reg-link"
                  onClick={() => {
                    navigate("/term-condition");
                  }}
                >
                  terms and conditions
                </span>
                . Please read them carefully. We are GDPR compliant
              </p>
            </div>
            <div className="dotted-line">
              <img src={Divider} alt="" />
            </div>

            <div className="field-container">
              {inputs.map((input) => (
                <div key={input.id}>
                  <div className="label reg-typography">
                    <label htmlFor={input.htmlFor}>{input.label}</label>
                    <HelpIcon className="icon" />
                  </div>

                  <div>
                    {input.name === "Company" ? (
                      <>
                        <FormControl fullWidth sx={{ width: "35ch" }}>
                          <InputLabel id="blood-group-label">Blood Group</InputLabel>
                          <Select
                            labelId="blood-group-label"
                            id="blood-group-select"
                            name={input.name}
                            value={values[input.name]}
                            label="Blood Group"
                            onChange={handleChange}
                          >
                            <MenuItem value="A+">A+</MenuItem>
                            <MenuItem value="A-">A-</MenuItem>
                            <MenuItem value="B+">B+</MenuItem>
                            <MenuItem value="B-">B-</MenuItem>
                            <MenuItem value="AB+">AB+</MenuItem>
                            <MenuItem value="AB-">AB-</MenuItem>
                            <MenuItem value="O+">O+</MenuItem>
                            <MenuItem value="O-">O-</MenuItem>
                          </Select>
                        </FormControl>
                      </>
                    ) : (
                      <TextField
                        className="field"
                        sx={{ width: "35ch" }}
                        type={input.type}
                        autoComplete="off"
                        name={input.name}
                        id={input.htmlFor}
                        placeholder={input.placeholder}
                        value={values[input.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    )}

                    {input.name === "password" &&
                      isStrongPassword(values.password) && (
                        <p className="strength-message reg-typography">
                          Password is strong!
                        </p>
                      )}

                    {errors[input.name] && touched[input.name] && (
                      <p className="error-message reg-typography">
                        {errors[input.name]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="dotted-line">
              <img src={Divider} alt="" />
            </div>
            
            <div className="user-type-selection">
              <FormControl component="fieldset">
                <FormLabel component="legend" className="user-type-label">Register as</FormLabel>
                <RadioGroup
                  row
                  aria-label="user-type"
                  name="userType"
                  value={userType}
                  onChange={handleUserTypeChange}
                >
                  <FormControlLabel 
                    value="player" 
                    control={<Radio />} 
                    label="Player" 
                    className="radio-label"
                  />
                  <FormControlLabel 
                    value="coach" 
                    control={<Radio />} 
                    label="Coach" 
                    className="radio-label"
                  />
                </RadioGroup>
              </FormControl>
              
              {selectedGames.length > 0 && (
                <div className="selected-games" style={{ marginTop: "10px" }}>
                  <Typography variant="body2" color="primary">
                    {userType === "player" ? "Selected games: " : "Selected game: "}
                    {selectedGames.join(", ")}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setShowGameSelection(true)}
                    variant="outlined"
                    sx={{ ml: 2 }}
                  >
                    Change
                  </Button>
                </div>
              )}
              
              <GameSelectionPopup
                open={showGameSelection}
                onClose={() => setShowGameSelection(false)}
                userType={userType}
                onSelectGames={handleGameSelection}
                availableGames={userType === "player" ? availableGamesForPlayers : availableGamesForCoaches}
              />
            </div>
            
            <div className="flex">
              <p className="error-message">{errMsg}</p>
            </div>
            <div>
              <div className="flex">
                <p className="reg-typography terms">
                  <Checkbox
                    checked={agreeTerms}
                    onChange={handleCheckboxChange}
                  />
                  I agree with{" "}
                  <span
                    className="reg-link"
                    onClick={() => {
                      navigate("/term-condition");
                    }}
                  >
                    terms and conditions.
                  </span>
                </p>
                <Button
                  type="submit"
                  disabled={submitButtonDisabled || !agreeTerms}
                  variant="contained"
                  className={`${
                    submitButtonDisabled || !agreeTerms
                      ? "disabled-btn"
                      : "button"
                  }`}
                  sx={{ mt: 3, mb: 2 }}
                >
                  Register
                </Button>
              </div>
            </div>
          </form>
        </div>
        <div className="side"></div>
      </section>
    </>
  );
};

export default Registration;