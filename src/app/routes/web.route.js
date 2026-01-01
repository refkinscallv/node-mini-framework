'use strict'

const route = require('@refkinscallv/express-routing')

route.get('', ({ res }) => {
    res.send('Hello World')
})
