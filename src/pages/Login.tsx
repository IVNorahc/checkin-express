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
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md mx-4 sm:mx-auto bg-white shadow-md rounded-xl p-6 sm:p-8 border border-[#e2e8f0]">
        <h1 className="text-center text-[#1a2744] font-bold text-2xl sm:text-3xl">
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
                focus:border-[#c17b3f] focus:ring-1 focus:ring-[#c17b3f] min-h-[48px] text-[#0f172a] placeholder-[#94a3b8]"
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
                focus:border-[#c17b3f] focus:ring-1 focus:ring-[#c17b3f] min-h-[48px] text-[#0f172a] placeholder-[#94a3b8]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm sm:text-base text-[#64748b] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#c17b3f]
                focus:border-[#c17b3f] focus:ring-1 focus:ring-[#c17b3f]"
            />
            Se souvenir de moi
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 sm:h-12 bg-[#1a2744] text-white rounded-lg
              hover:bg-[#243557] transition-colors disabled:opacity-60 disabled:cursor-not-allowed
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
            className="text-sm sm:text-base font-medium text-[#c17b3f] hover:text-[#a86835]"
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

