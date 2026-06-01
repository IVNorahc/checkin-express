export const PLAN_LIMITS = {
  trial: {
    scansPerMonth: Infinity, // accès complet pendant les 7 jours
    historyLimit: Infinity,
    hasStats: true,
    hasPrioritySupport: false,
    hasExport: true,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0,
  },
  starter: {
    scansPerMonth: 500,
    historyLimit: 50,
    hasStats: false,
    hasPrioritySupport: false,
    hasExport: false,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0.25,
  },
  business: {
    scansPerMonth: Infinity, // illimité
    historyLimit: Infinity,
    hasStats: true,
    hasPrioritySupport: true,
    hasExport: true,
    hasPdfGeneration: true,
    hasElectronicSignature: true,
    pricePerExtraScan: 0,
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

/** Vrai quand un Starter a consommé >= 80 % de son quota mensuel. */
export function isNearQuota(status: string, usedScans: number): boolean {
  if (status !== 'starter') return false
  return usedScans >= PLAN_LIMITS.starter.scansPerMonth * 0.8
}

/** Retourne le libellé du quota pour l'affichage dans le dashboard. */
export function getQuotaLabel(status: string, usedScans: number): string {
  if (status === 'business') return 'Scans illimités'
  if (status === 'trial')    return 'Scans illimités (pendant le trial)'
  const limit = PLAN_LIMITS.starter.scansPerMonth
  return `${usedScans} / ${limit} scans utilisés`
}
