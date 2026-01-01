const Socket = require('@core/socket.core')

const nsp = Socket.io.of('/user-status')

nsp.on('connection', (socket) => {
    const token = socket.handshake.query?.token || socket.handshake.auth?.token
    if (!token) return socket.disconnect(true)

    socket.join(`user-${token}`)
    nsp.emit('online_offline', { token, status: true })

    socket.on('disconnect', (reason) => {
        nsp.emit('online_offline', { token, status: false })
    })

    socket.on('online_offline', (data) => {
        nsp.emit('chat:online_offline', data)
    })
})
