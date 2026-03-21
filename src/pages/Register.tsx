import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type RegisterProps = {
  onLoginClick: () => void
  onSubscribe: () => void
}

export default function Register({ onLoginClick, onSubscribe }: RegisterProps) {
  const [hotelName, setHotelName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [country, setCountry] = useState('France')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback(null)

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }

    if (password.length < 8) {
      setFeedback({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          hotel_name: hotelName,
          country,
        },
      },
    })
    setIsLoading(false)

    if (error) {
      setFeedback({ type: 'error', text: error.message })
      return
    }

    setFeedback({ type: 'success', text: 'Compte créé avec succès ! 🎉\nRedirection vers les abonnements...' })
    
    // Rediriger vers Subscribe après 2 secondes
    setTimeout(() => {
      onSubscribe()
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md mx-4 sm:mx-auto bg-white shadow-md rounded-xl p-6 sm:p-8 border border-[#e2e8f0]">
        <h1 className="text-center text-[#1e3a8a] font-bold text-2xl sm:text-3xl">
          🏨 Check-in Express
        </h1>
        <p className="mt-1 text-center text-[#64748b] text-sm sm:text-base">
          Créer votre compte hôtel
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="sr-only" htmlFor="hotelName">
              Nom de l&apos;hôtel
            </label>
            <input
              id="hotelName"
              type="text"
              placeholder="Nom de votre hôtel"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b] placeholder-[#94a3b8]"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email professionnel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b] placeholder-[#94a3b8]"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              placeholder="Mot de passe (min. 8 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b] placeholder-[#94a3b8]"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="confirmPassword">
              Confirmation mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b] placeholder-[#94a3b8]"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="country">
              Pays
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b]"
            >
              <option value="France">France</option>
              <option value="Allemagne">Allemagne</option>
              <option value="Italie">Italie</option>
              <option value="Espagne">Espagne</option>
              <option value="Belgique">Belgique</option>
              <option value="Suisse">Suisse</option>
              <option value="Maroc">Maroc</option>
              <option value="Sénégal">Sénégal</option>
              <option value="Tunisie">Tunisie</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 sm:h-12 bg-[#1e3a8a] text-white rounded-lg
              hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 text-base sm:text-sm font-semibold"
          >
            {isLoading ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Création...
              </>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        {feedback && (
          <p
            className={`mt-4 text-sm sm:text-base text-center ${
              feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className="mt-4 text-center">
          <a
            href="#"
            className="text-sm sm:text-base font-medium text-[#1e3a8a] hover:text-[#1e40af]"
            onClick={(e) => {
              e.preventDefault()
              onLoginClick()
            }}
          >
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>
    </div>
  )
}

