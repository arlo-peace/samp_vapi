const express = require('express')
const { networkInterfaces } = require('os');
const axios = require('axios');
const path = require('path');
const { videoUpload, videoUploads, videoUploadsCheck } = require('./controllers/videoUpload');
const { videoList, videoDelt, dashboard } = require('./controllers/videoList');
const { login, changePasswrod } = require('./controllers/login');
const { verifyToken } = require('./_helper/token');
const { databaseDump, restoreData, backupList, deleteData } = require('./controllers/system');

const router = express.Router()

const outDir = '/www/wwwroot/lbg-xvideos/data/'

// middleware that header check
router.use((req, res, next) => {
    const userAgent = req.get('User-Agent');
    console.log(userAgent)
    if(userAgent===undefined){
        return res.status(405).json({
            status: 4500,
            message: 'Not allowed go back to hell.'
        })
    }
    // console.log(userAgent.indexOf('Windows'))
    // if(userAgent.indexOf('Linux') == -1 && userAgent.indexOf('Mac OS') == -1 && userAgent.indexOf('Windows') == -1){
    //     return res.status(405).json({
    //         status: 4500,
    //         message: 'Not allowed go back to hell.'
    //     })
    // } else {
    //     next()
    // }
    next()
    
})
// define the home page route
router.get('/', async (req, res) => {
    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object
    
    const response = await axios.get('https://api64.ipify.org?format=json');
    const publicIPv4 = response.data.ip;
    
    res.send(`<h1 style="color: red;text-align:center">Don't come this page we will ban next time your IP ${publicIPv4}<h1>`)
})

// testing route m3u8
router.get('/demoplay/:folderPath', (req, res) => {
    res.sendFile(outDir+req.query.folderPath)
})
// Serve the video segments
router.get('/demoplay/:folder/:folder1/:segment', (req, res) => {
    // res.header('Content-Type', 'application/vnd.apple.mpegurl');
    const segmentPath = path.join(outDir, req.params.folder+'/'+req.params.folder1+'/', req.params.segment);
    res.sendFile(segmentPath);
});
// Serve the video segments
router.get('/demoplay/:folder/:folder1/:folder2/:segment', (req, res) => {
    // res.header('Content-Type', 'application/vnd.apple.mpegurl');
    const segmentPath = path.join(outDir, req.params.folder+'/'+req.params.folder1+'/'+req.params.folder2+'/', req.params.segment);
    res.sendFile(segmentPath);
});

// define the about route
router.get('/uploads', videoUploadsCheck)
router.post('/uploads', videoUploads)
router.post('/upload', videoUpload)

//Admin Route
router.post('/adminlogin', login)
router.use('/admin/*', (req, res, next) => {
    let token = '';
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }
    if(verifyToken(token)){
        next()
    } else {
        return res.status(405).json({
            status: 4500,
            message: 'UNAUTHORIZED'
        }) 
    }
    
})
router.post('/admin/password', changePasswrod)
router.get('/admin/videos', videoList)
router.delete('/admin/videos', videoDelt)
router.get('/admin/dashboard', dashboard)
router.get('/admin/backupList', backupList)
router.get('/admin/backup', databaseDump)
router.get('/admin/restore', restoreData)
router.get('/admin/backupdelete', deleteData)
  
module.exports = router