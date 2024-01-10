const { exec, spa } = require('child_process');
const fs = require('fs');
const commandExists = require('command-exists');
const crypto = require('crypto');
const { getFileSize } = require('../_helper/files');
const { insertVideo, updateVideoDuration, updateVideoStatus } = require('../models/video.model');

const vidGenerate = async (inputData) => {

    // const outputDir = "/www/wwwroot/lbg-xvideos/data/"
    // const outputDir = "/www/wwwroot/api.lubugou.vip/vserver/uploads/m3u8/" // demo
    const outputDir = "/www/wwwroot/lbg-xvideos/data/" // live
    // const outputDir = "D:\\nodejs\\vserver\\uploads\\m3u8\\" // demo
    // const inputPath = "/www/wwwroot/api.lubugou.vip/data/" // demo
    // const inputPath = "/www/wwwroot/api.lubugou.vip/vserver/" // demo
    const inputPath = "/www/wwwroot/api.lubugou.vip/vserver/" // demo
    // const inputPath = "D:\\nodejs\\vserver\\" // demo

    const videoConfig = {
        domain: 'https://api.lubugou.vip',
        ratio: {w: '1280', h: '-1'},
        vbr: '1000k', // Video bitrate
        abr: '128k', // Audio bitrate
        screen: ['320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1'],
        quality: '5',
        delete: false
    }

    if(inputData.filed === ''){
        throw new Error({
            status: 'error',
            message: 'Your file is blank.'
        })
    }
    
    var commandExistsSync = commandExists.sync;
    // returns true/false; doesn't throw
    if (commandExistsSync('ffmpeg')) {} else {
        return {
            status: 'error',
            message: 'You need to install `ffmpeg`.'
        }
    }

    const commandList = await changeAsyncOperation(inputData, inputPath, outputDir, videoConfig);

    const executeSequentially = (command) => {
      process.chdir(command.paths);
      exec(command.command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${command.command}`);
            console.error(error);
            return;
        } else {
            console.log(`Command executed successfully: ${command.command}`);
            if(command.config?.delete){
                fs.rmSync(`${command.imgData?.filed}`);
            }
            await updateVideoStatus(command.imgData?.md5, 1)
        }
      });
    };
    
    // Start the execution
    executeSequentially(commandList);

    // Screenshot
    const executeSequenceSnap = (command, vConfig) => {
        exec(`${command.duration}`, async (err, stdout, stderr) => {
            if (err) {
                console.log('Error getting video metadata:', err);
                return;
            }
            console.log(stdout)
            console.log(`${command.duration}`)
            const duration = parseFloat(stdout);
            // Calculate the interval between screenshots
            const durationMatch = /Duration: (\d+:\d+:\d+\.\d+)/.exec(stdout);
            console.log(durationMatch)
            if (durationMatch && durationMatch.length > 1) {
                const rawDuration = durationMatch[1];
                
                // Convert raw duration to hours and minutes
                const [hours, minutes] = rawDuration.split(':').map(Number);
                const formattedDuration = `${hours}:${minutes}`;
                
                await updateVideoDuration(command.imgData.md5, formattedDuration)
                
                console.log(`Duration successfully time:${duration} duration:${formattedDuration}`);
            }
            

            const interval = duration / 11;
            // Use a loop to capture 10 screenshots
            await executeSnaps(command, interval, vConfig)
        });
    };
    executeSequenceSnap(commandList, videoConfig)
    
    const executeSnaps = (command, interval, vConfig) => {
        return new Promise((resolve) => {
            for (let i = 1; i <= 10; i++) {
                const time = i * interval;
                const outputFilePath = `${command.outputPath}/${i}.jpg`;
                const scale = vConfig.screen[i];
                
                // console.log(videoConfig.screen[i])
                // Capture the screenshot
                exec(`ffmpeg -i ${command.inputPath} -ss ${time} -vf "scale=${scale}" -q:v ${vConfig.quality} -frames:v 1 ${outputFilePath}`, (err, stdout, stderr) => {
                    if (err) {
                        console.error(`Error capturing screenshot ${i}:`, err);
                    } else {
                        console.log(`Screenshot ${i} captured at ${time}s: ${outputFilePath}`);
                    }
                });
            }
        })
    }
}

module.exports.vidGenerate = vidGenerate

function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
  
    return result;
}

const fileCreateEixt = (path) => {
    return new Promise(async (resolve) => {
        const randomString = generateRandomString(8);
        const paths = path+'/'+randomString;
        if(fs.existsSync(paths)){
            await fileCreateEixt(path)
        } else {
            fs.mkdirSync(`${paths}/hls`, { recursive: true })
            resolve(paths)
        }
    })
}

function changeAsyncOperation(jsonFile, inputPath, outDir, config) {
    return new Promise(async (resolve) => {
        const inPath = 'uploads/'+jsonFile.filed;
        const currentDate = new Date()
        const month = (currentDate.getUTCMonth()+1).toString().padStart(2, 0);
        const day = currentDate.getDate().toString().padStart(2, 0);
        const data = currentDate.getFullYear().toString()+month+day

        //// file create date
        const outputPath = await fileCreateEixt(outDir+data);
        console.log(outputPath)
        const key = crypto.randomBytes(16);
        fs.writeFileSync(`${outputPath}/hls/key.key`, key);
        fs.writeFileSync(`${outputPath}/hls/key.keyinfo`, `key.key\nkey.key`);

        let createM3u8 = "#EXTM3U\n";
        createM3u8 += "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\n";
        createM3u8 += "hls/index.m3u8"
        fs.writeFileSync(`${outputPath}/index.m3u8`, createM3u8)

        const outputPathS = outputPath.split('/')
        const opPath = outputPathS[outputPathS.length - 2]+"/"+outputPathS[outputPathS.length-1]

        const imageUrls = [1,2,3,4,5,6,7,8,9,10].map(v => `${config.domain}/${opPath}/${v}.jpg`)
        const fileSize = getFileSize(inputPath+inPath);
        await insertVideo({
            title: jsonFile?.fileoldname,
            md5: jsonFile?.md5,
            url: config.domain+'/'+opPath+'/hls/'+'index.m3u8',
            videos: config.domain+'/'+opPath+'/'+'index.m3u8',
            snaps: JSON.stringify(imageUrls),
            orgfile: jsonFile?.fileoldname,
            outdir: outputPath,
            size: fileSize,
            rpath: `${config.domain}/${opPath}/index.m3u8`,
            metadata: JSON.stringify(config)
        })

        resolve({
            paths: outputPath+'/hls',
            command: `ffmpeg -i ${inputPath+inPath} -vf "scale=w=${config.ratio.w}:h=${config.ratio.h},setsar=1" -c:v h264 -b:v ${config.vbr} -profile:v main -level:v 3.1 -c:a aac -b:a ${config.abr} -map 0 -var_stream_map "v:0,a:0" -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputPath}/hls/${generateRandomString(6)}%03d.ts" -hls_key_info_file "${outputPath}/hls/key.keyinfo" -master_pl_name "${outputPath}/index.m3u8" "${outputPath}/hls/index.m3u8"`,
            outputPath: outputPath,
            inputPath: inputPath+inPath,
            imgData: jsonFile,
            config: config,
            duration: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath+inPath}`
        })
    });
}
