import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface SubscribeProps {
  onBack?: () => void;
  showWelcome?: boolean;
}

const LEMON_STARTER_URL = "https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02?checkout[custom][plan]=starter";
const LEMON_BUSINESS_URL = "https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02?checkout[custom][plan]=business";

export default function Subscribe({ onBack, showWelcome }: SubscribeProps) {
  const navigate = useNavigate()
  const [showRefresh, setShowRefresh] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Pré-charger l'email au montage (getSession lit le cache local, pas de réseau)
  // pour que handlePlan soit synchrone et ne soit pas bloqué par le popup blocker.
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setUserEmail(data.session?.user.email ?? null))
      .catch(() => {})
  }, []);

  const handlePlan = (plan: 'starter' | 'business') => {
    const base = plan === 'business' ? LEMON_BUSINESS_URL : LEMON_STARTER_URL;
    const url = userEmail
      ? `${base}&checkout[email]=${encodeURIComponent(userEmail)}`
      : base;
    window.open(url, '_blank');
    setShowRefresh(true);
  };

  const handleRefresh = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      navigate('/login');
      return;
    }
    const { data: hotel } = await supabase
      .from("hotels")
      .select("subscription_status")
      .eq("user_id", data.session.user.id)
      .single();
    if (["starter", "business", "active"].includes(hotel?.subscription_status ?? "")) {
      navigate('/dashboard');
    } else {
      alert("Paiement non détecté. Réessayez dans quelques secondes.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/hotel-bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      <div
        className="min-h-screen w-full overflow-x-hidden p-4 md:p-8 pb-12"
        style={{
          minHeight: '100vh',
          background: 'rgba(232,244,253,0.60)',
          backdropFilter: 'blur(1px)',
        }}
      >
        <div className="mx-auto max-w-6xl">


          {/* En-tête */}
          <div className="mb-6 text-center md:mb-8">
            <div className="mb-4 flex justify-center">
              <img
                src="/percepta-logo.png"
                alt="Percepta"
                className="h-12 w-auto object-contain"
              />
            </div>
            <h1 className="mb-4 text-2xl font-extrabold text-[#1e3a8a] md:text-4xl">
              Choisissez votre formule
            </h1>
            <p className="text-base text-slate-500 md:text-lg">
              Sans engagement - Annulation à tout moment
            </p>
          </div>

          {/* Bannière de bienvenue */}
          {showWelcome && (
            <div
              className="mx-auto mb-4 max-w-2xl rounded-xl border border-green-200/50 bg-[rgba(30,58,138,0.15)] p-4 text-center backdrop-blur-sm md:mb-6 md:p-8"
            >
              <p className="m-0 font-semibold text-green-800">
                Votre compte a été créé avec succès ! Complétez votre inscription.
              </p>
            </div>
          )}

          {/* Message de paiement */}
          {showRefresh && (
            <div
              className="mx-auto mb-4 max-w-2xl rounded-xl border border-blue-200/50 bg-blue-50/90 p-4 text-center backdrop-blur-sm md:mb-6 md:p-8"
            >
              <p className="mb-4 font-semibold text-[#1e3a8a]">
                Une fois votre paiement effectué, cliquez ci-dessous.
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="cursor-pointer rounded-lg bg-gradient-to-br from-[#1e3a8a] to-[#4a90d9] px-6 py-3 text-sm font-semibold text-white"
              >
                Actualiser mon accès
              </button>
            </div>
          )}

          {/* Social Proof */}
          <div className="mx-auto mb-8 grid max-w-4xl grid-cols-2 gap-4 text-center md:grid-cols-4 md:gap-6">
            <div>
              <p className="mb-1 text-2xl font-extrabold text-[#1e3a8a] md:text-3xl">30s</p>
              <p className="text-xs text-slate-500 md:text-sm">Temps de check-in</p>
            </div>
            <div>
              <p className="mb-1 text-2xl font-extrabold text-[#1e3a8a] md:text-3xl">100%</p>
              <p className="text-xs text-slate-500 md:text-sm">Conforme RGPD</p>
            </div>
            <div>
              <p className="mb-1 text-2xl font-extrabold text-[#1e3a8a] md:text-3xl">7j</p>
              <p className="text-xs text-slate-500 md:text-sm">Essai gratuit</p>
            </div>
            <div>
              <p className="mb-1 text-2xl font-extrabold text-[#1e3a8a] md:text-3xl">0€</p>
              <p className="text-xs text-slate-500 md:text-sm">Sans engagement</p>
            </div>
          </div>

          {/* Cartes de tarification */}
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-2">
            {/* STARTER */}
            <div
              className="flex w-full flex-col rounded-[20px] border-2 border-blue-200/50 bg-white/95 p-4 shadow-lg shadow-blue-900/10 backdrop-blur-sm md:p-8"
            >
              <div className="flex flex-1 flex-col text-center">
                <h3 className="mb-2 text-xl font-bold text-[#1e3a8a] md:text-2xl">Starter</h3>
                <p className="mb-4 text-slate-500">Idéal pour les petits hôtels</p>

                <div className="mb-4 text-3xl font-bold text-[#1e3a8a] md:text-5xl">
                  49,99€
                  <span className="text-sm font-normal md:text-base">/mois</span>
                </div>

                <ul className="mb-4 flex flex-1 list-none flex-col gap-0 p-0 text-left">
                  {[
                    '500 scans inclus/mois',
                    'Fiches de police PDF',
                    'Signature électronique',
                    'Historique clients',
                    'Support email',
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center border-b border-blue-200/30 py-1.5 text-sm text-slate-800 md:text-[15px]"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-2">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handlePlan('starter')}
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#4a90d9] py-4 text-base font-bold text-white shadow-md shadow-blue-900/30"
                >
                  Choisir Starter
                </button>

                <p className="mt-3 text-center text-xs text-slate-400 md:text-sm">
                  0,25€/scan au-delà de 500
                </p>
              </div>
            </div>

            {/* BUSINESS */}
            <div
              className="relative flex w-full flex-col rounded-[20px] border-2 border-[#4a90d9] bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-4 shadow-xl shadow-blue-900/40 md:p-8"
            >
              <div className="absolute left-1/2 -top-5 z-10 flex -translate-x-1/2 justify-center">
                <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-5 py-2 text-sm font-bold text-gray-900 shadow-lg">
                  Plus populaire
                </span>
              </div>

              <div className="mt-6 flex flex-1 flex-col text-center md:mt-8">
                <h3 className="mb-2 text-xl font-bold text-white md:text-2xl">Business</h3>
                <p className="mb-4 text-blue-200">Pour les hôtels actifs</p>

                <div className="mb-4 text-3xl font-bold text-white md:text-5xl">
                  89,99€
                  <span className="text-sm font-normal text-blue-100 md:text-base">/mois</span>
                </div>

                <ul className="mb-4 flex list-none flex-col gap-2 p-0 text-left">
                  {[
                    'Illimité',
                    'Fiches de police PDF',
                    'Signature électronique',
                    'Historique clients',
                    'Support prioritaire',
                    'Dashboard statistiques',
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center border-b border-white/10 py-1 text-sm text-blue-100 md:text-[15px]"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-2">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handlePlan('business')}
                  className="w-full cursor-pointer rounded-xl bg-white py-4 text-base font-bold text-[#1e3a8a]"
                >
                  Choisir Business
                </button>

                <p className="mt-3 text-center text-xs text-blue-200 md:text-sm">
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 space-y-2 pb-8 text-center text-sm leading-relaxed text-slate-500 md:text-base">
            <p>Sécurisé Paiement sécurisé via Lemon Squeezy</p>
            <p>Annulation à tout moment - Sans engagement</p>
            <p>
              Des questions ?{" "}
            <a href="mailto:perceptasn@gmail.com" className="text-[#4a90d9] no-underline hover:underline">
                perceptasn@gmail.com
              </a>
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mt-2 border-none bg-transparent text-sm font-semibold text-[#4a90d9] underline hover:text-blue-800"
              >
                Essayer gratuitement 7 jours ?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
