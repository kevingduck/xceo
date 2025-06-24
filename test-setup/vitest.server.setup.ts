import { vi } from 'vitest'

// Mock environment variables for server tests
process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only'

// Mock external services
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: 'Mocked AI response' }]
      })
    }
  }))
}))

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    }
  }))
}))

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})