var mongoose = require('mongoose');
var deviceSchema = new mongoose.Schema ({
        id: String,
        deviceId: String,
        time : String,
        status : String
    });

module.exports = mongoose.model('device', deviceSchema);

