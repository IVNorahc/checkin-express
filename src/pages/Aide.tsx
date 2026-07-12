import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type FaqItem = {
  id: number
  question: string
  answer: string
  icon: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    icon: '📷',
    question: "Comment scanner une pièce d'identité ?",
    answer:
      "Allez sur la page Scanner et appuyez sur le bouton caméra. Pointez votre téléphone sur la pièce d'identité en veillant à ce qu'elle soit bien éclairée et nette dans le cadre. L'IA extrait automatiquement les données en quelques secondes et pré-remplit le formulaire. Vérifiez les informations, corrigez si besoin, puis confirmez le check-in.",
  },
  {
    id: 2,
    icon: '⚠️',
    question: "Que faire si le scan échoue ou donne de mauvais résultats ?",
    answer:
      "Si le scan échoue, vérifiez que : (1) la pièce est bien éclairée sans reflet, (2) l'image est nette et le document entier est visible, (3) vous utilisez la caméra arrière. Vous pouvez relancer le scan ou saisir les informations manuellement en cliquant sur « Saisie manuelle ». En cas de problème persistant, contactez le support.",
  },
  {
    id: 3,
    icon: '📋',
    question: "Comment exporter les fiches pour la gendarmerie ?",
    answer:
      "Allez sur la page Fiches de contrôle. Toutes les fiches du jour apparaissent automatiquement. Cliquez sur « 🖨 Imprimer toutes les fiches du jour » pour générer un PDF groupé au format A6 que vous pouvez imprimer ou envoyer. Vous pouvez aussi voir chaque fiche individuellement en cliquant sur « 📄 Voir la fiche PDF ».",
  },
  {
    id: 4,
    icon: '👥',
    question: "Comment ajouter un employé ?",
    answer:
      "La gestion des employés est disponible sur le plan Business. Allez dans Paramètres > Employés, puis cliquez sur « Inviter un employé ». Entrez l'email de votre employé — il recevra un lien d'invitation par email pour créer son compte et accéder à votre établissement.",
  },
  {
    id: 5,
    icon: '💳',
    question: "Comment changer mon abonnement ?",
    answer:
      "Allez dans Paramètres puis cliquez sur « Gérer mon abonnement ». Vous serez redirigé vers Lemon Squeezy où vous pouvez passer au plan supérieur, modifier votre cycle de facturation ou annuler votre abonnement. Les changements prennent effet immédiatement.",
  },
  {
    id: 6,
    icon: '💬',
    question: "Comment contacter le support ?",
    answer:
      "Vous pouvez nous contacter directement via WhatsApp au +221 71 127 95 03 (disponible 7j/7) ou par email à perceptasn@gmail.com. Vous pouvez aussi utiliser la page Support de l'application pour envoyer un message depuis votre compte.",
  },
]

const STEPS = [
  {
    number: '1',
    icon: '⚙️',
    title: 'Configurez votre hôtel',
    desc: "Ajoutez votre logo, adresse et informations de contact pour personnaliser vos fiches.",
    href: '/parametres',
    cta: 'Aller aux paramètres',
  },
  {
    number: '2',
    icon: '📷',
    title: 'Faites votre premier scan',
    desc: "Photographiez une pièce d'identité — notre IA remplit le formulaire automatiquement.",
    href: '/scan',
    cta: 'Aller au scanner',
  },
  {
    number: '3',
    icon: '📤',
    title: 'Exportez vos fiches SYNEXIE',
    desc: "Générez et imprimez les fiches de police au format A6 en un seul clic.",
    href: '/fiches',
    cta: 'Voir les fiches',
  },
]

const TUTORIAL_PLACEHOLDERS = [
  { title: 'Scanner une pièce d\'identité', duration: '2 min' },
  { title: 'Créer une fiche de police', duration: '1 min 30' },
  { title: 'Exporter et imprimer les fiches', duration: '1 min' },
]

export default function Aide() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (id: number) => setOpenFaq(prev => (prev === id ? null : id))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div
        className="px-4 py-8 text-center"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
      >
        <div className="text-4xl mb-3">❓</div>
        <h1 className="text-2xl font-extrabold text-white">Centre d'aide</h1>
        <p className="text-blue-200 text-sm mt-1">Guides, tutoriels et support</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── 1. Guide de démarrage ────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9]">
            <span className="text-xl">🚀</span>
            <h2 className="text-base font-bold text-[#1e3a8a]">Guide de démarrage</h2>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {STEPS.map((step) => (
              <div key={step.number} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold flex items-center justify-center">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1e293b] text-sm">{step.icon} {step.title}</p>
                  <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
                <button
                  onClick={() => navigate(step.href)}
                  className="flex-shrink-0 text-xs font-semibold text-[#1e3a8a] border border-[#1e3a8a]/30 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  {step.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── 2. FAQ ───────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9]">
            <span className="text-xl">💡</span>
            <h2 className="text-base font-bold text-[#1e3a8a]">Questions fréquentes</h2>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {FAQ_ITEMS.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="text-sm font-semibold text-[#1e293b] leading-snug">{item.question}</span>
                  </div>
                  <span
                    className="flex-shrink-0 text-[#94a3b8] text-base transition-transform duration-200"
                    style={{ transform: openFaq === item.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▾
                  </span>
                </button>
                {openFaq === item.id && (
                  <div className="px-5 pb-4 pt-0">
                    <div className="bg-[#f8fafc] rounded-xl px-4 py-3 border border-[#e2e8f0]">
                      <p className="text-sm text-[#475569] leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Tutoriels vidéo ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9]">
            <span className="text-xl">🎬</span>
            <h2 className="text-base font-bold text-[#1e3a8a]">Tutoriels vidéo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
            {TUTORIAL_PLACEHOLDERS.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] flex flex-col items-center justify-center gap-2 py-8 px-4 text-center"
              >
                <span className="text-3xl text-[#cbd5e1]">▶</span>
                <p className="text-xs font-semibold text-[#94a3b8]">{t.title}</p>
                <span className="text-[10px] text-[#cbd5e1] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                  {t.duration} · Bientôt disponible
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Contact support ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9]">
            <span className="text-xl">🤝</span>
            <h2 className="text-base font-bold text-[#1e3a8a]">Contacter le support</h2>
          </div>
          <div className="p-5 space-y-3">
            <a
              href="https://wa.me/221711279503?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20Check-in%20Express"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-4 hover:bg-[#dcfce7] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[#22c55e] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.118 1.529 5.845L0 24l6.335-1.502A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.88 9.88 0 01-5.031-1.374l-.36-.214-3.762.892.948-3.663-.235-.374A9.86 9.86 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118S21.882 6.533 21.882 12 17.467 21.882 12 21.882z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#15803d] text-sm">WhatsApp</p>
                <p className="text-xs text-[#16a34a]">+221 71 127 95 03 · Disponible 7j/7</p>
              </div>
              <span className="text-[#22c55e] text-lg flex-shrink-0">→</span>
            </a>

            <a
              href="mailto:perceptasn@gmail.com"
              className="flex items-center gap-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-4 hover:bg-[#dbeafe] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1e3a8a] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1e3a8a] text-sm">Email</p>
                <p className="text-xs text-[#2563eb]">perceptasn@gmail.com</p>
              </div>
              <span className="text-[#1e3a8a] text-lg flex-shrink-0">→</span>
            </a>

            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center gap-4 bg-[#fafafa] border border-[#e2e8f0] rounded-xl px-4 py-4 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-[#64748b] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1e293b] text-sm">Formulaire de contact</p>
                <p className="text-xs text-[#64748b]">Envoyez-nous un message depuis l'application</p>
              </div>
              <span className="text-[#94a3b8] text-lg flex-shrink-0">→</span>
            </button>
          </div>
        </section>

        {/* Lien retour dashboard */}
        <div className="text-center pb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-[#64748b] hover:text-[#1e3a8a] transition-colors"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
