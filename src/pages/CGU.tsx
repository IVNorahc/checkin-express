import { useNavigate } from 'react-router-dom'

const LAST_UPDATE = '20 mai 2026'
const COMPANY = 'Percepta SUARL'
const APP = 'Check-in Express'
const EMAIL = 'perceptasn@gmail.com'
const WEBSITE = 'checkinexpress.app'

export default function CGU() {
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
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : {LAST_UPDATE}</p>

          <Section title="1. Objet">
            <p>
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et
              l'utilisation de la plateforme <strong>{APP}</strong>, éditée par <strong>{COMPANY}</strong>,
              société immatriculée au Registre du Commerce et du Crédit Mobilier de Dakar (Sénégal).
            </p>
            <p>
              {APP} est une application web progressive (PWA) destinée aux établissements hôteliers
              permettant la gestion électronique des fiches de contrôle des clients, conformément à la
              réglementation hôtelière sénégalaise (Décret n° 76-764 du 17 juillet 1976 et textes subséquents).
            </p>
            <p>
              L'accès à la plateforme implique l'acceptation pleine et entière des présentes CGU. Toute
              utilisation du service vaut acceptation sans réserve.
            </p>
          </Section>

          <Section title="2. Accès et inscription">
            <p>
              Le service est réservé aux établissements hôteliers (hôtels, résidences hôtelières,
              auberges, maisons d'hôtes) régulièrement déclarés et exerçant leur activité au Sénégal
              ou dans tout pays reconnaissant une obligation légale de tenue d'un registre des voyageurs.
            </p>
            <p>
              Pour accéder au service, l'établissement doit créer un compte en fournissant une adresse
              e-mail valide et un mot de passe sécurisé. L'utilisateur certifie être habilité à engager
              l'établissement au nom duquel il s'inscrit.
            </p>
            <p>
              {COMPANY} se réserve le droit de refuser ou de suspendre tout accès en cas de violation des
              présentes CGU ou d'utilisation frauduleuse.
            </p>
          </Section>

          <Section title="3. Utilisation du service">
            <p>L'utilisateur s'engage à :</p>
            <ul>
              <li>Utiliser le service exclusivement dans le cadre de la gestion légale de son établissement ;</li>
              <li>Ne pas saisir de données inexactes, fictives ou appartenant à des tiers sans leur consentement ;</li>
              <li>Maintenir la confidentialité de ses identifiants de connexion ;</li>
              <li>Ne pas tenter de contourner les mesures de sécurité de la plateforme ;</li>
              <li>
                Respecter la réglementation applicable en matière de protection des données personnelles,
                notamment la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données
                à caractère personnel et le RGPD (Règlement UE 2016/679) lorsqu'applicable.
              </li>
            </ul>
            <p>
              Les quotas de scans sont définis par le plan souscrit (Starter : 200 scans/mois ;
              Business : illimité). Le dépassement sans abonnement adapté pourra entraîner la
              suspension temporaire de la fonctionnalité de scan.
            </p>
          </Section>

          <Section title="4. Responsabilités">
            <p><strong>{COMPANY} s'engage à :</strong></p>
            <ul>
              <li>Assurer la disponibilité de la plateforme avec un niveau de service raisonnable ;</li>
              <li>Mettre en œuvre les mesures techniques et organisationnelles appropriées pour sécuriser les données ;</li>
              <li>Notifier l'utilisateur de toute interruption planifiée dans un délai raisonnable.</li>
            </ul>
            <p><strong>{COMPANY} ne saurait être tenue responsable :</strong></p>
            <ul>
              <li>De l'inexactitude des données saisies par l'utilisateur ;</li>
              <li>
                De toute utilisation non conforme du service susceptible d'engager la responsabilité
                de l'établissement vis-à-vis des autorités compétentes ;
              </li>
              <li>
                Des dommages indirects résultant d'une interruption de service due à des causes
                extérieures (force majeure, panne réseau, etc.).
              </li>
            </ul>
            <p>
              L'utilisateur est seul responsable de la légalité et de l'exactitude des données qu'il
              saisit dans l'application et de la conservation des fiches de police conformément aux
              obligations légales de son établissement.
            </p>
          </Section>

          <Section title="5. Propriété intellectuelle">
            <p>
              La plateforme {APP}, son code source, son interface graphique, ses logos, sa charte
              graphique, ses algorithmes et toute documentation associée sont la propriété exclusive
              de <strong>{COMPANY}</strong> et sont protégés par les lois applicables en matière de
              propriété intellectuelle, notamment la loi sénégalaise n° 2008-09 du 25 janvier 2008
              sur la propriété littéraire et artistique.
            </p>
            <p>
              Toute reproduction, représentation, modification, adaptation, traduction ou exploitation,
              totale ou partielle, par quelque procédé que ce soit, sans autorisation préalable et
              écrite de {COMPANY}, est strictement interdite.
            </p>
            <p>
              L'abonnement au service confère à l'utilisateur un droit d'usage personnel, non exclusif
              et non cessible, limité à l'utilisation normale de la plateforme dans le cadre de son
              activité professionnelle.
            </p>
          </Section>

          <Section title="6. Tarification et paiement">
            <p>
              L'accès à {APP} est proposé selon les formules suivantes :
            </p>
            <ul>
              <li><strong>Essai gratuit</strong> : 7 jours, accès complet, sans carte bancaire requise ;</li>
              <li><strong>Starter</strong> : 49,99 €/mois — 200 scans/mois inclus ;</li>
              <li><strong>Business</strong> : 89,99 €/mois — scans illimités.</li>
            </ul>
            <p>
              Le paiement est mensuel, prélevé à date anniversaire de la souscription. En cas de
              non-paiement, l'accès au service pourra être suspendu après mise en demeure restée
              sans effet 48 heures.
            </p>
          </Section>

          <Section title="7. Résiliation">
            <p>
              L'utilisateur peut résilier son abonnement à tout moment depuis son espace client ou
              en envoyant un email à <a href={`mailto:${EMAIL}`} className="text-[#1e3a8a] hover:underline">{EMAIL}</a>.
              La résiliation prend effet à la fin de la période mensuelle en cours.
            </p>
            <p>
              {COMPANY} se réserve le droit de résilier ou suspendre unilatéralement tout abonnement
              en cas de violation des présentes CGU, avec effet immédiat et sans préavis.
            </p>
            <p>
              À la résiliation, les données de l'établissement sont conservées pendant la durée légale
              minimale applicable (voir Politique de Confidentialité), puis supprimées.
            </p>
          </Section>

          <Section title="8. Modification des CGU">
            <p>
              {COMPANY} se réserve le droit de modifier les présentes CGU à tout moment. L'utilisateur
              sera informé de toute modification substantielle par email ou via l'interface de
              l'application. La poursuite de l'utilisation du service vaut acceptation des nouvelles CGU.
            </p>
          </Section>

          <Section title="9. Droit applicable et juridiction">
            <p>
              Les présentes CGU sont régies par le droit sénégalais. Tout litige relatif à leur
              interprétation ou à leur exécution sera soumis à la compétence exclusive des tribunaux
              de Dakar (Sénégal), après tentative préalable de résolution amiable.
            </p>
            <p>
              Pour toute question, contactez-nous à :{' '}
              <a href={`mailto:${EMAIL}`} className="text-[#1e3a8a] hover:underline">{EMAIL}</a>
              {' '}— {WEBSITE}
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
