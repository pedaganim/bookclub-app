// Utility functions for birth date handling
export const formatBirthDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return '';
  }
};

export const validateBirthDate = (dateString: string): { isValid: boolean; error?: string } => {
  if (!dateString) {
    return { isValid: true }; // Optional field
  }
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    // Check if date is more than 150 years ago
    const maxAge = new Date();
    maxAge.setFullYear(maxAge.getFullYear() - 150);
    
    if (date < maxAge) {
      return { isValid: false, error: 'Date is too far in the past' };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid date' };
  }
};

export const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  
  try {
    const birth = new Date(birthDate);
    
    // Check if the date is invalid
    if (isNaN(birth.getTime())) {
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch {
    return null;
  }
};