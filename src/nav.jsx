// Nav icon paths ported 1:1 from the old inline <svg> strings.
const ICONS = {
  today: <path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />,
  session: <><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M10 9l5 3-5 3z" /></>,
  videos: <><circle cx="12" cy="12" r="9" /><path d="M10 8l6 4-6 4z" /></>,
  people: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /><circle cx="9" cy="7" r="4" /></>,
  followup: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
  reports: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8" />,
  messages: <><path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4z" /><path d="M8 9h8M8 13h5" /></>,
  team: <><path d="M20 21v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M4 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><circle cx="10" cy="7" r="4" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" /></>,
}

export const NAV_FULL = [
  { id: 'today', label: 'Today', icon: ICONS.today },
  { id: 'session', label: 'Check-in', icon: ICONS.session },
  { id: 'videos', label: 'Videos', icon: ICONS.videos },
  { id: 'people', label: 'People', icon: ICONS.people },
  { id: 'followup', label: 'Follow-Up', icon: ICONS.followup, cnt: 'followup' },
  { id: 'messages', label: 'Messages', icon: ICONS.messages, cnt: 'messages' },
  { id: 'reports', label: 'Reports', icon: ICONS.reports },
]

export const NAV_SUPPORT = [
  { id: 'support-hc', label: 'House Church', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></> },
  { id: 'support-followup', label: 'Follow Up', icon: ICONS.followup },
  { id: 'support-membership', label: 'Membership', icon: ICONS.people },
  { id: 'support-messages', label: 'Messages', icon: ICONS.messages, cnt: 'messages' },
]

export const NAV_TEAM = { id: 'team', label: 'Team', icon: ICONS.team }
export const NAV_PROFILE = { id: 'profile', label: 'Profile', icon: ICONS.profile }
