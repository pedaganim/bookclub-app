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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page size selector with correct options', () => {
    render(<Pagination {...defaultProps} />);
    
    const select = screen.getByDisplayValue('10');
    expect(select).toBeInTheDocument();
    
    // Check if all page size options are available
    fireEvent.click(select);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('calls onPageSizeChange when page size is changed', () => {
    render(<Pagination {...defaultProps} />);
    
    const select = screen.getByDisplayValue('10');
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
    
    expect(screen.getByText('Showing 5 books')).toBeInTheDocument();
  });

  it('displays singular form for 1 book', () => {
    render(<Pagination {...defaultProps} currentItemsCount={1} />);
    
    expect(screen.getByText('Showing 1 book')).toBeInTheDocument();
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