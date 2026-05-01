import React from 'react'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
  showBackButton?: boolean
  onBackClick?: () => void
}

export default function Layout({ children, showBackButton = false, onBackClick }: LayoutProps) {
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
      {/* Header global avec logo et déconnexion */}
      <Header showBackButton={showBackButton} onBackClick={onBackClick} />
      
      {/* Overlay léger comme la page login */}
      <div className="min-h-screen w-full bg-blue-50/40">
        {children}
      </div>
    </div>
  )
}
