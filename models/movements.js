const mongoose = require("mongoose");

const movementsSchema = new mongoose.Schema({
    deposits: {type:Number},
    withdraws: {type:Number},
    time:{type: String},
    creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' }
});

module.exports = mongoose.model('Movements', movementsSchema)