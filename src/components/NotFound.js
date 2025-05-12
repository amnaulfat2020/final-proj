import React from 'react';
import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Result
    status="404"
    title="404"
    subTitle={<span style={{ fontFamily: '"Montserrat", sans-serif' }}>Sorry, the page you visited does not exist.</span>}
    extra={
      <Link to="/">
          <Button type="primary" style={{ backgroundColor: 'rgb(22, 119, 255)', borderRadius: 0, fontFamily: 'Montserrat' }}>
            Back Home
          </Button>
        </Link>
      }
      style={{ fontFamily: '"Montserrat", sans-serif', marginTop: '20px' }}
    />
  );
};

export default NotFound;
