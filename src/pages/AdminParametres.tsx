import { useState, useEffect } from 'react'
import BackButton from '../components/BackButton'

const APP_VERSION = '1.0.0'
const SUPPORT_EMAIL = 'perceptasn@gmail.com'
const SUPPORT_WHATSAPP = '+221711279503'

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

  useEffect(() => {
    fetch('/version.json')
      .then(r => r.json())
      .then(d => setBuildId(String(d.v ?? '—')))
      .catch(() => setBuildId('—'))
  }, [])

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
        <BackButton />

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

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          Les paramètres de configuration avancés (limites de plans, webhooks, clés API) sont
          gérés directement dans les variables d'environnement Supabase et Netlify.
        </div>
      </div>
    </div>
  )
}
