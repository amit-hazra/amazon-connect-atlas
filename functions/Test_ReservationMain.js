async function Test_ReservationMain(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { queryPayload, returnPayload } = payload;

  const { orgId, userId, startDate, endDate, days = 30 } = queryPayload;

  const {
    getSupportComments = false, //Does the caller need us to return the support comments
    getRecentComments = false, //Does the caller need us to return recent comments
    getDueAmount = false, //Does the caller need us to return the amount due
    getPaymentHistory = false,
    getPayments = false,
    getReservationLogs = false,
    getEventDetails = false,
    getInsuranceDetails = false,
    internalPopulate = false,
  } = returnPayload;

  const { page = 1, limit = 10, all = false } = pagination;

  const APP_CONSTANTS = context.values.get("app_constants");
  const { DB_FACILITRON_DEV } = context.environment.values;
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");

  let query = {};

  if (getPayments) {
    query = resolvePaymentsQuery(queryPayload);
  }

  if (getRecentComments) {
    query = resolveRecentCommentsQuery(queryPayload);
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(COLLECTIONS.RESERVATIONS);
  /* 
    RESERVATION BASIC QUERY
  */
  let aReservationsAggregate = [
    { $match: { ...query } },
    {
      $project: {
        short_id: 1,
        owner_id: "$owner._id",
        renter_id: "$renter",
        renter_owner_id: "$renter_owner",
        created: 1,
        status: 1,
      },
    },
  ];

  /* 
    RESERVATION EVENT DETAILS
  */
  if (getEventDetails) {
    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_objs",
        let: { res_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$reservation", "$$res_id"] },
                  {
                    $or: [
                      { $eq: ["$description", "event_name"] },
                      { $eq: ["$description", "daily_schedules"] },
                      { $eq: ["$description", "attendance"] },
                      { $eq: ["$description", "insurance"] },
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              description: 1,
              "obj.event_name": 1,
              "obj.localDate": 1,
              "obj.attendance_participants": 1,
              "obj.attendance_spectators": 1,
              "obj.insurance_type": 1,
            },
          },
        ],
        as: "objs",
      },
    });
  }

  /* 
    RESERVATION LOGS - APPROVED LOGS
  */
  if (getReservationLogs) {
    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_logs",
        let: { reservation_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$reservation_id", "$reservation"] },
                  { $eq: ["$status_type", "approved"] },
                ],
              },
            },
          },
          { $project: { created: 1, status_type: 1 } },
          { $sort: { created: -1 } },
        ],
        as: "approved_logs",
      },
    });
  }
  /* 
    SUPPORT COMMENTS
  */
  if (getSupportComments) {
    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_facilitron_comments",
        let: { reservation_id: "$_id" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$$reservation_id", "$reservation"] } },
          },
          { $project: { created: 1, description: 1 } },
          { $sort: { created: -1 } },
        ],
        as: "support_comments",
      },
    });
  }

  /* 
    RECENT COMMENTS
  */
  if (getRecentComments) {
    let recentCommentsPipelineMatch = {
      created: {
        $gte: new Date().setDate(new Date().getDate() - parseInt(days)), // To get date if days is subtracted from today's date
      },
    };

    aReservationsAggregate.push(
      {
        $lookup: {
          from: "reservation_internal_comments", // internal comments
          let: { reservation_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$reservation_id", "$reservation"] },
                ...recentCommentsPipelineMatch,
              },
            },
            {
              $project: {
                created: 1,
                description: 1,
                creator: 1,
                type: "internal",
              },
            },
            { $sort: { created: -1 } },
            { $limit: 2 },
          ],
          as: "internal_comments",
        },
      },
      {
        $lookup: {
          from: "reservation_comments", // external comments
          let: { reservation_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$reservation_id", "$reservation"] },
                ...recentCommentsPipelineMatch,
              },
            },
            {
              $project: {
                created: 1,
                description: 1,
                creator: 1,
                type: "external",
              },
            },
            { $sort: { created: -1 } },
            { $limit: 2 },
          ],
          as: "external_comments",
        },
      },
      {
        $addFields: {
          comments: {
            $concatArrays: ["$internal_comments", "$external_comments"],
          },
        },
      },
      {
        $addFields: {
          comments_size: { $size: "$comments" },
        },
      },
      {
        $match: {
          comments_size: { $gt: 0 },
        },
      },
      /*  {
        $match: {
          $or: [
            { comments: { $gt: { $size: 0 } } },
            {
              created: {
                $gte: new Date(
                  new Date().setDate(new Date().getDate() - parseInt(30))
                ),
              },
            },
          ],
        },
      }, */ // If we want 'reservations with no comments' should also be returned
      {
        $project: {
          comments_size: 0,
          internal_comments: 0,
          external_comments: 0,
        },
      },
      {
        $sort: {
          "comments.created": -1,
        },
      }
    );
  }

  /* 
 
  
  */

  /* PAYMENTS RELATED TO RESERVATIONS */
  if (getPayments) {
    let paymentPipelineMatch = [
      { $eq: ["$$reservation_id", "$reservation"] },
      { $ne: ["$amount", 0] },
      { $ne: ["$status", 16] },
    ];
    if (startDate) {
      paymentPipelineMatch.push({
        $gte: ["$created", new Date(startDate)],
      });
    }
    if (endDate) {
      paymentPipelineMatch.push({
        $lte: ["$created", new Date(endDate)],
      });
    }

    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_payments",
        let: { reservation_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: paymentPipelineMatch,
              },
            },
          },
          {
            $project: {
              description: 1,
              created: 1,
              amount: 1,
              payment_method: 1,
            },
          },
        ],
        as: "payments",
      },
    });
  }

  /* 
    RESERVATION RELATED CHARGES - PAYMENT DUES
  */
  if (getDueAmount) {
    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_charges",
        let: { reservation_id: "$_id" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$$reservation_id", "$reservation"] } },
          },
          {
            $project: {
              description: 1,
              name: 1,
              category: 1,
              localDate: 1,
              amount: 1,
            },
          },
        ],
        as: "charges",
      },
    });
  }

  /* 
   UNWIND FOR PAYMENT HISTORY
  */
  if (getPaymentHistory) {
    let collectionName = COLLECTIONS.WALLET_OWNERS;
    let match1Stage = {};
    let match2Stage = {};
    if (orgId) {
      match1Stage = {
        owner: new BSON.ObjectId(orgId),
      };
    }

    if (userId) {
      collectionName = COLLECTIONS.WALLET_USERS;
      match1Stage = {
        user: new BSON.ObjectId(userId),
      };
    }

    if (startDate) {
      match2Stage["created"] = {
        $gte: new Date(startDate),
      };
    }

    if (endDate) {
      match2Stage["created"] = {
        ...match2Stage.created,
        $lte: new Date(endDate),
      };
    }
    aReservationsAggregate.push(
      {
        $lookup: {
          from: collectionName,
          pipeline: [
            { $match: match1Stage },
            {
              $project: {
                type: "wallet_payment",
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
                      $lt: [
                        { $abs: { $subtract: ["$paid_date", "$created"] } },
                        60000,
                      ],
                    },
                    then: "$created",
                    else: {
                      $ifNull: [{ $add: ["$paid_date", 28800000] }, "$created"],
                    },
                  },
                },
                amount: { $ifNull: ["$amount", 0] },
                transaction_type: "$payment_info.transaction_type",
              },
            },
            {
              $match: match2Stage,
            },
          ],
          as: "wallet_payments",
        },
      },
      {
        $addFields: {
          payment_history: {
            $concatArrays: ["$payments", "$wallet_payments"],
          },
        },
      },
      {
        $unwind: {
          path: "$payment_history",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          "payment_history.created": -1,
        },
      }
    );
  }

  /* 
    AGGREGATE PROJECTION
  */
  let commonProjection = {
    short_id: 1,
    created: 1,
    status: 1,
    owner_id: 1,
    renter_id: 1,
    renter_owner_id: 1,
    type: 1,
  };

  let projectStage1 = {};
  let projectStage2 = {};

  if (getPayments) {
    commonProjection = {
      ...commonProjection,
      payment_history: 1,
    };
  }

  if (getRecentComments) {
    commonProjection = {
      ...commonProjection,
      comments: 1,
    };
  }

  if (getSupportComments) {
    commonProjection = {
      ...commonProjection,
      support_comments: 1,
    };
  }

  if (getDueAmount) {
    commonProjection = {
      ...commonProjection,
      charges: 1,
    };
  }

  if (getEventDetails) {
    projectStage1 = {
      ...projectStage1,
      event_name: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$objs",
              as: "event_name",
              cond: { $eq: ["$$event_name.description", "event_name"] },
            },
          },
          0,
        ],
      },
      event_dates: {
        $filter: {
          input: "$objs",
          as: "event_dates",
          cond: { $eq: ["$$event_dates.description", "daily_schedules"] },
        },
      },
    };

    projectStage2 = {
      ...projectStage2,
      event_name: "$event_name.obj.event_name",
      event_dates: "$event_dates.obj.localDate",
    };
  }

  if (getInsuranceDetails) {
    projectStage1 = {
      ...projectStage1,
      insurance_type: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$objs",
              as: "insurance",
              cond: { $eq: ["$$insurance.description", "insurance"] },
            },
          },
          0,
        ],
      },
    };
  }

  if (getReservationLogs) {
    projectStage1 = {
      ...projectStage1,
      attendance_info: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$objs",
              as: "attendance_obj",
              cond: { $eq: ["$$attendance_obj.description", "attendance"] },
            },
          },
          0,
        ],
      },
      approved_date: { $arrayElemAt: ["$approved_logs", 0] },
    };

    projectStage2 = {
      ...projectStage2,
      attendance: {
        $sum: [
          "$attendance_info.obj.attendance_participants",
          "$attendance_info.obj.attendance_spectators",
        ],
      },
      approved_date: "$approved_date.created",
    };
  }

  aReservationsAggregate.push(
    {
      $project: {
        ...commonProjection,
        ...projectStage1,
      },
    },
    {
      $project: {
        ...commonProjection,
        insurance_type: "$insurance_type.obj.insurance_type",

        payments: 1,
        charges: 1,
        support_comments: 1,
        comments: 1,
      },
    }
  );

  /* 
    PAGINATION
  */
  aReservationsAggregate.push({ $skip: (page - 1) * limit });
  aReservationsAggregate.push({
    $limit: all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit,
  });

  let reservations = await collection
    .aggregate(aReservationsAggregate, { allowDiskUse: true })
    .toArray();

  // GetInsuranceStatus(reservations);

  // will use Private_PopulateOwnerAndRenter function for populating after working on the logic for external and internal type reservations.
  if (internalPopulate) {
    reservations = await populateOwnerAndRenter(reservations); // not needed for payment history
  } else {
    reservations = await context.functions.execute(
      "Private_PopulateOwnerAndRenter",
      reservations
    );
  }

  return reservations;
}

async function populateOwnerAndRenter(reservations) {
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  let userCollection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.USERS);

  let ownerCollection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.OWNERS);

  const OWNER_PROJECTION = {
    _id: 1,
    name: 1,
    u_id: 1,
    status: 1,
  };

  const USER_PROJECTION = {
    _id: 1,
    first_name: 1,
    last_name: 1,
    phone: 1,
    local: {
      email: 1,
    },
  };

  for (let reservation of reservations) {
    if (reservation?.owner_id) {
      let owner = await ownerCollection.findOne(
        { _id: reservation?.owner_id },
        OWNER_PROJECTION
      );
      reservation["owner"] = owner;
    }

    if (reservation?.renter_owner_id) {
      let renterOwner = await ownerCollection.findOne(
        {
          _id: reservation?.renter_owner_id,
        },
        OWNER_PROJECTION
      );
      reservation["renter_owner"] = renterOwner;
    }

    if (reservation?.renter_id) {
      // let renter = await userCollection.findOne(
      //   { _id: reservation?.renter_id },
      //   USER_PROJECTION
      // );
      // reservation["renter"] = renter;
    }
  }

  return reservations;
}

function resolvePaymentsQuery(query) {
  let resolvedQuery = {};

  if (query?.orgId) {
    resolvedQuery["renter_owner"] = new BSON.ObjectId(query?.orgId);
  }

  if (query?.userId) {
    resolvedQuery["renter"] = new BSON.ObjectId(query?.userId);
  }

  return resolvedQuery;
}

function resolveRecentCommentsQuery(query) {
  let resolvedRecentCommentsQuery = {};
  if (query.userId) {
    resolvedRecentCommentsQuery["renter"] = new BSON.ObjectId(query.userId);
  }
  if (query.orgId) {
    resolvedRecentCommentsQuery = {
      ...resolvedRecentCommentsQuery,
      $or: [
        {
          owner: new BSON.ObjectId(query.orgId),
        },
        {
          renter_owner: new BSON.ObjectId(query.orgId),
        },
      ],
    };
  }
  return resolvedRecentCommentsQuery;
}

// Function exported to App Services
exports = Test_ReservationMain;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Test_ReservationMain };
}
