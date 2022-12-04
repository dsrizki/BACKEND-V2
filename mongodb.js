let mongoose = require('mongoose');
require('dotenv').config();

let db = process.env.DB || 'local_db';
let url = process.env.DB_URL || 'localhost:27017';

let DB_ref = mongoose
  .createConnection('mongodb://' + url + '/' + db)

  .on('error', function (err) {
    if (err) {
      console.error('Error connecting to MongoDB.', err.message);
      process.exit(1);
    }
  })
  .once('open', function callback() {
    console.info('Mongo db connected successfully ' + db);
  });

module.exports = DB_ref;
