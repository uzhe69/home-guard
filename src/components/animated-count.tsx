import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

type AnimatedCountProps = TextProps & {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

export function AnimatedCount({ value, decimals = 0, prefix = '', suffix = '', ...props }: AnimatedCountProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const start = previousValue.current;
    previousValue.current = value;
    const startedAt = Date.now();
    const duration = 650;
    const interval = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (value - start) * eased);
      if (progress === 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <Text {...props}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </Text>
  );
}
