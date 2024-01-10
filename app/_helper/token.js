var jwt = require('jsonwebtoken');
const { config } = require('../_config/config');

module.exports.genToken = (value) => {
    const token = jwt.sign({
            user: value,
            date: Date.now()
        }, config.tokenKey, { expiresIn: '1d' }
    );
    return token;
}

module.exports.verifyToken = (token) => {
    try {
        var decoded = jwt.verify(token, config.tokenKey);
        return decoded;
    } catch(err) {
        return false;
    }
}