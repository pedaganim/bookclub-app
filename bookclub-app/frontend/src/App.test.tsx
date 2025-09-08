import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => <div data-testid="route">{element}</div>,
  Navigate: () => <div data-testid="navigate">Redirect</div>
}));

// Mock the child components to avoid complex dependencies in unit test
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}));

jest.mock('./components/Navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navigation</nav>;
  };
});

jest.mock('./pages/Home', () => {
  return function MockHome() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('./pages/Login', () => {
  return function MockLogin() {
    return <div data-testid="login-page">Login Page</div>;
  };
});

jest.mock('./pages/Register', () => {
  return function MockRegister() {
    return <div data-testid="register-page">Register Page</div>;
  };
});

jest.mock('./pages/AuthCallback', () => {
  return function MockAuthCallback() {
    return <div data-testid="auth-callback-page">Auth Callback Page</div>;
  };
});

jest.mock('./components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

test('renders app with navigation', () => {
  render(<App />);
  const navbar = screen.getByTestId('navbar');
  expect(navbar).toBeInTheDocument();
});

test('renders auth provider wrapper', () => {
  render(<App />);
  const authProvider = screen.getByTestId('auth-provider');
  expect(authProvider).toBeInTheDocument();
});
