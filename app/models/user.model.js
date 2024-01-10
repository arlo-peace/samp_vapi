'use strict';
const db = require('../_config/db');

module.exports.getUser = (user) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM user WHERE ? LIMIT 1`, {user: user}, function(error, results) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results[0])
        })
    })
}

module.exports.getTheUser = (user) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM user WHERE ? LIMIT 1`, user, function(error, results) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results[0])
        })
    })
}

module.exports.updateToken = (user, data) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE user SET token = ? WHERE user = ?`, [data, user], function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
            // console.log('The solution is: ', results[0].solution);
        })
    })
}

module.exports.updatePass = (user, data) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE user SET password = ? WHERE user = ?`, [data, user], function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
            // console.log('The solution is: ', results[0].solution);
        })
    })
}