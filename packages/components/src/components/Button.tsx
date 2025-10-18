import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-primary-600 text-white hover:bg-primary-700':
            variant === 'primary',
          'bg-gray-100 text-gray-900 hover:bg-gray-200':
            variant === 'secondary',
          'border border-gray-300 bg-transparent hover:bg-gray-100':
            variant === 'outline',
          'hover:bg-gray-100': variant === 'ghost',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Button.displayName = 'Button';
