import * as React from "react"
import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const getMaxWidth = (size: ContainerProps['size']) => {
  switch (size) {
    case 'sm': return 'max-w-screen-sm'
    case 'md': return 'max-w-screen-md'
    case 'lg': return 'max-w-screen-lg'
    case 'xl': return 'max-w-screen-xl'
    case 'full': return 'max-w-full'
    default: return 'max-w-screen-xl'
  }
}

export function Container({
  className,
  children,
  size = 'xl',
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8",
        getMaxWidth(size),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}