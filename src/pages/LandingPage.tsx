import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setChecking(false)
      }
    }).catch(() => setChecking(false))
  }, [navigate])

  if (checking) return null

  return (
    <div className="min-h-screen bg-white font-sans">
      <Nav />
      <Hero />
      <ProblemSolution />
      <Features />
      <Pricing />
      <Footer />
    </div>
  )
}

/* ── Nav ─────────────────────────────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/percepta-logo.png" alt="Percepta" className="h-8 w-auto" />
          <span className={`font-bold text-base sm:text-lg hidden sm:block ${scrolled ? 'text-[#1e3a8a]' : 'text-white'}`}>
            Check-in Express
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${scrolled ? 'text-[#1e3a8a] hover:bg-blue-50' : 'text-white hover:bg-white/10'}`}
          >
            Se connecter
          </a>
          <a
            href="/register"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#1e3a8a] text-white hover:bg-[#162e6e] transition-colors shadow"
          >
            Essai gratuit
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center text-center px-4 pt-16"
      style={{
        backgroundImage: "url('/hotel-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[#0f1f4d]/70" />
      <div className="relative z-10 max-w-3xl mx-auto py-24">
        <div className="flex justify-center mb-6">
          <img src="/percepta-logo.png" alt="Percepta" className="h-14 w-auto" />
        </div>

        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Essai gratuit 7 jours — sans carte bancaire
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
          L'enregistrement hôtelier intelligent
          <span className="text-[#4a90d9]"> pour le Sénégal</span>
        </h1>

        <p className="text-base sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Scannez les pièces d'identité, générez les fiches de police et exportez vers la gendarmerie en quelques secondes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/register"
            className="px-8 py-4 rounded-xl bg-[#4a90d9] text-white font-bold text-base sm:text-lg shadow-lg hover:bg-[#3a7bc8] transition-colors"
          >
            Commencer l'essai gratuit
          </a>
          <a
            href="/login"
            className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold text-base sm:text-lg hover:bg-white/20 transition-colors"
          >
            Se connecter
          </a>
        </div>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '30s', label: 'Check-in complet' },
            { value: '100%', label: 'Conforme RGPD' },
            { value: '7j', label: 'Essai gratuit' },
            { value: '0€', label: 'Sans engagement' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">{value}</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}

/* ── Problem / Solution ─────────────────────────────────────────────────────── */

function ProblemSolution() {
  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] mb-3">
            Fini la paperasse manuelle
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Les hôteliers sénégalais perdent en moyenne 8 minutes par client à remplir manuellement les fiches de police. Check-in Express réduit ça à 30 secondes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Avant */}
          <div className="bg-white rounded-2xl border-2 border-red-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">😩</div>
              <h3 className="font-bold text-lg text-red-700">Avant</h3>
            </div>
            <ul className="space-y-4">
              {[
                'Saisie manuelle des informations client',
                'Erreurs de transcription fréquentes',
                'Fiches papier perdues ou illisibles',
                'Transmission gendarmerie longue et complexe',
                'Aucune traçabilité des check-ins',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Après */}
          <div className="bg-white rounded-2xl border-2 border-green-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">🚀</div>
              <h3 className="font-bold text-lg text-green-700">Après Check-in Express</h3>
            </div>
            <ul className="space-y-4">
              {[
                'Scan automatique de la pièce d\'identité',
                'Données extraites sans erreur par l\'IA',
                'Fiche de police PDF générée en 1 clic',
                'Export SYNEXIE vers la gendarmerie instantané',
                'Historique complet et consultable',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Features ─────────────────────────────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: '📷',
      title: 'Scan IA',
      subtitle: 'Lecture automatique des pièces d\'identité',
      description: 'Photographiez la pièce d\'identité du client. Notre IA (Google Gemini) extrait instantanément nom, prénom, date de naissance, nationalité et numéro de document.',
      bullets: ['CNI, passeport, titre de séjour', 'Précision de lecture > 95%', 'Fonctionne même sur photos floues'],
    },
    {
      icon: '📄',
      title: 'Fiches PDF',
      subtitle: 'Format police sénégalaise officiel',
      description: 'La fiche de police est générée automatiquement au format réglementaire. Signature électronique du client incluse. Exportez en PDF en un clic.',
      bullets: ['Format conforme gendarmerie', 'Signature électronique intégrée', 'Archivage automatique 5 ans'],
    },
    {
      icon: '📤',
      title: 'Export SYNEXIE',
      subtitle: 'Transmission gendarmerie en 1 clic',
      description: 'Envoyez vos fiches directement au système SYNEXIE de la gendarmerie nationale sénégalaise. Aucune ressaisie, aucun déplacement.',
      bullets: ['Compatible SYNEXIE officiel', 'Accusé de réception automatique', 'Traçabilité complète des envois'],
    },
  ]

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] mb-3">
            Tout ce dont votre hôtel a besoin
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Une solution complète, pensée pour les réalités du terrain hôtelier au Sénégal.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 sm:p-8 flex flex-col"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-extrabold text-[#1e3a8a] text-lg mb-1">{f.title}</h3>
              <p className="text-xs font-semibold text-[#4a90d9] uppercase tracking-wide mb-3">{f.subtitle}</p>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">{f.description}</p>
              <ul className="space-y-2 mt-auto">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="w-4 h-4 text-[#4a90d9] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pricing ─────────────────────────────────────────────────────────────────── */

function Pricing() {
  return (
    <section className="py-20 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] mb-3">
            Tarifs simples et transparents
          </h2>
          <p className="text-slate-500">
            7 jours gratuits sur les deux formules — aucune carte bancaire requise.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 sm:p-8 flex flex-col shadow-sm">
            <h3 className="font-extrabold text-[#1e3a8a] text-xl mb-1">Starter</h3>
            <p className="text-slate-500 text-sm mb-5">Idéal pour les petits établissements</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-[#1e3a8a]">49,99€</span>
              <span className="text-slate-500 text-sm">/mois</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                '500 scans inclus/mois',
                'Fiches de police PDF',
                'Signature électronique',
                'Export SYNEXIE',
                'Historique clients',
                'Support email',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/register"
              className="block w-full text-center py-3.5 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#4a90d9] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Démarrer l'essai gratuit
            </a>
            <p className="text-center text-xs text-slate-400 mt-3">0,25€/scan au-delà de 500</p>
          </div>

          {/* Business */}
          <div className="relative bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] rounded-2xl p-6 sm:p-8 flex flex-col shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow">
                Plus populaire
              </span>
            </div>
            <h3 className="font-extrabold text-white text-xl mb-1 mt-3">Business</h3>
            <p className="text-blue-200 text-sm mb-5">Pour les hôtels à fort volume</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">89,99€</span>
              <span className="text-blue-200 text-sm">/mois</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Scans illimités',
                'Fiches de police PDF',
                'Signature électronique',
                'Export SYNEXIE',
                'Historique clients',
                'Support prioritaire',
                'Dashboard statistiques',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-blue-100 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/register"
              className="block w-full text-center py-3.5 rounded-xl bg-white text-[#1e3a8a] font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              Démarrer l'essai gratuit
            </a>
            <p className="text-center text-xs text-blue-300 mt-3">Aucun frais supplémentaire</p>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Paiement sécurisé via Lemon Squeezy · Annulation à tout moment · Sans engagement
        </p>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-[#0f1f4d] text-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <img src="/percepta-logo.png" alt="Percepta" className="h-8 w-auto" />
              <span className="font-bold text-white">Check-in Express</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              La solution d'enregistrement hôtelier intelligente, conçue pour les hôteliers sénégalais.
            </p>
            <div className="mt-4 space-y-1">
              <a href="mailto:perceptasn@gmail.com" className="block text-sm text-blue-300 hover:text-white transition-colors">
                perceptasn@gmail.com
              </a>
              <a href="https://wa.me/221711279503" className="block text-sm text-blue-300 hover:text-white transition-colors">
                WhatsApp : +221 71 127 95 03
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Produit</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Fonctionnalités', href: '#' },
                  { label: 'Tarifs', href: '#' },
                  { label: 'Se connecter', href: '/login' },
                  { label: 'Créer un compte', href: '/register' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-blue-300 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Légal</h4>
              <ul className="space-y-2">
                {[
                  { label: 'CGU', href: '/cgu' },
                  { label: 'Confidentialité', href: '/confidentialite' },
                  { label: 'Mentions légales', href: '/mentions-legales' },
                  { label: 'Support', href: '/support' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-blue-300 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-blue-400">
          <p>© 2026 Percepta SUARL · Tous droits réservés</p>
          <p>Fait avec ❤️ au Sénégal</p>
        </div>
      </div>
    </footer>
  )
}
