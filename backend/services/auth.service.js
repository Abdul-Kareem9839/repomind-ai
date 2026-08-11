import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken } from '../utils/token.js';

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password });
  const token = signAccessToken({ sub: user._id.toString() });

  return { user: user.toSafeObject(), token };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signAccessToken({ sub: user._id.toString() });

  return { user: user.toSafeObject(), token };
}
