import type { ClubDirectoryEntry } from '../types/matches'
import rawClubDirectory from './clubContacts.json'

export const clubDirectory: ClubDirectoryEntry[] = (rawClubDirectory as ClubDirectoryEntry[]).sort(
  (left, right) => left.name.localeCompare(right.name),
)
