import React from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
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
      {/* Overlay léger comme la page login */}
      <div className="min-h-screen w-full bg-blue-50/40">
        {children}
      </div>
    </div>
  )
}
