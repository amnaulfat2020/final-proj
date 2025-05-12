import React from "react";
import { Card, Typography, Alert, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { auth } from "../../utils/constants/Firebase";
import { signOut } from "firebase/auth";
import "./pendingRequest.css"; // You'll need to create this CSS file

const { Title, Text } = Typography;

const PendingRequest = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="pending-container">
      <Card className="pending-card">
        <Title level={2}>Request Pending</Title>
        <Alert
          message="Your coach registration is pending approval"
          description="Your request has been submitted and is waiting for administrator approval. You will be notified via email once your request is approved."
          type="info"
          showIcon
          style={{ marginBottom: "20px" }}
        />
        
        <div className="pending-info">
          <Text>
            Thank you for registering as a coach with VU Sport Society. Our admin team is currently reviewing your application.
            This process typically takes 1-2 business days.
          </Text>
          
          <Text style={{ marginTop: "15px" }}>
            Once approved, you'll be able to access your coach dashboard and start creating training sessions.
          </Text>
        </div>
        
        <div className="pending-actions">
          <Button onClick={handleLogout} type="primary">
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingRequest;