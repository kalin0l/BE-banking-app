const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/httpError");
const User = require("../models/user");
const sendEmail = require("../utils/email");
const catchAsync = require("../utils/catchAsync");
const { promisify } = require('util');
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ userId: id }, "super-secret-key", { expiresIn: "1h" });
};

const createAndSend = (user,statusCode,res) => {
  const token = signToken(user._id);

  res.status(statusCode).json({
    message:'success',
    token,
    user
    // loging the user
  });
}
const filterObj = (obj,...alowedFields) => {
  console.log(alowedFields);
  const newObj = {}
  Object.keys(obj).forEach(el => {
    if(alowedFields.includes(el)){
       newObj[el] = obj[el];
    }
  });
  console.log(newObj);
  return newObj;
}

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("cannot fetch users", 500);
    return next(error);
  }
  res.json({
    users: users.map((u) => u.toObject({ getters: true })),
  });
};
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError("Invalid inputs passed", 422);
    return next(error);
  }
  const { name, email, password, confirmPassword } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError("Signin up failed", 500);
    return next(error);
  }
  if (existingUser) {
    const error = new HttpError("User exist already", 422);
    return next(error);
  }

  

  const createdUser = new User({
    name,
    email,
    password,
    confirmPassword,
    movements: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("saving user failed , please try again!", 500);
    return next(error);
  }
  let token;
  try {
    token = signToken(createdUser.id);
    // jwt.sign({userId:createdUser.id},'super-secret-key',{expiresIn: '1h'})
  } catch (err) {
    const error = new HttpError("Signing up failed!", 422);
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    user: createdUser.toObject({ getUsers: true }),
    token,
  });
  
};
const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email }).select("+password");
    const correct = await existingUser.comparePasswords(
      password,
      existingUser.password
    );

    if (!existingUser || !correct) {
      const error = new HttpError("incorrect email or password", 401);
      return next(error);
    }
  } catch (err) {
    const error = new HttpError("Login failed", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid credentials", 422);
    return next(error);
  }
  let isValidPassword = false;

  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again",
      422
    );
    return next(error);
  }
  if (!isValidPassword) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again",
      422
    );
    return next(error);
  }
  createAndSend(existingUser,200,res);

  
};


const forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  let user;
  try {
    user = await User.findOne({ email: req.body.email });
  } catch (err) {
    const error = new HttpError("There is no user with that email", 404);
    return next(error);
  }

  // 2) Generate the random reset token
  const resetToken = user.createPassResetToken();
  try {
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    const error = new HttpError("unable to save reset token", 404);
    return next(error);
  }

  // 3) Send it to user's email
  const resetURL = `http://localhost:5000/api/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
      token: resetToken
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const error = new HttpError("unable to send email", 404);
    return next(error);
  }
};


const resetPassword = async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  let user;
  try {
    user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  } catch (err) {
    const error = new HttpError("unable to save the token", 404);
    return next(error);
  }

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new HttpError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  try {
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    const error = new HttpError("unable to save", 404);
    return next(error);
  }

  createAndSend(user,200,res);

 
};


const protect = async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new HttpError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, "super-secret-key");

  }catch(err){}

  // 3) Check if user still exists
  let currentUser 
  try {
    currentUser = await User.findById(decoded.userId);

  }catch(err){
    const error = new HttpError('The user belonging to this token does no longer exist.',
    401);
    return next(error);

  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
};

const updatePassword = async (req, res, next) => {
  // get the user from the collection
  let user ;
  try{
    user = await User.findById(req.user.id);

  }catch(err){
    const error = new HttpError("unable to find", 404);
    return next(error);
  }
  // check if the posted pw is correct
  try {
    await user.comparePasswords(req.body.passwordCurrent, user.password)
  }catch(err){
    const error = new HttpError('your current is wrong', 401)
    return next(error );
  }
    

  // if pw is correct ,update
  user.password = req.body.password;
  user.passwordConfirm = req.body.confirmPassword;
  try {
    await user.save({validateBeforeSave:false});
  }catch(err){
    const error = new HttpError('cannot save the new pass and user',400);
    return next(error);
  }

    createAndSend(user, 200, res);
};

exports.protect = protect
exports.updatePassword = updatePassword;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
