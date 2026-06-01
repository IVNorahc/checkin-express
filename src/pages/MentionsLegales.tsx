import { useNavigate } from 'react-router-dom'

const LAST_UPDATE = '24 mai 2026'
const COMPANY = 'Percepta SUARL'
const APP = 'Check-in Express'
const EMAIL = 'perceptasn@gmail.com'
const WEBSITE = 'checkinexpress.app'

export default function MentionsLegales() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#1e3a8a] font-medium text-sm">
            ← Retour
          </button>
          <img src="/percepta-logo.png" alt="Percepta" className="h-8 w-auto object-contain" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] mb-2">
            Mentions légales
          </h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : {LAST_UPDATE}</p>

          <Section title="1. Éditeur du site">
            <p>
              Le site et l'application <strong>{APP}</strong> sont édités par :
            </p>
            <ul>
              <li><strong>Raison sociale :</strong> {COMPANY}</li>
              <li><strong>Siège social :</strong> Kaolack, Sénégal</li>
              <li><strong>Email :</strong> <a href={`mailto:${EMAIL}`} className="text-[#1e3a8a] hover:underline">{EMAIL}</a></li>
              <li><strong>Site web :</strong> {WEBSITE}</li>
            </ul>
          </Section>

          <Section title="2. Hébergement">
            <p>
              L'application {APP} est hébergée par :
            </p>
            <ul>
              <li><strong>Société :</strong> Vercel Inc.</li>
              <li><strong>Adresse :</strong> 340 Pine Street, Suite 701, San Francisco, CA 94104, USA</li>
              <li><strong>Site web :</strong> vercel.com</li>
            </ul>
          </Section>

          <Section title="3. Base de données">
            <p>
              Les données de l'application sont stockées sur les serveurs de :
            </p>
            <ul>
              <li><strong>Société :</strong> Supabase Inc.</li>
              <li><strong>Infrastructure :</strong> Cloud (AWS)</li>
              <li><strong>Site web :</strong> supabase.com</li>
            </ul>
            <p>
              Les données sont traitées conformément à notre{' '}
              <button
                onClick={() => navigate('/confidentialite')}
                className="text-[#1e3a8a] hover:underline"
              >
                Politique de confidentialité
              </button>.
            </p>
          </Section>

          <Section title="4. Propriété intellectuelle">
            <p>
              L'ensemble des éléments constituant le site et l'application <strong>{APP}</strong> —
              notamment le code source, l'interface graphique, les logos, la charte graphique,
              les algorithmes et toute documentation associée — est la propriété exclusive de{' '}
              <strong>{COMPANY}</strong>.
            </p>
            <p>
              Tous droits réservés © {COMPANY} 2026. Toute reproduction, représentation,
              modification ou exploitation, totale ou partielle, sans autorisation préalable et
              écrite de {COMPANY}, est strictement interdite.
            </p>
          </Section>

          <Section title="5. Limitation de responsabilité">
            <p>
              {COMPANY} s'efforce d'assurer l'exactitude et la mise à jour des informations
              diffusées sur {APP}. Toutefois, {COMPANY} ne peut garantir l'exactitude, la
              complétude ou l'actualité des informations fournies.
            </p>
            <p>
              {COMPANY} ne saurait être tenue responsable :
            </p>
            <ul>
              <li>des dommages directs ou indirects résultant de l'accès ou de l'utilisation de l'application ;</li>
              <li>d'une interruption de service due à des causes techniques extérieures (force majeure, panne réseau, incident hébergeur) ;</li>
              <li>de l'exactitude des données saisies par les utilisateurs ;</li>
              <li>de l'utilisation faite par les établissements hôteliers des fiches de contrôle générées.</li>
            </ul>
            <p>
              L'utilisateur reconnaît utiliser le service sous sa seule responsabilité et à ses
              risques et périls.
            </p>
          </Section>

          <Section title="6. Droit applicable et juridiction compétente">
            <p>
              Les présentes mentions légales sont régies par le <strong>droit sénégalais</strong>.
              Tout litige relatif à leur interprétation ou à leur exécution sera soumis, après
              tentative préalable de résolution amiable, à la compétence exclusive du{' '}
              <strong>Tribunal de Kaolack (Sénégal)</strong>.
            </p>
            <p>
              Pour toute question ou réclamation, contactez-nous à :{' '}
              <a href={`mailto:${EMAIL}`} className="text-[#1e3a8a] hover:underline">{EMAIL}</a>
            </p>
          </Section>

        </div>
      </main>

      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-[#1e3a8a] mb-3 pb-1 border-b border-[#e2e8f0]">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="text-center py-6 text-xs text-gray-400">
      © {new Date().getFullYear()} {COMPANY} · {APP}
    </footer>
  )
}
