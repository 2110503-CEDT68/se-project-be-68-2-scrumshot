const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Load models
const Campground = require('./models/Campground');

// Connect to DB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI);

// Read JSON file
const campgrounds = JSON.parse(
  fs.readFileSync(`${__dirname}/campgrounds.json`, 'utf-8')
);

// Import into DB
const seedDatabase = async () => {
  try {
    console.log('Clearing existing campgrounds...');
    await Campground.deleteMany();

    console.log('Importing campgrounds from JSON...');
    await Campground.create(campgrounds);

    console.log('Database successfully seeded!');
    process.exit();
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();
