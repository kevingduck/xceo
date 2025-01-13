import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    // Initial check
    checkMobile()

    // Add event listener with debounce for better performance
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 100)
    }

    window.addEventListener('resize', handleResize)
    mql.addEventListener('change', checkMobile)

    return () => {
      window.removeEventListener('resize', handleResize)
      mql.removeEventListener('change', checkMobile)
      clearTimeout(timeoutId)
    }
  }, [])

  return isMobile
}

// Export a constant for reuse in other components
export const BREAKPOINTS = {
  mobile: MOBILE_BREAKPOINT,
  tablet: 1024,
  desktop: 1280
} as const