import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Error = () => {
  const navigate = useNavigate();
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const userLoggedIn = localStorage.getItem('userLoggedIn');

    if (userLoggedIn === 'true') {
        localStorage.removeItem('sessionExpired');

      navigate('/');
    } else {
      setSessionExpired(true);
    }
  }, [navigate]);
  

  return (
    <div>
      <h1>Session Expired</h1>
      <p>Your session has expired. Please log in again.</p>
      {/* Add a login button or a link to the login page */}
    </div>
  );
};

export default Error;
