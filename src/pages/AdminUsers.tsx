import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPlanDisplayName, getPlanColor, getRemainingScans } from '../utils/planFeatures';

interface Hotel {
  id: string;
  hotel_name: string;
  email: string;
  subscription_status: string;
  status: string;
  suspended_at?: string;
  suspended_reason?: string;
  created_at: string;
  user_created_at?: string;
  last_sign_in_at?: string;
  is_admin?: boolean;
  monthly_scan_counts?: { scan_count: number; month_year: string }[];
}

export const AdminUsers: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('hotels_with_email')
        .select(`
          id,
          hotel_name,
          email,
          subscription_status,
          status,
          suspended_at,
          suspended_reason,
          created_at,
          user_created_at,
          last_sign_in_at,
          is_admin,
          monthly_scan_counts (
            scan_count,
            month_year
          )
        `)
        .eq('is_admin', false) // Exclure les comptes admin
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setHotels(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleSuspend = async (hotelId: string) => {
    if (!confirm('Suspendre ce compte ?')) return;
    
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ 
          status: 'suspended',
          suspended_at: new Date().toISOString()
        })
        .eq('id', hotelId);

      if (error) throw error;
      fetchHotels();
    } catch (err) {
      alert('Erreur lors de la suspension: ' + (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  const handleDeactivate = async (hotelId: string) => {
    if (!confirm('Désactiver définitivement ce compte ?')) return;
    
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ status: 'disabled' })
        .eq('id', hotelId);

      if (error) throw error;
      fetchHotels();
    } catch (err) {
      alert('Erreur lors de la désactivation: ' + (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  const handleDelete = async (hotelId: string) => {
    if (!confirm('Supprimer définitivement ce compte et toutes ses données ?')) return;
    
    try {
      // Récupérer l'utilisateur associé
      const { data: hotel } = await supabase
        .from('hotels')
        .select('user_id')
        .eq('id', hotelId)
        .single();

      if (hotel?.user_id) {
        // Supprimer l'utilisateur auth
        await supabase.auth.admin.deleteUser(hotel.user_id);
      }

      // Supprimer l'hôtel
      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', hotelId);

      if (error) throw error;
      fetchHotels();
    } catch (err) {
      alert('Erreur lors de la suppression: ' + (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  const handleReactivate = async (hotelId: string) => {
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ 
          status: 'active', 
          suspended_at: null,
          suspended_reason: null
        })
        .eq('id', hotelId);

      if (error) throw error;
      fetchHotels();
    } catch (err) {
      alert('Erreur lors de la réactivation: ' + (err instanceof Error ? err.message : 'Erreur'));
    }
  };

  const getSubscriptionBadge = (status: string, createdAt: string) => {
    const color = getPlanColor(status);
    const daysSinceCreation = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const trialDaysRemaining = Math.max(0, 7 - daysSinceCreation);

    switch (status) {
      case 'trial':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800`}>
            Trial ({trialDaysRemaining} jours restants)
          </span>
        );
      case 'starter':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
            Starter
          </span>
        );
      case 'business':
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
            Business
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
            Expiré
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Actif
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Suspendu
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Désactivé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Inconnu
          </span>
        );
    }
  };

  const getMonthlyScans = (hotel: Hotel) => {
    if (!hotel.monthly_scan_counts || hotel.monthly_scan_counts.length === 0) {
      return 0;
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthData = hotel.monthly_scan_counts.find(
      count => count.month_year?.slice(0, 7) === currentMonth
    );
    
    return currentMonthData?.scan_count || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Erreur</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchHotels}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="mt-2 text-gray-600">Gérez les comptes hôtels et leurs abonnements</p>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Liste des comptes ({hotels.length})
              </h2>
              <button
                onClick={fetchHotels}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Actualiser
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hôtel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abonnement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scans ce mois
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hotel.hotel_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hotel.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSubscriptionBadge(hotel.subscription_status, hotel.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(hotel.status)}
                      {hotel.status === 'suspended' && hotel.suspended_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Depuis {new Date(hotel.suspended_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getMonthlyScans(hotel)} scans
                      </div>
                      <div className="text-xs text-gray-500">
                        {getRemainingScans(hotel.subscription_status, getMonthlyScans(hotel))} restants
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(hotel.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hotel.last_sign_in_at 
                        ? new Date(hotel.last_sign_in_at).toLocaleDateString('fr-FR') + ' ' + 
                          new Date(hotel.last_sign_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : 'Jamais'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {hotel.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleSuspend(hotel.id)}
                              className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600"
                            >
                              Suspendre
                            </button>
                            <button
                              onClick={() => handleDeactivate(hotel.id)}
                              className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                            >
                              Désactiver
                            </button>
                          </>
                        )}
                        
                        {hotel.status === 'suspended' && (
                          <button
                            onClick={() => handleReactivate(hotel.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                          >
                            Réactiver
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(hotel.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hotels.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">Aucun utilisateur trouvé</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
