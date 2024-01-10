module.exports.config = {
    password: {
        salts: 10,
        key: "",
        default: "$2b$10$47RVxeSsG2dUXY6XKkFMv.RJR5r/a.PAmRjPnNpDf820QU32l86wG"//admin0101
    },
    tokenKey: "$2b$10$HThudwC4Ft7wA9Bvyfa5suu2shhwtASEdVqco5v08Ev/uqypeZpCC",
    outputDir: "/www/wwwroot/lbg-xvideos/data/",
    inputDir: "/www/wwwroot/api.lubugou.vip/vserver/",
    videoConfig: {
        domain: 'https://play.lubugou.vip',
        ratio: {w: '1280', h: '-1'}, // 480,720,1280,0
        vbr: '2000k', // Video bitrate - 500,1000,2000,0
        abr: '128k', // Audio bitrate - 32,64,128,256
        shd: '3', // Sharding duration do not exceed 10
        frr: '25', // 10,15,25,30 - video frame rate
        screen: ['320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1'],
        quality: '5',
        storeMp4: true
    },
    database: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'video_server',
    }
}