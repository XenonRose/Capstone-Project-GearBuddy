const STORAGE_KEY = 'gearbuddy-bookings'

export function getSavedBookings() {
  try {
    const savedBookings = localStorage.getItem(STORAGE_KEY)
    const parsedBookings = savedBookings ? JSON.parse(savedBookings) : []

    return Array.isArray(parsedBookings) ? parsedBookings : []
  } catch {
    return []
  }
}

export function saveBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  } catch {
    // The page can still show the current booking if browser storage is unavailable.
  }
}

export function addSavedBooking(booking) {
  const updatedBookings = [booking, ...getSavedBookings()]
  saveBookings(updatedBookings)
  return updatedBookings
}