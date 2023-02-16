async function Private_GetAccountBalance(payload) {
  const { orgId, userId, startDate, endDate = new Date() } = payload;
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_DEV } = context.environment.values;

  let collectionName = COLLECTIONS.WALLET_OWNERS;

  let query = {};

  if (orgId) {
    query = {
      owner: new BSON.ObjectId(orgId),
    };
  }

  if (userId) {
    collectionName = COLLECTIONS.WALLET_USERS;
    query = {
      user: new BSON.ObjectId(userId),
    };
  }

  let match2Pipeline = {};

  /* 
  
  If we are pulling data for last 90 days
  then startDate=
  
  */
  if (startDate) {
    match2Pipeline["created"] = { $lt: new Date(startDate) };
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(collectionName);

  let pipeline = [
    {
      $match: { ...query },
    },
    {
      $project: {
        id: 1,
        created: {
          $cond: {
            if: {
              $lt: [{ $abs: { $subtract: ["$paid_date", "$created"] } }, 60000],
            },
            then: "$created",
            else: {
              $ifNull: [
                { $add: ["$paid_date", 8 * 60 * 60 * 1000] },
                "$created",
              ],
            },
          },
        },
        amount: { $ifNull: ["$amount", 0] },
      },
    },
    {
      $match: { ...match2Pipeline },
    },
    { $group: { _id: "$id", balance: { $sum: "$amount" } } },
  ];
  let startTime = Date.now();
  console.log("get account balance startTime", new Date(startTime));

  let response = await collection.aggregate(pipeline).toArray();

  console.log("get account balance endtime", Date.now() - startTime);
  return JSON.parse(JSON.stringify(response));
}

// Function exported to App Services
exports = Private_GetAccountBalance;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetAccountBalance };
}
