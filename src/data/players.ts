import type { AuthUser } from '../types/auth'
import type { PlayerGender } from '../types/matches'

export interface SamplePlayerLogin {
  id: string
  name: string
  firstName: string
  username: string
  gender: PlayerGender
  password: string
}

export const samplePlayerLogins: SamplePlayerLogin[] = [
  {
    id: 'alice-morgan',
    name: 'Alice Morgan',
    firstName: 'Alice',
    username: 'alice',
    gender: 'lady',
    password: 'alice123',
  },
  {
    id: 'ben-carter',
    name: 'Ben Carter',
    firstName: 'Ben',
    username: 'ben',
    gender: 'man',
    password: 'ben123',
  },
  {
    id: 'chloe-evans',
    name: 'Chloe Evans',
    firstName: 'Chloe',
    username: 'chloe',
    gender: 'lady',
    password: 'chloe123',
  },
  {
    id: 'daniel-shah',
    name: 'Daniel Shah',
    firstName: 'Daniel',
    username: 'daniel',
    gender: 'man',
    password: 'daniel123',
  },
  {
    id: 'emily-wright',
    name: 'Emily Wright',
    firstName: 'Emily',
    username: 'emily',
    gender: 'lady',
    password: 'emily123',
  },
  {
    id: 'farah-khan',
    name: 'Farah Khan',
    firstName: 'Farah',
    username: 'farah',
    gender: 'man',
    password: 'farah123',
  },
]

export const samplePlayers = samplePlayerLogins.map(({ password: _password, ...player }) => player)

export const mockAuthAccounts: Array<{ username: string; password: string; user: AuthUser }> = [
  {
    username: 'admin',
    password: 'admin123',
    user: {
      id: 'admin',
      name: 'Admin',
      username: 'admin',
      role: 'admin',
    },
  },
  ...samplePlayerLogins.map((player) => ({
    username: player.username,
    password: player.password,
    user: {
      id: player.id,
      playerId: player.id,
      name: player.name,
      username: player.username,
      role: 'player' as const,
    },
  })),
]
