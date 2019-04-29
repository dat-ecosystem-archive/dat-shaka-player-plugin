const resolveLink = require('dat-link-resolve')
const parseRange = require('range-parser')
const hyperdrive = require('hyperdrive')
const Discovery = require('discovery-swarm-web')
const collect = require('collect-stream')
const debug = require('debug')('dat-shaka-plugin')
const mime = require('mime')
const ram = require('random-access-memory')
const url = require('url')

const SCHEME = 'dat'

function createPlugin(shaka, options) {
  if (!options || 'object' !== typeof options) {
    options = {}
  }

  const requests = new Set()
  const swarms = new Map()
  const drives = new Map()

  let destroyed = false

  shaka.net.NetworkingEngine.registerScheme(SCHEME, onscheme)

  return {
    requests,
    options,
    swarms,
    drives,

    get destroyed() {
      return destroyed
    },

    unregister() {
      return this.destroy()
    },

    destroy() {
      for (const key of swarms.keys()) {
        swarms.get(key).close()
        swarms.delete(key)
      }

      for (const key of drives.keys()) {
        drives.get(key).close()
        drives.delete(key)
      }

      for (const request of requests.values()) {
        request.abort()
        requests.delete(request)
      }

      shaka.net.NetworkingEngine.unregisterScheme(SCHEME)
    },
  }

  function onscheme(uri, req, type, onprogress) {
    if (destroyed) {
      throw new Error("'dat-shaka-plugin' is destroyed. Please unregister.")
    }

    let filename = null
    let drive = null
    let abort = null
    let key = null

    const request = new Promise((resolve, reject) => {
      abort = reject

      resolveLink(uri, onresolvelink)

      function onresolvelink(err, link) {
        if (err) {
          return reject(err)
        }

        key = Buffer.from(link, 'hex')
        drive = drives.get(link) || options.archive || options.drive
        swarm = swarms.get(link) || options.swarm

        if (!drive) {
          drive = hyperdrive(ram, key, Object.assign({}, options, {
            latest: true,
            sparse: true,
          }))
        }

        if (!swarm) {
          swarm = new Discovery(Object.assign({}, options.discovery, {
            stream: onstream
          }))
        }

        drives.set(link, drive)
        swarms.set(link, swarm)

        const { pathname } = url.parse(uri.replace(link, 'dat.local'))

        filename = pathname

        drive.ready(() => {
          swarm.join(drive.discoveryKey)
          drive.download(filename)
          drive.stat(filename, onstat)
        })
      }

      function onread(err, buffer) {
        if (err) {
          return reject(err)
        }

        resolve(makeResponse(uri, buffer, type))
      }

      function onstat(err, stats) {
        if (err) {
          return drive.once('update', () => {
            drive.stat(filename, onstat)
          })
        }

        if ('HEAD' === req.method) {
          resolve(makeResponse(uri, stats, type))
        }

        if ('GET' === req.method) {
          const { headers } = req
          const { size } = stats
          const range = headers.Range
            ? parseRange(size, headers.Range)[0]
            : null

          collect(drive.createReadStream(filename, range), onread)
        }
      }
    })

    const operation = new shaka.util.AbortableOperation(request, onabort)

    requests.add(request)
    request.then(ondone).catch(ondone)
    request.operation = operation
    request.abort = () => operation.abort()

    return operation

    function ondone(err) {
      if (err) {
        debug(err)
      }
      requests.delete(request)
    }

    function onabort() {
      requests.delete(request)
      return abort(new shaka.util.Error(
        shaka.util.Error.Severity.RECOVERABLE,
        shaka.util.Error.Category.NETWORK,
        shaka.util.Error.Code.OPERATION_ABORTED
      ))
    }

    function onstream() {
      return drive.replicate({ timeout: 0, live: true })
    }
  }

  function makeResponse(uri, file, type) {
    const contentType = mime.getType(uri)
    const headers = {}
    const status = 200
    const data = file && file.buffer ? file.buffer : null

    headers['content-type'] = contentType

    if (file && file.size) {
      headers['content-length'] = file.size
    } else if (file && file.buffer) {
      headers['content-length'] = file.length
    }

    const response = { uri, data, status, headers, fromCache: false }

    return response
  }
}

module.exports = createPlugin
