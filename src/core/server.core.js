'use strict'

const http = require('http')
const https = require('https')
const fs = require('fs')
const Express = require('@core/express.core')
const Logger = require('@core/logger.core')
const config = require('@app/config')

module.exports = class Server {
    static instance = null

    static init() {
        try {
            const app = Express.instance()
            const port = config.app.port

            this.#applyServerOptions(app)

            Logger.info('server', 'preparing server...')

            this.instance = config.server.https ? this.#httpsServer(app, port) : this.#httpServer(app, port)

            return this.instance
        } catch (err) {
            Logger.set(err, 'server')
        }
    }

    static #applyServerOptions(app) {
        try {
            const opt = config.server.options

            if (opt.poweredBy === false) {
                app.disable('x-powered-by')
            }
        } catch (err) {
            Logger.warning('server', 'failed to apply express-level server options')
        }
    }

    // --- HTTP ---
    static #httpServer(app, port) {
        const opt = config.server.options

        const serverOptions = { ...opt }
        delete serverOptions.poweredBy

        const server = http.createServer(serverOptions, app)

        this.#applyRuntimeOptions(server, opt)

        server.listen(port, () => {
            Logger.info('server', `HTTP running at ${config.app.url}`)
        })

        this.#onError(server)
        return server
    }

    // --- HTTPS ---
    static #httpsServer(app, port) {
        const { cert, key } = config.server.ssl
        const opt = config.server.options

        if (!fs.existsSync(cert) || !fs.existsSync(key)) {
            return Logger.set('SSL certificate or key file is missing', 'server')
        }

        const serverOptions = {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert),
            ...opt,
        }

        delete serverOptions.poweredBy

        const server = https.createServer(serverOptions, app)

        this.#applyRuntimeOptions(server, opt)

        server.listen(port, () => {
            Logger.info('server', `HTTPS running at ${config.app.url}`)
        })

        this.#onError(server)
        return server
    }

    // --- apply ANY option dynamically ---
    static #applyRuntimeOptions(server, opt) {
        for (const key of Object.keys(opt)) {
            try {
                server[key] = opt[key]
            } catch {
                // pass
            }
        }
    }

    static #onError(server) {
        server.on('error', (err) => {
            Logger.set(err, 'server')
        })
    }
}
