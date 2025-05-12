import React from "react";
import { Card, Typography, Alert, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { auth } from "../../utils/constants/Firebase";
import { signOut } from "firebase/auth";

const { Title, Text } = Typography;

const RequestDeclined = () => {
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
    <div className="declined-container">
      <Card className="declined-card">
        <Title level={2}>Request Declined</Title>
        <Alert
          message="Your coach registration request has been declined"
          description="Unfortunately, your request to join as a coach has been declined by the administrator."
          type="error"
          showIcon
          style={{ marginBottom: "20px" }}
        />
        
        <div className="declined-info">
          <Text>
            For more information or to appeal this decision, please contact support at support@vusportsociety.com
          </Text>
        </div>
        
        <div className="declined-actions">
          <Button onClick={handleLogout} type="primary">
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RequestDeclined;