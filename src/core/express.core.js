'use strict'

const express = require('express')
const qs = require('qs')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const Routes = require('@refkinscallv/express-routing')
const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Express {
    static app = express()
    static router = express.Router()

    static instance() {
        return this.app
    }

    static init() {
        Logger.info('express', 'preparing middlewares and routes...')
        this.#middlewares()
        this.#routes()
        Logger.info('express', 'middlewares and routes are ready')
    }

    static #middlewares() {
        try {
            this.app.set('trust proxy', config.express.trustProxy)
            this.app.set('query parser', (str) => qs.parse(str))
            this.app.use(express.json())
            this.app.use(express.urlencoded({ extended: true }))
            this.app.use(cookieParser())
            this.app.use(cors(config.express.cors))
            if (config.express.static.status) {
                this.app.use(config.express.static.alias, express.static(config.express.static.alias))
            }
            if (config.express.view.status) {
                this.app.set('view engine', config.express.view.engine)
                this.app.set('views', config.express.view.path)
            }
            require('@app/http/middlewares/register.middleware').register(this.app)
        } catch (err) {
            Logger.set(err, 'express')
        }
    }

    static #routes() {
        try {
            require('@app/routes/register.route')
            Routes.apply(this.router)
            this.app.use(this.router)
        } catch (err) {
            Logger.set(err, 'express')
        }
    }
}
