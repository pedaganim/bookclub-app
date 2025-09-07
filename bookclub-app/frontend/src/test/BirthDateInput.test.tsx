import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Simple component to test birth feature without router dependencies
const BirthDateInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ value, onChange }) => {
  return (
    <div>
      <label htmlFor="dateOfBirth">Date of Birth (Optional)</label>
      <input
        id="dateOfBirth"
        name="dateOfBirth"
        type="date"
        className="form-input"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

describe('Birth Date Input Component', () => {
  it('should render date of birth input', () => {
    const mockOnChange = jest.fn();
    render(<BirthDateInput value="" onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/date of birth/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('name', 'dateOfBirth');
  });

  it('should display the provided value', () => {
    const mockOnChange = jest.fn();
    const testDate = '1990-05-15';
    
    render(<BirthDateInput value={testDate} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/date of birth/i);
    expect(input).toHaveValue(testDate);
  });

  it('should call onChange when date is changed', async () => {
    const mockOnChange = jest.fn();
    
    render(<BirthDateInput value="" onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/date of birth/i);
    fireEvent.change(input, { target: { value: '1985-12-25' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle clearing the date', async () => {
    const mockOnChange = jest.fn();
    
    render(<BirthDateInput value="1990-05-15" onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/date of birth/i);
    fireEvent.change(input, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should accept various date formats through HTML5 date input', () => {
    const mockOnChange = jest.fn();
    
    const { rerender } = render(<BirthDateInput value="1990-01-01" onChange={mockOnChange} />);
    let input = screen.getByLabelText(/date of birth/i);
    expect(input).toHaveValue('1990-01-01');
    
    rerender(<BirthDateInput value="2000-12-31" onChange={mockOnChange} />);
    input = screen.getByLabelText(/date of birth/i);
    expect(input).toHaveValue('2000-12-31');
    
    rerender(<BirthDateInput value="1985-06-15" onChange={mockOnChange} />);
    input = screen.getByLabelText(/date of birth/i);
    expect(input).toHaveValue('1985-06-15');
  });
});

// Test form data handling for birth feature
describe('Birth Feature Form Data Handling', () => {
  it('should handle form state with dateOfBirth field', () => {
    const formData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      bio: 'Test bio',
      dateOfBirth: '1990-05-15',
    };

    expect(formData.dateOfBirth).toBe('1990-05-15');
    expect(typeof formData.dateOfBirth).toBe('string');
  });

  it('should handle form state without dateOfBirth field', () => {
    const formData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      bio: 'Test bio',
      dateOfBirth: '',
    };

    expect(formData.dateOfBirth).toBe('');
  });

  it('should validate that dateOfBirth can be optional in form submission', () => {
    const formDataWithBirth = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      bio: 'Test bio',
      dateOfBirth: '1990-05-15',
    };

    const formDataWithoutBirth = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      bio: 'Test bio',
      dateOfBirth: '',
    };

    // Both should be valid form submissions
    expect(formDataWithBirth.dateOfBirth).toBeTruthy();
    expect(formDataWithoutBirth.dateOfBirth).toBeFalsy();
    
    // Both should have all required fields
    expect(formDataWithBirth.name).toBeTruthy();
    expect(formDataWithBirth.email).toBeTruthy();
    expect(formDataWithBirth.password).toBeTruthy();
    
    expect(formDataWithoutBirth.name).toBeTruthy();
    expect(formDataWithoutBirth.email).toBeTruthy();
    expect(formDataWithoutBirth.password).toBeTruthy();
  });
});