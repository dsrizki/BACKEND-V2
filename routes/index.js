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

  // TODO Get Payload, Rejected QR List, New QR List from req body
  const { payload, reject_qr_list, new_qr_list } = req.body;

  // TODO Validate Payload, Rejected QR List, New QR List from from req body

  // TODO looping as much as reject_qr_list length from req body
  for (let i = 0; i < reject_qr_list.length; i++) {
    // console.log(reject_qr_list[i].payload);
    const filter = {
      payload: payload,
      qr_list: { $elemMatch: { payload: reject_qr_list[i].payload } },
    };

    const isRejectedQRListExist = await stock_read_log
      .aggregate([
        {
          $match: filter,
        },
      ])
      .exec();
    if (!isRejectedQRListExist.length) {
      return res.status(404).json({
        message: 'Rejected QR List not found',
      });
    }
  }

  // TODO looping as much as new_qr_list length from req body
  for (let i = 0; i < new_qr_list.length; i++) {
    // console.log(new_qr_list[i].payload);
    const filter = {
      qr_list: { $elemMatch: { payload: new_qr_list[i].payload } },
    };

    const isNewQRListExist = await stock_read_log
      .aggregate([
        {
          $match: filter,
        },
      ])
      .exec();
    if (!isNewQRListExist.length) {
      return res.status(404).json({
        message: 'New QR List not found',
      });
    }
  }

  const filter = {};

  const list = await stock_read_log
    .aggregate([
      {
        $match: filter,
      },
    ])
    .exec();

  res.json(list);
});

router.use('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
