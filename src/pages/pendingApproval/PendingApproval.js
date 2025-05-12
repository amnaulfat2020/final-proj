// src/pages/pendingApproval/PendingApproval.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../utils/constants/Firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Button, Card, Typography } from '@mui/material';

const PendingApproval = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.email);
        const unsubscribeUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            // If any approval is granted, redirect to dashboard
            if (userData.status === "approved") {
              navigate(`/dashboard/${userData.uniqueId}`);
            }
          }
        });

        return () => unsubscribeUser();
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ padding: 4, maxWidth: 600 }}>
        <Typography variant="h4" gutterBottom>
          Approval Pending
        </Typography>
        <Typography variant="body1" paragraph>
          Your registration request has been sent to the coaches for the selected games.
          You will be able to access your account once at least one coach approves your request.
        </Typography>
        <Typography variant="body1" paragraph>
          Please check back later or wait for a confirmation email.
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => auth.signOut().then(() => navigate("/"))}
        >
          Return to Login
        </Button>
      </Card>
    </div>
  );
};

export default PendingApproval;