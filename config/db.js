const mongoose = require('mongoose');

const dns = require('dns');

const connectDB = async () => {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(process.env.MONGO_URI);

  console.log(`MongoDB connected: ${conn.connection.host}`)
}

module.exports = connectDB;