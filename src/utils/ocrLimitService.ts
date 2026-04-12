import { supabase } from '../lib/supabase'

export interface HotelProfile {
  id: string
  trial_end: string | null
  subscription_status: 'active' | 'cancelled' | 'expired' | null
  ocr_scans_used: number
}

export async function getHotelProfile(userId: string): Promise<HotelProfile | null> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('id, trial_end, subscription_status, ocr_scans_used')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erreur récupération profil hôtel:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Erreur:', err)
    return null
  }
}

export async function canUseOCR(userId: string): Promise<{ canUse: boolean; reason?: string; scansUsed?: number; scansLimit?: number }> {
  const profile = await getHotelProfile(userId)
  
  if (!profile) {
    return { canUse: false, reason: 'Profil hôtel non trouvé' }
  }

  const now = new Date()
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null
  const isTrialActive = trialEnd && trialEnd > now
  const hasActiveSubscription = profile.subscription_status === 'active'

  // Si abonnement actif, OCR illimité
  if (hasActiveSubscription) {
    return { canUse: true }
  }

  // Si trial actif, vérifier la limite de 10 scans
  if (isTrialActive) {
    const scansUsed = profile.ocr_scans_used || 0
    const scansLimit = 10
    
    if (scansUsed >= scansLimit) {
      return { 
        canUse: false, 
        reason: '🔒 Vous avez utilisé vos 10 scans gratuits. Souscrivez à un forfait pour continuer à utiliser l\'OCR.',
        scansUsed,
        scansLimit
      }
    }
    
    return { canUse: true, scansUsed, scansLimit }
  }

  // Si pas de trial et pas d'abonnement
  return { 
    canUse: false, 
    reason: '⏰ Votre essai gratuit est terminé. Souscrivez à un forfait pour continuer.' 
  }
}

export async function incrementOCRScans(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_ocr_scans', { 
      user_id: userId 
    })

    if (error) {
      console.error('Erreur incrémentation scans OCR:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Erreur:', err)
    return false
  }
}

export function getTrialInfo(profile: HotelProfile | null): { 
  isActive: boolean; 
  daysRemaining: number; 
  scansUsed: number; 
  scansLimit: number 
} {
  if (!profile) {
    return { isActive: false, daysRemaining: 0, scansUsed: 0, scansLimit: 10 }
  }

  const now = new Date()
  const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null
  const isActive = !!(trialEnd && trialEnd > now)
  const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const scansUsed = profile.ocr_scans_used || 0
  const scansLimit = 10

  return { isActive, daysRemaining, scansUsed, scansLimit }
}
