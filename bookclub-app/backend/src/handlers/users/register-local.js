const { v4: uuidv4 } = require('uuid');
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    // Validate input
    const errors = {};
    if (!data.email) errors.email = 'Email is required';
    if (!data.name) errors.name = 'Name is required';
    if (!data.password) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    // Additional validation
    if (data.password.length < 8) {
      return response.validationError({
        password: 'Password must be at least 8 characters long',
      });
    }

    // Check if user already exists
    const existingUser = await LocalStorage.getUserByEmail(data.email);
    if (existingUser) {
      return response.validationError({
        email: 'A user with this email already exists',
      });
    }

    // Create user
    const userId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const user = {
      userId,
      email: data.email,
      name: data.name,
      password: data.password, // In production, this would be hashed
      bio: data.bio || '',
      dateOfBirth: data.dateOfBirth || null,
      profilePicture: data.profilePicture || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await LocalStorage.createUser(user);

    return response.success(
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
      201
    );
  } catch (error) {
    return response.error(error);
  }
};
