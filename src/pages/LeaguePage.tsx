import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import { upsertLeagueContextDetails, upsertTeamMatchSettings } from '../services/leagueService'
import { getAddressById, getClubById } from '../utils/matches'

export function LeaguePage() {
  const { teamSettings } = useAppData()
  const [matchType, setMatchType] = useState('Mixed 6')
  const [divisionNumber, setDivisionNumber] = useState('3')
  const [homeClubId, setHomeClubId] = useState('park-langley')
  const [homeVenueId, setHomeVenueId] = useState('park-langley-the-parklangley-club')
  const [leagueName, setLeagueName] = useState('NWKBA')
  const [teamName, setTeamName] = useState(teamSettings.profile.teamName)
  const [teamNumber, setTeamNumber] = useState(String(teamSettings.profile.teamNumber))
  const [teamLabel, setTeamLabel] = useState(teamSettings.profile.teamLabel)
  const [bestOf, setBestOf] = useState(String(teamSettings.matchFormat.scoring.bestOf))
  const [targetScore, setTargetScore] = useState(String(teamSettings.matchFormat.scoring.targetScore))
  const [winBy, setWinBy] = useState(String(teamSettings.matchFormat.scoring.winBy))
  const [capScore, setCapScore] = useState(String(teamSettings.matchFormat.scoring.capScore))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const selectedHomeClub = useMemo(() => getClubById(clubDirectory, homeClubId), [homeClubId])
  const homeVenues = selectedHomeClub?.addresses ?? []
  const selectedVenue = useMemo(
    () => getAddressById(selectedHomeClub, homeVenueId),
    [homeVenueId, selectedHomeClub],
  )
  useEffect(() => {
    setTeamName(teamSettings.profile.teamName)
    setTeamNumber(String(teamSettings.profile.teamNumber))
    setTeamLabel(teamSettings.profile.teamLabel)
    setHomeClubId(teamSettings.profile.homeClubId)
    setHomeVenueId(teamSettings.profile.homeVenueId)
    setLeagueName(teamSettings.profile.leagueName ?? 'NWKBA')
    setBestOf(String(teamSettings.matchFormat.scoring.bestOf))
    setTargetScore(String(teamSettings.matchFormat.scoring.targetScore))
    setWinBy(String(teamSettings.matchFormat.scoring.winBy))
    setCapScore(String(teamSettings.matchFormat.scoring.capScore))
  }, [teamSettings])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    try {
      const updatedSettings = await upsertTeamMatchSettings({
        matchType,
        divisionNumber: Number(divisionNumber),
        teamName: teamName.trim(),
        teamNumber: Number(teamNumber),
        teamLabel: teamLabel.trim(),
        format: {
          ...teamSettings.matchFormat,
          scoring: {
            ...teamSettings.matchFormat.scoring,
            bestOf: Number(bestOf),
            targetScore: Number(targetScore),
            winBy: Number(winBy),
            capScore: Number(capScore),
          },
        },
      })
      await upsertLeagueContextDetails({
        matchType,
        divisionNumber: Number(divisionNumber),
        homeClubId,
        homeVenueId,
        leagueName: leagueName.trim(),
      })
      setTeamName(updatedSettings.teamName)
      setTeamNumber(String(updatedSettings.teamNumber))
      setTeamLabel(updatedSettings.teamLabel)
      setStatus('League settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save league settings.')
    }
  }

  return (
    <div className="stack">
      <Card>
        <h1>League</h1>
        <p>Edit home club, home venue, and league name for the selected match context.</p>
      </Card>
      <Card>
        <div className="form-grid">
          <label className="field">
            <span>Match type</span>
            <select className="input" value={matchType} onChange={(event) => setMatchType(event.target.value)}>
              <option>Mixed 6</option>
              <option>Mixed 4</option>
              <option>Mens 6</option>
            </select>
          </label>
          <label className="field">
            <span>Division</span>
            <input className="input" value={divisionNumber} onChange={(event) => setDivisionNumber(event.target.value)} />
          </label>
          <label className="field">
            <span>League name</span>
            <input className="input" value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
          </label>
          <label className="field">
            <span>Home club</span>
            <select className="input" value={homeClubId} onChange={(event) => setHomeClubId(event.target.value)}>
              {clubDirectory.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Home venue</span>
            <select className="input" value={homeVenueId} onChange={(event) => setHomeVenueId(event.target.value)}>
              {homeVenues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.venueName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          Current team: <strong>{teamSettings.profile.teamName}</strong>
          {' '}· Match type: <strong>{matchType}</strong> · Division: <strong>{divisionNumber}</strong>
          {' '}· Selected venue: <strong>{selectedVenue?.venueName ?? 'Venue TBC'}</strong>
        </p>
        <form className="stack" onSubmit={handleSubmit}>
          <Button type="submit">Save league settings</Button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
        {status ? <p className="muted">{status}</p> : null}
      </Card>
    </div>
  )
}
