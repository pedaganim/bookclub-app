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
    
    // Get all selects with value 10 (mobile and desktop)
    const selects = screen.getAllByDisplayValue('10');
    expect(selects).toHaveLength(2); // mobile and desktop versions
    
    // Check if all page size options are available in the first select
    fireEvent.click(selects[0]);
    expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onPageSizeChange when page size is changed', () => {
    render(<Pagination {...defaultProps} />);
    
    // Get the first select (mobile version)
    const selects = screen.getAllByDisplayValue('10');
    fireEvent.change(selects[0], { target: { value: '25' } });
    
    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('enables next button when hasNextPage is true', () => {
    render(<Pagination {...defaultProps} />);
    
    // Get all Next buttons (mobile and desktop)
    const nextButtons = screen.getAllByText('Next');
    expect(nextButtons[0]).not.toBeDisabled();
  });

  it('disables next button when hasNextPage is false', () => {
    render(<Pagination {...defaultProps} hasNextPage={false} />);
    
    // Get all Next buttons (mobile and desktop)
    const nextButtons = screen.getAllByText('Next');
    expect(nextButtons[0]).toBeDisabled();
  });

  it('enables previous button when hasPreviousPage is true', () => {
    render(<Pagination {...defaultProps} hasPreviousPage={true} />);
    
    // Check for both "Prev" (mobile) and "Previous" (desktop) buttons
    const prevButton = screen.getByText('Prev');
    const previousButton = screen.getByText('Previous');
    expect(prevButton).not.toBeDisabled();
    expect(previousButton).not.toBeDisabled();
  });

  it('disables previous button when hasPreviousPage is false', () => {
    render(<Pagination {...defaultProps} />);
    
    // Check for both "Prev" (mobile) and "Previous" (desktop) buttons
    const prevButton = screen.getByText('Prev');
    const previousButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
    expect(previousButton).toBeDisabled();
  });

  it('calls onNextPage when next button is clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    // Get all Next buttons and click the first one
    const nextButtons = screen.getAllByText('Next');
    fireEvent.click(nextButtons[0]);
    
    expect(defaultProps.onNextPage).toHaveBeenCalled();
  });

  it('calls onPreviousPage when previous button is clicked', () => {
    render(<Pagination {...defaultProps} hasPreviousPage={true} />);
    
    // Click the mobile "Prev" button
    const prevButton = screen.getByText('Prev');
    fireEvent.click(prevButton);
    
    expect(defaultProps.onPreviousPage).toHaveBeenCalled();
  });

  it('displays current items count correctly when total is unknown', () => {
    render(<Pagination {...defaultProps} currentItemsCount={5} />);
    
    expect(screen.getByText('Showing 5 books')).toBeInTheDocument();
  });

  it('displays singular form for 1 book when total is unknown', () => {
    render(<Pagination {...defaultProps} currentItemsCount={1} />);
    
    expect(screen.getByText('Showing 1 book')).toBeInTheDocument();
  });

  it('disables controls when loading', () => {
    render(<Pagination {...defaultProps} isLoading={true} />);
    
    // Get all selects and buttons
    const selects = screen.getAllByDisplayValue('10');
    const nextButtons = screen.getAllByText('Next');
    const prevButton = screen.getByText('Prev');
    const previousButton = screen.getByText('Previous');
    
    expect(selects[0]).toBeDisabled();
    expect(selects[1]).toBeDisabled();
    expect(nextButtons[0]).toBeDisabled();
    expect(nextButtons[1]).toBeDisabled();
    expect(prevButton).toBeDisabled();
    expect(previousButton).toBeDisabled();
  });
});