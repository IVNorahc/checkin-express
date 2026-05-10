import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, Users, Camera, TrendingUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

// Icônes Lucide React pour chaque KPI
const HotelIcon = () => <Building2 className="w-5 h-5 text-white" />;
const UsersIcon = () => <Users className="w-5 h-5 text-white" />;
const ScanIcon = () => <Camera className="w-5 h-5 text-white" />;
const RevenueIcon = () => <TrendingUp className="w-5 h-5 text-white" />;

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, loading = false }) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'purple':
        return 'bg-purple-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBgColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200';
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'purple':
        return 'bg-purple-50 border-purple-200';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'purple':
        return 'text-purple-600';
      case 'yellow':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 border ${getBgColorClasses(color)}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${getTextColorClasses(color)}`}>{value}</p>
        </div>
        <div className={`text-2xl ${getColorClasses(color)} bg-white rounded-full p-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface Hotel {
  id: string;
  hotel_name: string;
}

interface DailyScanData {
  date: string;
  scans: number;
}

interface MonthlyScanData {
  hotel_name: string;
  scans: number;
}

export const AdminDashboard: React.FC = () => {
  console.log('ADMIN DASHBOARD MOUNTED')
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    trial: 0,
    active: 0,
    expired: 0
  });
  
  // KPIs
  const [totalHotels, setTotalHotels] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [todayScans, setTodayScans] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState('€0');
  
  // Graphiques
  const [dailyScansData, setDailyScansData] = useState<DailyScanData[]>([]);
  const [monthlyScansPerUser, setMonthlyScansPerUser] = useState<MonthlyScanData[]>([]);

  // Modales
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [supportEmail, setSupportEmail] = useState('support@percepta.tech');
  const [supportWhatsApp, setSupportWhatsApp] = useState('+33612345678');
  const [defaultTrialDays, setDefaultTrialDays] = useState(30);

  const exportToCSV = () => {
    // Créer les en-têtes CSV
    const headers = [
      'Hôtel',
      'Email',
      'Abonnement',
      'Statut',
      'Créé le',
      'Fin essai',
      'Scans'
    ];
    
    // Créer les données CSV
    const csvData = hotels.map((hotel: any) => [
      hotel.hotel_name || 'Non spécifié',
      hotel.email || 'N/A',
      hotel.subscription_status === 'trial' ? 'Trial' :
      hotel.subscription_status === 'starter' ? 'Starter' :
      hotel.subscription_status === 'business' ? 'Business' :
      'Expiré',
      hotel.status === 'active' ? 'Actif' :
      hotel.status === 'suspended' ? 'Suspendu' :
      hotel.status === 'disabled' ? 'Désactivé' :
      'Inconnu',
      hotel.created_at ? new Date(hotel.created_at).toLocaleDateString('fr-FR') : '-',
      hotel.trial_end ? new Date(hotel.trial_end).toLocaleDateString('fr-FR') : '-',
      hotel.ocr_scans_used || 0
    ]);
    
    // Créer le contenu CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Générer le nom de fichier avec la date
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `checkin-express-users-${today}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchKPIs = async () => {
    try {
      // Total hôtels
      const { count: totalHotels } = await supabaseAdmin
        .from('hotels')
        .select('*', { count: 'exact', head: true });

      // Abonnés actifs
      const { count: activeSubscriptions } = await supabaseAdmin
        .from('hotels')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Scans aujourd'hui (depuis la table clients)
      const today = new Date().toISOString().slice(0, 10);
      const { count: todayScans } = await supabaseAdmin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Revenus mensuels (simulation: 29€ par abonné actif)
      const monthlyRevenue = activeSubscriptions ? activeSubscriptions * 29 : 0;

      setTotalHotels(totalHotels || 0);
      setActiveSubscriptions(activeSubscriptions || 0);
      setTodayScans(todayScans || 0);
      setMonthlyRevenue(`€${monthlyRevenue}`);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchDailyScansData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabaseAdmin
        .from('clients')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (selectedHotel !== 'all') {
        query = query.eq('hotel_id', selectedHotel);
      }

      const { data } = await query;

      if (data) {
        const groupedData = data.reduce((acc: Record<string, number>, scan) => {
          const date = new Date(scan.created_at).toISOString().slice(0, 10);
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(groupedData).map(([date, scans]) => ({
          date: new Date(date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          scans
        }));

        setDailyScansData(chartData);
      }
    } catch (err) {
      console.error('Error fetching daily scans:', err);
    }
  };

  const fetchMonthlyScansPerUser = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthStart = new Date(currentMonth + '-01').toISOString();
      const monthEnd = new Date(currentMonth + '-31').toISOString();
      
      // Calculer les scans mensuels depuis la table clients
      let query = supabaseAdmin
        .from('clients')
        .select(`
          hotel_id,
          hotels!inner (
            hotel_name
          )
        `)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .order('created_at', { ascending: false });

      if (selectedHotel !== 'all') {
        query = query.eq('hotel_id', selectedHotel);
      }

      const { data } = await query;

      if (data) {
        // Grouper par hôtel et compter les scans
        const groupedData = data.reduce((acc: Record<string, { hotel_name: string; scans: number }>, item: any) => {
          const hotelId = item.hotel_id;
          const hotelName = item.hotels?.hotel_name || 'Hôtel inconnu';
          
          if (!acc[hotelId]) {
            acc[hotelId] = { hotel_name: hotelName, scans: 0 };
          }
          acc[hotelId].scans += 1;
          return acc;
        }, {});

        const chartData = Object.values(groupedData)
          .sort((a, b) => b.scans - a.scans)
          .slice(0, 10); // Top 10
          
        setMonthlyScansPerUser(chartData);
      }
    } catch (err) {
      console.error('Error fetching monthly scans per user:', err);
    }
  };

  const loadUsers = async () => {
  // Requête 1 : hotels seuls, sans jointure
  const { data: hotelsData, error: hotelsError } = await supabaseAdmin
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('HOTELS:', hotelsData, hotelsError)

  // Requête 2 : profiles seuls, sans jointure
  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('*')

  console.log('PROFILES:', profilesData, profilesError)

  if (hotelsData) {
    const merged = hotelsData.map(hotel => ({
      ...hotel,
      email: profilesData?.find(p => p.id === hotel.user_id)?.email || 'N/A'
    }))
    setHotels(merged)
    
    // Calculer les stats
    const total = merged.length
    const active = merged.filter((h: any) => 
      h.subscription_status === 'active').length
    const trial = merged.filter((h: any) => 
      h.subscription_status === 'trial').length
    
    // Un hôtel est expiré si trial_end < maintenant ET status = trial
    const now = new Date()
    const expired = merged.filter((h: any) => 
      h.subscription_status === 'trial' && 
      new Date(h.trial_end) < now).length

    setStats({ total, trial: trial - expired, active, expired })
  }
}

const handleReactivate = async (hotelId: string) => {
  console.log('Tentative de réactivation pour hotelId:', hotelId)
  
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 30)
  
  const { data, error } = await supabaseAdmin
    .from('hotels')
    .update({ 
      subscription_status: 'active',
      trial_end: trialEnd.toISOString()
    })
    .eq('id', hotelId)
  
  console.log('Réactiver result - Data:', JSON.stringify(data))
  console.log('Réactiver result - Error:', JSON.stringify(error))
  
  if (error) {
    alert('Erreur lors de la réactivation: ' + error.message)
    return
  }
  
  alert('Compte réactivé pour 30 jours !')
  loadUsers()
}

const handleAction = async (hotelId: string, newStatus: string) => {
  console.log('Tentative d\'action pour hotelId:', hotelId, 'newStatus:', newStatus)
  
  const messages: any = {
    suspended: 'Suspendre ce compte ?',
    inactive: 'Désactiver définitivement ce compte ?',
    active: 'Réactiver ce compte ?'
  }
  
  if (!confirm(messages[newStatus])) return
  
  const updateData: any = { subscription_status: newStatus }
  
  if (newStatus === 'active') {
    const newTrialEnd = new Date()
    newTrialEnd.setDate(newTrialEnd.getDate() + 30)
    updateData.subscription_status = 'trial'
    updateData.trial_end = newTrialEnd.toISOString()
  }
  
  const { data, error } = await supabaseAdmin
    .from('hotels')
    .update(updateData)
    .eq('id', hotelId)
  
  console.log('Action result - Data:', JSON.stringify(data))
  console.log('Action result - Error:', JSON.stringify(error))
  
  if (error) {
    alert('Erreur lors de l\'action: ' + error.message)
    return
  }
  
  loadUsers()
}

const handleDelete = async (hotelId: string) => {
  console.log('Tentative de suppression pour hotelId:', hotelId)
  
  if (!confirm('ATTENTION : Supprimer définitivement ce compte et toutes ses données ?')) return
  
  const { data, error } = await supabaseAdmin
    .from('hotels')
    .delete()
    .eq('id', hotelId)
  
  console.log('Supprimer result - Data:', JSON.stringify(data))
  console.log('Supprimer result - Error:', JSON.stringify(error))
  
  if (error) {
    alert('Erreur lors de la suppression: ' + error.message)
    return
  }
  
  alert('Compte supprimé avec succès !')
  loadUsers()
}

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIs(),
        fetchDailyScansData(),
        fetchMonthlyScansPerUser(),
        loadUsers()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('SERVICE KEY existe:', !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
    loadUsers()
  }, [])

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchDailyScansData();
      fetchMonthlyScansPerUser();
    }
  }, [selectedHotel, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
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
            onClick={fetchAllData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="min-h-screen bg-white/80">
        
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3"
          style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/90 rounded-xl p-2">
              <img src="/percepta-logo.png" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Admin — Check-in Express</h1>
              <p className="text-blue-200 text-xs">Gestion des utilisateurs et KPIs</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await supabaseAdmin.auth.signOut()
              window.location.replace(window.location.origin + '/login')
            }}
            className="bg-white/20 hover:bg-white/30 text-white 
                       border border-white/30 px-4 py-2 rounded-lg text-sm"
          >
            Déconnexion
          </button>
        </header>

        {/* CONTENU */}
        <div className="p-6">
          
          {/* Bouton retour */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-blue-700 
                       hover:text-blue-900 font-medium mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" 
                    strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
                  <p className="mt-2 text-gray-600">Vue d'ensemble de l'activité</p>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedHotel}
                    onChange={(e) => setSelectedHotel(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tous les hôtels</option>
                    {hotels.map(h => (
                      <option key={h.id} value={h.id}>{h.hotel_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={fetchAllData}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Actualiser
                  </button>
                </div>
              </div>
            </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard 
            title="Total hôtels" 
            value={hotels.length} 
            icon={<HotelIcon />} 
            color="bg-blue-500" 
            loading={loading}
          />
          <KPICard 
            title="Abonnés actifs" 
            value={activeSubscriptions} 
            icon={<UsersIcon />} 
            color="bg-green-500" 
            loading={loading}
          />
          <KPICard 
            title="Scans aujourd'hui" 
            value={todayScans} 
            icon={<ScanIcon />} 
            color="bg-yellow-500" 
            loading={loading}
          />
          <KPICard 
            title="Revenus/mois" 
            value={monthlyRevenue} 
            icon={<RevenueIcon />} 
            color="bg-purple-500" 
            loading={loading}
          />
        </div>

        {/* Actions rapides */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <button
              onClick={exportToCSV}
              className="w-full md:w-auto bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 text-center"
            >
              Exporter CSV
            </button>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="w-full md:w-auto bg-blue-700 text-white px-4 py-3 rounded-lg hover:bg-blue-800 text-center"
            >
              Analyses détaillées
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full md:w-auto bg-blue-800 text-white px-4 py-3 rounded-lg hover:bg-blue-900 text-center"
            >
              Paramètres système
            </button>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <div id="liste-users" className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Liste des utilisateurs ({hotels.length})
              </h2>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">
                  Total: {stats.total}
                </span>
                <span className="text-green-600">
                  Actifs: {stats.active}
                </span>
                <span className="text-yellow-600">
                  Trial: {stats.trial}
                </span>
                <span className="text-red-600">
                  Expirés: {stats.expired}
                </span>
              </div>
            </div>
          </div>

          {/* Version Desktop - Tableau */}
          <div className="hidden md:block overflow-x-auto">
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
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin essai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hotels.map((hotel: any) => (
                  <tr key={hotel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {hotel.hotel_name || 'Non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hotel.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        hotel.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        hotel.subscription_status === 'starter' ? 'bg-green-100 text-green-800' :
                        hotel.subscription_status === 'business' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {hotel.subscription_status === 'trial' ? 'Trial' :
                         hotel.subscription_status === 'starter' ? 'Starter' :
                         hotel.subscription_status === 'business' ? 'Business' :
                         'Expiré'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                        hotel.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        hotel.status === 'disabled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {hotel.status === 'active' ? 'Actif' :
                         hotel.status === 'suspended' ? 'Suspendu' :
                         hotel.status === 'disabled' ? 'Désactivé' :
                         'Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(hotel.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hotel.trial_end ? new Date(hotel.trial_end).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hotel.ocr_scans_used || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2 flex-wrap">
                        {/* Suspendre/Désactiver ou Réactiver */}
                        {(hotel.subscription_status === 'suspended' || 
                          hotel.subscription_status === 'inactive' || 
                          (hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < new Date())) ? (
                          <button
                            onClick={() => handleAction(hotel.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white 
                                       px-2 py-1 rounded text-xs font-medium"
                          >
                            Réactiver
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAction(hotel.id, 'suspended')}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white 
                                         px-2 py-1 rounded text-xs font-medium"
                            >
                              Suspendre
                            </button>
                            <button
                              onClick={() => handleAction(hotel.id, 'inactive')}
                              className="bg-orange-500 hover:bg-orange-600 text-white 
                                         px-2 py-1 rounded text-xs font-medium"
                            >
                              Désactiver
                            </button>
                          </>
                        )}
                        
                        {/* Supprimer */}
                        <button
                          onClick={() => handleDelete(hotel.id)}
                          className="bg-red-600 hover:bg-red-700 text-white 
                                     px-2 py-1 rounded text-xs font-medium"
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

          {/* Version Mobile - Cartes */}
          <div className="block md:hidden space-y-4">
            {hotels.map((hotel: any) => (
              <div key={hotel.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {/* Nom hôtel en titre */}
                <h3 className="font-semibold text-gray-900 mb-3">
                  {hotel.hotel_name || 'Non spécifié'}
                </h3>
                
                {/* Informations */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm text-gray-900">{hotel.email}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Abonnement:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      hotel.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                      hotel.subscription_status === 'starter' ? 'bg-green-100 text-green-800' :
                      hotel.subscription_status === 'business' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {hotel.subscription_status === 'trial' ? 'Trial' :
                       hotel.subscription_status === 'starter' ? 'Starter' :
                       hotel.subscription_status === 'business' ? 'Business' :
                       'Expiré'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Statut:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      hotel.status === 'active' ? 'bg-green-100 text-green-800' :
                      hotel.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      hotel.status === 'disabled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {hotel.status === 'active' ? 'Actif' :
                       hotel.status === 'suspended' ? 'Suspendu' :
                       hotel.status === 'disabled' ? 'Désactivé' :
                       'Inconnu'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fin essai:</span>
                    <span className="text-sm text-gray-900">
                      {hotel.trial_end ? new Date(hotel.trial_end).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                </div>
                
                {/* Boutons d'action */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                  {/* Suspendre/Désactiver ou Réactiver */}
                  {(hotel.subscription_status === 'suspended' || 
                    hotel.subscription_status === 'inactive' || 
                    (hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < new Date())) ? (
                    <button
                      onClick={() => handleAction(hotel.id, 'active')}
                      className="bg-green-600 hover:bg-green-700 text-white 
                                 px-3 py-2 rounded text-xs font-medium flex-1"
                    >
                      Réactiver
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(hotel.id, 'suspended')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white 
                                   px-3 py-2 rounded text-xs font-medium flex-1"
                      >
                        Suspendre
                      </button>
                      <button
                        onClick={() => handleAction(hotel.id, 'inactive')}
                        className="bg-orange-500 hover:bg-orange-600 text-white 
                                   px-3 py-2 rounded text-xs font-medium flex-1"
                      >
                        Désactiver
                      </button>
                    </>
                  )}
                  
                  {/* Supprimer */}
                  <button
                    onClick={() => handleDelete(hotel.id)}
                    className="bg-red-600 hover:bg-red-700 text-white 
                               px-3 py-2 rounded text-xs font-medium flex-1"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            
            {hotels.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">Aucun utilisateur trouvé</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Modale Analyses détaillées */}
    {showAnalyticsModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analyses détaillées</h2>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Graphique scans/jour */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Scans par jour (30 derniers jours)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {dailyScansData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyScansData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="scans" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Scans"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune donnée de scans disponible
                  </div>
                )}
              </div>
            </div>

            {/* Graphique scans par hôtel */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Scans par hôtel (ce mois)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {monthlyScansPerUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyScansPerUser}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hotel_name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="scans" 
                        fill="#10b981"
                        name="Scans"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune donnée de scans par hôtel disponible
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Modale Paramètres système */}
    {showSettingsModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Paramètres système</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Email support */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email support
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="support@percepta.tech"
                />
              </div>

              {/* WhatsApp support */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp support
                </label>
                <input
                  type="tel"
                  value={supportWhatsApp}
                  onChange={(e) => setSupportWhatsApp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+33612345678"
                />
              </div>

              {/* Durée trial par défaut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée trial par défaut (jours)
                </label>
                <input
                  type="number"
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="365"
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    // Sauvegarder les paramètres (à implémenter)
                    alert('Paramètres sauvegardés avec succès !');
                    setShowSettingsModal(false);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  </div>
  );
};

export default AdminDashboard;
