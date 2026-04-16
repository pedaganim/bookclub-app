import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from '../components/Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    pageSize: 10,
    onPageSizeChange: jest.fn(),
    hasNextPage: true,
    hasPreviousPage: false,
    onNextPage: jest.fn(),
    onPreviousPage: jest.fn(),
    currentItemsCount: 10,
    isLoading: false,
    itemLabelSingular: 'book',
    itemLabelPlural: 'books',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page size selector with correct options', () => {
    render(<Pagination {...defaultProps} />);
    
    const select = screen.getByDisplayValue('10');
    expect(select).toBeInTheDocument();
    
    fireEvent.change(select, { target: { value: '25' } });
    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('enables next button when hasNextPage is true', () => {
    render(<Pagination {...defaultProps} />);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();
  });

  it('disables next button when hasNextPage is false', () => {
    render(<Pagination {...defaultProps} hasNextPage={false} />);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('enables previous button when hasPreviousPage is true', () => {
    render(<Pagination {...defaultProps} hasPreviousPage={true} />);
    
    const prevButton = screen.getByText('Previous');
    expect(prevButton).not.toBeDisabled();
  });

  it('disables previous button when hasPreviousPage is false', () => {
    render(<Pagination {...defaultProps} />);
    
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('calls onNextPage when next button is clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(defaultProps.onNextPage).toHaveBeenCalled();
  });

  it('calls onPreviousPage when previous button is clicked', () => {
    render(<Pagination {...defaultProps} hasPreviousPage={true} />);
    
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    
    expect(defaultProps.onPreviousPage).toHaveBeenCalled();
  });

  it('displays current items count correctly', () => {
    render(<Pagination {...defaultProps} currentItemsCount={5} />);
    
    // The component now uses uppercase/italic/black styling, but screen.getByText matches node content
    expect(screen.getByText(/Showing 5/i)).toBeInTheDocument();
  });

  it('disables controls when loading', () => {
    render(<Pagination {...defaultProps} isLoading={true} />);
    
    const select = screen.getByDisplayValue('10');
    const nextButton = screen.getByText('Next');
    const prevButton = screen.getByText('Previous');
    
    expect(select).toBeDisabled();
    expect(nextButton).toBeDisabled();
    expect(prevButton).toBeDisabled();
  });
});