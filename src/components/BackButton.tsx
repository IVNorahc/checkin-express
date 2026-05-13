import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const BackButton = () => {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="flex items-center gap-1 text-blue-600 font-medium py-2 mb-4"
    >
      <ChevronLeft size={20} />
      Retour
    </button>
  )
}

export default BackButton
