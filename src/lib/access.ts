export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'paused'
  | 'trialing'

export interface MirroredSubscription {
  status: SubscriptionStatus | string
  scheduled_change_action?: string | null
  scheduled_change_at?: string | null
}

export function subscriptionGrantsAccess(
  subscription: MirroredSubscription | null | undefined
): boolean {
  if (!subscription) return false

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return true
    case 'canceled':
      return false
    case 'paused':
    case 'past_due':
      return false
    default:
      return false
  }
}
