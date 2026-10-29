// The admin app's navigation, grouped the way the church now works:
// Next Steps (the four Sundays and the automatic WhatsApp line), Follow Up
// (the human calls, with its own contacts), and Bible Study. Icon paths are
// 24px stroke icons, drawn by Sidebar.
const ICONS = {
  today: <path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />,
  session: <><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M10 9l5 3-5 3z" /></>,
  videos: <><circle cx="12" cy="12" r="9" /><path d="M10 8l6 4-6 4z" /></>,
  people: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /><circle cx="9" cy="7" r="4" /></>,
  reports: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8" />,
  messaging: <><path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4z" /><path d="M8 9h8M8 13h5" /></>,
  fuDash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  contacts: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></>,
  outcomes: <><path d="M9 3h6a1 1 0 011 1v2H8V4a1 1 0 011-1z" /><path d="M5 6h14v15H5z" /><path d="M9 14l2 2 4-4" /></>,
  membership: <path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z" />,
  houseChurch: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></>,
  bible: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5z" /><path d="M9 7h6M9 11h4" /></>,
  upload: <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
  team: <><path d="M20 21v-2a4 4 0 00-3-3.87M14 3.13a4 4 0 010 7.75M4 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><circle cx="10" cy="7" r="4" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" /></>,
}

export const NAV_TODAY = { id: 'today', label: 'Today', icon: ICONS.today }
export const NAV_TEAM = { id: 'team', label: 'Team', icon: ICONS.team }
export const NAV_PROFILE = { id: 'profile', label: 'Profile', icon: ICONS.profile }

// `roles` lists who sees an item; absent means director and leader.
export const NAV_GROUPS = [
  {
    id: 'ns', label: 'Next Steps', icon: ICONS.session,
    hint: 'The four Sundays, and the automatic line that thanks people after each one.',
    items: [
      { id: 'session', label: 'Check-in', icon: ICONS.session },
      { id: 'videos', label: 'Videos', icon: ICONS.videos },
      { id: 'people', label: 'People', icon: ICONS.people },
      { id: 'reports', label: 'Reports', icon: ICONS.reports },
      { id: 'messaging', label: 'Messaging', icon: ICONS.messaging, cnt: 'messaging' },
    ],
  },
  {
    id: 'fu', label: 'Follow Up', icon: ICONS.contacts,
    hint: 'Welcome cards and people handed over from Next Steps. Calls by a person, from their own phone.',
    items: [
      { id: 'fu-dash', label: 'Dashboard', icon: ICONS.fuDash, roles: ['director', 'leader', 'support'] },
      { id: 'contacts', label: 'Contacts', icon: ICONS.contacts, cnt: 'contacts', roles: ['director', 'leader', 'support'] },
      { id: 'outcomes', label: 'Outcomes', icon: ICONS.outcomes, roles: ['director', 'leader', 'support'] },
      { id: 'membership', label: 'Membership', icon: ICONS.membership, roles: ['director', 'leader', 'support'] },
      { id: 'house-church', label: 'House Church', icon: ICONS.houseChurch, roles: ['director', 'leader', 'support'] },
    ],
  },
  {
    id: 'bs', label: 'Bible Study', icon: ICONS.bible,
    hint: 'Tuesday teaching, written up by series.',
    items: [
      { id: 'bible', label: 'Bible Study', icon: ICONS.bible },
      { id: 'bible-upload', label: 'Upload', icon: ICONS.upload, roles: ['director'] },
    ],
  },
]

const allowed = (item, role) => (item.roles || ['director', 'leader']).includes(role)

// The nav a given role sees: groups with only their visible items, empty
// groups dropped. Follow Up (support) sees only the Follow Up group.
export function navFor(role) {
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(i, role)) }))
    .filter((g) => g.items.length)
  return {
    top: role === 'support' ? [] : [NAV_TODAY],
    groups,
    bottom: role === 'director' ? [NAV_TEAM, NAV_PROFILE] : [NAV_PROFILE],
  }
}

export const firstPaneFor = (role) => (role === 'support' ? 'fu-dash' : 'today')

export const groupOf = (paneId) => NAV_GROUPS.find((g) => g.items.some((i) => i.id === paneId))
