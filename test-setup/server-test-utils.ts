import { vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock database utilities
export const createMockDatabase = () => ({
  users: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  tasks: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  businessInfo: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  }
})

// Mock Express app factory
export const createTestApp = () => {
  const app = express()
  app.use(express.json())
  return app
}

// Mock session
export const createMockSession = (userData?: any) => ({
  user: userData || { id: '1', username: 'testuser' },
  save: vi.fn((callback) => callback && callback()),
  destroy: vi.fn((callback) => callback && callback()),
  regenerate: vi.fn((callback) => callback && callback()),
  reload: vi.fn((callback) => callback && callback()),
  touch: vi.fn((callback) => callback && callback()),
  cookie: {
    maxAge: 3600000,
    secure: false,
    httpOnly: true
  }
})

// Mock request with session
export const createMockRequest = (overrides: any = {}) => ({
  user: overrides.user || { id: '1', username: 'testuser' },
  session: createMockSession(overrides.user),
  body: overrides.body || {},
  params: overrides.params || {},
  query: overrides.query || {},
  headers: overrides.headers || {},
  ...overrides
})

// Mock response
export const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    locals: {},
    headersSent: false,
    getHeader: vi.fn(),
    setHeader: vi.fn(),
    removeHeader: vi.fn(),
  }
  return res
}

// Mock next function
export const createMockNext = () => vi.fn()

// Authentication test utilities
export const createAuthenticatedRequest = (app: express.Application, userData?: any) => {
  const agent = request.agent(app)
  
  // Mock authentication middleware
  app.use((req, res, next) => {
    req.user = userData || { id: '1', username: 'testuser' }
    req.session = createMockSession(req.user) as any
    next()
  })
  
  return agent
}

// Database seed utilities
export const seedTestDatabase = async (mockDb: any) => {
  // Mock user data
  mockDb.users.findMany.mockResolvedValue([
    { id: '1', username: 'testuser', email: 'test@example.com' },
    { id: '2', username: 'admin', email: 'admin@example.com' }
  ])
  
  // Mock task data
  mockDb.tasks.findMany.mockResolvedValue([
    { id: '1', title: 'Test Task', description: 'Test Description', userId: '1' },
    { id: '2', title: 'Another Task', description: 'Another Description', userId: '1' }
  ])
  
  return mockDb
}

// WebSocket test utilities
export const createMockWebSocketServer = () => ({
  clients: new Set(),
  broadcast: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn()
})

export const createMockWebSocketClient = () => ({
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
})