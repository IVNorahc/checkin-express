import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
// ── Types ─────────────────────────────────────────────────────────────────────

interface LoginLog {
  id: string
  device: string | null
  browser: string | null
  created_at: string
}

interface Employee {
  id: string
  email: string
  nom: string
  role: string
  status: 'pending' | 'active' | 'inactive'
  created_at: string
}

interface Hotel {
  id: string
  hotel_name: string
  address?: string
  phone: string
  email?: string
  city?: string
  website?: string
  logo_url?: string
  numero_registre?: string
  numero_agrement?: string
  subscription_status: string
  trial_end?: string
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\.]/g, '')
  return /^(\+221|221)?[73]\d{8}$/.test(cleaned) || /^\+[1-9]\d{6,14}$/.test(cleaned)
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function Field({
  label, name, value, onChange, type = 'text', required = false,
  placeholder = '', hint = '', span = false,
}: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; required?: boolean; placeholder?: string; hint?: string; span?: boolean
}) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

function StatusBanner({ text, type, onDismiss }: {
  text: string; type: 'error' | 'success'; onDismiss: () => void
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl mb-4 text-sm ${
      type === 'error'
        ? 'bg-red-50 border border-red-200 text-red-700'
        : 'bg-green-50 border border-green-200 text-green-700'
    }`}>
      <span>{text}</span>
      <button onClick={onDismiss} className="text-current opacity-50 hover:opacity-100 shrink-0 text-base leading-none">✕</button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Parametres() {
  const [userEmail, setUserEmail] = useState('')
  const [hotel, setHotel]         = useState<Hotel | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [logoCacheBust, setLogoCacheBust] = useState(Date.now())
  const [showLogout, setShowLogout] = useState(false)
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [mfaEnabled, setMfaEnabled]       = useState(false)
  const [mfaFactorId, setMfaFactorId]     = useState<string | null>(null)
  const [mfaEnrolling, setMfaEnrolling]   = useState(false)
  const [enrollData, setEnrollData]       = useState<{ qr_code: string; secret: string; factorId: string } | null>(null)
  const [mfaCode, setMfaCode]             = useState('')
  const [mfaVerifying, setMfaVerifying]   = useState(false)
  const [mfaDisabling, setMfaDisabling]   = useState(false)
  const [mfaError, setMfaError]           = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const doSignOut = async () => {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  // ── Employee state ───────────────────────────────────────────────────────────
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [empLoading, setEmpLoading]     = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteNom, setInviteNom]       = useState('')
  const [inviting, setInviting]         = useState(false)
  const [empError, setEmpError]         = useState<string | null>(null)
  const [empSuccess, setEmpSuccess]     = useState<string | null>(null)

  const [form, setForm] = useState({
    hotel_name:       '',
    address:          '',
    city:             '',
    phone:            '',
    email:            '',
    website:          '',
    numero_registre:  '',
    numero_agrement:  '',
  })

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserEmail(user.email ?? '')

        const { data, error: err } = await supabase
          .from('hotels')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (err) { setError('Erreur chargement des données'); return }

        setHotel(data)
        setForm({
          hotel_name:      data.hotel_name      ?? '',
          address:         data.address         ?? '',
          city:            data.city            ?? '',
          phone:           data.phone           ?? '',
          email:           data.email           ?? '',
          website:         data.website         ?? '',
          numero_registre: data.numero_registre ?? '',
          numero_agrement: data.numero_agrement ?? '',
        })

        // Isolated — never blocks page render
        loadEmployees(data.id)
        loadLoginLogs(data.id)
        checkMfaStatus()
      } catch {
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Save hotel info + legal ──────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotel?.id) return
    setError(null); setSuccess(null); setSaving(true)

    if (!form.phone) {
      setError('Le téléphone est obligatoire.'); setSaving(false); return
    }
    if (!isValidPhone(form.phone)) {
      setError('Téléphone invalide — format attendu : +221XXXXXXXXX, 7XXXXXXXX ou +33XXXXXXXXX')
      setSaving(false); return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Adresse email invalide.')
      setSaving(false); return
    }

    try {
      const payload = {
        hotel_name:      form.hotel_name.trim(),
        address:         form.address.trim(),
        city:            form.city.trim(),
        phone:           form.phone.trim(),
        email:           form.email.trim(),
        website:         form.website.trim(),
        numero_registre: form.numero_registre.trim(),
        numero_agrement: form.numero_agrement.trim(),
      }
      const { error: err } = await supabase
        .from('hotels')
        .update(payload)
        .eq('id', hotel.id)

      if (err) {
        console.error('[Parametres] Supabase error:', err)
        setError(`Erreur Supabase (${err.code}) : ${err.message}`)
        return
      }

      setHotel(prev => prev ? { ...prev, ...form } : null)
      setSuccess('Informations enregistrées avec succès.')
    } catch (err) {
      console.error('[Parametres] Unexpected error:', err)
      setError('Erreur inattendue lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // ── Logo upload ──────────────────────────────────────────────────────────────

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !hotel?.id) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format invalide — JPG, PNG ou WebP uniquement.'); return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 Mo."); return
    }

    setLogoUploading(true); setError(null); setSuccess(null)
    console.log('[Logo] Upload start — hotelId:', hotel.id, '| file:', file.name, file.type, file.size)

    try {
      const storagePath = `${hotel.id}/logo`
      console.log('[Logo] Storage path:', `hotel-logos/${storagePath}`)

      const { error: uploadErr } = await supabase.storage
        .from('hotel-logos')
        .upload(storagePath, file, { upsert: true, contentType: file.type })

      if (uploadErr) {
        console.error('[Logo] Storage upload error:', uploadErr)
        // Extraire le message d'un StorageError (ce n'est pas un JS Error)
        const storageMsg = (uploadErr as { message?: string }).message ?? JSON.stringify(uploadErr)
        const statusCode = (uploadErr as { statusCode?: string }).statusCode ?? ''
        throw new Error(`Storage [${statusCode}] : ${storageMsg}`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('hotel-logos')
        .getPublicUrl(storagePath)
      console.log('[Logo] Public URL:', publicUrl)

      const { error: updateErr } = await supabase
        .from('hotels')
        .update({ logo_url: publicUrl })
        .eq('id', hotel.id)

      if (updateErr) {
        console.error('[Logo] hotels.logo_url update error:', updateErr)
        throw new Error(`DB update [${updateErr.code}] : ${updateErr.message}`)
      }

      console.log('[Logo] Saved ✓')
      setHotel(prev => prev ? { ...prev, logo_url: publicUrl } : null)
      setLogoCacheBust(Date.now())
      setSuccess('Logo mis à jour avec succès.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('[Logo] Final catch:', msg)
      setError(
        msg.includes('Bucket not found') || msg.includes('404')
          ? "Bucket 'hotel-logos' introuvable — créez-le dans Supabase Storage (public)."
          : msg.includes('403') || msg.includes('Unauthorized') || msg.includes('policy')
            ? `Accès refusé au Storage — vérifiez les policies RLS du bucket hotel-logos. (${msg})`
            : `Erreur upload logo : ${msg}`
      )
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Change password ──────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!userEmail) return
    setError(null); setSuccess(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) setError("Erreur lors de l'envoi de l'email.")
    else setSuccess('Email de réinitialisation envoyé. Vérifiez votre boîte.')
  }

  // ── 2FA helpers ──────────────────────────────────────────────────────────────

  const checkMfaStatus = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find(f => f.status === 'verified')
    if (verified) {
      setMfaEnabled(true)
      setMfaFactorId(verified.id)
    }
  }

  const handleStartEnroll = async () => {
    setMfaError(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error || !data) {
      setMfaError('Erreur lors de la génération du QR code.')
      return
    }
    setEnrollData({ qr_code: data.totp.qr_code, secret: data.totp.secret, factorId: data.id })
    setMfaEnrolling(true)
  }

  const handleVerifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollData) return
    setMfaVerifying(true)
    setMfaError(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollData.factorId,
      code: mfaCode,
    })
    if (error) {
      setMfaError("Code incorrect. Réessayez avec un nouveau code de l'application.")
      setMfaCode('')
      setMfaVerifying(false)
      return
    }
    setMfaEnabled(true)
    setMfaFactorId(enrollData.factorId)
    setMfaEnrolling(false)
    setEnrollData(null)
    setMfaCode('')
    setMfaVerifying(false)
    setSuccess('Double authentification activée avec succès.')
  }

  const handleUnenroll = async () => {
    if (!mfaFactorId) return
    if (!window.confirm('Désactiver la double authentification ? Votre compte sera moins sécurisé.')) return
    setMfaDisabling(true)
    setMfaError(null)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
    if (error) {
      setMfaError('Erreur lors de la désactivation.')
      setMfaDisabling(false)
      return
    }
    setMfaEnabled(false)
    setMfaFactorId(null)
    setMfaDisabling(false)
    setSuccess('Double authentification désactivée.')
  }

  // ── Employee helpers ──────────────────────────────────────────────────────────

  const loadLoginLogs = async (hotelId: string) => {
    setLogsLoading(true)
    try {
      const { data } = await supabase
        .from('login_logs')
        .select('id, device, browser, created_at')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setLoginLogs(data as LoginLog[])
    } catch {
      // table may not exist yet — silently ignore
    } finally {
      setLogsLoading(false)
    }
  }

  const loadEmployees = async (hotelId: string) => {
    setEmpLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('hotel_employees')
        .select('id, email, nom, role, status, created_at')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
      if (err) {
        console.warn('[Employees] Query error (table may not exist yet):', err.message)
      } else if (data) {
        setEmployees(data as Employee[])
      }
    } catch (e) {
      console.warn('[Employees] Unexpected error in loadEmployees:', e)
    } finally {
      setEmpLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotel?.id) return
    setEmpError(null); setEmpSuccess(null)

    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setEmpError('Adresse email invalide.'); return
    }
    if (!inviteNom.trim()) {
      setEmpError('Le nom est obligatoire.'); return
    }

    setInviting(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('invite-employee', {
        body: { hotel_id: hotel.id, email: inviteEmail.trim(), nom: inviteNom.trim() },
      })

      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)

      setEmpSuccess(`Invitation envoyée à ${inviteEmail.trim()}`)
      setInviteEmail('')
      setInviteNom('')
      await loadEmployees(hotel.id)
    } catch (err: any) {
      setEmpError(err?.message || "Erreur lors de l'invitation.")
    } finally {
      setInviting(false)
    }
  }

  const handleToggleEmployee = async (emp: Employee) => {
    if (!hotel?.id) return
    const newStatus = emp.status === 'active' ? 'inactive' : 'active'
    const { error: err } = await supabase
      .from('hotel_employees')
      .update({ status: newStatus })
      .eq('id', emp.id)
    if (err) { setEmpError('Erreur lors de la mise à jour.'); return }
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: newStatus } : e))
  }

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!hotel?.id) return
    if (!window.confirm(`Supprimer ${emp.nom} (${emp.email}) ?`)) return
    const { error: err } = await supabase
      .from('hotel_employees')
      .delete()
      .eq('id', emp.id)
    if (err) { setEmpError('Erreur lors de la suppression.'); return }
    setEmployees(prev => prev.filter(e => e.id !== emp.id))
  }

  // ── Subscription badge ───────────────────────────────────────────────────────

  const subBadge = () => {
    if (!hotel) return null
    const { subscription_status: s, trial_end } = hotel
    const color =
      s === 'trial'    ? 'bg-yellow-100 text-yellow-800' :
      s === 'starter'  ? 'bg-blue-100 text-blue-800' :
      s === 'business' ? 'bg-green-100 text-green-800' :
                         'bg-red-100 text-red-800'
    const label =
      s === 'trial'    ? 'Trial' :
      s === 'starter'  ? 'Starter' :
      s === 'business' ? 'Business' : 'Expiré'
    const expiry = (s === 'trial' && trial_end)
      ? ` · expire le ${new Date(trial_end).toLocaleDateString('fr-FR')}`
      : ''
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}{expiry}
      </span>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a8a]" />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {showLogout && (
        <LogoutConfirmModal onConfirm={() => void doSignOut()} onCancel={() => setShowLogout(false)} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-1.5">
            <img src="/percepta-logo.png" className="h-8 w-auto object-contain" alt="Percepta" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Check-in Express</h1>
            <p className="text-blue-200 text-xs mt-0.5">Paramètres</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-lg text-sm"
        >
          Déconnexion
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {error   && <StatusBanner text={error}   type="error"   onDismiss={() => setError(null)} />}
        {success && <StatusBanner text={success} type="success" onDismiss={() => setSuccess(null)} />}

        {/* ── 1. Informations hôtel ─────────────────────────────────────────── */}
        <SectionCard title="Informations hôtel">
          <form onSubmit={handleSave} className="space-y-4">
            <FieldRow>
              <Field label="Nom de l'hôtel" name="hotel_name" value={form.hotel_name}
                onChange={onChange} required placeholder="Hôtel de la Paix" />
              <Field label="Téléphone" name="phone" value={form.phone}
                onChange={onChange} required type="tel"
                placeholder="+221 77 000 00 00"
                hint="Format : +221XXXXXXXXX ou 7XXXXXXXX" />
            </FieldRow>
            <Field label="Adresse complète" name="address" value={form.address}
              onChange={onChange} placeholder="123 Rue Carnot" span />
            <FieldRow>
              <Field label="Ville" name="city" value={form.city}
                onChange={onChange} placeholder="Dakar" />
              <Field label="Email de contact" name="email" value={form.email}
                onChange={onChange} type="email" placeholder="contact@monhotel.sn" />
            </FieldRow>
            <Field label="Site web" name="website" value={form.website}
              onChange={onChange} type="url" placeholder="https://monhotel.sn"
              hint="Optionnel" span />

            {/* ── 3. Informations légales (dans le même formulaire) ──────────── */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">Informations légales</p>
              <FieldRow>
                <Field label="N° registre de commerce" name="numero_registre"
                  value={form.numero_registre} onChange={onChange}
                  placeholder="RCCM SN-DKR-…" hint="Optionnel" />
                <Field label="N° agrément hôtelier" name="numero_agrement"
                  value={form.numero_agrement} onChange={onChange}
                  placeholder="AGR-…" hint="Optionnel" />
              </FieldRow>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* ── 2. Logo hôtel ─────────────────────────────────────────────────── */}
        <SectionCard title="Logo de l'hôtel">
          <div className="flex items-start gap-5">
            {/* Prévisualisation */}
            <div className="shrink-0 w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {hotel?.logo_url ? (
                <img
                  src={`${hotel.logo_url}?cb=${logoCacheBust}`}
                  alt="Logo hôtel"
                  className="w-full h-full object-contain p-1"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-3xl">🏨</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 mb-3">
                Le logo s'affiche dans l'en-tête des fiches de police PDF générées.
              </p>
              <label className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                logoUploading
                  ? 'opacity-50 pointer-events-none bg-gray-100 border-gray-300 text-gray-500'
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
              }`}>
                {logoUploading ? (
                  <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Téléchargement…</>
                ) : (
                  <>{hotel?.logo_url ? '🔄 Changer le logo' : '📤 Choisir un logo'}</>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">JPG, PNG ou WebP · max 2 Mo</p>
            </div>
          </div>
        </SectionCard>

        {/* ── 4. Compte utilisateur ─────────────────────────────────────────── */}
        <SectionCard title="Compte utilisateur">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input
                type="email" value={userEmail} disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Non modifiable</p>
            </div>
            <button
              type="button"
              onClick={handleChangePassword}
              className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Envoyer un lien de réinitialisation du mot de passe
            </button>
          </div>
        </SectionCard>

        {/* ── 4.5. Sécurité ─────────────────────────────────────────────────── */}
        <SectionCard title="Sécurité">
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Double authentification (2FA)</p>
                <p className="text-xs text-gray-400 mt-0.5">Protégez votre compte avec Google Authenticator ou Authy</p>
              </div>
              <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {mfaEnabled ? '● Activé' : '● Inactif'}
              </span>
            </div>

            {mfaError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{mfaError}</p>
            )}

            {/* Non inscrit → bouton activer */}
            {!mfaEnabled && !mfaEnrolling && (
              <button
                type="button"
                onClick={() => void handleStartEnroll()}
                className="w-full px-4 py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Activer la double authentification
              </button>
            )}

            {/* Enrollment en cours → QR code + saisie code */}
            {mfaEnrolling && enrollData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Scannez ce QR code avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>, puis entrez le code généré ci-dessous.
                  </p>
                  <div className="inline-block border border-gray-200 rounded-xl p-3 bg-white shadow-sm">
                    <img src={enrollData.qr_code} alt="QR Code 2FA" className="w-48 h-48 mx-auto" />
                  </div>
                  <details className="mt-3 text-left">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 text-center">Afficher le code secret (saisie manuelle)</summary>
                    <p className="mt-1.5 font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all select-all">{enrollData.secret}</p>
                  </details>
                </div>
                <form onSubmit={e => void handleVerifyEnroll(e)} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification (6 chiffres)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-widest bg-white text-gray-900 focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setMfaEnrolling(false); setEnrollData(null); setMfaCode(''); setMfaError(null) }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={mfaVerifying || mfaCode.length !== 6}
                      className="flex-1 px-4 py-2.5 bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {mfaVerifying ? 'Vérification…' : 'Confirmer'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Déjà activé → bouton désactiver */}
            {mfaEnabled && !mfaEnrolling && (
              <button
                type="button"
                onClick={() => void handleUnenroll()}
                disabled={mfaDisabling}
                className="w-full px-4 py-2.5 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {mfaDisabling ? 'Désactivation…' : 'Désactiver le 2FA'}
              </button>
            )}
          </div>
        </SectionCard>

        {/* ── 5. Employés ───────────────────────────────────────────────────── */}
        <SectionCard title="Employés">

          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-3 mb-5">
            <p className="text-sm text-gray-500 mb-3">
              Invitez vos réceptionnistes. Ils pourront scanner, consulter l'historique et générer des fiches, mais n'auront pas accès aux paramètres ni à la facturation.
            </p>
            {empError   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{empError}</p>}
            {empSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{empSuccess}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  placeholder="Marie Diop"
                  value={inviteNom}
                  onChange={e => setInviteNom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="marie@monhotel.sn"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={inviting}
                className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {inviting ? 'Envoi…' : '+ Inviter un employé'}
              </button>
            </div>
          </form>

          {/* Employee list */}
          {empLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#1e3a8a] rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Aucun employé pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {employees.map(emp => (
                <li key={emp.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{emp.nom}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.email}</p>
                    <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                      emp.status === 'active'   ? 'bg-green-100 text-green-700' :
                      emp.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-500'
                    }`}>
                      {emp.status === 'active' ? 'Actif' : emp.status === 'pending' ? 'Invitation envoyée' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {emp.status !== 'pending' && (
                      <button
                        onClick={() => handleToggleEmployee(emp)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          emp.status === 'active'
                            ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                            : 'border-green-300 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {emp.status === 'active' ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* ── 6. Abonnement ─────────────────────────────────────────────────── */}
        <SectionCard title="Abonnement">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Plan actuel</p>
              {subBadge()}
            </div>
            <button
              type="button"
              onClick={() => window.open('https://lemonsqueezy.com/billing', '_blank')}
              className="px-5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Gérer mon abonnement
            </button>
          </div>
        </SectionCard>

        {/* ── 7. Connexions récentes ─────────────────────────────────────── */}
        <SectionCard title="Connexions récentes">
          {logsLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#1e3a8a] rounded-full animate-spin" />
            </div>
          ) : loginLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Aucune connexion enregistrée.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {loginLogs.map((log, idx) => {
                const deviceIcon = log.device === 'mobile' ? '📱' : '💻'
                const browserIcon =
                  log.browser === 'Chrome'  ? '🌐' :
                  log.browser === 'Firefox' ? '🦊' :
                  log.browser === 'Safari'  ? '🧭' :
                  log.browser === 'Edge'    ? '🔷' : '🌍'
                const date = new Date(log.created_at)
                const label = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                  + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <li key={log.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{deviceIcon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {browserIcon} {log.browser ?? 'Navigateur inconnu'} · {log.device === 'mobile' ? 'Mobile' : 'Bureau'}
                        </p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Actuelle
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        {/* Footer légal */}
        <footer className="pt-2 pb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="hover:text-[#1e3a8a] transition-colors">
            CGU
          </a>
          <span>·</span>
          <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-[#1e3a8a] transition-colors">
            Politique de confidentialité
          </a>
          <span>·</span>
          <a href="mailto:perceptasn@gmail.com" className="hover:text-[#1e3a8a] transition-colors">
            perceptasn@gmail.com
          </a>
        </footer>

      </div>
    </div>
  )
}

