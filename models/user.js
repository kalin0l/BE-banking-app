const bcrypt = require("bcryptjs/dist/bcrypt");
const mongoose = require("mongoose");
const mongooseUniqueValidator = require("mongoose-unique-validator");
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  confirmPassword: {
    type: String,
    required: true,
    // this only works on create and save
    validate: {
      validator: function (el) {
        return el === this.password;
      },
    },
  },
  passwordResetToken:{type:String},
  passwordResetExpires:{type:Date},
});

userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password,12);
  this.confirmPassword = undefined;
})

userSchema.plugin(mongooseUniqueValidator);

userSchema.methods.comparePasswords = async function(cadidatePass,userPass){
  return await bcrypt.compare(cadidatePass,userPass);
}

userSchema.methods.createPassResetToken = function(){
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log({resetToken} , this.passwordResetToken)


  return resetToken;

}

module.exports = mongoose.model("User", userSchema);
