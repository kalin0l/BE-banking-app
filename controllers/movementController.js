const HttpError = require("../models/httpError");
const Movements = require("./../models/movements");
const { validationResult } = require("express-validator");
const User = require("./../models/user");

const getMovUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userWithMov;
  try {
    userWithMov = await Movements.find({creator:userId});
  } catch (err) {
    const error = new HttpError("getting movs failed", 500);
    return next(error);
  }
  console.log(userWithMov);
  if (!userWithMov || userWithMov.length === 0) {
    return next(
      new HttpError("Could not fetch movements for the provided user id.", 404)
    );
  }

  res
    .status(200)
    .json({
      movements: userWithMov.map((u) =>
        u.toObject({ getters: true })
      ),
    });
};
const createMov = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError("creating a movement failed", 422);
    return next(error);
  }
  const { deposits,withdraws,time, creator } = req.body;

  let createdMov = new Movements({
    deposits,
    time,
    withdraws,
    creator,
  });
  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating deposit/withdraw failed", 500);
    return next(error);
  }
  if (!user) {
    const error = new HttpError(
      "Could not find user with the provided id",
      404
    );
    return next(error);
  }
  try {
    await createdMov.save();
  } catch (err) {
    const error = new HttpError(
      "Creating deposit/withdraw failed, please try again.",
      500
    );
    return next(error);
  }
  res.status(201).json({ movement: createdMov,
message:'added' });
};



exports.getMovUserId = getMovUserId;
exports.createMov = createMov;
