export type AccountTypePlan = {
  key: 'contractor' | 'subcontractor' | 'labor-only'
  name: string
  nameEs: string
  price: string
  period: string
  icon: string
  highlight: boolean
  features: string[]
  featuresEs: string[]
}

export const ACCOUNT_TYPE_PLANS: AccountTypePlan[] = [
  {
    key: 'contractor',
    name: 'Contractor',
    nameEs: 'Contratista',
    price: '$97',
    period: '/mo',
    icon: '🏗️',
    highlight: true,
    features: [
      'Full access — all 3 bid tiers',
      'Unlimited estimates',
      'PDF + Word export',
      'Full CRM dashboard',
      'Client history & notes',
      'Custom branding on exports',
      'Change order tracking',
      'Job profitability analytics',
      'Client approval portal (e-sign)',
      'Priority support',
    ],
    featuresEs: [
      'Acceso completo — los 3 niveles',
      'Estimaciones ilimitadas',
      'PDF + Word',
      'CRM completo',
      'Historial y notas de clientes',
      'Marca personalizada en exportaciones',
      'Seguimiento de órdenes de cambio',
      'Análisis de rentabilidad',
      'Portal de aprobación del cliente',
      'Soporte prioritario',
    ],
  },
  {
    key: 'subcontractor',
    name: 'Sub-Contractor',
    nameEs: 'Sub-Contratista',
    price: '$67',
    period: '/mo',
    icon: '🔧',
    highlight: false,
    features: [
      'Sub-Contractor + Labor tiers',
      'Unlimited estimates',
      'PDF + Word export',
      'Full CRM dashboard',
      'Client history & notes',
      'Custom branding on exports',
      'Change order tracking',
      'Job profitability analytics',
      'Client approval portal (e-sign)',
      'Priority support',
    ],
    featuresEs: [
      'Niveles Sub-Contratista + Mano de Obra',
      'Estimaciones ilimitadas',
      'PDF + Word',
      'CRM completo',
      'Historial y notas de clientes',
      'Marca personalizada en exportaciones',
      'Seguimiento de órdenes de cambio',
      'Análisis de rentabilidad',
      'Portal de aprobación del cliente',
      'Soporte prioritario',
    ],
  },
  {
    key: 'labor-only',
    name: 'Labor Only',
    nameEs: 'Solo Mano de Obra',
    price: '$39',
    period: '/mo',
    icon: '👷',
    highlight: false,
    features: [
      'Labor-Only tier',
      'Optional materials section',
      'Unlimited estimates',
      'PDF + Word export',
      'Full CRM dashboard',
      'Client history & notes',
      'Custom branding on exports',
      'Change order tracking',
      'Job profitability analytics',
      'Client approval portal (e-sign)',
      'Priority support',
    ],
    featuresEs: [
      'Nivel Solo Mano de Obra',
      'Sección de materiales opcional',
      'Estimaciones ilimitadas',
      'PDF + Word',
      'CRM completo',
      'Historial y notas de clientes',
      'Marca personalizada en exportaciones',
      'Seguimiento de órdenes de cambio',
      'Análisis de rentabilidad',
      'Portal de aprobación del cliente',
      'Soporte prioritario',
    ],
  },
]

// Legacy export — kept for any code still referencing UPGRADE_PLANS
export const UPGRADE_PLANS = [
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$49',
    period: '/mo',
    features: [
      'Unlimited estimates',
      'PDF + Word export',
      'Full CRM dashboard',
      'Client history & notes',
      'Custom branding on exports',
      'Estimate email delivery',
      'Change order tracking',
    ],
    featuresEs: [
      'Estimaciones ilimitadas',
      'PDF + Word',
      'CRM completo',
      'Historial y notas de clientes',
      'Marca personalizada en exportaciones',
      'Envío de estimaciones por correo',
      'Seguimiento de órdenes de cambio',
    ],
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    price: '$95',
    period: '/mo',
    features: [
      'Everything in Pro',
      'Up to 3 team members',
      'Client approval portal (e-sign)',
      'Job profitability analytics',
      'Monthly revenue reports',
      'Automated follow-up reminders',
      'Priority support (24hr response)',
    ],
    featuresEs: [
      'Todo en Pro',
      'Hasta 3 miembros del equipo',
      'Portal de aprobación del cliente (firma)',
      'Análisis de rentabilidad por trabajo',
      'Reportes de ingresos mensuales',
      'Recordatorios automáticos de seguimiento',
      'Soporte prioritario (respuesta en 24h)',
    ],
  },
]
