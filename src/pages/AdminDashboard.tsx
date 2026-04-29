import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  
  // KPIs
  const [totalHotels, setTotalHotels] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [todayScans, setTodayScans] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  
  // Graphiques
  const [dailyScansData, setDailyScansData] = useState<DailyScanData[]>([]);
  const [monthlyScansPerUser, setMonthlyScansPerUser] = useState<MonthlyScanData[]>([]);

  const fetchKPIs = async () => {
    try {
      // Total hôtels
      const { count: totalHotelsCount } = await supabase
        .from('hotels')
        .select('*', { count: 'exact', head: true });

      // Abonnés actifs (non-trial)
      const { count: activeCount } = await supabase
        .from('hotels')
        .select('*', { count: 'exact', head: true })
        .in('subscription_status', ['starter', 'business'])
        .eq('status', 'active');

      // Scans aujourd'hui
      const today = new Date().toISOString().slice(0, 10);
      const { count: todayScansCount } = await supabase
        .from('scan_history')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Revenus mensuels
      const { data: revenueData } = await supabase
        .from('hotels')
        .select('subscription_status')
        .in('subscription_status', ['starter', 'business'])
        .eq('status', 'active');

      const revenue = (revenueData?.filter(h => h.subscription_status === 'starter').length || 0) * 49.99 +
                      (revenueData?.filter(h => h.subscription_status === 'business').length || 0) * 89.99;

      setTotalHotels(totalHotelsCount || 0);
      setActiveSubscriptions(activeCount || 0);
      setTodayScans(todayScansCount || 0);
      setMonthlyRevenue(revenue);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchDailyScansData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('scan_history')
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
      
      let query = supabase
        .from('monthly_scan_counts')
        .select(`
          scan_count,
          hotel_id,
          hotels!inner (
            hotel_name
          )
        `)
        .eq('month_year', currentMonth)
        .order('scan_count', { ascending: false });

      if (selectedHotel !== 'all') {
        query = query.eq('hotel_id', selectedHotel);
      }

      const { data } = await query;

      if (data) {
        const chartData = data.map((item: any) => ({
          hotel_name: item.hotels.hotel_name,
          scans: item.scan_count
        }));
        setMonthlyScansPerUser(chartData);
      }
    } catch (err) {
      console.error('Error fetching monthly scans per user:', err);
    }
  };

  const fetchHotels = async () => {
    try {
      const { data } = await supabase
        .from('hotels')
        .select('id, hotel_name')
        .eq('status', 'active')
        .order('hotel_name');

      setHotels(data || []);
    } catch (err) {
      console.error('Error fetching hotels:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKPIs(),
        fetchDailyScansData(),
        fetchMonthlyScansPerUser(),
        fetchHotels()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            value={totalHotels} 
            icon="{'\ud83c\udfe8'}" 
            color="blue" 
            loading={loading}
          />
          <KPICard 
            title="Abonnés actifs" 
            value={activeSubscriptions} 
            icon="{'\u2705'}" 
            color="green" 
            loading={loading}
          />
          <KPICard 
            title="Scans aujourd'hui" 
            value={todayScans} 
            icon="{'\ud83d\udcf8'}" 
            color="purple" 
            loading={loading}
          />
          <KPICard 
            title="Revenus/mois" 
            value={`${monthlyRevenue.toFixed(2)}{'\u20ac'}`} 
            icon="{'\ud83d\udcb0'}" 
            color="yellow" 
            loading={loading}
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Graphique 1 - Scans par jour */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Scans par jour (30 derniers jours)
            </h3>
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
                  stroke="#3B82F6" 
                  name="Scans" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique 2 - Scans par utilisateur */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Scans ce mois par hôtel
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyScansPerUser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hotel_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="scans" 
                  fill="#3B82F6" 
                  name="Scans ce mois"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 text-center"
            >
              Gérer les utilisateurs
            </button>
            <button
              onClick={() => window.location.href = '/admin/analytics'}
              className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 text-center"
            >
              Analytics détaillés
            </button>
            <button
              onClick={() => window.location.href = '/admin/settings'}
              className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 text-center"
            >
              Paramètres système
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
