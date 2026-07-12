interface Props {
  onConfirm: () => void
  onCancel: () => void
}

export default function LogoutConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🚪
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Déconnexion</h2>
          <p className="text-sm text-gray-500">Voulez-vous vraiment vous déconnecter ?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-[#1e3a8a] text-white rounded-xl text-sm font-semibold hover:bg-[#1e40af] transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
