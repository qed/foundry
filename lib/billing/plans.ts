export interface PlanDefinition {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: number
  priceAnnual: number
  seatLimit: number
  features: string[]
  storageGb: number
  supportLevel: string
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    seatLimit: 3,
    features: [
      'All core features',
      '5 GB storage',
      'Community support',
    ],
    storageGb: 5,
    supportLevel: 'community',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    priceAnnual: 990,
    seatLimit: 10,
    features: [
      'All Free features',
      '100 GB storage',
      'Email support',
      'API access',
      'Advanced reporting',
    ],
    storageGb: 100,
    supportLevel: 'email',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    priceAnnual: 0,
    seatLimit: 999,
    features: [
      'All Pro features',
      'Unlimited storage',
      'Phone + email support',
      'Custom integrations',
      'SLA',
    ],
    storageGb: -1,
    supportLevel: 'phone',
  },
]

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId)
}
