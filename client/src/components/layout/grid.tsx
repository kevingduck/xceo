import * as React from "react"
import { cn } from "@/lib/utils"

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  gap?: number
  rowGap?: number
  colGap?: number
}

export function Grid({
  className,
  cols = 1,
  gap,
  rowGap,
  colGap,
  children,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid w-full",
        // Default responsive columns
        {
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': cols === 3,
          'grid-cols-1 sm:grid-cols-2': cols === 2,
          'grid-cols-1': cols === 1,
        },
        // Gap utilities
        gap && `gap-${gap}`,
        rowGap && `gap-y-${rowGap}`,
        colGap && `gap-x-${colGap}`,
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
}

export function GridItem({
  className,
  span,
  children,
  ...props
}: GridItemProps) {
  return (
    <div
      className={cn(
        span && `col-span-${span}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
