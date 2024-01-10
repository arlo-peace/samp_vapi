'use strict';

const { cryptPassword, comparePassword, randomString } = require("../_helper/password");
const { genToken } = require("../_helper/token");
const { getUser, updateToken } = require("../models/user.model");

module.exports.login = async (req, res) => {
    const {
        user,
        pass
    } = req.body

    const userD = await getUser(user)

    if(comparePassword(pass, userD?.password)){
        const token = genToken(user);
        await updateToken(user, token)
        return res.status(200).json({
            status: 2000,
            message: "success",
            data: {
                token: token,
                user: user,
                pass: cryptPassword('admin0101'),
                check: comparePassword(pass)
            }
        })
    } else {
        return res.status(405).json({
            status: 4000,
            message: "Unauthorized",
        })
    }
}

module.exports.changePasswrod = async (req, res) => {

    const {
        user,
        opass,
        npass
    } = req.body

    const userD = await getUser(user)
    if(comparePassword(opass, userD.password)){
        const password = cryptPassword(npass);
        await updateToken(user, password)
        return res.status(200).json({
            status: 2000,
            message: "Update password successfully.",
        })
    } else {
        return res.status(203).json({
            status: 2300,
            message: "Your data is something wrong.",
        })
    }
    
}