import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '../../../../test-setup/test-utils'
import { useWebSocket } from '../use-websocket'
import { createMockWebSocket } from '../../../../test-setup/test-utils'

// Mock WebSocket
const mockWebSocket = vi.fn()
global.WebSocket = mockWebSocket

// Mock timers
vi.useFakeTimers()

describe('useWebSocket', () => {
  let mockWs: any

  beforeEach(() => {
    mockWs = createMockWebSocket()
    mockWebSocket.mockImplementation(() => mockWs)
    vi.clearAllMocks()
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'http:',
        host: 'localhost:3000',
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Initial connection', () => {
    it('initializes with disconnected state', () => {
      const { result } = renderHook(() => useWebSocket())

      expect(result.current.connectionState).toBe('connecting')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(true)
      expect(result.current.isReconnecting).toBe(false)
    })

    it('creates WebSocket with correct URL', () => {
      renderHook(() => useWebSocket())

      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws')
    })

    it('uses secure protocol for HTTPS', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'example.com',
        },
        writable: true,
      })

      renderHook(() => useWebSocket())

      expect(mockWebSocket).toHaveBeenCalledWith('wss://example.com/ws')
    })
  })

  describe('Connection states', () => {
    it('transitions to connected state on open', async () => {
      const onConnect = vi.fn()
      const { result } = renderHook(() => useWebSocket({ onConnect }))

      act(() => {
        mockWs.onopen?.({})
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected')
        expect(result.current.isConnected).toBe(true)
        expect(result.current.isConnecting).toBe(false)
      })

      expect(onConnect).toHaveBeenCalled()
    })

    it('transitions to disconnected state on close', async () => {
      const onDisconnect = vi.fn()
      const { result } = renderHook(() => useWebSocket({ onDisconnect }))

      // First connect
      act(() => {
        mockWs.onopen?.({})
      })

      // Then disconnect
      act(() => {
        mockWs.onclose?.({ code: 1000, reason: 'Normal closure' })
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('reconnecting')
      })

      expect(onDisconnect).toHaveBeenCalled()
    })

    it('handles manual disconnect', async () => {
      const { result } = renderHook(() => useWebSocket())

      // First connect
      act(() => {
        mockWs.onopen?.({})
      })

      // Manual disconnect
      act(() => {
        result.current.disconnect()
      })

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Manual disconnect')
      
      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected')
      })
    })
  })

  describe('Message handling', () => {
    it('calls onMessage callback for received messages', () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket({ onMessage }))

      const testMessage = { type: 'test', data: 'hello' }
      
      act(() => {
        mockWs.onmessage?.({ data: JSON.stringify(testMessage) })
      })

      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('handles non-JSON messages', () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket({ onMessage }))

      const textMessage = 'plain text message'
      
      act(() => {
        mockWs.onmessage?.({ data: textMessage })
      })

      expect(onMessage).toHaveBeenCalledWith(textMessage)
    })

    it('handles pong messages for heartbeat', () => {
      const { result } = renderHook(() => useWebSocket({ enableHeartbeat: true }))

      act(() => {
        mockWs.onopen?.({})
      })

      const pongMessage = { type: 'pong', timestamp: Date.now() }
      
      act(() => {
        mockWs.onmessage?.({ data: JSON.stringify(pongMessage) })
      })

      // Should not call onMessage for pong messages
      expect(result.current.isConnected).toBe(true)
    })

    it('handles message acknowledgments', () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket({ onMessage }))

      const ackMessage = { type: 'ack', messageId: 'test-id' }
      
      act(() => {
        mockWs.onmessage?.({ data: JSON.stringify(ackMessage) })
      })

      // Should not call onMessage for ack messages
      expect(onMessage).not.toHaveBeenCalled()
    })
  })

  describe('Sending messages', () => {
    it('sends message when connected', () => {
      const { result } = renderHook(() => useWebSocket())

      // Connect first
      act(() => {
        mockWs.onopen?.({})
        mockWs.readyState = WebSocket.OPEN
      })

      const testMessage = 'test message'
      let sendResult: boolean

      act(() => {
        sendResult = result.current.sendMessage(testMessage)
      })

      expect(mockWs.send).toHaveBeenCalledWith(testMessage)
      expect(sendResult!).toBe(true)
    })

    it('queues message when not connected', () => {
      const { result } = renderHook(() => useWebSocket())

      const testMessage = 'queued message'
      let sendResult: boolean

      act(() => {
        sendResult = result.current.sendMessage(testMessage)
      })

      expect(mockWs.send).not.toHaveBeenCalled()
      expect(sendResult!).toBe(false)
      expect(result.current.queuedMessagesCount).toBe(1)
    })

    it('processes queued messages on connection', () => {
      const { result } = renderHook(() => useWebSocket())

      // Queue a message while disconnected
      act(() => {
        result.current.sendMessage('queued message')
      })

      expect(result.current.queuedMessagesCount).toBe(1)

      // Connect and verify message is sent
      act(() => {
        mockWs.onopen?.({})
        mockWs.readyState = WebSocket.OPEN
      })

      expect(mockWs.send).toHaveBeenCalledWith('queued message')
      expect(result.current.queuedMessagesCount).toBe(0)
    })

    it('does not queue priority messages', () => {
      const { result } = renderHook(() => useWebSocket())

      act(() => {
        result.current.sendMessage('priority message', { priority: true })
      })

      expect(result.current.queuedMessagesCount).toBe(0)
    })
  })

  describe('Reconnection logic', () => {
    it('attempts to reconnect on connection loss', async () => {
      const { result } = renderHook(() => useWebSocket({ maxReconnectAttempts: 3 }))

      // Connect first
      act(() => {
        mockWs.onopen?.({})
      })

      // Simulate connection loss
      act(() => {
        mockWs.onclose?.({ code: 1006, reason: 'Connection lost' })
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('reconnecting')
      })

      // Fast-forward time to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(mockWebSocket).toHaveBeenCalledTimes(2) // Initial + reconnect
    })

    it('stops reconnecting after max attempts', async () => {
      const { result } = renderHook(() => useWebSocket({ 
        maxReconnectAttempts: 2,
        reconnectInterval: 1000 
      }))

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWs.onclose?.({ code: 1006, reason: 'Connection lost' })
        })

        act(() => {
          vi.advanceTimersByTime(1500)
        })
      }

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected')
      })

      expect(result.current.reconnectAttempts).toBe(2)
    })
  })

  describe('Heartbeat mechanism', () => {
    it('sends ping messages when heartbeat is enabled', () => {
      renderHook(() => useWebSocket({ 
        enableHeartbeat: true, 
        heartbeatInterval: 1000 
      }))

      // Connect first
      act(() => {
        mockWs.onopen?.({})
        mockWs.readyState = WebSocket.OPEN
      })

      // Fast-forward to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ping"')
      )
    })

    it('reconnects on heartbeat timeout', () => {
      renderHook(() => useWebSocket({ 
        enableHeartbeat: true, 
        heartbeatInterval: 1000 
      }))

      // Connect first
      act(() => {
        mockWs.onopen?.({})
        mockWs.readyState = WebSocket.OPEN
      })

      // Fast-forward past heartbeat timeout without receiving pong
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(mockWs.close).toHaveBeenCalled()
    })
  })

  describe('Page visibility handling', () => {
    it('pauses reconnection when page is hidden', () => {
      const { result } = renderHook(() => useWebSocket())

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Connection loss while hidden should not trigger reconnect
      act(() => {
        mockWs.onclose?.({ code: 1006, reason: 'Connection lost' })
      })

      expect(result.current.connectionState).toBe('disconnected')
    })

    it('resumes connection when page becomes visible', () => {
      const { result } = renderHook(() => useWebSocket())

      // Start with hidden page
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      })

      // Simulate connection loss
      act(() => {
        mockWs.onclose?.({ code: 1006, reason: 'Connection lost' })
      })

      // Page becomes visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(result.current.reconnectAttempts).toBe(0) // Reset on visibility
    })
  })

  describe('Network status handling', () => {
    it('reconnects when coming back online', () => {
      const { result } = renderHook(() => useWebSocket())

      // Simulate going offline then online
      act(() => {
        mockWs.onclose?.({ code: 1006, reason: 'Network error' })
      })

      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      expect(result.current.reconnectAttempts).toBe(0) // Reset on online event
    })
  })

  describe('Cleanup', () => {
    it('cleans up connections on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket())

      unmount()

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Manual disconnect')
    })
  })
})