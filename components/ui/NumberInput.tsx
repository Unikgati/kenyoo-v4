import React from 'react';
import { cn } from '../../lib/utils';
import Input from './Input';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, className, ...props }) => {
  // Format number with thousand separator (Indonesian format)
  const formatNumber = (num: number): string => {
    return num.toLocaleString('id-ID').replace(/,/g, '.');
  };

  // Parse formatted number back to number
  const parseFormattedNumber = (formatted: string): number => {
    return parseFloat(formatted.replace(/\./g, '')) || 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-digit characters except decimal point
    const cleanValue = e.target.value.replace(/[^\d.]/g, '');
    const numberValue = parseFormattedNumber(cleanValue);
    onChange(numberValue);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={formatNumber(value)}
      onChange={handleChange}
      className={className}
    />
  );
};

export default NumberInput;
