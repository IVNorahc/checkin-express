import React from 'react'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
  showNavigation?: boolean
}

export default function Layout({ children, currentPage, onNavigate, showNavigation = false }: LayoutProps) {
  return (
    <div 
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: 'url(/hotel-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Navigation */}
      {showNavigation && (
        <Navigation currentPage={currentPage} onNavigate={onNavigate} />
      )}
      
      {/* Overlay léger comme la page login */}
      <div className={`min-h-screen w-full bg-blue-50/40 ${
        showNavigation ? 'md:ml-56' : ''
      }`}>
        {/* Padding pour mobile avec navigation en bas */}
        <div className={`${showNavigation ? 'pb-20 md:pb-0' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
