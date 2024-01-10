const { exec, spa, execSync } = require('child_process');
const fs = require('fs');
const commandExists = require('command-exists');
const crypto = require('crypto');
const { getFileSize } = require('../_helper/files');
const { insertVideo, updateVideoDuration, updateVideoStatus } = require('../models/video.model');
const { config } = require('../_config/config');

const vidGenerate = async (inputData) => {

    const videoConfig = config.videoConfig

    // if(inputData.filed === ''){
    //     throw new Error({
    //         status: 'error',
    //         message: 'Your file is blank.'
    //     })
    // }
    
    var commandExistsSync = commandExists.sync;
    // returns true/false; doesn't throw
    if (commandExistsSync('ffmpeg')) {} else {
        return {
            status: 'error',
            message: 'You need to install `ffmpeg`.'
        }
    }

    // const commandList = await changeAsyncOperation(inputData, inputPath, outputDir, videoConfig);
    const commandList = inputData
     await updateVideoStatus(commandList.imgData.md5, 2)
    const executeSequentially = (command) => {
    //   process.chdir(command.paths);
      exec(command.command, async (error, stdout, stderr) => {
          
        // console.error("stdout", stdout);
        // console.error("stderr", stderr);
        
        if (error) {
            console.error(`Error executing command: ${command.command}`);
            console.error(error);
            await updateVideoStatus(command.imgData.md5, 3)
            return;
        } else {
            // console.log(`Command executed successfully: ${command.command}`);
            if(command.config?.storeMp4){
                fs.copyFileSync(command.inputPath, command.paths+'/index.mp4')
            }
            if(stderr){
                console.info(stderr);
            }
            await updateVideoStatus(command.imgData?.md5, 1)
            const destinationPath = command.paths+'/index.m3u8';
            const masterPath = command.paths+'/hls/master.m3u8';
            fs.readFile(masterPath, 'utf8', (err, data) => {
                if(err){ 
                    console.error('Error writing file:', err.message);
                } else {
                    if(typeof data === 'string'){
                        const modifiedData = data.replace(/index.m3u8/g, 'hls/index.m3u8');
                        // Write the modified content back to the file
                        fs.writeFile(destinationPath, modifiedData, 'utf8', (writeErr) => {
                            if (writeErr) {
                                console.error('Error writing file:', writeErr.message);
                            } else {
                                console.log('File modified and saved successfully.');
                                fs.rmSync(masterPath, {force: true})
                            }
                        });
                    }
                }
            })
            
            fs.rmSync(`${command.inputPath}`); /// delete Image
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
            
            // console.log("stdout Duration: ", stdout)
            // console.log("stderr Duration:", stderr)
            // console.log(`${command.duration}`)
            const duration = parseFloat(stdout);
            // Calculate the interval between screenshots
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = Math.floor(duration % 60);
            
            const formattedDuration = `${hours}:${minutes}:${seconds}`;
            
            await updateVideoDuration(command.imgData.md5, formattedDuration)
            
            // console.log(`Duration successfully time:${duration} duration:${formattedDuration}`);
            

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

function changeAsyncOperation(jsonFile, configs) {
    return new Promise(async (resolve) => {
        const inPath = 'uploads/'+jsonFile.filed;
        const currentDate = new Date()
        const month = (currentDate.getUTCMonth()+1).toString().padStart(2, 0);
        const day = currentDate.getDate().toString().padStart(2, 0);
        const data = currentDate.getFullYear().toString()+month+day
        const inputPath = configs.inputDir
        const outDir = configs.outputDir
        const config = configs.videoConfig

        //// file create date
        const outputPath = await fileCreateEixt(outDir+data);

        const key = crypto.randomBytes(16);
        fs.writeFileSync(`${outputPath}/hls/key.key`, key);
        fs.writeFileSync(`${outputPath}/hls/key_info`, `key.key\n${outputPath}/hls/key.key`);
        
        const ffprobeOutput = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=noprint_wrappers=1:nokey=1 "${inputPath+inPath}"`, { encoding: 'utf-8' });
        
        const widthg = parseInt(ffprobeOutput.trim());
        console.log(`Video width: ${widthg}`);
        const vwidth = parseInt(config.ratio.w) > widthg ? parseInt(config.ratio.w) : widthg
        // let createM3u8 = "#EXTM3U\n";
        // createM3u8 += "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\n";
        // createM3u8 += "hls/index.m3u8"
        // fs.writeFileSync(`${outputPath}/index.m3u8`, createM3u8)

        const outputPathS = outputPath.split('/')
        const opPath = outputPathS[outputPathS.length - 2]+"/"+outputPathS[outputPathS.length-1]

        const imageUrls = [1,2,3,4,5,6,7,8,9,10].map(v => `${config.domain}/${opPath}/${v}.jpg`)
        const fileSize = getFileSize(inputPath+inPath);
        await insertVideo({
            title: jsonFile?.fileoldname,
            md5: jsonFile?.md5,
            url: config.domain+'/'+opPath+'/hls/'+'index.m3u8',
            videos: config.domain+'/'+opPath+'/'+'index.m3u8',
            mp4: config.domain+'/'+opPath+'/'+'index.mp4',
            snaps: JSON.stringify(imageUrls),
            orgfile: jsonFile?.fileoldname,
            outdir: outputPath,
            size: fileSize,
            rpath: `${opPath}`,
            metadata: JSON.stringify(config),
            created_at: Date.now()
        })
        /// ffmpeg -i ${inputPath+inPath} -vf "scale=w=${config.ratio.w}:h=${config.ratio.h},setsar=1" -c:v libx264 -b:v ${config.vbr} -r ${config.frr} -profile:v main -level:v 3.1 -c:a aac -map 0 -var_stream_map "v:0,a:0" -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputPath}/hls/${generateRandomString(6)}%03d.ts" -hls_key_info_file "${outputPath}/hls/key.keyinfo" -master_pl_name "${outputPath}/index.m3u8" "${outputPath}/hls/index.m3u8"
        /// - ffmpeg -i ${inputPath+inPath} -vf "scale='min(${config.ratio.w}, iw)':'${config.ratio.h}'" -c:v libx264 -b:v ${config.vbr} -r ${config.frr} -profile:v main -level:v 3.1 -c:a aac -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${outputPath}/hls/${generateRandomString(6)}%03d.ts" -hls_key_info_file "${outputPath}/hls/key_info" -master_pl_name "master.m3u8" "${outputPath}/hls/index.m3u8"
        resolve({
            paths: outputPath,
            command: `ffmpeg -i ${inputPath+inPath} -vf "scale=w=${vwidth}:h=${config.ratio.h},setsar=1" -c:v libx264 -b:v ${config.vbr} -r ${config.frr} -profile:v main -level:v 3.1 -c:a aac -map 0 -var_stream_map "v:0,a:0" -f hls -hls_time ${config.shd} -hls_playlist_type vod -hls_segment_filename "${outputPath}/hls/${generateRandomString(6)}%03d.ts" -hls_key_info_file "${outputPath}/hls/key_info" -master_pl_name "master.m3u8" "${outputPath}/hls/index.m3u8"`,
            outputPath: outputPath,
            inputPath: inputPath+inPath,
            imgData: jsonFile,
            config: config,
            duration: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath+inPath}`
        })
    });
}

module.exports.changeAsyncOperation = changeAsyncOperation;