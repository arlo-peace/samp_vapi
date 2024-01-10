const Queue = require('bull');
const { vidGenerate, changeAsyncOperation } = require('./videoGenrerate');
const videoQueue = new Queue('Video Transcoding', { redis: { host: 'localhost', port: 6379, password: null}});
const { config } = require('../_config/config');

videoQueue.process('createUpload', async (job) => {
    const createCmd = await changeAsyncOperation(job.data, config);
    return { status: 'created', data: {...createCmd} };
})
videoQueue.process('transcode', async (job) => {
    const jobdata = job.data;
    console.log(jobdata)
    await new Promise((resolve, reject) => {
        vidGenerate(jobdata, (b) => {
            resolve();
        });
    });
})

module.exports = videoQueue;