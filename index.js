require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI);

// Create a schema
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new Schema({
  username: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

// Create a model
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Port connection
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/**
 * Get all users data
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @returns {Array<User>} Array of user objects
 */
async function getUsers(req, res) {
  // Get all users data
  try {
    const users = await User.find({});

    if (!users) {
      return res.json({ error: 'No users found' });
    }

    res.json(users);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Create a new user
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @returns {User} The newly created user object
 */
async function createUser(req, res) {
  const username = req.body.username;

  // Create a new user
  const userDoc = new User({ username: username });

  // Save the new user to the database
  try {
    const user = await userDoc.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Failed to create user' });
  }
}

// ---API Routes---

/**
 * Get all users data or create a new user
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @returns {Array<User>|User} Array of user objects or the newly created user object
 */
app.route('/api/users').get(getUsers).post(createUser);

/**
 * Create a new exercise for a user
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @returns {Object} The newly created exercise object with user details
 */
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date ? new Date(req.body.date) : new Date();

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Create a new exercise
    const exerciseDoc = new Exercise({
      username: user.username,
      description,
      duration,
      date,
    });

    // Save the new exercise to the database
    const savedExercise = await exerciseDoc.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (error) {
    console.error(error);
  }
});

/**
 * Get exercise logs for a user
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @returns {{
 *   _id: string,
 *   username: string,
 *   count: number,
 *   log: Array<{
 *     description: string,
 *     duration: number,
 *     date: string
 *   }>
 * }} The exercise log data for the user
 */
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from ? new Date(req.query.from) : new Date(0);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const limit = req.query.limit ? parseInt(req.query.limit) : 0;

  // Get the user's data by ID
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const searchFilter = {
      username: user.username,
      date: { $gte: from, $lte: to },
    };

    // Get the user's exercise logs
    const exercises = await Exercise.find(searchFilter);

    // Create a log object
    const logData = {
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(({ description, duration, date }) => ({
        description: description,
        duration: duration,
        date: date.toDateString(),
      })),
    };

    // Limit the number of logs
    if (limit > 0) {
      logData.log = logData.log.slice(0, limit);
    }

    res.json(logData);
  } catch (error) {
    console.error(error);
  }
});

const listener = app.listen(PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
