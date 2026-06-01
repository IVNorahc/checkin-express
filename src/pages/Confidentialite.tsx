import { useNavigate } from 'react-router-dom'

const LAST_UPDATE = '20 mai 2026'
const COMPANY = 'Percepta SUARL'
const APP = 'Check-in Express'
const DPO_EMAIL = 'perceptasn@gmail.com'

export default function Confidentialite() {
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
            Politique de Confidentialité
          </h1>
          <p className="text-sm text-gray-400 mb-2">Dernière mise à jour : {LAST_UPDATE}</p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8">
            ⚠️ Cette politique concerne le traitement de données à caractère personnel, y compris des
            données biométriques (pièces d'identité officielles). Veuillez la lire attentivement.
          </p>

          <Section title="1. Responsable du traitement">
            <p>
              Le responsable du traitement des données personnelles collectées via {APP} est :
            </p>
            <address className="not-italic bg-slate-50 rounded-lg p-3 text-sm">
              <strong>{COMPANY}</strong><br />
              Dakar, Sénégal<br />
              E-mail : <a href={`mailto:${DPO_EMAIL}`} className="text-[#1e3a8a] hover:underline">{DPO_EMAIL}</a>
            </address>
            <p>
              Dans le cadre de la relation avec les hôtels clients, {COMPANY} agit en tant que
              <strong> sous-traitant</strong> au sens de la loi sénégalaise n° 2008-12 du 25 janvier 2008
              et du RGPD. L'établissement hôtelier demeure le responsable de traitement vis-à-vis
              des personnes concernées (les voyageurs).
            </p>
          </Section>

          <Section title="2. Données collectées">
            <p>Dans le cadre de la création et la gestion des fiches de contrôle hôtelières, les données suivantes sont collectées :</p>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.1 Données relatives aux voyageurs</h3>
            <ul>
              <li><strong>Identité</strong> : nom de famille, prénoms, date et lieu de naissance, nationalité, sexe ;</li>
              <li>
                <strong>Pièce d'identité</strong> : type de document (CNI, passeport, titre de séjour),
                numéro de document, date de délivrance, date d'expiration — ces données constituent
                des données <em>sensibles</em> au sens de la loi ;
              </li>
              <li><strong>Coordonnées</strong> : adresse de domicile, profession ;</li>
              <li><strong>Voyage</strong> : ville de provenance, destination, date d'arrivée, date de départ prévue ;</li>
              <li><strong>Séjour</strong> : numéro de chambre ;</li>
              <li><strong>Signature électronique</strong> : image de la signature du voyageur.</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.2 Données relatives aux hôtels (comptes)</h3>
            <ul>
              <li>Adresse e-mail professionnelle ;</li>
              <li>Nom de l'établissement et numéro de téléphone ;</li>
              <li>Données d'usage : nombre de scans effectués, date d'inscription ;</li>
              <li>Logo de l'établissement (optionnel).</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mt-3 mb-1">2.3 Données techniques</h3>
            <ul>
              <li>Adresse IP de connexion, données de session, journaux d'accès ;</li>
              <li>Informations sur l'appareil utilisé (type de navigateur, système d'exploitation).</li>
            </ul>
          </Section>

          <Section title="3. Finalités du traitement">
            <p>Les données des voyageurs sont traitées exclusivement pour les finalités suivantes :</p>
            <ul>
              <li>
                <strong>Obligation légale</strong> : tenue du registre de police obligatoire pour les
                établissements hôteliers en application du Décret sénégalais n° 76-764 du 17 juillet 1976
                réglementant le logement des étrangers et ressortissants sénégalais ;
              </li>
              <li>
                <strong>Génération de fiches PDF</strong> : production des fiches de contrôle A6
                conformes aux exigences administratives ;
              </li>
              <li>
                <strong>Archivage légal</strong> : conservation des fiches pendant la durée réglementaire
                afin de répondre aux demandes des autorités compétentes.
              </li>
            </ul>
            <p>
              Les données ne sont <strong>jamais utilisées à des fins commerciales, publicitaires
              ou de profilage</strong>, ni transmises à des tiers à d'autres fins que celles décrites
              ci-dessus.
            </p>
          </Section>

          <Section title="4. Bases légales du traitement">
            <ul>
              <li>
                <strong>Obligation légale</strong> (art. 6.1.c RGPD / art. 7 loi 2008-12) : le
                traitement des données des voyageurs est imposé par la réglementation hôtelière
                sénégalaise ;
              </li>
              <li>
                <strong>Consentement</strong> : la signature électronique du voyageur matérialise
                son consentement à la collecte de ses données dans le cadre de son enregistrement ;
              </li>
              <li>
                <strong>Intérêt légitime</strong> : amélioration du service et sécurisation de
                la plateforme.
              </li>
            </ul>
          </Section>

          <Section title="5. Durée de conservation">
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Type de donnée</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Durée</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Fiches de contrôle des voyageurs', 'Minimum 6 mois, conformément à la réglementation hôtelière sénégalaise'],
                  ['Données de compte hôtel', 'Durée de l\'abonnement + 3 ans après résiliation'],
                  ['Journaux techniques', '12 mois glissants'],
                  ['Données de facturation', '10 ans (obligation comptable)'],
                ].map(([type, duree]) => (
                  <tr key={type}>
                    <td className="px-3 py-2 border border-gray-200">{type}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Au terme de ces durées, les données sont supprimées de façon sécurisée ou anonymisées
              de manière irréversible.
            </p>
          </Section>

          <Section title="6. Destinataires des données">
            <p>Les données personnelles collectées sont accessibles aux personnes suivantes :</p>
            <ul>
              <li>Le personnel habilité de l'établissement hôtelier (responsable de traitement) ;</li>
              <li>
                Les équipes techniques de {COMPANY} dans le strict cadre de la maintenance et de
                l'hébergement de la plateforme ;
              </li>
              <li>
                Les <strong>autorités compétentes</strong> (police, gendarmerie) sur réquisition
                judiciaire, conformément aux obligations légales.
              </li>
            </ul>
            <p>
              Nous faisons appel aux sous-traitants techniques suivants, liés par des obligations
              contractuelles de confidentialité :
            </p>
            <ul>
              <li><strong>Supabase</strong> (hébergement base de données — UE/USA) ;</li>
              <li><strong>Google Gemini API</strong> (lecture OCR des pièces d'identité — traitement ponctuel, non stocké).</li>
            </ul>
          </Section>

          <Section title="7. Sécurité des données">
            <p>
              {COMPANY} met en œuvre les mesures techniques et organisationnelles suivantes pour
              protéger les données traitées :
            </p>
            <ul>
              <li>Chiffrement des communications via TLS 1.3 (HTTPS) ;</li>
              <li>Chiffrement des données au repos dans la base de données (AES-256) ;</li>
              <li>Contrôle d'accès par politiques RLS (Row Level Security) — chaque hôtel ne peut accéder qu'à ses propres données ;</li>
              <li>Authentification sécurisée (mot de passe haché, session JWT) ;</li>
              <li>Journalisation des accès et détection des anomalies ;</li>
              <li>Stockage local sur l'appareil chiffré via IndexedDB pour les fiches temporaires.</li>
            </ul>
            <p>
              En cas de violation de données à caractère personnel susceptible d'engendrer un risque
              pour les droits et libertés des personnes, {COMPANY} s'engage à notifier les autorités
              compétentes (CDP Sénégal) dans les 72 heures et à informer les personnes concernées
              dans les meilleurs délais.
            </p>
          </Section>

          <Section title="8. Droits des personnes concernées">
            <p>
              Conformément à la loi sénégalaise n° 2008-12 et au RGPD, toute personne dont les
              données sont traitées dispose des droits suivants :
            </p>
            <ul>
              <li><strong>Droit d'accès</strong> : obtenir une copie des données vous concernant ;</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes ;</li>
              <li>
                <strong>Droit à l'effacement</strong> : demander la suppression de vos données,
                sous réserve des obligations légales de conservation ;
              </li>
              <li>
                <strong>Droit d'opposition</strong> : vous opposer à un traitement dans les cas
                prévus par la loi ;
              </li>
              <li>
                <strong>Droit à la limitation</strong> : restreindre le traitement de vos données
                dans certains cas.
              </li>
            </ul>
            <p>
              Pour exercer ces droits, adressez votre demande écrite accompagnée d'une copie de
              votre pièce d'identité à :
            </p>
            <address className="not-italic bg-slate-50 rounded-lg p-3 text-sm">
              <strong>Délégué à la Protection des Données (DPO)</strong><br />
              {COMPANY}<br />
              E-mail : <a href={`mailto:${DPO_EMAIL}`} className="text-[#1e3a8a] hover:underline">{DPO_EMAIL}</a>
            </address>
            <p>
              Nous nous engageons à répondre à votre demande dans un délai d'un (1) mois à compter
              de sa réception. En cas de refus, vous disposez du droit de saisir la
              <strong> Commission de Protection des Données Personnelles (CDP)</strong> du Sénégal.
            </p>
          </Section>

          <Section title="9. Transferts internationaux de données">
            <p>
              Dans le cadre de l'utilisation de services tiers (Supabase, Google), certaines données
              peuvent être transférées hors du Sénégal. Ces transferts sont encadrés par des
              clauses contractuelles types offrant un niveau de protection adéquat, conformément
              aux exigences de la loi 2008-12 et aux décisions d'adéquation de la Commission
              européenne.
            </p>
          </Section>

          <Section title="10. Cookies et traceurs">
            <p>
              {APP} utilise uniquement des cookies strictement nécessaires au fonctionnement du
              service (session d'authentification, préférences de l'application). Aucun cookie
              publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </Section>

          <Section title="11. Modifications de la politique">
            <p>
              La présente politique peut être modifiée pour refléter l'évolution réglementaire ou
              technique. Toute modification significative sera notifiée par e-mail ou via l'interface
              de l'application. La version en vigueur est accessible à tout moment depuis l'application.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>Pour toute question relative à cette politique :</p>
            <address className="not-italic bg-[#f0f7ff] border border-blue-100 rounded-lg p-4 text-sm">
              <strong>{COMPANY}</strong> — Délégué à la Protection des Données<br />
              E-mail : <a href={`mailto:${DPO_EMAIL}`} className="text-[#1e3a8a] font-semibold hover:underline">{DPO_EMAIL}</a>
            </address>
          </Section>

        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        © {new Date().getFullYear()} {COMPANY} · {APP}
      </footer>
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
