const multer = require("multer");
const path = require('path');
const fs = require('fs');
const { getVideo } = require("../models/video.model");
const videoQueue = require('../libs/queue')

// File validation function
const vidFilter = (req, file, cb) => {
    const allowedFileTypes = ['rmvb', 'flv', 'mp4', 'mov', '3gp', 'wmv', 'mp3', 'avi', 'mpeg'];
    // Check if the file extension is in the allowed list
    const fileExtension = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedFileTypes.includes(fileExtension)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Invalid file type. Allowed types: rmvb, flv, mp4, mov, 3gp, wmv, mp3, avi, mpeg, JPEG, PNG, and GIF.'), false); // Reject the file
    }
};

const uploads = multer({dest: './uploads/', fileFilter: vidFilter }).single('file');

module.exports.videoUploadsCheck = async (req, res) => {
    //uploads?status=md5Check&md5=9e4d6f3ec571cfc2d3179872e6ee3950&name=Jessie+J+-+Price+Tag+ft.+B.o.B&type=1&_=1703768226334
    let ifExist = false;
    let resData = {}
    
    if(req.query.status==='md5Check'){
        console.log(req.query.md5);
        const videoRow = await getVideo({"md5": req.query.md5})
        if(videoRow){
            ifExist = true;
            resData = {
                title: videoRow.title,
                pic: JSON.parse(videoRow.snaps)[0],
                share: videoRow.id,
                shareid: videoRow.id,
                url: videoRow.videos,
                mp4: videoRow.mp4,
                duration: videoRow.duration,
                orgfile: videoRow.orgfile,
                qr: videoRow.md5
            }
        }
        return res.status(200).send({
            ifExist: ifExist,
            ...resData
        });
    } else if(req.query.status==='chunkCheck'){
        // status=chunkCheck&name=725f66327c2392856bc751b0fbbc8a69&chunkIndex=1&size=10485760&_=1704030784346
        const segmentPath = './uploads/'+req.query.name+'-'+req.query.chunkIndex;
        if(fs.existsSync(segmentPath)){
            ifExist = true;
        }
        return res.status(200).send({
            ifExist: ifExist
        });
    } else if(req.query.status==='chunksMerge'){
        // const videoRow = await getVideo({"md5": req.query.md5})
        const {
            status, name, ext, chunks, fileoldname, md5
        } = req.query
        
        const finalName = await mergeWait(name, chunks, ext)
        if(finalName!==''){
            const createUpload = await videoQueue.add('createUpload', {
                filed: finalName,
                ...req.query
            });
            createUpload.finished().then(async (finisheddata) => {
                if(finisheddata.status=='created'){
                    videoQueue.add('transcode', {...finisheddata.data}, { attempts: 3})
                }
                
                const videoRow = await getVideo({"md5": req.query.md5})
                res.status(200).send({
                    ifExist: false,
                    title: videoRow.title,
                    pic: JSON.parse(videoRow.snaps)[0],
                    share: videoRow.id,
                    shareid: videoRow.id,
                    url: videoRow.videos,
                    mp4: videoRow.mp4,
                    duration: videoRow.duration,
                    orgfile: videoRow.orgfile,
                    qr: videoRow.md5
                });
            });
            
        } else {
            return res.status(302).send({
                status: 3200,
                message: "Error message."
            });
        }
    } else {
        return res.status(404).send({
            status: 4400,
            message: "Page Not Found"
        });
    }
}

const mergeWait = (dName, dchanks, dExt) => {
    return new Promise(async (resolve, reject) => {
        try {
            const finalFilePath = path.join(appRoot, 'uploads', dName+'.'+dExt);
            fs.writeFileSync(finalFilePath, '');
            for(let i=0; i < dchanks; i++){
                const chunkPath = path.join(appRoot, 'uploads', dName+'-'+i);
                if(fs.existsSync(chunkPath)){
                    const data = fs.readFileSync(chunkPath, {encoding: "utf8"});
                    fs.appendFileSync(finalFilePath, data);
                    fs.unlinkSync(chunkPath); // Delete individual chunks
                } else {
                    console.log('aaaa')
                }
            }
            resolve(dName+'.'+dExt)
        } catch (e) {
            console.log('mergeWait', e)
            reject('')
        }
    })
}

module.exports.videoUploads = (req, res) => {
    // userId:,md5: ,uniqueFileName: ,id: ,name:,type: ,lastModifiedDate: ,size: ,file: 
    uploads(req, res, async function (err) {
        const { file, chunk, chunks, uniqueFileName } = req.body;
        const uniqueIdentifier = uniqueFileName + '-' + chunk;
        // Save the chunk
        const tempFilePath = req.file.path;
        const targetFilePath = path.join(appRoot, 'uploads', uniqueIdentifier);
    
        fs.renameSync(tempFilePath, targetFilePath);
    
        res.json({ message: 'Chunk uploaded successfully' });
    })
}

module.exports.videoUpload = (req, res) => {
    res.send('Upload page.')
}