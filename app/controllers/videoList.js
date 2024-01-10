'use strict';

const { getVideoList, deleteVideo, videoStatus, videoAnalyze } = require("../models/video.model");

module.exports.dashboard = async (req, res) => {

    const result = await videoStatus()
    return res.status(200).json({
        status: '2000',
        message: 'success',
        data: result
    })
}

module.exports.videoList = async (req, res) => {
    const page = req.query.page
    const search = req.query.search
    const sortby = req.query.sortBy
    const sort = req.query.sort
    const type = req.query.type
    const result = await getVideoList({search: search, page: page, sortBy: sortby, sort: sort, type: type})

    return res.status(200).json({
        status: '2000',
        message: 'success',
        ...result
    })
}

module.exports.videoDelt = async (req, res) => {
    const result = await deleteVideo(req.body)
    return res.status(200).json({
        status: '2000',
        message: 'success',
        ...result
    })
}

module.exports.statistic = async (req, res) => {
    const result = await videoAnalyze(req.body)
    return res.status(200).json({
        status: '2000',
        message: 'success',
        data: [40, 39, 10, 40, 39, 60, 70, 50, 30, 20, 45, 55]
    })
}