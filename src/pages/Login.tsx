import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type LoginProps = {
  onRegisterClick: () => void
  onLoginSuccess: () => void
}

export default function Login({ onRegisterClick, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback(null)
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (error) {
      setFeedback({ type: 'error', text: 'Email ou mot de passe incorrect' })
      return
    }

    setFeedback({ type: 'success', text: 'Connexion réussie !' })
    onLoginSuccess()
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md mx-4 sm:mx-auto bg-white shadow-md rounded-xl p-6 sm:p-8 border border-[#e2e8f0]">
        <h1 className="text-center text-[#1e3a8a] font-bold text-2xl sm:text-3xl">
          🏨 Check-in Express
        </h1>
        <p className="mt-1 text-center text-[#64748b] text-sm sm:text-base">by Percepta</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="sr-only" htmlFor="email">
              Email de l'hôtel
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email de l'hôtel"
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
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base sm:text-sm bg-white
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[48px] text-[#1e293b] placeholder-[#94a3b8]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm sm:text-base text-[#64748b] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1e3a8a]
                focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
            />
            Se souvenir de moi
          </label>

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
                Connexion...
              </>
            ) : (
              'Se connecter'
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
              onRegisterClick()
            }}
          >
            Pas encore de compte ? S&apos;inscrire
          </a>
        </div>
      </div>
    </div>
  )
}

