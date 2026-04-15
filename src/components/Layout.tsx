import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div 
      className="min-h-screen w-full"
      style={{
        backgroundImage: 'url(/hotel-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* overlay semi-transparent pour lisibilité */}
      <div className="min-h-screen w-full bg-white/80 backdrop-blur-sm">
        {children}
      </div>
    </div>
  )
}
