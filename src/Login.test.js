// AuthComponent.test.js
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import Login from './pages/login/Login'; 
test('renders authentication form', () => {
  render(<Login />);

  const emailInput = screen.getByPlaceholderText(/Email Address/i);
  const passwordInput = screen.getByPlaceholderText(/Password/i); 
  // Check if the authentication form is rendered
  expect(emailInput).toBeInTheDocument;
  expect(passwordInput).toBeInTheDocument;
  expect(screen.getByText('Signin')).toBeInTheDocument;
});

test('allows user to log in', async () => {
  render(<Login />);
  
  // Simulate user input
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  fireEvent.change(emailInput, { target: { value: 'testUser@gmail.com' } });
  fireEvent.change(passwordInput, { target: { value: 'testPassword' } });
  // Trigger login
  fireEvent.click(screen.getByText('Signin'));
  screen.debug()

  // Wait for the login process (assuming it's asynchronous)
  // await waitFor(() => {
  //   expect(screen.getByText(/login successful/i)).toBeInTheDocument();
  // });
});
