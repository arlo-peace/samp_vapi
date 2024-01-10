'use stricts';
const db = require('../_config/db');

module.exports.showTables = () => {
    return new Promise((resolve, reject) => {
        db.query(`SHOW TABLES`, {user: user}, function(error, results) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
        })
    })
}

