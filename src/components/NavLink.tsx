import { useLocation } from 'react-router-dom'

interface NavLinkProps {
  to: string
  icon: string
  label: string
  isActive?: boolean
}

export default function NavLink({ to, icon, label, isActive }: NavLinkProps) {
  const location = useLocation()
  const active = isActive || location.pathname === to

  return (
    <a
      href={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  )
}
