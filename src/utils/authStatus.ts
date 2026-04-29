import { supabase } from '../lib/supabase';

export interface HotelStatus {
  status: 'active' | 'suspended' | 'disabled';
  suspended_at?: string;
  suspended_reason?: string;
}

export async function checkHotelStatus(userId: string): Promise<HotelStatus | null> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('status, suspended_at, suspended_reason')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error checking hotel status:', err);
    return null;
  }
}

export async function validateUserAccess(userId: string): Promise<{
  valid: boolean;
  error?: string;
  status?: HotelStatus;
}> {
  const status = await checkHotelStatus(userId);
  
  if (!status) {
    return {
      valid: false,
      error: 'Compte hôtel non trouvé. Veuillez contacter le support.'
    };
  }

  switch (status.status) {
    case 'suspended':
      return {
        valid: false,
        error: 'Votre compte est suspendu. Contactez support@percepta.io pour plus d\'informations.',
        status
      };
    
    case 'disabled':
      return {
        valid: false,
        error: 'Votre compte a été désactivé. Contactez support@percepta.io pour plus d\'informations.',
        status
      };
    
    case 'active':
      return {
        valid: true,
        status
      };
    
    default:
      return {
        valid: false,
        error: 'Statut de compte inconnu. Veuillez contacter le support.',
        status
      };
  }
}

export async function signOutUser() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out:', err);
  }
}
