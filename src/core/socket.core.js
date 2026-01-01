'use strict'

const { Server: SocketIO } = require('socket.io')
const Logger = require('@core/logger.core')
const Server = require('./server.core')
const config = require('@app/config')

module.exports = class Socket {
    static io = null

    static init() {
        try {
            Logger.info('socket', 'preparing socket server...')

            this.io = new SocketIO(Server.instance, config.socket.options)

            Logger.info('socket', 'socket server is ready')
            return this.io
        } catch (err) {
            console.error(err)
        }
    }
}
