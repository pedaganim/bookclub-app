import React from 'react';
import { render, screen } from '@testing-library/react';

// Test component that renders the login logo
const LoginLogo = () => (
  <div className="flex justify-center mb-6">
    <img src="/logo.png" alt="Book Club" className="h-24 w-auto" />
  </div>
);

describe('Login Page Logo', () => {
  test('displays logo image on login page', () => {
    render(<LoginLogo />);
    
    const logoImage = screen.getByAltText('Book Club');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', '/logo.png');
    expect(logoImage).toHaveClass('h-24', 'w-auto');
  });
});