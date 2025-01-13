import * as React from "react"
import { cn } from "@/lib/utils"

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  gap?: number
  rowGap?: number
  colGap?: number
  mobileRows?: boolean
}

export function Grid({
  className,
  cols = 1,
  gap,
  rowGap,
  colGap,
  mobileRows = false,
  children,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid w-full",
        // Enhanced responsive columns with better mobile support
        {
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': cols === 3,
          'grid-cols-1 sm:grid-cols-2': cols === 2,
          'grid-cols-1': cols === 1,
        },
        // Mobile-first gap utilities
        gap && `gap-${gap}`,
        rowGap && `gap-y-${rowGap}`,
        colGap && `gap-x-${colGap}`,
        // Force single column on mobile if mobileRows is true
        mobileRows && 'grid-cols-1 sm:grid-cols-inherit',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: number
  mobileFull?: boolean
}

export function GridItem({
  className,
  span,
  mobileFull = false,
  children,
  ...props
}: GridItemProps) {
  return (
    <div
      className={cn(
        span && `col-span-${span}`,
        // Full width on mobile if mobileFull is true
        mobileFull && 'col-span-full sm:col-span-inherit',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}