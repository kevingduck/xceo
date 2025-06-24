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
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis()
  }
}))

import { createTestApp, createMockSession, seedTestDatabase } from '../../../test-setup/server-test-utils'
import { registerRoutes } from '../../routes'

// Mock the websocket setup
vi.mock('../../websocket', () => ({
  setupWebSocket: vi.fn()
}))

// Mock AI services
vi.mock('../../services/ai', () => ({
  processAIMessage: vi.fn().mockResolvedValue({
    content: 'Mocked AI response',
    suggestedActions: []
  })
}))

vi.mock('../../services/feedback-analysis', () => ({
  analyzeFeedback: vi.fn().mockResolvedValue({
    suggestions: ['Mocked suggestion'],
    sentiment: 'positive'
  })
}))

describe('Tasks API Routes', () => {
  let app: express.Application
  let request: supertest.SuperTest<supertest.Test>

  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com'
  }

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    userId: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    app = createTestApp()
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.isAuthenticated = () => true
      req.user = mockUser
      req.session = createMockSession(mockUser) as any
      next()
    })

    // Register routes
    registerRoutes(app)
    
    // Seed test database
    await seedTestDatabase(mockDb)
    
    request = supertest(app)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return user tasks when authenticated', async () => {
      mockDb.query = {
        tasks: {
          findMany: vi.fn().mockResolvedValue([mockTask])
        }
      } as any

      const response = await request
        .get('/api/tasks')
        .expect(200)

      expect(response.body).toEqual([mockTask])
      expect(mockDb.query.tasks.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      })
    })

    it('should return 401 when not authenticated', async () => {
      // Create app without authentication
      const unauthApp = createTestApp()
      unauthApp.use((req, res, next) => {
        req.isAuthenticated = () => false
        next()
      })
      registerRoutes(unauthApp)
      
      const unauthRequest = supertest(unauthApp)

      await unauthRequest
        .get('/api/tasks')
        .expect(401)
    })

    it('should handle database errors gracefully', async () => {
      mockDb.query = {
        tasks: {
          findMany: vi.fn().mockRejectedValue(new Error('Database error'))
        }
      } as any

      await request
        .get('/api/tasks')
        .expect(500)
    })
  })

  describe('POST /api/tasks', () => {
    const validTaskData = {
      title: 'New Task',
      description: 'New Description',
      status: 'todo'
    }

    beforeEach(() => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockTask, ...validTaskData }])
        })
      })
    })

    it('should create a new task with valid data', async () => {
      const response = await request
        .post('/api/tasks')
        .send(validTaskData)
        .expect(200)

      expect(response.body).toMatchObject(validTaskData)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should return 400 for invalid task data', async () => {
      const invalidData = {
        title: '', // Empty title should fail validation
        description: 'Description'
      }

      const response = await request
        .post('/api/tasks')
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Invalid input')
      expect(response.body).toHaveProperty('errors')
    })

    it('should return 401 when not authenticated', async () => {
      const unauthApp = createTestApp()
      unauthApp.use((req, res, next) => {
        req.isAuthenticated = () => false
        next()
      })
      registerRoutes(unauthApp)
      
      const unauthRequest = supertest(unauthApp)

      await unauthRequest
        .post('/api/tasks')
        .send(validTaskData)
        .expect(401)
    })

    it('should handle database insertion errors', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insertion failed'))
        })
      })

      const response = await request
        .post('/api/tasks')
        .send(validTaskData)
        .expect(500)

      expect(response.body).toHaveProperty('message', 'Failed to create task')
    })
  })

  describe('PATCH /api/tasks/:id', () => {
    const taskId = 1
    const updateData = {
      title: 'Updated Task',
      status: 'in-progress'
    }

    beforeEach(() => {
      // Mock finding existing task
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTask])
          })
        })
      })

      // Mock updating task
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockTask, ...updateData }])
          })
        })
      })
    })

    it('should update an existing task', async () => {
      const response = await request
        .patch(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject(updateData)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should return 400 for invalid task ID', async () => {
      await request
        .patch('/api/tasks/invalid')
        .send(updateData)
        .expect(400)
    })

    it('should return 404 for non-existent task', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No task found
          })
        })
      })

      await request
        .patch(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(404)
    })

    it('should return 403 for unauthorized access', async () => {
      const unauthorizedTask = { ...mockTask, userId: '2' } // Different user
      
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([unauthorizedTask])
          })
        })
      })

      await request
        .patch(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(403)
    })

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        status: 'invalid-status' // Invalid status
      }

      const response = await request
        .patch(`/api/tasks/${taskId}`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Invalid input')
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    const taskId = 1

    beforeEach(() => {
      // Mock finding existing task
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTask])
          })
        })
      })

      // Mock deleting task
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    })

    it('should delete an existing task', async () => {
      const response = await request
        .delete(`/api/tasks/${taskId}`)
        .expect(200)

      expect(response.body).toEqual({ success: true })
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should return 400 for invalid task ID', async () => {
      await request
        .delete('/api/tasks/invalid')
        .expect(400)
    })

    it('should return 404 for non-existent task', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No task found
          })
        })
      })

      await request
        .delete(`/api/tasks/${taskId}`)
        .expect(404)
    })

    it('should return 403 for unauthorized access', async () => {
      const unauthorizedTask = { ...mockTask, userId: '2' } // Different user
      
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([unauthorizedTask])
          })
        })
      })

      await request
        .delete(`/api/tasks/${taskId}`)
        .expect(403)
    })

    it('should handle database deletion errors', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database deletion failed'))
      })

      await request
        .delete(`/api/tasks/${taskId}`)
        .expect(500)
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock a complete database failure
      mockDb.query = undefined

      await request
        .get('/api/tasks')
        .expect(500)
    })

    it('should validate request parameters correctly', async () => {
      // Test with various invalid parameters
      await request.patch('/api/tasks/0').send({}).expect(400)
      await request.patch('/api/tasks/-1').send({}).expect(400)
      await request.delete('/api/tasks/0').expect(400)
      await request.delete('/api/tasks/-1').expect(400)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete task lifecycle', async () => {
      // Create task
      const createData = {
        title: 'Lifecycle Task',
        description: 'Test lifecycle',
        status: 'todo'
      }

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockTask, ...createData, id: 2 }])
        })
      })

      const createResponse = await request
        .post('/api/tasks')
        .send(createData)
        .expect(200)

      const taskId = createResponse.body.id

      // Update task
      const updateData = { status: 'in-progress' }
      
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([createResponse.body])
          })
        })
      })

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...createResponse.body, ...updateData }])
          })
        })
      })

      await request
        .patch(`/api/tasks/${taskId}`)
        .send(updateData)
        .expect(200)

      // Delete task
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })

      await request
        .delete(`/api/tasks/${taskId}`)
        .expect(200)
    })
  })
})