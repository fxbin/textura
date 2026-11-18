'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  compact?: boolean;
  hideWordmarkOnMobile?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function BrandLogo({
  compact = false,
  hideWordmarkOnMobile = false,
  size = 'sm',
  className,
}: BrandLogoProps) {
  const gradId = React.useId();
  const iconDim = size === 'md' ? 'h-9 w-9 rounded-xl' : 'h-8 w-8 rounded-lg';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center border border-border/70 bg-card shadow-xs',
          iconDim
        )}
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5/6 w-5/6"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${gradId}-stem`} x1="10" y1="6" x2="26" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6CE5BA" />
              <stop offset="55%" stopColor="#5BE2C9" />
              <stop offset="100%" stopColor="#8DEAF5" />
            </linearGradient>
            <linearGradient id={`${gradId}-lines`} x1="21" y1="17" x2="31" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#77E5C8" />
              <stop offset="100%" stopColor="#94EBFA" />
            </linearGradient>
          </defs>

          {/* Ribbon 't' mark */}
          <path
            d="M15.5 7.5V26.2C15.5 29.8 18.2 32 22.1 32C24.2 32 26 31.3 27.2 30.2"
            stroke={`url(#${gradId}-stem)`}
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <path
            d="M10.5 14.2H26.4"
            stroke={`url(#${gradId}-stem)`}
            strokeWidth="4.4"
            strokeLinecap="round"
          />

          {/* Typesetting lines inside the 't' curve */}
          <path
            d="M21.5 18.8H29.5M21.5 22.1H28.2M21.5 25.4H29.5M21.5 28.7H26.5"
            stroke={`url(#${gradId}-lines)`}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {!compact && (
        <div className={cn('flex flex-col leading-none', hideWordmarkOnMobile && 'hidden sm:flex')}>
          <span className="text-[15px] font-bold tracking-tight text-foreground">Textura</span>
          <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
            排版禅室
          </span>
        </div>
      )}
    </div>
  );
}
