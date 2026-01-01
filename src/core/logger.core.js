'use strict'
const fs = require('fs')
const path = require('path')
const util = require('util')
const config = require('@app/config')

module.exports = class Logger {
    static LOG_DIR = path.join(process.cwd(), config.app.log_dir)
    static MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB
    static MAX_LOG_FILES = 7 // Keep logs for 7 days
    static logStats = {
        info: 0,
        debug: 0,
        log: 0,
        warning: 0,
        error: 0,
        all: 0,
    }

    static {
        Logger.info('logger', 'preparing logger')
        this.init()
        this.startLogRotation()
        Logger.info('logger', 'logger is ready')
    }

    static colorize(type, text) {
        const colors = {
            info: '\x1b[36m',
            debug: '\x1b[35m',
            log: '\x1b[37m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
            all: '\x1b[34m',
        }
        const reset = '\x1b[0m'
        return (colors[type] || '') + text + reset
    }

    static bold(text) {
        return `\x1b[1m${text}\x1b[0m`
    }

    static dim(text) {
        return `\x1b[2m${text}\x1b[0m`
    }

    static init() {
        if (!fs.existsSync(this.LOG_DIR)) {
            fs.mkdirSync(this.LOG_DIR, { recursive: true })
        }
    }

    static timestamp() {
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        const ms = String(d.getMilliseconds()).padStart(3, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`
    }

    static todayDir() {
        const dir = path.join(this.LOG_DIR, new Date().toISOString().slice(0, 10))
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        return dir
    }

    static writeToFile(type, message) {
        try {
            const file = path.join(this.todayDir(), `${type}.log`)

            if (fs.existsSync(file)) {
                const stats = fs.statSync(file)
                if (stats.size > this.MAX_LOG_SIZE) {
                    const timestamp = Date.now()
                    const rotatedFile = path.join(this.todayDir(), `${type}.${timestamp}.log`)
                    fs.renameSync(file, rotatedFile)
                }
            }

            fs.appendFileSync(file, message + '\n', { flag: 'a' })
        } catch (err) {
            console.error('Failed to write log:', err.message)
        }
    }

    static formatValue(value) {
        if (value === null) return 'null'
        if (value === undefined) return 'undefined'
        if (typeof value === 'object') {
            try {
                return util.inspect(value, {
                    depth: 4,
                    colors: false,
                    compact: false,
                    breakLength: 80,
                })
            } catch (e) {
                return '[Circular or Invalid Object]'
            }
        }
        return String(value)
    }

    static extractErrorInfo(err) {
        if (err instanceof Error) {
            return {
                message: err.message,
                name: err.name,
                stack: err.stack,
                code: err.code,
                ...err,
            }
        }
        return {
            message: String(err),
            stack: null,
        }
    }

    static parseStack(stack) {
        if (!stack) return []

        const lines = stack.split('\n').slice(1)
        return lines
            .map((line) => {
                const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || line.match(/at\s+(.+):(\d+):(\d+)/)

                if (match) {
                    if (match.length === 5) {
                        return {
                            function: match[1].trim(),
                            file: match[2],
                            line: match[3],
                            column: match[4],
                        }
                    } else {
                        return {
                            function: 'anonymous',
                            file: match[1],
                            line: match[2],
                            column: match[3],
                        }
                    }
                }
                return { raw: line.trim() }
            })
            .filter((item) => item.file || item.raw)
    }

    static formatStack(stack, forConsole = true) {
        const parsed = this.parseStack(stack)
        if (parsed.length === 0) return ''

        const lines = parsed.map((item, index) => {
            if (item.raw) {
                return forConsole ? this.dim(`  ${item.raw}`) : `  ${item.raw}`
            }

            const funcName = item.function || 'anonymous'
            const location = `${item.file}:${item.line}:${item.column}`
            const prefix = forConsole ? this.dim('  →') : '  →'
            const formattedFunc = forConsole ? this.bold(funcName) : funcName
            const formattedLoc = forConsole ? this.dim(location) : location

            return `${prefix} ${formattedFunc} (${formattedLoc})`
        })

        return '\n' + lines.join('\n')
    }

    static record(type, layer, err, options = {}) {
        this.logStats[type] = (this.logStats[type] || 0) + 1

        const errorInfo = this.extractErrorInfo(err)
        const rawMessage = errorInfo.message
        const header = `${this.timestamp()} | ${type.toUpperCase()} | ${layer.toUpperCase()}`
        const headerBold = this.bold(header)

        let consoleMessage = `${headerBold} | ${rawMessage}`
        let fileMessage = `${header} | ${rawMessage}`

        if (options.context) {
            const contextStr = this.formatValue(options.context)
            consoleMessage += `\n${this.dim('Context:')} ${contextStr}`
            fileMessage += `\nContext: ${contextStr}`
        }

        if (type === 'error' && errorInfo.name) {
            const errorType = `[${errorInfo.name}]`
            consoleMessage = `${headerBold} ${this.colorize('error', errorType)} | ${rawMessage}`
            fileMessage = `${header} ${errorType} | ${rawMessage}`

            if (errorInfo.code) {
                consoleMessage += `\n${this.dim('Code:')} ${errorInfo.code}`
                fileMessage += `\nCode: ${errorInfo.code}`
            }
        }

        if (errorInfo.stack && (type === 'error' || options.trace)) {
            const stackForConsole = this.formatStack(errorInfo.stack, true)
            const stackForFile = this.formatStack(errorInfo.stack, false)

            if (stackForConsole) {
                consoleMessage += this.colorize(type, stackForConsole)
                fileMessage += stackForFile
            }
        }

        this.writeToFile(type, fileMessage)

        this.writeToFile('all', fileMessage)

        const shouldLog = !config.app.production || !['error', 'warning'].includes(type)

        if (shouldLog) {
            console.log(this.colorize(type, consoleMessage))
        }

        if (!config.app.production && type === 'error' && !options.noThrow) {
            throw err instanceof Error ? err : new Error(err)
        }
    }

    static info(layer, message, options) {
        this.record('info', layer, message, options)
    }

    static debug(layer, message, options) {
        this.record('debug', layer, message, options)
    }

    static log(layer, message, options) {
        this.record('log', layer, message, options)
    }

    static warning(layer, message, options) {
        this.record('warning', layer, message, options)
    }

    static error(layer, err, options) {
        this.record('error', layer, err, { ...options, trace: true })
    }

    static set(err, layer, options) {
        this.error(layer, err, options)
    }

    static all(layer, message, options) {
        this.record('all', layer, message, options)
    }

    static trace(layer, message) {
        const err = new Error(message)
        this.record('debug', layer, err, { trace: true })
    }

    static group(layer, title, callback) {
        this.info(layer, `──── ${title} ────`)
        try {
            callback()
        } finally {
            this.info(layer, `──── End ${title} ────`)
        }
    }

    static table(layer, data) {
        if (Array.isArray(data) && data.length > 0) {
            console.table(data)
            this.writeToFile('log', `${this.timestamp()} | TABLE | ${layer.toUpperCase()}\n${JSON.stringify(data, null, 2)}`)
        }
    }

    static stats() {
        return { ...this.logStats }
    }

    static clearStats() {
        Object.keys(this.logStats).forEach((key) => {
            this.logStats[key] = 0
        })
    }

    static startLogRotation() {
        setInterval(
            () => {
                this.cleanOldLogs()
            },
            24 * 60 * 60 * 1000,
        )
    }

    static cleanOldLogs() {
        try {
            const dirs = fs.readdirSync(this.LOG_DIR)
            const now = Date.now()
            const maxAge = this.MAX_LOG_FILES * 24 * 60 * 60 * 1000

            dirs.forEach((dir) => {
                const dirPath = path.join(this.LOG_DIR, dir)
                const stats = fs.statSync(dirPath)

                if (stats.isDirectory() && now - stats.mtimeMs > maxAge) {
                    fs.rmSync(dirPath, { recursive: true, force: true })
                    this.info('logger', `Cleaned old log directory: ${dir}`)
                }
            })
        } catch (err) {
            console.error('Failed to clean old logs:', err.message)
        }
    }
}
