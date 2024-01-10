const { config } = require("../_config/config");
const bcrypt = require('bcrypt')

module.exports.cryptPassword = (password, salts=0) =>{
    const salt = bcrypt.genSaltSync(salts===0?config.password.salts:salts);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
}

module.exports.comparePassword = (password, saltPassword='') => {
    return bcrypt.compareSync(password, saltPassword?saltPassword:config.password.default);
}

module.exports.randomString = (count=8) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-,<>./?]{}[';
  
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
  
    return result;
}