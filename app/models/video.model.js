'use strict';
const db = require('../_config/db');
const {deleteFile} = require('../_helper/files');
// id, from, type, url, down_url, title, original, category, status, size, duration, created_at, updated_at

module.exports.videoAnalyze = (params) => {
    const date = new Date()
    let year = date.getFullYear()
    if(params!==undefined || params!=''){
        year = params
    }
    const start = year+'-01-01';
    const end = year+'-01-31';
    const startDate = Date.parse(start)
    const endDate = Date.parse(end)

    return new Promise((resolve, reject) => {
        db.query(`SELECT 
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 1 THEN 1 ELSE 0 END) AS 'jan',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 2 THEN 1 ELSE 0 END) AS 'feb',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 3 THEN 1 ELSE 0 END) AS 'mar',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 4 THEN 1 ELSE 0 END) AS 'apr',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 5 THEN 1 ELSE 0 END) AS 'may',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 6 THEN 1 ELSE 0 END) AS 'jun',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 7 THEN 1 ELSE 0 END) AS 'jul',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 8 THEN 1 ELSE 0 END) AS 'aug',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 9 THEN 1 ELSE 0 END) AS 'sep',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 10 THEN 1 ELSE 0 END) AS 'oct',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 11 THEN 1 ELSE 0 END) AS 'nov',
        SUM(CASE WHEN MONTH(FROM_UNIXTIME(created_at)) = 12 THEN 1 ELSE 0 END) AS 'dec',
        SUM(CASE WHEN YEAR(FROM_UNIXTIME(created_at)) = ${params} THEN 1 ELSE 0 END) AS 'total'
        FROM
            videos
        WHERE
        created_at BETWEEN '${startDate}' AND '${endDate}'`, where,function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results[0])
        })
    })
}

const getVideo = (where) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM videos WHERE ? LIMIT 1`, where,function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results[0])
        })
    })
}

module.exports.getVideo = getVideo

const videoCount = (where) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT COUNT(id) as id FROM videos WHERE ?`, where,function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results[0].id)
        })
    })
}

module.exports.videoStatus = async () => {
    const vcount = await videoCount()
    const fcount = await videoCount({status: 2})
    const wcount = await videoCount({status: 0})
    const scount = await videoCount({status: 1})
    return new Promise((resolve, reject) => {
        resolve({
            totals: vcount,
            failed: fcount,
            waiting: wcount,
            success: scount
        })
    })
}

module.exports.getVideoList = (params) => {
    const limit = 20;
    let offset = 0;
    const { search, page, sortBy, sort, type } = params
    let wheres = 'WHERE id IS NOT NULL';
    let orderBy = 'ORDER By id DESC';
    const filter = search!=undefined?search:''
    if(page) {
        offset = limit * parseFloat( parseFloat(page) > 1 ? parseFloat(page):0 )
    }

    if(filter!=''){
        const searchData = db.escape(filter);
        wheres += ` AND title LIKE "%${filter}%"`
    }
    
    if(type!='' && type!=undefined){
        const types = type.split(',')
        let orsh = types.map((v, k) => {
            if(k > 0){
                return ` OR type='${v}'`
            } else {
                return `type='${v}'`
            }
        }).join('')
        console.log(orsh)
        wheres += ` AND (${orsh})`
    }
    
    if((sortBy!=undefined && sortBy!='') && (sort!=undefined && sort!='')){
        let sb = 'ASC'
        if(sort=='desc'){
            sb = 'DESC'
        }
        orderBy = `ORDER By ${sortBy} ${sb}`;
    }

    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM videos ${wheres} ${orderBy} LIMIT ${limit} OFFSET ${offset}`, function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            
            db.query(`SELECT COUNT(*) AS totalCount FROM videos ${wheres}`, function(countError, countResults){
                const total = countResults[0].totalCount;
                resolve({
                    page: page,
                    limit: limit,
                    next: total === parseFloat(page)+1 ?parseFloat(page): parseFloat(page)+1,
                    count: countResults[0].totalCount,
                    data: results
                })
            })
        })
    })
}

module.exports.insertVideo = (data) => {
    return new Promise((resolve, reject) => {
        db.query(`INSERT INTO videos SET ?`, data, function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
        })
    })
}

module.exports.updateVideoDuration = (id, data) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE videos SET duration = ? WHERE md5 = ?`, [data, id], function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
        })
    })
}

module.exports.updateVideoStatus = (id, data) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE videos SET status = ? WHERE md5 = ?`, [data, id], function(error, results, fields) {
            if (error){
                reject(error)
                throw error
            }
            resolve(results)
        })
    })
}

module.exports.deleteVideo = (params) => {
    const { ids } = params
    return new Promise(async (resolve, reject) => {
        let returnData = []
        console.log(ids.length)
        for (const i of ids) {
            const row = await getVideo({id: i});
            const dfile = deleteFile(row.outdir)
            if(dfile){
                const bd = await delteVid({id: id});
                if(bd){
                    returnData.push(row.title)
                }
            }
        }
        resolve({
            data: returnData
        })
    })
}

const delteVid = (where) => {
    return new Promise(async (resolve, reject) => {
        db.query(`DELETE videos WHERE ?`, where, function(error, results, fields) {
            if (error){
                reject(error)
                return;
            }
            resolve(results)
        })
    })
}