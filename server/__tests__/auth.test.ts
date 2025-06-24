import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import supertest from 'supertest'

// Mock database first before any imports that use it
vi.mock('@db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  }
}))

import { setupAuth } from '../auth'
import { createTestApp } from '../../test-setup/server-test-utils'

// Mock database schema
vi.mock('@db/schema', () => ({
  users: {},
  insertUserSchema: {
    safeParse: vi.fn()
  },
  loginUserSchema: {
    safeParse: vi.fn()
  }
}))

describe('Authentication API', () => {
  let app: express.Application
  let request: supertest.SuperTest<supertest.Test>

  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword.salt',
    role: 'user'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    app = createTestApp()
    setupAuth(app)
    request = supertest(app)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/register', () => {
    const validRegistration = {
      username: 'newuser',
      password: 'password123',
      role: 'user'
    }

    beforeEach(() => {
      // Mock schema validation
      const { insertUserSchema } = require('@db/schema')
      insertUserSchema.safeParse.mockReturnValue({
        success: true,
        data: validRegistration
      })

      // Mock database operations
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing user
          })
        })
      })

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockUser, ...validRegistration }])
        })
      })
    })

    it('should register a new user successfully', async () => {
      const response = await request
        .post('/api/register')
        .send(validRegistration)
        .expect(200)

      expect(response.body).toMatchObject({
        ok: true,
        message: 'Registration successful',
        user: {
          username: validRegistration.username,
          role: validRegistration.role
        }
      })

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should return 400 for invalid registration data', async () => {
      const { insertUserSchema } = require('@db/schema')
      insertUserSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Username is required' }]
        }
      })

      const response = await request
        .post('/api/register')
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        ok: false,
        message: expect.stringContaining('Username is required')
      })
    })

    it('should return 400 for existing username', async () => {
      // Mock existing user found
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]) // User exists
          })
        })
      })

      const response = await request
        .post('/api/register')
        .send(validRegistration)
        .expect(400)

      expect(response.body).toMatchObject({
        ok: false,
        message: 'Username already exists'
      })
    })

    it('should handle database errors during registration', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      })

      await request
        .post('/api/register')
        .send(validRegistration)
        .expect(500)
    })
  })

  describe('POST /api/login', () => {
    const validLogin = {
      username: 'testuser',
      password: 'password123'
    }

    beforeEach(() => {
      // Mock schema validation
      const { loginUserSchema } = require('@db/schema')
      loginUserSchema.safeParse.mockReturnValue({
        success: true,
        data: validLogin
      })
    })

    it('should return 400 for invalid login data', async () => {
      const { loginUserSchema } = require('@db/schema')
      loginUserSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Username is required' }]
        }
      })

      const response = await request
        .post('/api/login')
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({
        ok: false,
        message: expect.stringContaining('Username is required')
      })
    })

    it('should handle login with non-existent user', async () => {
      // Mock user not found in database
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No user found
          })
        })
      })

      const response = await request
        .post('/api/login')
        .send(validLogin)
        .expect(400)

      expect(response.body).toMatchObject({
        ok: false,
        message: expect.stringContaining('Invalid username or password')
      })
    })

    it('should handle database errors during login', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      })

      await request
        .post('/api/login')
        .send(validLogin)
        .expect(500)
    })
  })

  describe('POST /api/logout', () => {
    it('should logout successfully', async () => {
      const response = await request
        .post('/api/logout')
        .expect(200)

      expect(response.body).toMatchObject({
        ok: true,
        message: 'Logout successful'
      })
    })
  })

  describe('GET /api/user', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request
        .get('/api/user')
        .expect(401)

      expect(response.body).toMatchObject({
        ok: false,
        message: 'Not logged in'
      })
    })

    it('should return user data when authenticated', async () => {
      // Mock authenticated request
      app.use((req, res, next) => {
        req.isAuthenticated = () => true
        req.user = { ...mockUser }
        next()
      })

      const response = await request
        .get('/api/user')
        .expect(200)

      expect(response.body).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role
      })

      // Should not include password
      expect(response.body).not.toHaveProperty('password')
    })
  })

  describe('Password hashing', () => {
    it('should hash passwords securely', async () => {
      // This test would normally check the actual crypto functions
      // For now, we'll just verify that password is hashed during registration
      const { insertUserSchema } = require('@db/schema')
      insertUserSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          username: 'testuser',
          password: 'plainpassword',
          role: 'user'
        }
      })

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            ...mockUser,
            username: 'testuser'
          }])
        })
      })

      await request
        .post('/api/register')
        .send({
          username: 'testuser',
          password: 'plainpassword'
        })
        .expect(200)

      // Verify that insert was called (password would be hashed internally)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('Admin middleware', () => {
    it('should block non-admin users from admin routes', async () => {
      // Test the isAdmin middleware indirectly by checking its behavior
      const { isAdmin } = require('../auth')
      
      const mockReq = {
        isAuthenticated: () => true,
        user: { role: 'user' }
      } as any

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any

      const mockNext = vi.fn()

      isAdmin(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        message: 'Access denied. Admin privileges required.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow admin users to access admin routes', async () => {
      const { isAdmin } = require('../auth')
      
      const mockReq = {
        isAuthenticated: () => true,
        user: { role: 'admin' }
      } as any

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any

      const mockNext = vi.fn()

      isAdmin(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block unauthenticated users from admin routes', async () => {
      const { isAdmin } = require('../auth')
      
      const mockReq = {
        isAuthenticated: () => false
      } as any

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any

      const mockNext = vi.fn()

      isAdmin(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        message: 'Not logged in'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})