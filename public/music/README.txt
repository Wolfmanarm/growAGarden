MUSIC FOLDER
============

Drop .wav or .mp3 music files here to use as in-game background music.

After adding files, register them in src/App.jsx under the MUSIC_TRACKS array:

  const MUSIC_TRACKS = [
    { title: 'My Track', src: '/music/my_track.mp3' },
    ...
  ]

Included example files (replace with real music):
  - peaceful_garden.wav  (daytime garden ambience)
  - farm_life.wav        (upbeat farming theme)
  - night_sounds.wav     (night/combat atmosphere)

Notes:
  - Music starts on first user interaction (browser autoplay policy)
  - Volume is set to 35% by default (change in App.jsx: audio.volume = 0.35)
  - Tracks play in sequence and loop back to the first
  - Player can mute/unmute via the 🎵 button in the HUD
