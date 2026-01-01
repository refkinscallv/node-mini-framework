'use strict'

const path = require('path')

module.exports = {
    app: {
        production: false,
        port: 3025,
        url: 'http://localhost:3025',
        name: 'Node Mini Framework',
        timezone: 'UTC',
        log_dir: 'logs',
    },

    server: {
        https: false,
        ssl: {
            cert: path.join(__dirname, '/path/to/ssl.cert'),
            key: path.join(__dirname, '/path/to/ssl.key'),
        },
        options: {
            poweredBy: false,
            maxHeaderSize: 16384,
            keepAliveTimeout: 5000,
            requestTimeout: 300000,
            headersTimeout: 60000,
        },
    },

    express: {
        trustProxy: true,
        cors: {
            origin: (origin, callback) => callback(null, true),
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE'],
            allowedHeaders: ['X-Requested-With', 'X-Custom-Header', 'Content-Type', 'Authorization', 'Accept', 'Origin', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
            exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Custom-Header'],
            credentials: true,
            maxAge: 86400,
            preflightContinue: false,
            optionsSuccessStatus: 200,
        },
        static: {
            status: true,
            alias: '/static',
            path: path.join(__dirname, '../public/static'),
        },
        view: {
            status: true,
            engine: 'ejs',
            path: path.join(__dirname, '../public/views'),
        },
    },

    socket: {
        options: {
            cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
            pingInterval: 25000,
            pingTimeout: 60000,
            maxHttpBufferSize: 1e6,
            transports: ['websocket'],
            allowUpgrades: false,
        },
    },

    database: {
        dialect: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'database',
        username: 'root',
        password: '',
        logging: false,
        timezone: '+00:00',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
        sync: true,
        force: false,
        alter: false,
    },
}
