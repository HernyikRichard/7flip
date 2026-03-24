export const COLLECTIONS = {
  USERS: 'users',
  FRIEND_REQUESTS: 'friendRequests',
  FRIENDSHIPS: 'friendships',
  GAMES: 'games',
  ROUNDS: 'rounds',
  EVENTS: 'events',
  SCAN_RESULTS: 'scanResults',
} as const

export const APP_NAME = '7flip'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  FRIENDS: '/friends',
  FRIEND_REQUESTS: '/friends/requests',
  GAMES: '/games',
  GAMES_NEW: '/games/new',
  HISTORY: '/history',
} as const
