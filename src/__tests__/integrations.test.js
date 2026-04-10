// src/__tests__/integrations.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the registry in isolation — import after we create it
let registry

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('../../integrations/index.js')
  registry = mod
})

describe('integration registry', () => {
  it('starts with zero registered integrations', () => {
    expect(registry.getAll()).toHaveLength(0)
  })

  it('registers an integration', () => {
    const fake = { name: 'test', start: vi.fn(), stop: vi.fn() }
    registry.register(fake)
    expect(registry.getAll()).toHaveLength(1)
  })

  it('startAll calls start on every registered integration', async () => {
    const onNotification = vi.fn()
    const fake1 = { name: 'a', start: vi.fn(), stop: vi.fn() }
    const fake2 = { name: 'b', start: vi.fn(), stop: vi.fn() }
    registry.register(fake1)
    registry.register(fake2)
    await registry.startAll(onNotification)
    expect(fake1.start).toHaveBeenCalledWith(onNotification)
    expect(fake2.start).toHaveBeenCalledWith(onNotification)
  })
})
