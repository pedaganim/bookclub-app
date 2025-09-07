import { formatBirthDate, validateBirthDate, calculateAge } from '../utils/birthDate';

describe('Birth Date Utilities', () => {
  describe('formatBirthDate', () => {
    it('should format valid date string to YYYY-MM-DD', () => {
      expect(formatBirthDate('1990-05-15')).toBe('1990-05-15');
      expect(formatBirthDate('2000-12-25')).toBe('2000-12-25');
      expect(formatBirthDate('1985-01-01')).toBe('1985-01-01');
    });

    it('should return empty string for invalid date', () => {
      expect(formatBirthDate('invalid-date')).toBe('');
      expect(formatBirthDate('2000-13-40')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(formatBirthDate('')).toBe('');
      expect(formatBirthDate(' ')).toBe('');
    });

    it('should handle ISO datetime strings', () => {
      const isoDate = '1990-05-15T10:30:00.000Z';
      expect(formatBirthDate(isoDate)).toBe('1990-05-15');
    });
  });

  describe('validateBirthDate', () => {
    it('should validate correct date formats', () => {
      expect(validateBirthDate('1990-05-15')).toEqual({ isValid: true });
      expect(validateBirthDate('2000-12-25')).toEqual({ isValid: true });
      expect(validateBirthDate('1985-01-01')).toEqual({ isValid: true });
    });

    it('should allow empty dates (optional field)', () => {
      expect(validateBirthDate('')).toEqual({ isValid: true });
    });

    it('should reject invalid date formats', () => {
      expect(validateBirthDate('invalid-date')).toEqual({
        isValid: false,
        error: 'Invalid date format'
      });
      expect(validateBirthDate('2000-13-40')).toEqual({
        isValid: false,
        error: 'Invalid date format'
      });
    });

    it('should reject dates more than 150 years ago', () => {
      const veryOldDate = '1800-01-01';
      expect(validateBirthDate(veryOldDate)).toEqual({
        isValid: false,
        error: 'Date is too far in the past'
      });
    });

    it('should accept reasonable birth dates', () => {
      const recentDate = '1950-01-01';
      expect(validateBirthDate(recentDate)).toEqual({ isValid: true });
    });

    it('should accept future dates (for edge cases)', () => {
      const futureDate = '2030-01-01';
      expect(validateBirthDate(futureDate)).toEqual({ isValid: true });
    });
  });

  describe('calculateAge', () => {
    beforeEach(() => {
      // Mock current date to 2023-06-15 for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct age for birth dates', () => {
      expect(calculateAge('1990-06-15')).toBe(33); // Same day
      expect(calculateAge('1990-06-14')).toBe(33); // Day before
      expect(calculateAge('1990-06-16')).toBe(32); // Day after (hasn't had birthday yet)
      expect(calculateAge('1985-01-01')).toBe(38);
      expect(calculateAge('2000-12-25')).toBe(22);
    });

    it('should return null for empty birth date', () => {
      expect(calculateAge('')).toBeNull();
    });

    it('should return null for invalid birth date', () => {
      expect(calculateAge('invalid-date')).toBeNull();
      expect(calculateAge('2000-13-40')).toBeNull();
    });

    it('should handle leap years correctly', () => {
      // Test leap year birthday
      expect(calculateAge('2000-02-29')).toBe(23);
    });

    it('should handle edge cases around birthday', () => {
      // Birthday hasn't occurred yet this year
      expect(calculateAge('1990-12-25')).toBe(32);
      
      // Birthday already occurred this year
      expect(calculateAge('1990-01-01')).toBe(33);
    });

    it('should handle future birth dates', () => {
      // Future dates should result in negative age, but we'll return the calculated value
      expect(calculateAge('2030-01-01')).toBe(-7);
    });
  });

  describe('Integration tests for birth date utilities', () => {
    it('should work together for complete birth date processing', () => {
      const birthDate = '1990-05-15';
      
      // Format should preserve the input
      const formatted = formatBirthDate(birthDate);
      expect(formatted).toBe(birthDate);
      
      // Validation should pass
      const validation = validateBirthDate(formatted);
      expect(validation.isValid).toBe(true);
      
      // Age calculation should work
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-06-15'));
      const age = calculateAge(formatted);
      expect(age).toBe(33);
      jest.useRealTimers();
    });

    it('should handle empty birth date throughout the pipeline', () => {
      const birthDate = '';
      
      const formatted = formatBirthDate(birthDate);
      expect(formatted).toBe('');
      
      const validation = validateBirthDate(formatted);
      expect(validation.isValid).toBe(true);
      
      const age = calculateAge(formatted);
      expect(age).toBeNull();
    });

    it('should handle invalid birth date throughout the pipeline', () => {
      const birthDate = 'invalid-date';
      
      const formatted = formatBirthDate(birthDate);
      expect(formatted).toBe('');
      
      const validation = validateBirthDate(birthDate); // Test with original invalid input
      expect(validation.isValid).toBe(false);
      
      const age = calculateAge(birthDate);
      expect(age).toBeNull();
    });
  });
});