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
      {/* Header avec logo Percepta */}
      <header className="flex items-center justify-between px-4 py-3 w-full">
        <div className="flex items-center gap-2 bg-white/90 rounded-xl px-3 py-2 shadow-sm">
          <img 
            src="/percepta-logo.png" 
            alt="Percepta"
            className="h-9 w-auto object-contain"
          />
          <span className="font-bold text-blue-800 text-sm">
            Check-in Express
          </span>
        </div>
      </header>
      
      {/* Overlay léger comme la page login */}
      <div className="min-h-screen w-full bg-blue-50/40">
        {children}
      </div>
    </div>
  )
}
