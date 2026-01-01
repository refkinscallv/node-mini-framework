'use strict'

const Logger = require('@core/logger.core')

module.exports = class Boot {
    static async run() {
        try {
            Logger.info('boot', 'booting server')

            await require('@core/database.core').init()

            require('@core/express.core').init()
            require('@core/server.core').init()
            require('@core/socket.core').init()
            require('@app/socket/register.socket')
        } catch (err) {
            Logger.set(err, 'boot')
        }
    }
}
