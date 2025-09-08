import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple test to verify Jest and React Testing Library are working
test('basic test framework validation', () => {
  const TestComponent = () => <div data-testid="test">Hello Test</div>;
  render(<TestComponent />);
  const element = screen.getByTestId('test');
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent('Hello Test');
});
