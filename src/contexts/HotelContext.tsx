import { createContext, useContext } from 'react'

export interface HotelContextValue {
  hotelId: string | null
  hotelName: string | null
  isEmployee: boolean
}

export const HotelContext = createContext<HotelContextValue>({
  hotelId: null,
  hotelName: null,
  isEmployee: false,
})

export const useHotel = () => useContext(HotelContext)
