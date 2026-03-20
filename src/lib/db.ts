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
}

export interface FichePolice {
  id?: number
  clientId: number
  generatedAt: string
  roomNumber: string
  printed: boolean
  pdfData?: string
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

