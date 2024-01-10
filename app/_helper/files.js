const fs = require('fs');
const { config } = require('process');

module.exports.getFileSize = (filePath) => {
    if(fs.existsSync(filePath)){
       const file = fs.statSync(filePath)
        const size = formatBytes(file.size);
        return size;
    }
    return 0;
}

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

module.exports.formatBytes = formatBytes


module.exports.deleteFile = (dir='') => {
    if(dir===''){
        return;
    }
    fs.rmSync(dir, {force: true})
    return true;
}