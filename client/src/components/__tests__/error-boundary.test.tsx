import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../../../../test-setup/test-utils'
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../error-boundary'
import { errorLogger } from '@/lib/error-logger'

// Mock the error logger
vi.mock('@/lib/error-logger', () => ({
  errorLogger: {
    logError: vi.fn()
  }
}))

// Test component that throws an error
const ThrowError = ({ shouldThrow = false, message = 'Test error' }: { shouldThrow?: boolean; message?: string }) => {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div>No error</div>
}

// Test component for reset functionality
const TestComponent = ({ resetKey = 0 }: { resetKey?: number }) => {
  return <div data-testid="test-component">Reset key: {resetKey}</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Normal rendering', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child content</div>
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('catches and displays error with default UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Failed to render this component.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('displays page-level error UI', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
    })

    it('displays section-level error UI', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Section Error')).toBeInTheDocument()
      expect(screen.getByText(/This section couldn't load properly/)).toBeInTheDocument()
    })

    it('displays isolated component error UI', () => {
      render(
        <ErrorBoundary isolate={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component Error')).toBeInTheDocument()
      expect(screen.getByText('This component failed to load.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('uses custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    })
  })

  describe('Error logging', () => {
    it('calls error logger when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Test logging error" />
        </ErrorBoundary>
      )

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'component',
          errorBoundary: true,
          errorCount: expect.any(Number)
        }),
        expect.any(String)
      )
    })

    it('calls custom onError handler', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })
  })

  describe('Reset functionality', () => {
    it('resets error state when Try Again is clicked', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error')).toBeInTheDocument()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      tryAgainButton.click()

      // After reset, re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument()
      })
    })

    it('resets when resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={[1]}>
          <TestComponent resetKey={1} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Reset key: 1')).toBeInTheDocument()

      // Change resetKeys to trigger reset
      rerender(
        <ErrorBoundary resetKeys={[2]}>
          <TestComponent resetKey={2} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Reset key: 2')).toBeInTheDocument()
    })

    it('resets on props change when resetOnPropsChange is true', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true} level="component">
          <TestComponent resetKey={1} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Reset key: 1')).toBeInTheDocument()

      // Change props to trigger reset
      rerender(
        <ErrorBoundary resetOnPropsChange={true} level="section">
          <TestComponent resetKey={2} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Reset key: 2')).toBeInTheDocument()
    })
  })

  describe('Development mode', () => {
    it('shows error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} message="Detailed test error" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument()
      expect(screen.getByText('Detailed test error')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Multiple errors', () => {
    it('shows multiple errors warning', () => {
      const { rerender } = render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Simulate multiple errors by re-rendering with error multiple times
      for (let i = 0; i < 3; i++) {
        rerender(
          <ErrorBoundary level="page">
            <ThrowError shouldThrow={true} message={`Error ${i}`} />
          </ErrorBoundary>
        )
      }

      expect(screen.getByText('Multiple errors detected')).toBeInTheDocument()
      expect(screen.getByText(/If the problem persists, please contact support/)).toBeInTheDocument()
    })
  })

  describe('HOC wrapper', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = () => <div data-testid="wrapped">Wrapped component</div>
      const WrappedComponent = withErrorBoundary(TestComponent, { level: 'component' })

      render(<WrappedComponent />)

      expect(screen.getByTestId('wrapped')).toBeInTheDocument()
      expect(screen.getByText('Wrapped component')).toBeInTheDocument()
    })

    it('catches errors in wrapped component', () => {
      const ErrorComponent = () => {
        throw new Error('Wrapped component error')
      }
      const WrappedComponent = withErrorBoundary(ErrorComponent, { level: 'component' })

      render(<WrappedComponent />)

      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })

  describe('useErrorHandler hook', () => {
    it('throws error when called', () => {
      const TestHookComponent = () => {
        const throwError = useErrorHandler()
        
        return (
          <button onClick={() => throwError(new Error('Hook error'))}>
            Throw Error
          </button>
        )
      }

      render(
        <ErrorBoundary>
          <TestHookComponent />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: /throw error/i })
      button.click()

      expect(screen.getByText('Error')).toBeInTheDocument()
    })
  })
})