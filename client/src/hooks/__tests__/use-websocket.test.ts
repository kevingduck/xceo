import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket } from '../use-websocket'
import { createMockWebSocket } from '@test-setup'

// Mock WebSocket
const mockWebSocket = vi.fn()
global.WebSocket = mockWebSocket

describe('useWebSocket', () => {
  let mockWs: any

  beforeEach(() => {
    vi.useFakeTimers()
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
    vi.clearAllMocks()
  })

  describe('Initial connection', () => {
    it('initializes with connecting state', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Should start in connecting state
      expect(result.current.connectionState).toBe('connecting')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(true)
      expect(result.current.isReconnecting).toBe(false)
      
      // WebSocket should be created
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws')
      })
    })

    it('creates WebSocket with correct URL', async () => {
      renderHook(() => useWebSocket())

      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws')
      })
    })

    it('uses secure protocol for HTTPS', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'example.com',
        },
        writable: true,
      })

      renderHook(() => useWebSocket())

      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalledWith('wss://example.com/ws')
      })
    })
  })

  describe('Connection states', () => {
    it('transitions to connected state on open', async () => {
      const onConnect = vi.fn()
      const { result } = renderHook(() => useWebSocket({ onConnect }))

      // Wait for WebSocket to be created
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Simulate connection opening
      act(() => {
        // The mock creates the onopen call with setTimeout
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected')
        expect(result.current.isConnected).toBe(true)
        expect(result.current.isConnecting).toBe(false)
        expect(onConnect).toHaveBeenCalled()
      })
    })

    it('transitions to reconnecting state on close', async () => {
      const onDisconnect = vi.fn()
      const { result } = renderHook(() => useWebSocket({ onDisconnect }))

      // Wait for WebSocket and connect
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected')
      })

      // Then disconnect
      act(() => {
        mockWs.readyState = WebSocket.CLOSED
        mockWs.onclose?.({ code: 1000, reason: 'Normal closure' } as CloseEvent)
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('reconnecting')
        expect(onDisconnect).toHaveBeenCalled()
      })
    })

    it('handles manual disconnect', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Wait for WebSocket and connect
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected')
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
    it('calls onMessage callback for received messages', async () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket({ onMessage }))

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      const testMessage = { type: 'test', data: 'hello' }
      
      act(() => {
        mockWs.onmessage?.({ data: JSON.stringify(testMessage) } as MessageEvent)
      })

      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('handles non-JSON messages', async () => {
      const onMessage = vi.fn()
      renderHook(() => useWebSocket({ onMessage }))

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      const textMessage = 'plain text message'
      
      act(() => {
        mockWs.onmessage?.({ data: textMessage } as MessageEvent)
      })

      expect(onMessage).toHaveBeenCalledWith(textMessage)
    })

    it('handles pong messages for heartbeat', async () => {
      const onMessage = vi.fn()
      const { result } = renderHook(() => useWebSocket({ 
        onMessage,
        enableHeartbeat: true,
        heartbeatInterval: 1000
      }))

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Send pong message
      act(() => {
        mockWs.onmessage?.({ data: 'pong' } as MessageEvent)
      })

      // Should not call onMessage for pong messages
      expect(onMessage).not.toHaveBeenCalledWith('pong')
    })

    it('handles message acknowledgments', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const messageId = 'test-id'
      
      // Send message with ID
      act(() => {
        result.current.sendMessage('test', { id: messageId })
      })

      // Receive acknowledgment
      act(() => {
        mockWs.onmessage?.({ 
          data: JSON.stringify({ type: 'ack', messageId }) 
        } as MessageEvent)
      })

      // Should process acknowledgment (pendingMessagesCount should decrease)
      expect(result.current.pendingMessagesCount).toBe(0)
    })
  })

  describe('Sending messages', () => {
    it('sends message when connected', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
        mockWs.readyState = WebSocket.OPEN
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const testMessage = 'test message'
      let sendResult: boolean | undefined

      act(() => {
        sendResult = result.current.sendMessage(testMessage)
      })

      expect(mockWs.send).toHaveBeenCalledWith(testMessage)
      expect(sendResult).toBe(true)
    })

    it('queues message when not connected', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Don't wait for connection
      const testMessage = 'test message'
      let sendResult: boolean | undefined

      act(() => {
        sendResult = result.current.sendMessage(testMessage)
      })

      expect(mockWs.send).not.toHaveBeenCalled()
      expect(sendResult).toBe(false)
      expect(result.current.queuedMessagesCount).toBe(1)
    })

    it('processes queued messages on connection', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Queue a message before connection
      act(() => {
        result.current.sendMessage('queued message')
      })

      expect(result.current.queuedMessagesCount).toBe(1)

      // Wait for WebSocket creation
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Connect and verify message is sent
      act(() => {
        vi.runAllTimers()
        mockWs.readyState = WebSocket.OPEN
        mockWs.onopen?.({} as Event)
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Queue should be processed
      expect(mockWs.send).toHaveBeenCalledWith('queued message')
      expect(result.current.queuedMessagesCount).toBe(0)
    })

    it('does not queue priority messages', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Send priority message while disconnected
      act(() => {
        result.current.sendMessage('priority message', { priority: true })
      })

      expect(result.current.queuedMessagesCount).toBe(0)
    })
  })

  describe('Reconnection logic', () => {
    it('attempts to reconnect on connection loss', async () => {
      const { result } = renderHook(() => useWebSocket({ 
        reconnectDelay: 100,
        maxReconnectAttempts: 3 
      }))

      // Wait for initial connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Simulate connection loss
      act(() => {
        mockWs.readyState = WebSocket.CLOSED
        mockWs.onclose?.({ code: 1006, reason: 'Abnormal closure' } as CloseEvent)
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('reconnecting')
      })

      // Advance timers to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Should create new WebSocket
      expect(mockWebSocket).toHaveBeenCalledTimes(2)
    })

    it('stops reconnecting after max attempts', async () => {
      const { result } = renderHook(() => useWebSocket({ 
        reconnectDelay: 100,
        maxReconnectAttempts: 2 
      }))

      // Wait for initial connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        // Reset mock to simulate new connection attempt
        mockWs = createMockWebSocket()
        mockWs.readyState = WebSocket.CLOSED
        mockWebSocket.mockImplementation(() => mockWs)

        act(() => {
          mockWs.onclose?.({ code: 1006 } as CloseEvent)
          vi.advanceTimersByTime(150)
        })
      }

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected')
        expect(result.current.reconnectAttempts).toBe(2)
      })
    })
  })

  describe('Heartbeat mechanism', () => {
    it('sends ping messages when heartbeat is enabled', async () => {
      renderHook(() => useWebSocket({ 
        enableHeartbeat: true,
        heartbeatInterval: 1000 
      }))

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
        mockWs.readyState = WebSocket.OPEN
      })

      // Clear previous calls
      mockWs.send.mockClear()

      // Fast-forward to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockWs.send).toHaveBeenCalledWith('ping')
    })

    it('reconnects on heartbeat timeout', async () => {
      const { result } = renderHook(() => useWebSocket({ 
        enableHeartbeat: true,
        heartbeatInterval: 1000,
        heartbeatTimeout: 2000 
      }))

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
        mockWs.readyState = WebSocket.OPEN
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Fast-forward past heartbeat timeout without receiving pong
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Should trigger reconnection
      expect(mockWs.close).toHaveBeenCalled()
    })
  })

  describe('Page visibility handling', () => {
    it('pauses reconnection when page is hidden', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Disconnect and verify no reconnection
      act(() => {
        mockWs.onclose?.({ code: 1000 } as CloseEvent)
      })

      expect(result.current.connectionState).toBe('disconnected')
      
      // Advance timers - should not reconnect
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(mockWebSocket).toHaveBeenCalledTimes(1)
    })

    it('resumes connection when page becomes visible', async () => {
      renderHook(() => useWebSocket())

      // Wait for initial connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Simulate page hidden then visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Make page visible again
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false
      })

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      // Should attempt to connect
      expect(mockWebSocket).toHaveBeenCalled()
    })
  })

  describe('Network status handling', () => {
    it('reconnects when coming back online', async () => {
      const { result } = renderHook(() => useWebSocket())

      // Wait for initial connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      // Disconnect
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.connectionState).toBe('disconnected')
      })

      // Simulate coming back online
      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      // Should create new connection
      expect(mockWebSocket).toHaveBeenCalledTimes(2)
    })
  })

  describe('Cleanup', () => {
    it('cleans up connections on unmount', async () => {
      const { unmount } = renderHook(() => useWebSocket())

      // Wait for connection
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalled()
      })

      act(() => {
        vi.runAllTimers()
      })

      unmount()

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Manual disconnect')
    })
  })
})