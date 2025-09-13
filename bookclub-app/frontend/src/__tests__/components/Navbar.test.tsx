import React from 'react';
import { render, screen } from '@testing-library/react';

// Test component that renders the logo
const LogoDisplay = () => (
  <div>
    <img src="/logo.png" alt="Book Club" className="h-8 w-auto" />
  </div>
);

// Test component that renders avatar
const AvatarDisplay = ({ user }: { user: any }) => (
  <div>
    {user?.profilePicture ? (
      <img
        src={user.profilePicture}
        alt={`${user.name}'s avatar`}
        className="h-6 w-6 rounded-full object-cover"
      />
    ) : (
      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center" data-testid="avatar-fallback">
        <span className="text-xs font-medium text-gray-600">
          {user?.name?.charAt(0)?.toUpperCase()}
        </span>
      </div>
    )}
  </div>
);

describe('Logo and Avatar Components', () => {
  test('logo displays correctly', () => {
    render(<LogoDisplay />);
    
    const logoImage = screen.getByAltText('Book Club');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('src', '/logo.png');
    expect(logoImage).toHaveClass('h-8', 'w-auto');
  });

  test('user avatar displays when profile picture exists', () => {
    const mockUser = {
      name: 'John Doe',
      profilePicture: 'https://example.com/avatar.jpg',
    };

    render(<AvatarDisplay user={mockUser} />);
    
    const avatar = screen.getByAltText("John Doe's avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(avatar).toHaveClass('h-6', 'w-6', 'rounded-full', 'object-cover');
  });

  test('displays initial letter when user has no profile picture', () => {
    const mockUser = {
      name: 'Jane Smith',
    };

    render(<AvatarDisplay user={mockUser} />);
    
    const avatarFallback = screen.getByText('J');
    expect(avatarFallback).toBeInTheDocument();
    
    // Check the avatar fallback div has the expected styling
    const avatarDiv = screen.getByTestId('avatar-fallback');
    expect(avatarDiv).toHaveClass('h-6', 'w-6', 'rounded-full', 'bg-gray-300');
  });
});