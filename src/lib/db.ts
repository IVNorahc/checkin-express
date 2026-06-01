import Dexie, { type Table } from 'dexie'

export interface Client {
  id?: number
  surname: string
  givenNames: string
  dateOfBirth: string
  documentType: string
  documentNumber: string
  nationality: string
  sex: string
  expiryDate: string
  roomNumber: string
  scanDate: string
  printed: boolean
  numero_registre?: string
  syncStatus?: 'synced' | 'pending_sync'
  pendingSyncData?: string
}

export interface FichePolice {
  id?: number
  clientId: number
  generatedAt: string
  roomNumber: string
  printed: boolean
  pdfData?: string      // legacy: base64 data URI (v1)
  ficheParams?: string  // JSON.stringify(FicheParams) pour régénération PDF
  numero_registre?: string
}

class HotelDatabase extends Dexie {
  clients!: Table<Client>
  fichesPolice!: Table<FichePolice>

  constructor(hotelId: string) {
    super(`hotel-${hotelId}`)
    this.version(1).stores({
      clients: '++id, surname, documentNumber, scanDate, roomNumber',
      fichesPolice: '++id, clientId, generatedAt, roomNumber'
    })
    // v2 : index 'printed' pour requêtes efficaces sur fiches non imprimées
    this.version(2).stores({
      clients: '++id, surname, documentNumber, scanDate, roomNumber',
      fichesPolice: '++id, clientId, generatedAt, roomNumber, printed'
    })
    // v3 : index 'syncStatus' pour le mode offline (pending_sync → synced)
    this.version(3).stores({
      clients: '++id, surname, documentNumber, scanDate, roomNumber, syncStatus',
      fichesPolice: '++id, clientId, generatedAt, roomNumber, printed'
    })
  }
}

let db: HotelDatabase | null = null

export function initDB(hotelId: string) {
  db = new HotelDatabase(hotelId)
  return db
}

export function getDB() {
  if (!db) throw new Error('DB non initialisée')
  return db
}
