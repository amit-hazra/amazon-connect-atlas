async function Private_GetWalletPayments(payload) {
  const { orgId, userId, startDate, endDate = new Date() } = payload;
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { PAYMENT_TYPES_ENUMS } = context.values.get("enums");
  const { WALLET_NAMES, PAYMENT_TYPES } = context.values.get(
    "reservation_constants"
  );
  const { DB_FACILITRON_DEV } = context.environment.values;
  let collectionName = COLLECTIONS.WALLET_OWNERS;

  let query = {
    name: { $ne: WALLET_NAMES.INSURANCE_PAYMENT }, //This is only for facility owner organizations (status=0)
    name: { $ne: WALLET_NAMES.SWEEP_RECEIVED }, //This is only for facility owner organizations (status=0)
    name: { $ne: WALLET_NAMES.SWEEP_SENT }, //This is only for facility owner organizations (status=0)
    name: { $ne: WALLET_NAMES.RESERVATION_PAYMENT }, //This is only for facility owner organizations (status=0)
  };

  if (orgId) {
    query = {
      ...query,
      owner: new BSON.ObjectId(orgId),
    };
  }

  if (userId) {
    collectionName = COLLECTIONS.WALLET_USERS;
    query = {
      ...query,
      user: new BSON.ObjectId(userId),
    };
  }

  let match2Stage = {};
  if (startDate) {
    match2Stage["created"] = {
      $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
    };
  }

  if (endDate) {
    match2Stage["created"] = {
      ...match2Stage.created,
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(collectionName);

  console.log(JSON.stringify(query));

  let pipeline = [
    { $match: { ...query } },
    {
      $project: {
        name: 1,
        reservation_id: {
          $cond: [
            { $eq: [{ $ifNull: ["$reservation_id", null] }, null] },
            "NoResId",
            "$reservation_id",
          ],
        },
        owner: 1,
        description: 1,
        payment_method: {
          $ifNull: ["$payment_info.payment_method", "$payment_method"],
        },
        cc_last4: "$payment_info.transaction.creditCard.last4",
        created: {
          $cond: {
            if: {
              $lt: [{ $abs: { $subtract: ["$paid_date", "$created"] } }, 60000],
            },
            then: "$created",
            else: { $ifNull: [{ $add: ["$paid_date", 28800000] }, "$created"] },
          },
        },
        amount: { $ifNull: ["$amount", 0] },
        transaction_type: "$payment_info.transaction_type",
        payment_type: "wallet_payment",
      },
    },
    {
      $match: match2Stage,
    },
    {
      $lookup: {
        from: "reservations",
        let: { res_id: "$reservation_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$$res_id", "$_id"] } } },
          { $project: { _id: 0, short_id: 1, status: 1 } },
        ],
        as: "reservation_info",
      },
    },
    {
      $unwind: { path: "$reservation_info", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        name: 1,
        reservation_id: 1,
        reservation_info: 1,
        owner: 1,
        description: 1,
        payment_method: 1,
        cc_last4: 1,
        created: 1,
        amount: 1,
        transaction_type: 1,
        payment_type: 1,
        payments: {
          payment_obj: {
            icon_number: {
              $cond: {
                if: { $eq: [{ $toInt: "$payment_method.payment_type" }, 7] },
                then: null,
                else: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $eq: [
                            "$payment_method.card_type",
                            PAYMENT_TYPES.CREDIT_CARD,
                          ],
                        },
                        then: PAYMENT_TYPES_ENUMS.CREDIT_CARD,
                      },
                      {
                        case: {
                          $eq: [
                            { $toLower: "$payment_method.card_type" },
                            PAYMENT_TYPES.PAYPAL,
                          ],
                        },
                        then: PAYMENT_TYPES_ENUMS.PAYPAL,
                      },
                      {
                        case: {
                          $eq: [
                            "$payment_method.card_type",
                            PAYMENT_TYPES.BANK_CHECK,
                          ],
                        },
                        then: PAYMENT_TYPES_ENUMS.BANK_CHECK,
                      },
                      {
                        case: {
                          $eq: [
                            "$payment_method.card_type",
                            PAYMENT_TYPES.E_CHECK,
                          ],
                        },
                        then: PAYMENT_TYPES_ENUMS.E_CHECK,
                      },
                      {
                        case: {
                          $eq: [
                            { $toLower: "$payment_method.card_type" },
                            PAYMENT_TYPES.CASH,
                          ],
                        },
                        then: PAYMENT_TYPES_ENUMS.CASH,
                      },
                    ],
                    default: null,
                  },
                },
              },
            },
            display_text: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$name", "bounced_payment"] },
                    then: "Bounce, other fee",
                  },
                  {
                    case: { $eq: ["$name", "refund_to_account"] },
                    then: "Refunded",
                  },
                  {
                    case: { $eq: ["$name", "reservation_transfer"] },
                    then: {
                      $cond: [
                        { $gte: ["$amount", 0] },
                        "To account from",
                        "From account to",
                      ],
                    },
                  },

                  {
                    case: {
                      $eq: [{ $toInt: "$payment_method.payment_type" }, 7],
                    },
                    then: "Direct Payment",
                  },
                ],
                default: null,
              },
            },
            hover_text: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: [{ $toInt: "$payment_method.payment_type" }, 0],
                    },
                    then: {
                      $cond: [
                        { $eq: ["$payment_method.card_type", "PayPal"] },
                        { transaction: null, name: null },
                        { transaction: "$cc_last4", name: null },
                      ],
                    },
                  },
                  {
                    case: {
                      $eq: [{ $toInt: "$payment_method.payment_type" }, 3],
                    },
                    then: {
                      transaction: null,
                      name: {
                        $concat: [
                          "$payment_method.first_name",
                          " ",
                          "$payment_method.last_name",
                        ],
                      },
                    },
                  },
                  {
                    case: {
                      $eq: [{ $toInt: "$payment_method.payment_type" }, 8],
                    },
                    then: { transaction: "$payment_method.last4", name: null },
                  },
                ],
                default: null,
              },
            },
          },
          reservation_number: {
            short_id: { $ifNull: ["$reservation_info.short_id", null] },
            display_text: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$name", "payment_processing_fee"] },
                    then: "Payment Processing Fee",
                  },
                  {
                    case: { $eq: ["$name", "add_payment"] },
                    then: "Charged to Renter",
                  },
                  {
                    case: { $eq: ["$name", "refund_to_account"] },
                    then: "Refunded from Account",
                  },
                  {
                    case: { $eq: ["$name", "renter_payment"] },
                    then: "Payment to Account",
                  },
                  {
                    case: { $eq: ["$name", "payment_to_account"] },
                    then: "Payment to Account",
                  },
                ],
                default: null,
              },
            },
          },
        },
      },
    },
  ];
  let startTime = Date.now();
  console.log("get wallet payments startTime", new Date(startTime));

  let response = await collection.aggregate(pipeline).toArray();
  console.log("get wallet payments endtime", Date.now() - startTime);
  return JSON.parse(JSON.stringify(response));
}

// Function exported to App Services
exports = Private_GetWalletPayments;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetWalletPayments };
}
