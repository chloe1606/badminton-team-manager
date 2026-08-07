import type { AuthUser } from '../types/auth'

export interface SamplePlayerLogin {
  id: string
  name: string
  email: string
  password: string
}

export const samplePlayerLogins: SamplePlayerLogin[] = [
  {
    id: 'alice-morgan',
    name: 'Alice Morgan',
    email: 'alice@badminton.local',
    password: 'alice123',
  },
  {
    id: 'ben-carter',
    name: 'Ben Carter',
    email: 'ben@badminton.local',
    password: 'ben123',
  },
  {
    id: 'chloe-evans',
    name: 'Chloe Evans',
    email: 'chloe@badminton.local',
    password: 'chloe123',
  },
  {
    id: 'daniel-shah',
    name: 'Daniel Shah',
    email: 'daniel@badminton.local',
    password: 'daniel123',
  },
  {
    id: 'emily-wright',
    name: 'Emily Wright',
    email: 'emily@badminton.local',
    password: 'emily123',
  },
  {
    id: 'farah-khan',
    name: 'Farah Khan',
    email: 'farah@badminton.local',
    password: 'farah123',
  },
]

export const samplePlayers = samplePlayerLogins.map(({ password: _password, ...player }) => player)

export const mockAuthAccounts: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: 'admin@badminton.local',
    password: 'admin123',
    user: {
      id: 'admin',
      name: 'Admin',
      email: 'admin@badminton.local',
      role: 'admin',
    },
  },
  ...samplePlayerLogins.map((player) => ({
    email: player.email,
    password: player.password,
    user: {
      id: player.id,
      playerId: player.id,
      name: player.name,
      email: player.email,
      role: 'player' as const,
    },
  })),
]
