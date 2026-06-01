import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'
import { getDB, initDB, type FichePolice } from '../lib/db'
import { generateFichesGroupees, type FicheParams } from '../utils/generateFicheControle'

type FicheWithParams = FichePolice & { params: FicheParams }

function todayRange() {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] text-[#94a3b8] uppercase tracking-wide leading-none mb-0.5">{label}</span>
      <span className="text-[#1e3a8a] font-medium text-sm truncate block">{value || '—'}</span>
    </div>
  )
}

export default function FichesControle() {
  const [fiches, setFiches] = useState<FicheWithParams[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [minutesUntil20h, setMinutesUntil20h] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const autoFiredRef = useRef(false)
  const printAllRef = useRef<((auto: boolean) => Promise<void>) | null>(null)

  const loadFiches = useCallback(async (uid: string) => {
    const { start, end } = todayRange()
    initDB(uid)
    const db = getDB()

    const raw = await db.fichesPolice
      .where('generatedAt')
      .between(start.toISOString(), end.toISOString())
      .reverse()
      .toArray()

    setFiches(
      raw
        .filter(f => !!f.ficheParams)
        .map(f => ({ ...f, params: JSON.parse(f.ficheParams!) as FicheParams }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id)
        void loadFiches(session.user.id)
      } else {
        setLoading(false)
      }
    })
  }, [loadFiches])

  const handlePrintAll = useCallback(async (auto: boolean) => {
    if (printing || !userId) return
    setPrinting(true)

    // Ouvrir la fenêtre PDF de façon synchrone (avant tout await) pour contourner
    // le bloqueur de popups iOS/Android qui refuse window.open après des awaits.
    const pdfWin = auto ? null : window.open('', '_blank')
    if (pdfWin) {
      pdfWin.document.write(
        '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;color:#1e3a8a">' +
        '<p>⏳ Génération du PDF en cours…</p></body></html>'
      )
    }

    try {
      const { start, end } = todayRange()
      const db = getDB()

      const unprintedFiches = await db.fichesPolice
        .where('generatedAt')
        .between(start.toISOString(), end.toISOString())
        .filter(f => !f.printed && !!f.ficheParams)
        .toArray()

      if (unprintedFiches.length === 0) {
        if (!auto) alert("Aucune fiche non imprimée pour aujourd'hui.")
        pdfWin?.close()
        return
      }

      // Charger le logo de l'hôtel
      let logoDataUrl: string | undefined
      try {
        const { data: hotelRow } = await supabase
          .from('hotels')
          .select('logo_url')
          .eq('user_id', userId)
          .single()
        if (hotelRow?.logo_url) {
          const resp = await fetch(hotelRow.logo_url)
          const imgBlob = await resp.blob()
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(imgBlob)
          })
        }
      } catch { /* logo indisponible — on continue sans */ }

      const fichesList: FicheParams[] = unprintedFiches.map(f => ({
        ...JSON.parse(f.ficheParams!),
        logoUrl: logoDataUrl,
      }))

      // Générer le PDF groupé
      const blob = generateFichesGroupees(fichesList)
      const url = URL.createObjectURL(blob)

      if (pdfWin) {
        // Affichage interactif : naviguer la fenêtre déjà ouverte vers le PDF
        pdfWin.location.href = url
      } else {
        // Déclenchement automatique (20h) : téléchargement classique
        const a = document.createElement('a')
        a.href = url
        a.download = `fiches-police-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      setTimeout(() => URL.revokeObjectURL(url), 15_000)

      // Marquer comme imprimées dans IndexedDB
      await Promise.all([
        ...unprintedFiches.map(f => db.fichesPolice.update(f.id!, { printed: true })),
        ...unprintedFiches.map(f => db.clients.update(f.clientId, { printed: true })),
      ])

      localStorage.setItem('checkin_print_trigger_date', new Date().toISOString().split('T')[0])

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Check-in Express', {
          body: `${unprintedFiches.length} fiche(s) prêtes. Ouvrez le PDF pour imprimer.`,
        })
      }

      await loadFiches(userId)
    } catch (err) {
      console.error('Erreur impression groupée:', err)
      pdfWin?.close()
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setPrinting(false)
    }
  }, [printing, userId, loadFiches])

  const handleViewSingle = useCallback((fiche: FicheWithParams) => {
    try {
      const blob = generateFichesGroupees([fiche.params])
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 15_000)
    } catch (err) {
      console.error('Erreur affichage fiche:', err)
      alert('Erreur lors de la génération du PDF.')
    }
  }, [])

  const handleExportSynexie = async (mode: 'today' | 'all') => {
    if (!userId || exporting) return
    setExporting(true)
    try {
      const db = getDB()
      let rawFiches: FichePolice[]

      if (mode === 'today') {
        const { start, end } = todayRange()
        rawFiches = await db.fichesPolice
          .where('generatedAt')
          .between(start.toISOString(), end.toISOString())
          .reverse()
          .toArray()
      } else {
        rawFiches = await db.fichesPolice.orderBy('generatedAt').reverse().toArray()
      }

      const withParams = rawFiches
        .filter(f => !!f.ficheParams)
        .map(f => ({ ...f, params: JSON.parse(f.ficheParams!) as FicheParams }))

      if (withParams.length === 0) {
        alert(mode === 'today' ? "Aucune fiche pour aujourd'hui." : 'Aucune fiche dans l\'historique.')
        return
      }

      const SEP = ';'
      const esc = (v: string) => {
        const s = String(v ?? '')
        return (s.includes(SEP) || s.includes('"') || s.includes('\n'))
          ? '"' + s.replace(/"/g, '""') + '"'
          : s
      }

      const HEADERS = [
        'NUMERO_REGISTRE',
        'NOM', 'PRENOMS', 'DATE_NAISSANCE', 'LIEU_NAISSANCE', 'NATIONALITE',
        'TYPE_PIECE', 'NUMERO_PIECE', 'DATE_EXPIRATION',
        'ADRESSE', 'PROFESSION', 'VENANT_DE', 'ALLANT_A',
        'NUMERO_CHAMBRE', 'DATE_ARRIVEE', 'DATE_DEPART',
        'NOM_HOTEL', 'DATE_ENREGISTREMENT',
      ]

      const rows = withParams.map(({ params: p, generatedAt }) => [
        p.registrationNumber ?? '',
        p.nom, p.prenoms, p.dateNaissance, p.lieuNaissance, p.nationalite,
        p.typePiece, p.numeroPiece, p.dateExpiration,
        p.adresse, p.profession, p.venantDe, p.allantA,
        p.numeroChambre, p.dateArrivee, p.dateDepart,
        p.hotelName,
        new Date(generatedAt).toLocaleDateString('fr-FR'),
      ].map(esc).join(SEP))

      // UTF-8 BOM pour compatibilité Excel/Windows
      const csv = '﻿' + [HEADERS.join(SEP), ...rows].join('\r\n')

      const hotelName = withParams[0]?.params.hotelName ?? 'HOTEL'
      const hotelSlug = hotelName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SYNEXIE_${hotelSlug}_${dateStr}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 15_000)
    } catch (err) {
      console.error('Erreur export SYNEXIE:', err)
      alert('Erreur lors de la génération du fichier SYNEXIE.')
    } finally {
      setExporting(false)
    }
  }

  // Synchroniser la ref pour que l'interval accède toujours à la dernière version
  useEffect(() => {
    printAllRef.current = handlePrintAll
  })

  // Vérification 20h Dakar (Africa/Dakar = UTC+0)
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
      const todayKey = now.toISOString().split('T')[0]
      const alreadyDone = localStorage.getItem('checkin_print_trigger_date') === todayKey

      if (alreadyDone || autoFiredRef.current) {
        setMinutesUntil20h(null)
        return
      }

      if (totalMinutes >= 20 * 60) {
        autoFiredRef.current = true
        setMinutesUntil20h(null)
        printAllRef.current?.(true)
      } else if (totalMinutes >= 19 * 60 + 30) {
        setMinutesUntil20h(20 * 60 - totalMinutes)
      } else {
        setMinutesUntil20h(null)
      }
    }

    check()
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, []) // refs uniquement — pas de dépendances d'état

  const unprintedCount = fiches.filter(f => !f.printed).length
  const alreadyPrinted = localStorage.getItem('checkin_print_trigger_date') === new Date().toISOString().split('T')[0]

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-4">
      <div className="max-w-3xl mx-auto">

        <BackButton />

        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a]">Fiches du jour</h1>
          <p className="text-[#64748b] mt-1 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Bannière compte à rebours (après 19h30) */}
        {minutesUntil20h !== null && (
          <div className="mb-5 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl mt-0.5">⏰</span>
            <div>
              <p className="font-semibold text-amber-800">
                Impression automatique dans {minutesUntil20h} minute{minutesUntil20h > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-600 mt-0.5">
                Le PDF groupé sera généré automatiquement à 20h00 Dakar
              </p>
            </div>
          </div>
        )}

        {/* Boutons actions */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handlePrintAll(false)}
            disabled={printing || unprintedCount === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {printing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>🖨 Imprimer toutes les fiches du jour</>
            )}
          </button>

          {/* Split-button Export SYNEXIE */}
          <div className="flex rounded-xl overflow-hidden shadow-sm border border-[#15803d]">
            <button
              onClick={() => void handleExportSynexie('today')}
              disabled={exporting || fiches.length === 0}
              className="flex items-center gap-2 px-4 py-3 bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exporter les fiches du jour au format SYNEXIE (gendarmerie)"
            >
              {exporting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>📤</span>
              }
              Export SYNEXIE
            </button>
            <button
              onClick={() => void handleExportSynexie('all')}
              disabled={exporting}
              className="px-3 py-3 bg-[#15803d] text-white text-xs font-medium hover:bg-[#166534] transition-colors border-l border-[#166534] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exporter toutes les fiches (historique complet)"
            >
              Tout
            </button>
          </div>

          {unprintedCount > 0 && !printing && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200">
              {unprintedCount} non imprimée{unprintedCount > 1 ? 's' : ''}
            </span>
          )}
          {alreadyPrinted && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
              ✓ Imprimées aujourd'hui
            </span>
          )}
        </div>

        {/* Chargement */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
          </div>
        )}

        {/* Vide */}
        {!loading && fiches.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-[#e2e8f0]">
            <p className="text-5xl mb-3">📋</p>
            <h3 className="text-lg font-semibold text-[#1e3a8a] mb-1">Aucune fiche pour aujourd'hui</h3>
            <p className="text-[#64748b] text-sm">Scannez des documents via l'onglet Scanner</p>
          </div>
        )}

        {/* Liste des fiches */}
        {!loading && fiches.length > 0 && (
          <div className="space-y-3">
            {fiches.map((fiche) => {
              const p = fiche.params
              return (
                <div
                  key={fiche.id}
                  className={`bg-white rounded-xl border px-5 py-4 transition-colors ${
                    fiche.printed
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-[#e2e8f0]'
                  }`}
                >
                  {/* Ligne 1 : nom + statut + heure */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[#1e3a8a] text-base leading-tight">
                        {p.nom} {p.prenoms}
                      </h3>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Enregistré à {formatTime(fiche.generatedAt)}
                      </p>
                      {p.registrationNumber && (
                        <p className="text-xs font-mono font-semibold text-[#1e3a8a] mt-0.5">
                          N° {p.registrationNumber}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 ml-3 text-xs px-2.5 py-1 rounded-full font-medium ${
                        fiche.printed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {fiche.printed ? '✓ Imprimée' : 'En attente'}
                    </span>
                  </div>

                  {/* Grille détails */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2.5">
                    <Field label="Nationalité" value={p.nationalite} />
                    <Field label="Chambre" value={p.numeroChambre} />
                    <Field label="Date arrivée" value={p.dateArrivee} />
                    <Field label="Venant de" value={p.venantDe} />
                    <Field label="Allant à" value={p.allantA} />
                    <Field label={p.typePiece || 'N° pièce'} value={p.numeroPiece} />
                  </div>

                  {/* Bouton voir PDF individuel */}
                  <button
                    onClick={() => handleViewSingle(fiche)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1e3a8a] border border-[#1e3a8a]/40 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    📄 Voir la fiche PDF
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
