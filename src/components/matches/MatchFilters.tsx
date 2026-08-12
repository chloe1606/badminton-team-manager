import { clubDirectory } from '../../data/clubContacts'

export interface MatchFiltersValue {
  season: string
  opponentClubId: string
  location: 'all' | 'home' | 'away'
  availabilityStatus: 'all' | 'available' | 'unavailable' | 'selected' | 'not_selected' | 'missing_response'
}

interface MatchFiltersProps {
  filters: MatchFiltersValue
  onChange: (filters: MatchFiltersValue) => void
  seasonOptions: string[]
}

export function MatchFilters({ filters, onChange, seasonOptions }: MatchFiltersProps) {
  function updateFilter<Key extends keyof MatchFiltersValue>(key: Key, value: MatchFiltersValue[Key]) {
    onChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div className="form-grid match-filter-grid">
      <label className="field">
        <span>Season</span>
        <select className="input" value={filters.season} onChange={(event) => updateFilter('season', event.target.value)}>
          <option value="">All seasons</option>
          {seasonOptions.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Opponent</span>
        <select
          className="input"
          value={filters.opponentClubId}
          onChange={(event) => updateFilter('opponentClubId', event.target.value)}
        >
          <option value="">All opponents</option>
          {clubDirectory.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Location</span>
        <select className="input" value={filters.location} onChange={(event) => updateFilter('location', event.target.value as MatchFiltersValue['location'])}>
          <option value="all">All locations</option>
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      </label>
      <label className="field">
        <span>Availability status</span>
        <select
          className="input"
          value={filters.availabilityStatus}
          onChange={(event) =>
            updateFilter('availabilityStatus', event.target.value as MatchFiltersValue['availabilityStatus'])
          }
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="selected">Selected</option>
          <option value="not_selected">Not selected</option>
          <option value="missing_response">Missing response</option>
        </select>
      </label>
    </div>
  )
}
