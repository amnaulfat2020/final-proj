import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const SessionTimeout = ({ timeoutSeconds = 600 }) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timeout;

    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log('Session timeout occurred.');
        setVisible(true);
      }, timeoutSeconds * 1000);
    };

    resetTimeout();

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keydown', resetTimeout);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginAgain = () => {
    console.log('User clicked "Login Again."');
    setVisible(false);
    localStorage.setItem('userLoggedIn', 'true');
    navigate('/');
  };

  const buttonStyle = {
    borderRadius: 0,
    fontFamily: 'Montserrat, sans-serif', 
    backgroundColor: '#4743e0',
  };


  return (
    <Modal
      title="Session Expired"
      open={visible}
      onOk={handleLoginAgain}
      onCancel={() => setVisible(false)}
      footer={[
        <Button key="login" type="primary" onClick={handleLoginAgain} style={buttonStyle}>
          Login Again
        </Button>,
      ]}
    >
      Your session has expired. Please log in again.
    </Modal>
  );
};

export default SessionTimeout;
