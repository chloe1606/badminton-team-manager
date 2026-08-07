import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataProvider'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { formatTeamDisplayName } from '../utils/matches'

function parsePositiveInteger(value: string): number | null {
  const parsedValue = Number(value)
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null
  }

  return parsedValue
}

export function SettingsPage() {
  const { teamSettings, updateTeamSettings } = useAppData()
  const [teamName, setTeamName] = useState(teamSettings.profile.teamName)
  const [teamNumber, setTeamNumber] = useState(String(teamSettings.profile.teamNumber))
  const [teamLabel, setTeamLabel] = useState(teamSettings.profile.teamLabel)
  const [leagueName, setLeagueName] = useState(teamSettings.profile.leagueName)
  const [numberOfRubbers, setNumberOfRubbers] = useState(
    String(teamSettings.matchFormat.numberOfRubbers),
  )
  const [pairingSlotsText, setPairingSlotsText] = useState(
    teamSettings.matchFormat.pairingSlots.join('\n'),
  )
  const [presetName, setPresetName] = useState(teamSettings.matchFormat.scoring.presetName)
  const [bestOf, setBestOf] = useState(String(teamSettings.matchFormat.scoring.bestOf))
  const [targetScore, setTargetScore] = useState(String(teamSettings.matchFormat.scoring.targetScore))
  const [winBy, setWinBy] = useState(String(teamSettings.matchFormat.scoring.winBy))
  const [capScore, setCapScore] = useState(String(teamSettings.matchFormat.scoring.capScore))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setTeamName(teamSettings.profile.teamName)
    setTeamNumber(String(teamSettings.profile.teamNumber))
    setTeamLabel(teamSettings.profile.teamLabel)
    setLeagueName(teamSettings.profile.leagueName)
    setNumberOfRubbers(String(teamSettings.matchFormat.numberOfRubbers))
    setPairingSlotsText(teamSettings.matchFormat.pairingSlots.join('\n'))
    setPresetName(teamSettings.matchFormat.scoring.presetName)
    setBestOf(String(teamSettings.matchFormat.scoring.bestOf))
    setTargetScore(String(teamSettings.matchFormat.scoring.targetScore))
    setWinBy(String(teamSettings.matchFormat.scoring.winBy))
    setCapScore(String(teamSettings.matchFormat.scoring.capScore))
  }, [teamSettings])

  const currentTeamName = useMemo(
    () => formatTeamDisplayName(teamSettings.profile),
    [teamSettings.profile],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    const parsedTeamNumber = parsePositiveInteger(teamNumber)
    const parsedRubbers = parsePositiveInteger(numberOfRubbers)
    const parsedBestOf = parsePositiveInteger(bestOf)
    const parsedTargetScore = parsePositiveInteger(targetScore)
    const parsedWinBy = parsePositiveInteger(winBy)
    const parsedCapScore = parsePositiveInteger(capScore)
    const pairingSlots = pairingSlotsText
      .split('\n')
      .map((slot) => slot.trim())
      .filter(Boolean)

    if (!teamName.trim() || !teamLabel.trim() || !leagueName.trim() || !presetName.trim()) {
      setError('Team, league, and scoring preset details are required.')
      return
    }

    if (
      !parsedTeamNumber ||
      !parsedRubbers ||
      !parsedBestOf ||
      !parsedTargetScore ||
      !parsedWinBy ||
      !parsedCapScore
    ) {
      setError('All numeric configuration values must be whole numbers greater than zero.')
      return
    }

    if (parsedBestOf % 2 === 0) {
      setError('Best-of scoring must be an odd number.')
      return
    }

    if (pairingSlots.length === 0) {
      setError('Add at least one pairing slot.')
      return
    }

    if (parsedCapScore < parsedTargetScore) {
      setError('Score cap must be greater than or equal to the target score.')
      return
    }

    updateTeamSettings({
      profile: {
        teamName: teamName.trim(),
        teamNumber: parsedTeamNumber,
        teamLabel: teamLabel.trim(),
        leagueName: leagueName.trim(),
      },
      matchFormat: {
        numberOfRubbers: parsedRubbers,
        pairingSlots,
        scoring: {
          presetName: presetName.trim(),
          bestOf: parsedBestOf,
          targetScore: parsedTargetScore,
          winBy: parsedWinBy,
          capScore: parsedCapScore,
        },
      },
    })
    setStatus('Settings saved.')
  }

  return (
    <div className="stack">
      <Card>
        <h1>Settings</h1>
        <p>
          Update the current team profile and league format defaults used when admins create new
          matches.
        </p>
        <p className="muted">
          Current team: <strong>{currentTeamName}</strong> · League:{' '}
          <strong>{teamSettings.profile.leagueName}</strong>
        </p>
      </Card>

      <Card>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field">
              <span>Team name</span>
              <input className="input" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
            </label>

            <label className="field">
              <span>Team number</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                type="number"
                value={teamNumber}
                onChange={(event) => setTeamNumber(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Team label</span>
              <input
                className="input"
                value={teamLabel}
                onChange={(event) => setTeamLabel(event.target.value)}
              />
            </label>

            <label className="field">
              <span>League name</span>
              <input
                className="input"
                value={leagueName}
                onChange={(event) => setLeagueName(event.target.value)}
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Number of rubbers</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                type="number"
                value={numberOfRubbers}
                onChange={(event) => setNumberOfRubbers(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Scoring preset</span>
              <input
                className="input"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Best of</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                step={2}
                type="number"
                value={bestOf}
                onChange={(event) => setBestOf(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Target score</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                type="number"
                value={targetScore}
                onChange={(event) => setTargetScore(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Win by</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                type="number"
                value={winBy}
                onChange={(event) => setWinBy(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Score cap</span>
              <input
                className="input"
                inputMode="numeric"
                min={1}
                type="number"
                value={capScore}
                onChange={(event) => setCapScore(event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>Pairing slots (one per line)</span>
            <textarea
              className="input textarea-input"
              rows={4}
              value={pairingSlotsText}
              onChange={(event) => setPairingSlotsText(event.target.value)}
            />
          </label>

          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          {status ? <p className="muted">{status}</p> : null}

          <div className="form-actions">
            <Button type="submit">Save settings</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
