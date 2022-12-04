let express = require('express');
let router = express.Router();
const stock_read_log = require('../models/stock_read_log');
const FileSystem = require('fs');
const { log } = require('console');

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
    payload: 'PWAPJ.VI.AW.CXWX400.0600-2211-00035',
    // payload: 'PWAPJ.VI.AW.CXWX400.0600-2211-00036',
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
  try {
    // TODO Get Payload, Rejected QR List, New QR List from req body
    const { payload, reject_qr_list, new_qr_list } = req.body;

    // TODO Validate Payload, Rejected QR List, New QR List from from req body
    await validationRequestBody(payload, reject_qr_list, new_qr_list);

    // TODO Update the Rejected QR List and the New QR List
    await updateAndDeleteQR(payload, reject_qr_list, new_qr_list);

    // TODO Update Rejected QR List status to rejected based on request body
    //? Unused ???
    // for (let i = 0; i < reject_qr_list.length; i++) {
    //   console.log(reject_qr_list[i].payload);
    //   const updated = await stock_read_log.updateOne(
    //     { 'qr_list.payload': reject_qr_list[i].payload },
    //     {
    //       $set: { 'qr_list.$.status': 0, 'qr_list.$.status_qc': 1 },
    //     }
    //   );
    // }

    res.json('OK');
  } catch (error) {
    console.log(error);
    // res.json.json({
    //   message: 'Error edit repacking data',
    // });
  }
});

router.use('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

const validationRequestBody = async (payload, reject_qr_list, new_qr_list) => {
  try {
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
        throw {
          error: 'Rejected QR List not found',
        };
      }
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
        throw {
          error: 'New QR List not found',
        };
      }
    }
  } catch (error) {
    console.log(error);
    // res.status(404).json({
    //   message: error,
    // });
  }
};

const updateAndDeleteQR = async (payload, reject_qr_list, new_qr_list) => {
  try {
    for (let i = 0; i < new_qr_list.length; i++) {
      console.log(i + 1 + ' kali looping');
      const filter = {
        qr_list: { $elemMatch: { payload: new_qr_list[i].payload } },
      };
      // TODO Get One New QR
      const [newQRList] = await stock_read_log
        .aggregate([
          {
            $match: filter,
          },
        ])
        .exec();

      // TODO Map New QR to an object
      const [mappedNewQR] = newQRList.qr_list.filter(
        (newQR) => newQR.payload === new_qr_list[i].payload
      );

      // TODO Remove New QR List that we pulled
      const removed = await stock_read_log.updateOne(
        { qr_list: { $elemMatch: { payload: new_qr_list[i].payload } } },
        {
          $pull: {
            qr_list: { payload: new_qr_list[i].payload },
          },
          $inc: { qty: -1 },
        }
      );

      if (!removed.acknowledged) {
        throw {
          error: "Can't Remove",
        };
      }

      // TODO Add the mapped New QR to payload ( -> PWAPJ.VI.AW.CXWX400.0600-2211-00035)
      const updated = await stock_read_log.findOneAndUpdate(
        { payload: payload },
        {
          $inc: { qty: 1 },
          $push: { qr_list: mappedNewQR },
        }
      );
      // console.log(updated, '<<<');

      if (!updated) {
        throw {
          error: "Can't update",
        };
      }

      // TODO Remove the Rejected QR
      const deleteItem = await stock_read_log.updateOne(
        { qr_list: { $elemMatch: { payload: reject_qr_list[i].payload } } },
        {
          $pull: {
            qr_list: { payload: reject_qr_list[i].payload },
          },
          $inc: { qty: -1 },
        }
      );

      if (!deleteItem.acknowledged) {
        throw {
          error: "Can't remove item",
        };
      }
    }
  } catch (error) {
    console.log(error);
    // res.status(400).json({
    //   message: error,
    // });
  }
};

module.exports = router;
