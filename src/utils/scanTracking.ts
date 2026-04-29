import { supabase } from '../lib/supabase';

export interface ScanRecord {
  hotel_id: string;
  document_type: string;
  success: boolean;
  ocr_data?: any;
  processing_time_ms?: number;
  error_message?: string;
}

export async function recordScan(scanData: ScanRecord): Promise<void> {
  try {
    const { error } = await supabase
      .from('scan_history')
      .insert({
        hotel_id: scanData.hotel_id,
        document_type: scanData.document_type,
        success: scanData.success,
        ocr_data: scanData.ocr_data,
        processing_time_ms: scanData.processing_time_ms,
        error_message: scanData.error_message
      });

    if (error) {
      console.error('Error recording scan:', error);
      // Ne pas lancer d'erreur pour ne pas bloquer le processus principal
    }
  } catch (err) {
    console.error('Error in recordScan:', err);
  }
}

export async function getMonthlyScanCount(hotelId: string): Promise<number> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const { data, error } = await supabase
      .from('monthly_scan_counts')
      .select('scan_count')
      .eq('hotel_id', hotelId)
      .eq('month_year', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data?.scan_count || 0;
  } catch (err) {
    console.error('Error getting monthly scan count:', err);
    return 0;
  }
}

export async function getTodayScanCount(hotelId: string): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    const { count, error } = await supabase
      .from('scan_history')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .gte('created_at', today);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error('Error getting today scan count:', err);
    return 0;
  }
}

export async function getScanHistory(hotelId: string, limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error getting scan history:', err);
    return [];
  }
}
