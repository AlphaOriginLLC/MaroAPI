const itemGenerator = require('../generators/itemGenerator');
const networthGenerator = require('../generators/networthGenerator');
const router = require('express').Router();
const db = require('../storage/database');

let prices = {};

const retrievePrices = async function () {

  for (const item of await db.auctions.find()) {
    // Temporarily (?) find CPC of outdated auctions
    let value = item.auction.value ?? 0;
    let lower = item.id.toLowerCase();
    // if(value == 0 && !(lower in prices)){
    //   let count = item.auction.count;
    //   value = (count <= 1) ? item.auction.price : item.auction.price / count;
    //   unfoundAuctions[lower] = value;
    // }
    prices[lower] = parseInt(value);
  }

  for (const product of await db.bazaar.find()) {
    prices[product.id.toLowerCase()] = parseInt(product.buyPrice);
  }
};

const createJsonResponse = function (res, code, reason) {
  return res.status(code).json({
    status: code,
    cause: reason
  });
};


router.post('/categories', async (req, res) => {
  const profile = req.body.data;

  try {
    const items = await itemGenerator.getItems(profile, prices);
    if (items.no_inventory) {
      return createJsonResponse(res, 404, 'This player has their inventory API disabled.');
    }

    return res.status(200).json({
      status: 200,
      data: await networthGenerator.getNetworth(items, profile)
    });
  } catch (e) {
    console.error(e);
    return createJsonResponse(res, 500, 'An internal server error occurred.');
  }
});

router.post('/total', async (req, res) => {
  const profile = req.body.data;

  try {
    const items = await itemGenerator.getItems(profile, prices);

    if (items.no_inventory) {
      return createJsonResponse(res, 404, 'This player has their inventory API disabled.');
    }

    const data = await networthGenerator.getNetworth(items, profile);

    const output = {
      total: data.networth + (data.purse + data.bank),
      purse: data.purse,
      bank: data.bank
    };

    return res.status(200).json({
      status: 200,
      data: output
    });
  } catch (e) {
    return createJsonResponse(res, 500, 'An internal server error occurred.');
  }
});

retrievePrices();
setInterval(() => retrievePrices(), 60 * 10000);

module.exports = router;
