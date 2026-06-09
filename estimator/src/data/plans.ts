export const UPGRADE_PLANS = [
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$49',
    period: '/mo',
    features: ['Unlimited estimates', 'PDF + Word export', 'Full CRM', 'Custom branding'],
    featuresEs: ['Estimaciones ilimitadas', 'PDF + Word', 'CRM completo', 'Marca personalizada'],
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    price: '$95',
    period: '/mo',
    features: ['Everything in Pro', 'Team members', 'Priority support', 'White-label export'],
    featuresEs: ['Todo en Pro', 'Miembros del equipo', 'Soporte prioritario', 'Exportación marca blanca'],
  },
]
