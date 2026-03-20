import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type RegisterProps = {
  onLoginClick: () => void
}

export default function Register({ onLoginClick }: RegisterProps) {
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

    setFeedback({ type: 'success', text: 'Compte créé ! Vérifiez votre email.' })
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white shadow-lg rounded-xl p-8">
        <h1 className="text-center text-[#1e3a8a] font-bold text-2xl">
          🏨 Check-in Express
        </h1>
        <p className="mt-1 text-center text-gray-500 text-sm">
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white
                focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
            className="w-full h-12 bg-[#1e3a8a] text-white rounded-lg
              hover:bg-[#162f6b] transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
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
            className={`mt-4 text-sm text-center ${
              feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className="mt-4 text-center">
          <a
            href="#"
            className="text-sm font-medium text-[#1e3a8a] hover:underline"
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

