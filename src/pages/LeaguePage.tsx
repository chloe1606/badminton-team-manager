import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { clubDirectory } from '../data/clubContacts'
import { listTeamMatchSettings, upsertTeamMatchSettings, type TeamMatchSettingsRecord } from '../services/leagueService'
import { getAddressById, getClubById } from '../utils/matches'

export function LeaguePage() {
  const { teamSettings } = useAppData()
  const [matchType, setMatchType] = useState('Mixed 6')
  const [divisionNumber, setDivisionNumber] = useState('3')
  const [homeClubId, setHomeClubId] = useState('park-langley')
  const [homeVenueId, setHomeVenueId] = useState('park-langley-the-parklangley-club')
  const [leagueName, setLeagueName] = useState('NWKBA')
  const [teamName, setTeamName] = useState(teamSettings.profile.teamName)
  const [teamNumber, setTeamNumber] = useState(teamSettings.profile.teamNumber?.toString() ?? '')
  const [teamLabel, setTeamLabel] = useState(teamSettings.profile.teamLabel)
  const [bestOf, setBestOf] = useState(String(teamSettings.matchFormat.scoring.bestOf))
  const [targetScore, setTargetScore] = useState(String(teamSettings.matchFormat.scoring.targetScore))
  const [winBy, setWinBy] = useState(String(teamSettings.matchFormat.scoring.winBy))
  const [capScore, setCapScore] = useState(String(teamSettings.matchFormat.scoring.capScore))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [teamOptions, setTeamOptions] = useState<TeamMatchSettingsRecord[]>([])

  const selectedHomeClub = useMemo(() => getClubById(clubDirectory, homeClubId), [homeClubId])
  const homeVenues = selectedHomeClub?.addresses ?? []
  const selectedVenue = useMemo(
    () => getAddressById(selectedHomeClub, homeVenueId),
    [homeVenueId, selectedHomeClub],
  )

  const teamTypeOptions = useMemo(() => {
    return [...new Set(teamOptions.map((setting) => setting.matchType))]
      .filter((value) => value.trim().length > 0)
      .sort((a, b) => a.localeCompare(b))
  }, [teamOptions])

  const leagueNameOptions = useMemo(() => {
    return [...new Set(teamOptions.map((setting) => setting.leagueName).filter(Boolean) as string[])]
      .filter((value) => value.trim().length > 0)
      .sort((a, b) => a.localeCompare(b))
  }, [teamOptions])

  const teamNumberOptions = useMemo(() => {
    const rowsForTeam = teamOptions.filter((setting) => setting.matchType === matchType)
    const rowsForDivision = rowsForTeam.filter((setting) => String(setting.divisionNumber) === divisionNumber)
    const source = rowsForDivision.length > 0 ? rowsForDivision : rowsForTeam
    const values = [...new Set(source.map((setting) => (setting.teamNumber === null ? '' : String(setting.teamNumber))))]
    const sortedValues = values.sort((a, b) => {
      if (!a) return -1
      if (!b) return 1
      return Number(a) - Number(b)
    })
    return sortedValues.length > 0 ? sortedValues : ['']
  }, [teamOptions, matchType, divisionNumber])

  useEffect(() => {
    listTeamMatchSettings()
      .then(setTeamOptions)
      .catch(() => {
        setTeamOptions([])
      })
  }, [])

  useEffect(() => {
    setTeamName(teamSettings.profile.teamName)
    setTeamNumber(teamSettings.profile.teamNumber?.toString() ?? '')
    setTeamLabel(teamSettings.profile.teamLabel)
    setHomeClubId(teamSettings.profile.homeClubId)
    setHomeVenueId(teamSettings.profile.homeVenueId)
    setLeagueName(teamSettings.profile.leagueName ?? 'NWKBA')
    setBestOf(String(teamSettings.matchFormat.scoring.bestOf))
    setTargetScore(String(teamSettings.matchFormat.scoring.targetScore))
    setWinBy(String(teamSettings.matchFormat.scoring.winBy))
    setCapScore(String(teamSettings.matchFormat.scoring.capScore))
  }, [teamSettings])

  useEffect(() => {
    if (teamTypeOptions.length > 0 && !teamTypeOptions.includes(matchType)) {
      setMatchType(teamTypeOptions[0])
    }
  }, [teamTypeOptions, matchType])

  useEffect(() => {
    if (leagueNameOptions.length > 0 && !leagueNameOptions.includes(leagueName)) {
      setLeagueName(leagueNameOptions[0])
    }
  }, [leagueNameOptions, leagueName])

  useEffect(() => {
    if (!teamNumberOptions.includes(teamNumber)) {
      setTeamNumber(teamNumberOptions[0] ?? '')
    }
  }, [teamNumberOptions, teamNumber])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    try {
      const updatedSettings = await upsertTeamMatchSettings({
        matchType,
        divisionNumber: Number(divisionNumber),
        teamName: teamName.trim(),
        teamNumber: teamNumber ? Number(teamNumber) : null,
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
        homeClubId,
        homeVenueId,
        leagueName: leagueName.trim(),
      })
      setTeamName(updatedSettings.teamName)
      setTeamNumber(updatedSettings.teamNumber?.toString() ?? '')
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
            <span>Team</span>
            <select className="input" value={matchType} onChange={(event) => setMatchType(event.target.value)}>
              {(teamTypeOptions.length > 0 ? teamTypeOptions : [matchType]).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Division</span>
            <input className="input" value={divisionNumber} onChange={(event) => setDivisionNumber(event.target.value)} />
          </label>
          <label className="field">
            <span>League name</span>
            <select className="input" value={leagueName} onChange={(event) => setLeagueName(event.target.value)}>
              {(leagueNameOptions.length > 0 ? leagueNameOptions : [leagueName]).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Team number</span>
            <select className="input" value={teamNumber} onChange={(event) => setTeamNumber(event.target.value)}>
              {teamNumberOptions.map((value) => (
                <option key={value} value={value}>
                  {value ? value : 'Not set'}
                </option>
              ))}
            </select>
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
          {teamNumber ? <> <strong>{teamNumber}</strong></> : null}
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
