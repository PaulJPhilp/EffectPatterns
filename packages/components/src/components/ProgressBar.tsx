import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils.js';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, showLabel = true, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        {showLabel && (
          <div className="mb-2 flex justify-between text-gray-600 text-sm">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            aria-valuemax={max}
            aria-valuemin={0}
            aria-valuenow={value}
            className="h-full bg-primary-600 transition-all duration-300 ease-in-out"
            role="progressbar"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
