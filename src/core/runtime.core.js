'use strict'

const config = require('@app/config')
const Logger = require('@core/logger.core')

module.exports = class Runtime {
    static set() {
        Logger.info('runtime', 'preparing the modified node system')
        require('@core/logger.core').init()
        process.env.TZ = config.app.timezone
    }
}
