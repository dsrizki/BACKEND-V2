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

router.use('/all', async (req, res) => {
  const { payload, reject_qr_list, new_qr_list } = req.body;
  const filter = {
    // payload: payload,
    // qr_list: { $elemMatch: { payload: reject_qr_list[1].payload } },
    // qr_list: { $elemMatch: { payload: new_qr_list[0].payload } },
    payload: 'PWAPJ.VI.AW.CXWX400.0600-2211-00036',
    // payload: 'PWAPJ.VI.AW.CXWX400.0600-2211-00037',
  };
  const list = await stock_read_log
    .aggregate([
      {
        $match: filter,
      },
    ])
    .exec();
  res.json(list);
});

router.use('/edit-repacking-data', async (req, res) => {
  // Silahkan dikerjakan disini.

  // TODO Get Payload, Rejected QR List, New QR List from req body
  const { payload, reject_qr_list, new_qr_list } = req.body;

  // TODO Validate Payload, Rejected QR List, New QR List from from req body

  // TODO looping as much as reject_qr_list length from req body
  for (let i = 0; i < reject_qr_list.length; i++) {
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
    // console.log(isRejectedQRListExist);
  }

  // TODO looping as much as new_qr_list length from req body
  for (let i = 0; i < new_qr_list.length; i++) {
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
    // console.log(isNewQRListExist);
  }

  //! TODO MAKE IT 1 FUNCTION
  // TODO Add New QR List from request body New QR List
  for (let i = 0; i < new_qr_list.length; i++) {
    // console.log(new_qr_list[i].payload);
    const filter = {
      qr_list: { $elemMatch: { payload: new_qr_list[i].payload } },
    };

    const [newQRList] = await stock_read_log
      .aggregate([
        {
          $match: filter,
        },
      ])
      .exec();
    // console.log(newQRList.qr_list);
    const [filtered] = newQRList.qr_list.filter(
      (newQR) => newQR.payload === new_qr_list[i].payload
    );

    await stock_read_log.updateOne(
      { qr_list: { $elemMatch: { payload: new_qr_list[i].payload } } },
      {
        $pull: {
          qr_list: { payload: new_qr_list[i].payload },
        },
        $inc: { qty: -1 },
      }
    );

    const updated = await stock_read_log.findOneAndUpdate(
      { payload: payload },
      {
        $inc: { qty: 1 },
        $push: { qr_list: filtered },
      }
    );
    console.log('masuk pak eko');
    // console.log(updated);

    // TODO Remove Rejected QR List
    console.log(reject_qr_list[i].payload);
    const deleteItem = await stock_read_log.updateOne(
      { qr_list: { $elemMatch: { payload: reject_qr_list[i].payload } } },
      {
        $pull: {
          qr_list: { payload: reject_qr_list[i].payload },
        },
        $inc: { qty: -1 },
      }
    );
    console.log(deleteItem);
  }
  //! TODO MAKE IT 1 FUNCTION

  // TODO Update Rejected QR List status to rejected based on request body
  // for (let i = 0; i < reject_qr_list.length; i++) {
  //   console.log(reject_qr_list[i].payload);
  //   const updated = await stock_read_log.updateOne(
  //     { 'qr_list.payload': reject_qr_list[i].payload },
  //     {
  //       $set: { 'qr_list.$.status': 0, 'qr_list.$.status_qc': 1 },
  //     }
  //   );
  // }

  // TODO Remove QR list that rejected based on request body

  // TODO Remove QR List that inserted based on request body New QR List

  // TODO Decrement the payload qty

  res.json('OK');
});

router.use('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
