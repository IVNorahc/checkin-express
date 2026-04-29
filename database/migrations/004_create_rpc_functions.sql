-- Créer la fonction RPC get_all_hotels_admin
CREATE OR REPLACE FUNCTION get_all_hotels_admin()
RETURNS TABLE (
  id UUID,
  hotel_name TEXT,
  email TEXT,
  subscription_status TEXT,
  status TEXT,
  suspended_at TIMESTAMP,
  suspended_reason TEXT,
  created_at TIMESTAMP,
  user_created_at TIMESTAMP,
  last_sign_in_at TIMESTAMP,
  is_admin BOOLEAN,
  monthly_scan_counts JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retourner tous les hôtels sauf l'admin
  RETURN QUERY
  SELECT 
    h.id,
    h.hotel_name,
    h.email,
    h.subscription_status,
    h.status,
    h.suspended_at,
    h.suspended_reason,
    h.created_at,
    u.created_at as user_created_at,
    u.last_sign_in_at,
    h.is_admin,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'scan_count', msc.scan_count,
          'month_year', msc.month_year
        )
      ) FILTER (WHERE msc.scan_count IS NOT NULL),
      '[]'::json
    ) as monthly_scan_counts
  FROM public.hotels h
  JOIN auth.users u ON h.user_id = u.id
  LEFT JOIN public.monthly_scan_counts msc ON h.id = msc.hotel_id
  WHERE h.email != 'muhammadsamb@gmail.com'
  GROUP BY 
    h.id, h.hotel_name, h.email, h.subscription_status, h.status, 
    h.suspended_at, h.suspended_reason, h.created_at, 
    u.created_at, u.last_sign_in_at, h.is_admin
  ORDER BY h.created_at DESC;
  
  RETURN;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_all_hotels_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_hotels_admin() TO service_role;

-- Créer une fonction RPC pour les KPIs du dashboard
CREATE OR REPLACE FUNCTION get_admin_kpis()
RETURNS TABLE (
  total_hotels BIGINT,
  active_subscriptions BIGINT,
  today_scans BIGINT,
  monthly_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  revenue NUMERIC := 0;
BEGIN
  -- Total hôtels (excluant admin)
  SELECT COUNT(*) INTO total_hotels
  FROM public.hotels 
  WHERE email != 'muhammamsamb@gmail.com';
  
  -- Abonnés actifs (excluant admin)
  SELECT COUNT(*) INTO active_subscriptions
  FROM public.hotels 
  WHERE email != 'muhammamsamb@gmail.com'
    AND subscription_status IN ('starter', 'business')
    AND status = 'active';
  
  -- Scans aujourd'hui
  SELECT COUNT(*) INTO today_scans
  FROM public.scan_history sh
  JOIN public.hotels h ON sh.hotel_id = h.id
  WHERE DATE(sh.created_at) = CURRENT_DATE
    AND h.email != 'muhammamsamb@gmail.com';
  
  -- Revenus mensuels (excluant admin)
  SELECT 
    (COUNT(*) FILTER (WHERE subscription_status = 'starter') * 49.99) +
    (COUNT(*) FILTER (WHERE subscription_status = 'business') * 89.99)
  INTO revenue
  FROM public.hotels 
  WHERE email != 'muhammamsamb@gmail.com'
    AND subscription_status IN ('starter', 'business')
    AND status = 'active';
  
  monthly_revenue := COALESCE(revenue, 0);
  
  RETURN NEXT;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_admin_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_kpis() TO service_role;

-- Créer une fonction RPC pour les données de graphiques
CREATE OR REPLACE FUNCTION get_dashboard_charts(selected_hotel UUID DEFAULT NULL)
RETURNS TABLE (
  daily_scans JSON,
  monthly_scans_per_user JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_data JSON;
  monthly_data JSON;
BEGIN
  -- Données quotidiennes des 30 derniers jours
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'date', TO_CHAR(created_at, 'DD/MM'),
      'scans', scan_count
    ) ORDER BY created_at
  ) INTO daily_data
  FROM (
    SELECT 
      DATE(created_at) as created_at,
      COUNT(*) as scan_count
    FROM public.scan_history sh
    JOIN public.hotels h ON sh.hotel_id = h.id
    WHERE sh.created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND h.email != 'muhammamsamb@gmail.com'
      AND (selected_hotel IS NULL OR sh.hotel_id = selected_hotel)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  ) daily_counts;
  
  -- Données mensuelles par utilisateur
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'hotel_name', hotel_name,
      'scans', scan_count
    ) ORDER BY scan_count DESC
  ) INTO monthly_data
  FROM (
    SELECT 
      h.hotel_name,
      COALESCE(msc.scan_count, 0) as scan_count
    FROM public.hotels h
    LEFT JOIN public.monthly_scan_counts msc ON h.id = msc.hotel_id 
      AND msc.month_year = DATE_TRUNC('month', CURRENT_DATE)
    WHERE h.email != 'muhammamsamb@gmail.com'
      AND h.status = 'active'
      AND (selected_hotel IS NULL OR h.id = selected_hotel)
    ORDER BY scan_count DESC
    LIMIT 20
  ) monthly_counts;
  
  RETURN NEXT;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_dashboard_charts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_charts(UUID) TO service_role;
