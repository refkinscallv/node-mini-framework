'use strict'

const { Sequelize } = require('sequelize')
const fs = require('fs')
const path = require('path')
const Logger = require('@core/logger.core')
const config = require('@app/config')

module.exports = class Database {
    static sequelize = null
    static models = {}

    static async init() {
        try {
            Logger.info('database', 'preparing database connection...')

            const dbConfig = config.database

            this.sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
                host: dbConfig.host,
                port: dbConfig.port,
                dialect: dbConfig.dialect,
                logging: dbConfig.logging ? (msg) => Logger.debug('sequelize', msg) : false,
                pool: dbConfig.pool,
                timezone: dbConfig.timezone,
                define: dbConfig.define,
            })

            await this.testConnection()
            await this.loadModels()
            await this.associateModels()

            if (dbConfig.sync) {
                await this.sync()
            }

            Logger.info('database', 'database is ready')
        } catch (err) {
            Logger.set(err, 'database')
        }
    }

    static async testConnection() {
        try {
            await this.sequelize.authenticate()
            Logger.info('database', 'connection has been established successfully')
        } catch (err) {
            Logger.set(err, 'database')
            throw err
        }
    }

    static async loadModels() {
        try {
            const modelsDir = path.join(process.cwd(), 'src/app/models')

            if (!fs.existsSync(modelsDir)) {
                Logger.warning('database', 'models directory not found, skipping model loading')
                return
            }

            const files = fs.readdirSync(modelsDir).filter((file) => file.endsWith('.model.js'))

            for (const file of files) {
                const modelPath = path.join(modelsDir, file)
                const modelDefiner = require(modelPath)

                if (typeof modelDefiner === 'function') {
                    const model = modelDefiner(this.sequelize, Sequelize.DataTypes)
                    this.models[model.name] = model
                    Logger.debug('database', `model ${model.name} loaded`)
                }
            }

            Logger.info('database', `${Object.keys(this.models).length} models loaded`)
        } catch (err) {
            Logger.set(err, 'database')
        }
    }

    static async associateModels() {
        try {
            Object.values(this.models).forEach((model) => {
                if (model.associate) {
                    model.associate(this.models)
                }
            })

            Logger.info('database', 'model associations completed')
        } catch (err) {
            Logger.set(err, 'database')
        }
    }

    static async sync() {
        try {
            const dbConfig = config.database
            await this.sequelize.sync({
                force: dbConfig.force,
                alter: dbConfig.alter,
            })
            Logger.info('database', 'database synchronized')
        } catch (err) {
            Logger.set(err, 'database')
        }
    }

    static async close() {
        try {
            await this.sequelize.close()
            Logger.info('database', 'database connection closed')
        } catch (err) {
            Logger.set(err, 'database')
        }
    }

    static getModel(name) {
        return this.models[name]
    }

    static getInstance() {
        return this.sequelize
    }

    static async transaction(callback) {
        return await this.sequelize.transaction(callback)
    }

    static async query(sql, options = {}) {
        return await this.sequelize.query(sql, options)
    }
}
