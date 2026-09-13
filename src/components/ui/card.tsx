import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

type CardProps = ViewProps & { className?: string };

export function Card({ className, style, ...props }: CardProps) {
  return (
    <View
      className={cn('rounded-[24px] border border-line bg-white p-5', className)}
      style={[
        {
          shadowColor: '#173B2E',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.045,
          shadowRadius: 24,
        },
        style,
      ]}
      {...props}
    />
  );
}
