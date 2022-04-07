![deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg)

More info on active projects and modules at [dat-ecosystem.org](https://dat-ecosystem.org/) <img src="https://i.imgur.com/qZWlO1y.jpg" width="30" height="30" /> 

---

dat-shaka-player-plugin
=======================

A plugin for 'shaka-player' to load `dat://` URI schemes.

## Installation

```sh
$ npm install dat-shaka-player-plugin
```

## Usage

```js
const register = require('dat-shaka-player-plugin')
const shaka = require('shaka-player')

register(shaka)
```

## API

### `plugin = require('dat-shaka-player-plugin')(shaka, options)`

A factory function to create and register the plugin with
`shaka-player` to handle `dat://` URI requests for MPEG-DASH
manifests (`*.mpd`) or HLS playlists (`*.m3u8`). `shaka` is the
`shaka-player` module and `options` can be:

```js
{
  archive: Object, // an optional 'hyperdrive' instance that represents a DAT archive. This will override the resolved archive from the DAT link.
  swarm: Object, // an optional 'discovery-swarm-web' or 'discovery-swarm' object to swarm for resources
  discovery: Object, // an optional object passed to the swarm constructor
}
```

#### `plugin.requests`

A `Set` that represents the currently active requests being made by the
`shaka-player` for resources stored in a DAT archive.

#### `plugin.options`

The options passed to the plugin factory.

#### `plugin.swarms`

A `Map` of swarms corresponding to a DAT link.

#### `plugin.drives`

A `Map` of hyperdrives corresponding to a DAT link.

#### `plugin.destroyed`

A boolean indicating that the plugin is destroyed.

#### `plugin.unregister()`

An alias to `plugin.destroy()`

#### `plugin.destroy()`

Destroy the plugin, close the underlying resources, and unregister as a
scheme for `shaka-player`.

## License

MIT
