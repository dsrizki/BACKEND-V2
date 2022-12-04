let express = require('express');
let router = express.Router();
const stock_read_log = require('../models/stock_read_log');
const FileSystem = require('fs');

router.use('/export-data', async (req, res) => {
  const list = await stock_read_log
    .aggregate([
      {
        $match: {},
      },
    ])
    .exec();

  FileSystem.writeFile(
    './stock_read_log.json',
    JSON.stringify(list),
    (error) => {
      if (error) throw error;
    }
  );

  console.log('stock_read_log.json exported!');
  res.json({ statusCode: 1, message: 'stock_read_log.json exported!' });
});

router.use('/import-data', async (req, res) => {
  const list = await stock_read_log
    .aggregate([
      {
        $match: {},
      },
    ])
    .exec();

  FileSystem.readFile('./stock_read_log.json', async (error, data) => {
    if (error) throw error;

    const list = JSON.parse(data);

    const deletedAll = await stock_read_log.deleteMany({});

    const insertedAll = await stock_read_log.insertMany(list);

    console.log('stock_read_log.json imported!');
    res.json({ statusCode: 1, message: 'stock_read_log.json imported!' });
  });
});

router.use('/edit-repacking-data', async (req, res) => {
  // Silahkan dikerjakan disini.

  // TODO Get Payload, Rejected QR List, New QR List from request body
  const { payload, reject_qr_list, new_qr_list } = req.body;

  const filter = {};

  const list = await stock_read_log
    .aggregate([
      {
        $match: filter,
      },
    ])
    .exec();

  console.log(list.length);

  res.json(list);
});

router.use('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;