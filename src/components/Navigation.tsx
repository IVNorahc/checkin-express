import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'

interface NavigationProps {
  currentPage?: string
  onNavigate?: (page: string) => void
}

interface NavItem {
  to: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { to: 'dashboard', label: 'Accueil', icon: 'home' },
  { to: 'scan', label: 'Scanner', icon: 'camera' },
  { to: 'historique', label: 'Historique', icon: 'list' },
  { to: 'fiches', label: 'Fiches', icon: 'document' },
  { to: 'parametres', label: 'Paramètres', icon: 'settings' },
  { to: 'support', label: 'Support', icon: 'help' }
]

const icons: Record<string, ReactElement> = {
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  camera: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  list: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  document: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  help: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function Navigation({ currentPage = 'dashboard', onNavigate }: NavigationProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNavClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page)
    } else {
      // Fallback: utiliser window.location pour la navigation
      window.location.href = `/${page === 'dashboard' ? '' : page}`
    }
  }

  if (isMobile) {
    // Navigation mobile - barre en bas
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-50">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => handleNavClick(item.to)}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
              currentPage === item.to 
                ? 'text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="w-6 h-6">
              {icons[item.icon]}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    )
  }

  // Navigation desktop - sidebar à gauche
  return (
    <nav className="fixed left-0 top-0 h-screen w-56 bg-white shadow-lg flex flex-col p-4 z-50">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <img 
            src="/percepta-logo.png" 
            alt="Percepta"
            className="h-8 w-auto object-contain"
          />
          <span className="font-bold text-blue-800 text-sm">
            Check-in Express
          </span>
        </div>
      </div>

      <div className="flex-1">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => handleNavClick(item.to)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentPage === item.to 
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="w-5 h-5">
              {icons[item.icon]}
            </div>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={async () => {
            const { supabase } = await import('../lib/supabase')
            await supabase.auth.signOut()
            window.location.replace(window.location.origin + '/login')
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </nav>
  )
}
