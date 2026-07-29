import { describe, it, expect } from 'vitest'
import { subscriptionGrantsAccess } from '../access'
import type { MirroredSubscription } from '../access'

describe('subscriptionGrantsAccess', () => {
  it('grants access for active subscription', () => {
    expect(subscriptionGrantsAccess({ status: 'active' })).toBe(true)
  })

  it('grants access for trialing subscription', () => {
    expect(subscriptionGrantsAccess({ status: 'trialing' })).toBe(true)
  })

  it('grants access for active subscription with scheduled cancellation', () => {
    const sub: MirroredSubscription = {
      status: 'active',
      scheduled_change_action: 'cancel',
      scheduled_change_at: '2027-01-01T00:00:00Z',
    }
    expect(subscriptionGrantsAccess(sub)).toBe(true)
  })

  it('grants access for trialing subscription with scheduled pause', () => {
    const sub: MirroredSubscription = {
      status: 'trialing',
      scheduled_change_action: 'pause',
      scheduled_change_at: '2027-01-01T00:00:00Z',
    }
    expect(subscriptionGrantsAccess(sub)).toBe(true)
  })

  it('denies access for canceled subscription', () => {
    expect(subscriptionGrantsAccess({ status: 'canceled' })).toBe(false)
  })

  it('denies access when subscription is null', () => {
    expect(subscriptionGrantsAccess(null)).toBe(false)
  })

  it('denies access when subscription is undefined', () => {
    expect(subscriptionGrantsAccess(undefined)).toBe(false)
  })

  it('denies access for paused subscription', () => {
    expect(subscriptionGrantsAccess({ status: 'paused' })).toBe(false)
  })

  it('denies access for past_due subscription', () => {
    expect(subscriptionGrantsAccess({ status: 'past_due' })).toBe(false)
  })

  it('denies access for unknown status', () => {
    expect(subscriptionGrantsAccess({ status: 'unknown' })).toBe(false)
  })

  it('denies access for empty string status', () => {
    expect(subscriptionGrantsAccess({ status: '' })).toBe(false)
  })
})
