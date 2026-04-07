const User = require("../models/User");

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  user.password = undefined;

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    data: user,
    token,
  });
};

//@desc Register User
//@route POST /api/v1/auth/register
//@access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, tel, password, role } = req.body;
    //Create User
    const user = await User.create({
      name,
      email,
      tel,
      password,
      role,
    });
    //create token
    //const token = user.getSignedJwtToken();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
    console.log(err.stack);
  }
};

// @desc     Login user
// @route    POST /api/v1/auth/login
// @access   Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  // 1. Validate email & password
  if (!email || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please provide an email and password",
      });
  }

  // 2. Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });
  }

  // 3. Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
  // 4. Create token
  //const token = user.getSignedJwtToken();
  //res.status(200).json({ success: true, token });
  sendTokenResponse(user, 200, res);
};

// At the end of file
// @desc     Get current Logged in user
// @route    GET /api/v1/auth/me
// @access   Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};
