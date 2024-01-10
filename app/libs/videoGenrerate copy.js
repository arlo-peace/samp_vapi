const { exec, spa } = require('child_process');
const fs = require('fs');
const commandExists = require('command-exists');
const crypto = require('crypto');
const crypto = require('../libs/queue');
const { insertVideo, updateVideoDuration, updateVideoStatus } = require('../models/video.model');

const vidGenerate = async (inputData, cb) => {

    // const outputDir = "/www/wwwroot/lbg-xvideos/data/"
    // const outputDir = "/www/wwwroot/api.lubugou.vip/data/" // demo
    const outputDir = "D:\\nodejs\\vserver\\uploads\\m3u8\\" // demo
    // const inputPath = "/www/wwwroot/api.lubugou.vip/data/" // demo
    // const inputPath = "/www/wwwroot/api.lubugou.vip/vserver/uploads/" // demo
    const inputPath = "D:\\nodejs\\vserver\\" // demo

    const videoConfig = {
        domain: 'https://api.lubugou.vip',
        ratio: {w: '1280', h: '-1'},
        vbr: '1000k', // Video bitrate
        abr: '128k', // Audio bitrate
        screen: ['320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1','320:-1'],
        quality: '5',
        delete: false
    }

    if(inputData.files.length <= 0){
        return {
            status: 'error',
            message: 'Your files is blank.'
        }
    }
    
    var commandExistsSync = commandExists.sync;
    // returns true/false; doesn't throw
    if (commandExistsSync('ffmpeg')) {} else {
        return {
            status: 'error',
            message: 'You need to install `ffmpeg`.'
        }
    }

    const commandList = await someAsyncOperation(inputData, inputPath, outputDir, videoConfig);
    const executeSequentially = (commands, index = 0) => {
        if (index < commands.length) {
          const command = commands[index];
          process.chdir(command.paths);
          exec(command.command, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${command.command}`);
                console.error(error);
                return;
            } else {
                console.log(`Command executed successfully: ${command.command}`);
                if(command.config?.delete){
                    fs.rmSync(`${command.imgData.path}`);
                }
                await updateVideoStatus(command.imgData.originalname, 1)
            }
      
            // Call the next command recursively
            executeSequentially(commands, index + 1);
          });
        } else {
            return {
                status: true,
                message:'All files are executed'
            }
        }
    };
    
    // Start the execution
    executeSequentially(commandList);

    // Screenshot
    const executeSequenceSnap = (commands, index = 0) => {
        if (index < commands.length) {
            const command = commands[index];
            exec(`${command.duration}`, async (err, stdout, stderr) => {
                if (err) {
                    console.log('Error getting video metadata:', err);
                    return;
                }          
                const duration = parseFloat(stdout);
                // Calculate the interval between screenshots

                await updateVideoDuration(command.imgData.originalname, duration)

                const interval = duration / 10;
                // Use a loop to capture 10 screenshots
                for (let i = 1; i <= 10; i++) {
                    const time = i * interval;
                    const outputFilePath = `${command.outputPath}/${i}.jpg`;
                    const scale = videoConfig.screen[i];
                    
                    // console.log(videoConfig.screen[i])
                    // Capture the screenshot
                    exec(`ffmpeg -i ${command.inputPath} -ss ${time} -vf "scale=${scale}" -q:v ${videoConfig.quality} -frames:v 1 ${outputFilePath}`, (err, stdout, stderr) => {
                        // if (err) {
                        //     // console.error(`Error capturing screenshot ${i}:`, err);
                        // } else {
                        //     // console.log(`Screenshot ${i} captured at ${time}s: ${outputFilePath}`);
                        // }
                    });
                }
                executeSequenceSnap(commandList, index+1)
            });
        } else {
            return {
                status: true,
                message:'Already screenshots executed'
            }
        }
    };
    executeSequenceSnap(commandList)
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

function someAsyncOperation(jsonFile, inputPath, outDir, config) {
    return new Promise(async (resolve) => {
        let commands = []
        for (let index = 0; index < jsonFile.files.length; index++) {
            const inPath = jsonFile.files[index];
            const currentDate = new Date
            const data = currentDate.getFullYear().toString()+currentDate.getMonth().toString()+currentDate.getDate().toString();

            //// file create date
            const outputPath = await fileCreateEixt(outDir+data);

            const key = crypto.randomBytes(16);
            fs.writeFileSync(`${outputPath}/hls/key.key`, key);
            fs.writeFileSync(`${outputPath}/hls/key.keyinfo`, `key.key\nkey.key`);

            let createM3u8 = "#EXTM3U\n";
            createM3u8 += "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\n";
            createM3u8 += "hls/index.m3u8"
            fs.writeFileSync(`${outputPath}/index.m3u8`, createM3u8)

            const outputPathS = outputPath.split('/')
            const opPath = outputPathS[outputPathS.length - 1]+""+outputPathS[outputPathS.length]

            const imageUrls = [1,2,3,4,5,6,7,8,9,10].map(v => `${config.domain}/${opPath}/${v}.jpg`)
            await insertVideo({
                title: jsonFile.body?.name,
                md5: jsonFile.body?.md5,
                url: config.domain+'/'+opPath+'/hls/'+'index.m3u8',
                videos: config.domain+'/'+opPath+'/'+'index.m3u8',
                snaps: JSON.stringify(imageUrls),
                orgfile: inPath.originalname,
                outdir: outputPath,
                size: inPath.size,
                rpath: `${config.domain}/${opPath}/index.m3u8`,
                metadata: JSON.stringify(config)
            })

            commands.push({
                paths: outputPath+'/hls',
                command: `ffmpeg -i ${inputPath+inPath.path} -vf "scale=w=${config.ratio.w}:h=${config.ratio.h},setsar=1" -c:v h264 -b:v ${config.vbr} -profile:v main -level:v 3.1 -c:a aac -b:a ${config.abr} -map 0 -var_stream_map "v:0,a:0" -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputPath}/hls/${generateRandomString(6)}%03d.ts" -hls_key_info_file "${outputPath}/hls/key.keyinfo" -master_pl_name "${outputPath}/index.m3u8" "${outputPath}/hls/index.m3u8"`,
                outputPath: outputPath,
                inputPath: inputPath+inPath.path,
                imgData: inPath,
                config: config,
                duration: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath+inPath.path}`
            })
        }
        resolve(commands)
    });
}
