'use strict';

const express = require('express')
const app = express()
const cors = require('cors')
const path = require('path')
const bodyParser = require('body-parser')
const port = 5000
const mysqlPool = require('./app/_config/db');
// Router Page
const router = require('./app/route')

global.appRoot = path.resolve(__dirname);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(cors({
    origin: "*"
}))

app.use('/', router)


app.listen(port, () => {
    console.log(`listening on port ${port}`)
    mysqlPool.getConnection((err, connection) => {
        if (err) {
            throw err;
        }
        // Release the connection back to the pool when done
        connection.release();
        console.log("MySQL Connected!")
    })
})