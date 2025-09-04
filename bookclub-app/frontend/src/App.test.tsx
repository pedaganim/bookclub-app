/**
 * Test suite for the main App component
 * Contains basic smoke tests to ensure the component renders correctly
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Test to verify App component renders without crashing
 */
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
