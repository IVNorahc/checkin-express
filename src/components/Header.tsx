import { supabase } from '../lib/supabase'

interface HeaderProps {
  showBackButton?: boolean
  onBackClick?: () => void
}

export default function Header({ showBackButton = false, onBackClick }: HeaderProps) {
  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await supabase.auth.signOut()
      window.location.replace(window.location.origin + '/login')
    } catch (error) {
      console.error('Erreur déconnexion:', error)
      window.location.replace(window.location.origin + '/login')
    }
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 w-full">
      {/* Logo + nom */}
      <div className="flex items-center gap-2">
        {showBackButton && onBackClick && (
          <button
            onClick={onBackClick}
            type="button"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium transition-colors mr-3"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
            Retour
          </button>
        )}
        
        <div className="flex items-center gap-2 bg-white/90 rounded-xl px-3 py-2 shadow-sm">
          <img 
            src="/percepta-logo.png" 
            alt="Percepta"
            className="h-9 w-auto object-contain" 
          />
          <span className="font-bold text-blue-800 text-sm hidden sm:block">
            Check-in Express
          </span>
        </div>
      </div>

      {/* Bouton déconnexion */}
      <button
        onClick={handleSignOut}
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
      >
        Déconnexion
      </button>
    </header>
  )
}
