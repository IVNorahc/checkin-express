export const PLAN_LIMITS = {
  trial: {
    scansPerMonth: 10,
    historyLimit: 10,
    hasStats: false,
    hasPrioritySupport: false,
    hasExport: false,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0.25,
  },
  starter: {
    scansPerMonth: 200,
    historyLimit: 50,
    hasStats: false,
    hasPrioritySupport: false,
    hasExport: false,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0.25,
  },
  business: {
    scansPerMonth: 500,
    historyLimit: Infinity,
    hasStats: true,
    hasPrioritySupport: true,
    hasExport: true,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0.25,
  }
}

export function getPlanLimits(status: string) {
  return PLAN_LIMITS[status as keyof typeof PLAN_LIMITS] 
    || PLAN_LIMITS.trial
}

export function canAccessFeature(status: string, feature: keyof typeof PLAN_LIMITS.trial) {
  const limits = getPlanLimits(status)
  return limits[feature] === true || limits[feature] === Infinity
}

export function getRemainingScans(status: string, usedScans: number) {
  const limits = getPlanLimits(status)
  return Math.max(0, limits.scansPerMonth - usedScans)
}

export function isScanLimitReached(status: string, usedScans: number) {
  const limits = getPlanLimits(status)
  return usedScans >= limits.scansPerMonth
}

export function getPlanDisplayName(status: string) {
  switch (status) {
    case 'trial': return 'Trial'
    case 'starter': return 'Starter'
    case 'business': return 'Business'
    default: return 'Inconnu'
  }
}

export function getPlanColor(status: string) {
  switch (status) {
    case 'trial': return 'yellow'
    case 'starter': return 'green'
    case 'business': return 'blue'
    default: return 'gray'
  }
}

export function getPlanPrice(status: string) {
  switch (status) {
    case 'trial': return '0'
    case 'starter': return '49,99'
    case 'business': return '89,99'
    default: return '0'
  }
}
