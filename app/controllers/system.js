const fs = require('fs')
const { config } = require('../_config/config')
const process = require('process')
const { formatBytes } = require('../_helper/files')
const exec = require('child_process').exec
const spawn = require('child_process').spawn

module.exports.backupList = (req, res) => {
    let fileList = []
    const backPath = process.cwd()+'/backup/';
    fs.readdir(backPath, function (err, files) {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        } 
        files.forEach(function (file) {
            const fd = fs.statSync(backPath+file)
            fileList.push({
                size: formatBytes(fd.size),
                mtime: fd.mtime,
                name: file,
            })
        });
        res.status(200).json({
            status: 2000,
            message: 'success',
            data: fileList
        })
    })
}

module.exports.databaseDump = (req, res) => {
    const dumpFileName = `${process.cwd()}/backup/${Math.round(Date.now() / 1000)}.dump.sql`
    // const command = `mysql -h ${config.database.host} -u ${config.database.user} --password="${config.database.password}" ${config.database.database} > ${dumpFileName}`;
    const command = `mysqldump -u ${config.database.user} --password="${config.database.password}" ${config.database.database} > ${dumpFileName}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
        console.error('Error restoring database:', error);
        } else {
        console.log('Database restored successfully.');
        }
    });

    res.status(200).json({
        status: 2000,
        message: 'success',
        data: 'Please wait doing export.'
    })
}

module.exports.restoreData = (req, res) => {
    const backupFilePath = process.cwd()+'/backup/'+req.query.fname
    if(!fs.existsSync(backupFilePath)){
        res.status(200).json({
            status: 2000,
            message: 'no_file',
            data: 'Not found this file.'
        })
        return 
    }
    const command = `mysql -u ${config.database.user} --password="${config.database.password}" ${config.database.database} < ${backupFilePath}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
        console.error('Error restoring database:', error);
        } else {
        console.log('Database restored successfully.');
        }
    });
    res.status(200).json({
        status: 2000,
        message: 'restore',
        data: 'Please wait doing restore.'
    })
}

module.exports.deleteData = (req, res) => {
    const backupFilePath = process.cwd()+'/backup/'+req.query.fname
    if(!fs.existsSync(backupFilePath)){
        res.status(200).json({
            status: 2000,
            message: 'no_file',
            data: 'Not found this file.'
        })
        return 
    }
    fs.unlinkSync(backupFilePath);
    res.status(200).json({
        status: 2000,
        message: 'delete_',
        data: 'Successfully deleted.'
    })
}