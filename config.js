window.CONFIG = {
  TMDB_KEY: (window.KEYS || {}).TMDB_KEY,  // keys live in keys.js (not committed)
  YT_KEY: (window.KEYS || {}).YT_KEY,
  REGION: 'IN',
  LANG: 'en-IN',
  NAME: 'N',
  // Services the app knows. `on` = shown as a "Popular on …" row by default (changeable in Settings). `match` = TMDB provider name; `app` = webOS app id; `jw` = JustWatch package code.
  SERVICES: [
    {name: 'Netflix', match: 'netflix', app: 'netflix', jw: 'nfx', on: true},
    {name: 'JioHotstar', match: 'hotstar', app: 'hotstar', jw: 'jhs', on: true},
    {name: 'Prime Video', match: 'amazon prime video', app: 'amazon', jw: 'prv', on: true},
    {name: 'ZEE5', match: 'zee5', app: 'com.zee5.app', jw: 'zee'},
    {name: 'Apple TV+', match: 'apple tv', app: 'com.apple.appletv', jw: 'atp'}
  ],
  // App row. The TV won't list installed apps for non-system apps, so each of these
  // is checked with getAppLoadStatus and only the ones that exist are shown.
  APPS: [
    {id: 'netflix', title: 'Netflix', icon: 'netflix.png', color: '#000'},
    {id: 'amazon', title: 'Prime Video', icon: 'prime.png', color: '#00a8e1'},
    {id: 'hotstar', title: 'JioHotstar', color: '#0f1c4d'},
    {id: 'youtube.leanback.v4', title: 'YouTube', icon: 'youtube.svg', color: '#fff'},
    {id: 'com.zee5.app', title: 'ZEE5', color: '#8230c6'},
    {id: 'spotify-beehive', title: 'Spotify', icon: 'spotify.png', color: '#121212'},
    {id: 'com.apple.appletv', title: 'Apple TV', icon: 'appletv.png', color: '#000'},
    {id: 'com.webos.app.livetv', title: 'Live TV', color: '#d93025'},
    {id: 'com.webos.app.lgchannels', title: 'LG Channels', color: '#a50034'},
    {id: 'com.twin.app.gamingportal', title: 'Gaming', icon: 'gamingportal.png', color: '#5b2bd1'},
    {id: 'com.webos.app.browser', title: 'Browser', color: '#1a73e8'},
    {id: 'com.webos.app.hdmi1', title: 'HDMI 1', color: '#3c4043'},
    {id: 'com.webos.app.hdmi2', title: 'HDMI 2', color: '#3c4043'},
    {id: 'com.webos.app.hdmi3', title: 'HDMI 3', color: '#3c4043'},
    {id: 'com.webos.app.discovery', title: 'Apps Store', color: '#c5221f'},
    {id: 'com.palm.app.settings', title: 'Settings', icon: 'settings.png', color: '#5f6368'}
  ]
};
