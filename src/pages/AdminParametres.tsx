import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const APP_VERSION = '1.0.0'
const SUPPORT_EMAIL = 'perceptasn@gmail.com'
const SUPPORT_WHATSAPP = '+221711279503'

type BroadcastFilter = 'all' | 'trial_active' | 'starter' | 'business' | 'trial_expired'

const FILTER_LABELS: Record<BroadcastFilter, string> = {
  all: 'Tous les hôtels',
  trial_active: 'Trial actif',
  starter: 'Abonnés Starter',
  business: 'Abonnés Business',
  trial_expired: 'Trial expiré',
}

interface InfoRow {
  label: string
  value: string
  mono?: boolean
}

function InfoCard({ title, rows }: { title: string; rows: InfoRow[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">
        {title}
      </h2>
      <dl className="space-y-3">
        {rows.map(({ label, value, mono }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
            <dd className={`text-sm font-medium text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function AdminParametres() {
  const [buildId, setBuildId] = useState<string>('—')

  // Broadcast state
  const [bSubject, setBSubject] = useState('')
  const [bMessage, setBMessage] = useState('')
  const [bFilter, setBFilter] = useState<BroadcastFilter>('all')
  const [sending, setSending] = useState(false)
  const [bResult, setBResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [bError, setBError] = useState('')

  useEffect(() => {
    fetch('/version.json')
      .then(r => r.json())
      .then(d => setBuildId(String(d.v ?? '—')))
      .catch(() => setBuildId('—'))
  }, [])

  const handleBroadcast = async () => {
    if (!bSubject.trim() || !bMessage.trim() || sending) return
    setSending(true)
    setBResult(null)
    setBError('')
    try {
      const { data, error } = await supabase.functions.invoke('broadcast-email', {
        body: { subject: bSubject.trim(), message: bMessage.trim(), filter: bFilter },
      })
      if (error) throw error
      setBResult(data as { sent: number; failed: number; total: number })
      setBSubject('')
      setBMessage('')
    } catch (err) {
      setBError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSending(false)
    }
  }

  const appRows: InfoRow[] = [
    { label: 'Nom de l\'application', value: 'Check-in Express' },
    { label: 'Version', value: APP_VERSION },
    { label: 'Build ID', value: buildId, mono: true },
    { label: 'Environnement', value: import.meta.env.MODE === 'production' ? 'Production' : 'Développement' },
  ]

  const contactRows: InfoRow[] = [
    { label: 'Email support', value: SUPPORT_EMAIL },
    { label: 'WhatsApp', value: SUPPORT_WHATSAPP },
    { label: 'Éditeur', value: 'Percepta SUARL' },
  ]

  const techRows: InfoRow[] = [
    { label: 'Frontend', value: 'React + Vite + Tailwind CSS' },
    { label: 'Backend', value: 'Supabase (PostgreSQL)' },
    { label: 'OCR', value: 'Google Gemini 2.0 Flash' },
    { label: 'Paiement', value: 'Lemon Squeezy' },
    { label: 'Hébergement', value: 'Netlify / Supabase Edge' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#1e3a8a] rounded-xl flex items-center justify-center text-white text-xl">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paramètres système</h1>
            <p className="text-sm text-gray-500">Informations de la plateforme Check-in Express</p>
          </div>
        </div>

        <InfoCard title="Application" rows={appRows} />
        <InfoCard title="Contact & Support" rows={contactRows} />
        <InfoCard title="Stack technique" rows={techRows} />

        {/* ── Broadcast email ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-lg">
              📢
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Envoyer un message aux hôtels</h2>
              <p className="text-xs text-gray-500 mt-0.5">Email envoyé via Resend à tous les destinataires sélectionnés</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Filtre destinataires */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Destinataires
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(FILTER_LABELS) as [BroadcastFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setBFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      bFilter === key
                        ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sujet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bSubject}
                onChange={e => setBSubject(e.target.value)}
                placeholder="Ex : Nouvelle fonctionnalité disponible"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={bMessage}
                onChange={e => setBMessage(e.target.value)}
                rows={6}
                placeholder="Rédigez votre message ici…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Les sauts de ligne sont préservés dans l'email.</p>
            </div>

            {/* Résultat / erreur */}
            {bResult && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <span className="text-green-600 text-lg leading-none">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Envoi terminé</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {bResult.sent} email{bResult.sent > 1 ? 's' : ''} envoyé{bResult.sent > 1 ? 's' : ''}
                    {bResult.failed > 0 && (
                      <span className="text-amber-700"> · {bResult.failed} échec{bResult.failed > 1 ? 's' : ''}</span>
                    )}
                    {' '}sur {bResult.total} destinataire{bResult.total > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {bError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <span className="text-red-500 text-lg leading-none">⚠️</span>
                <p className="text-sm text-red-700">{bError}</p>
              </div>
            )}

            {/* Bouton */}
            <button
              onClick={() => void handleBroadcast()}
              disabled={sending || !bSubject.trim() || !bMessage.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white font-semibold rounded-xl shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>📤 Envoyer à : {FILTER_LABELS[bFilter]}</>
              )}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          Les paramètres de configuration avancés (limites de plans, webhooks, clés API) sont
          gérés directement dans les variables d'environnement Supabase et Netlify.
        </div>
      </div>
    </div>
  )
}
