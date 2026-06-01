import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (!sessionData.session) {
          setHasAccess(false)
          setIsLoading(false)
          return
        }

        // Check if user is admin (admins bypass subscription check)
        const isAdmin = sessionData.session.user?.user_metadata?.is_admin === true
        if (isAdmin) {
          setHasAccess(true)
          setIsLoading(false)
          return
        }

        // Get hotel subscription data
        const { data: hotelData, error } = await supabase
          .from('hotels')
          .select('subscription_status, trial_end')
          .eq('user_id', sessionData.session.user.id)
          .single()

        if (error || !hotelData) {
          setHasAccess(false)
          setIsLoading(false)
          return
        }

        // Check subscription status
        const trialExpired = hotelData.trial_end && new Date(hotelData.trial_end) < new Date()
        const isActive = hotelData.subscription_status === 'active'
        const isTrial = hotelData.subscription_status === 'trial' && !trialExpired

        const accessGranted = isActive || isTrial
        setHasAccess(accessGranted)
        
      } catch (error) {
        console.error('Error checking subscription:', error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkSubscription()
  }, [])

  // Show loading spinner while checking
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#e8f4fd",
        backgroundImage: "url('/hotel-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "20px",
          padding: "48px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #bfdbfe",
            borderTop: "4px solid #1e3a8a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
        </div>
      </div>
    )
  }

  // Redirect to subscription page if no access
  if (!hasAccess) {
    window.location.replace(window.location.origin + '/subscribe')
    return null
  }

  // Allow access
  return <>{children}</>
}
