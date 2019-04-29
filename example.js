const register = require('./')
const shaka = require('shaka-player')

const BIG_BUCK_BUNNY_URI = 'dat://b2e7f16be8cf431310db322c2b8f8c97a39872de364295f251b76f40002f62bc/bunny.mpd'

const video = document.createElement('video')
const player = new shaka.Player(video)

Object.assign(video, {
  crossOrigin: 'anonymous',
  autoplay: true,
  controls: true,
  preload: true,
})

Object.assign(document.body.style, {
  background: '#151515',
  margin: '8px',
  padding: 0,
})

Object.assign(video.style, {
  display: 'block',
  position: 'relative',
  margin: '0px auto',
  width: '100%',
  height: 'calc(calc(100 * 1vh) - 16px)',
  outline: 'none',
})

const plugin = register(shaka, {})
const uri = window.location.hash.slice(1) || BIG_BUCK_BUNNY_URI

player.load(uri)

video.addEventListener('ended', () => {
  // you most likely never need to do this
  plugin.destroy()
})

document.body.appendChild(video)
