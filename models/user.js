
var mongoose = require('mongoose');
var userSchema = new mongoose.Schema ({
        id: String,
        username: String,
        password: String,
        email: String,
        deviceId: String,
        firstName: String,
        lastName: String,
        role: String
     });

module.exports = mongoose.model('User', userSchema);
