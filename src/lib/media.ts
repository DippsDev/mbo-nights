/**
 * React sets `muted` as a property only. iOS Safari reads the *attribute* to decide
 * whether a video may take over the audio session — without it, playing a hero clip
 * pauses the site's sound bed. Call before every play().
 */
export function forceMuted(video: HTMLVideoElement) {
  video.muted = true
  video.defaultMuted = true
  video.setAttribute('muted', '')
}
