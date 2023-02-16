async function Private_SearchReservation(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { queryPayload, returnPayload } = payload;

  const { startDate, endDate, days = 30 } = queryPayload;

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
    isSearchList = false,
    getPhoneSupport = false,
    getInsurance = false,
  } = returnPayload;

  const { page = 1, limit = 10, all = false } = pagination;

  const APP_CONSTANTS = context.values.get("app_constants");
  const { DB_FACILITRON_DEV } = context.environment.values;
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { PAYMENT_TYPES_ENUMS } = context.values.get("enums");
  const { RESERVATION_TYPES, PAYMENT_TYPES } = context.values.get(
    "reservation_constants"
  );

  let query = resolveQuery(queryPayload);

  if (getDueAmount || isSearchList) {
    query["created"] = {
      $gt: new Date(new Date().getFullYear(), new Date().getMonth() - 12, 0),
    };
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(COLLECTIONS.RESERVATIONS);

  let reservationProject = {
    short_id: 1,
    owner_id: "$owner._id",
    renter_id: "$renter",
    renter_owner_id: "$renter_owner",
    created: 1,
    status: 1,
  };

  if (getPhoneSupport) {
    reservationProject["support_ticket"] = 1;
  }

  /* 
    RESERVATION BASIC QUERY
  */
  let aReservationsAggregate = [
    { $match: { ...query } },
    {
      $project: reservationProject,
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
          { $project: { created: 1, description: 1, creator: 1 } },
          { $sort: { created: -1 } },
          { $limit: isSearchList ? 1 : 3 },
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
        $gte: new Date(
          new Date().setDate(new Date().getDate() - parseInt(days))
        ), // To get date when days is subtracted from today's date
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
              },
            },
            { $sort: { created: -1 } },
            // { $limit: 2 },
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
              },
            },
            { $sort: { created: -1 } },
            // { $limit: 2 },
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

  /* PAYMENTS RELATED TO RESERVATIONS */
  if (getPayments) {
    let paymentPipelineMatch = [
      { $eq: ["$$reservation_id", "$reservation"] },
      { $ne: ["$amount", 0] },
      { $ne: ["$status", 16] },
    ];
    if (startDate) {
      paymentPipelineMatch.push({
        $gte: ["$created", new Date(new Date(startDate).setHours(0, 0, 0, 0))],
      });
    }
    if (endDate) {
      paymentPipelineMatch.push({
        $lte: [
          "$created",
          new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        ],
      });
    }

    if (getPaymentHistory) {
      paymentPipelineMatch.push({
        $ne: [{ $toInt: "$payment_method.payment_type" }, 2],
      });
    }

    let paymentsPipelineProjection = {
      description: 1,
      created: 1,
      amount: 1,
    };

    if (getPaymentHistory) {
      paymentsPipelineProjection = {
        ...paymentsPipelineProjection,
        payment_method: 1,
        payment_obj: {
          icon_number: {
            $cond: {
              if: { $eq: [{ $toInt: "$payment_method.payment_type" }, 7] },
              then: null,
              // else: { $toInt: "$payment_method.payment_type" },
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
                  case: {
                    $regexMatch: {
                      input: "$description",
                      regex: "bounced",
                      options: "i",
                    },
                  },
                  then: "Bounced",
                },
                {
                  case: {
                    $regexMatch: {
                      input: "$description",
                      regex: "void",
                      options: "i",
                    },
                  },
                  then: "Void",
                },
                {
                  case: {
                    $regexMatch: {
                      input: "$description",
                      regex: "refund",
                      options: "i",
                    },
                  },
                  then: "Refunded",
                },
                {
                  case: {
                    $eq: [{ $toInt: "$payment_method.payment_type" }, 2],
                  },
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
                      {
                        transaction: "$transaction.creditCard.last4",
                        name: null,
                      },
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
                  then: {
                    transaction: "$payment_method.last4",
                    name: null,
                  },
                },
              ],
              default: null,
            },
          },
        },
        reservation_number: {
          short_id: "$shortId",
          display_text: null,
        },
      };
    }

    aReservationsAggregate.push({
      $lookup: {
        from: "reservation_payments",
        let: { reservation_id: "$_id", shortId: "$short_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: paymentPipelineMatch,
              },
            },
          },
          {
            $project: paymentsPipelineProjection,
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
    aReservationsAggregate.push({
      $unwind: {
        path: "$payments",
        preserveNullAndEmptyArrays: false,
      },
    });
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
      payments: 1,
    };
  }

  if (getPhoneSupport) {
    commonProjection["support_ticket"] = 1;
  }

  if (getPaymentHistory) {
    commonProjection = {
      ...commonProjection,
      payment_type: "$payments.payment_method.card_type",
      payment_description: "$payments.description",
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
        ...projectStage2,
        insurance_type: "$insurance_type.obj.insurance_type",
        payments: 1,
        charges: 1,
        support_comments: 1,
        comments: 1,
      },
    }
  );
  if (getPaymentHistory) {
    aReservationsAggregate.push({
      $project: {
        payments: {
          payment_method: {
            card_type: 0,
          },
          description: 0,
        },
      },
    });
  }
  /* 
    PAGINATION
  */
  aReservationsAggregate.push({ $skip: (page - 1) * limit });
  aReservationsAggregate.push({
    $limit: all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit,
  });

  let startTime = Date.now();
  console.log("startTime", new Date(startTime));

  let reservations = await collection
    .aggregate(aReservationsAggregate)
    .toArray();

  console.log("endtime", (Date.now() - startTime) / 1000, "seconds");

  // GetInsuranceStatus(reservations);

  // will use Private_PopulateOwnerAndRenter function for populating after working on the logic for external and internal type reservations.
  if (internalPopulate) {
    const { DB_FACILITRON_COMMON } = context.environment.values;

    let populateStartTime = Date.now();
    console.log("populateStartTime", new Date(populateStartTime));

    reservations = await populateOwnerAndRenter({
      reservations,
      RESERVATION_TYPES,
      DB_FACILITRON_COMMON,
      DATA_SOURCE,
      COLLECTIONS,
      getInsurance,
    }); // not needed for payment history
    console.log(
      "populateEndTime",
      (Date.now() - populateStartTime) / 1000,
      "seconds"
    );
  } else {
    reservations = await context.functions.execute(
      "Private_PopulateOwnerAndRenter",
      reservations
    );
  }

  return reservations;
}

async function populateOwnerAndRenter(payload) {
  const {
    RESERVATION_TYPES,
    DB_FACILITRON_COMMON,
    DATA_SOURCE,
    COLLECTIONS,
    getInsurance,
  } = payload;

  let { reservations } = payload;
  console.log(JSON.stringify(reservations));

  let userCollection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.USERS);

  let ownerCollection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.OWNERS);

  let OWNER_PROJECTION = {
    _id: 1,
    name: 1,
    u_id: 1,
    status: 1,
    owner: 1,
    timezone: 1,
  };

  if (getInsurance) {
    OWNER_PROJECTION["insurance_outgoing"] = 1;
  }

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
    let ownerIds = [];

    if (reservation?.owner_id) {
      ownerIds.push(reservation?.owner_id);
    }

    if (reservation?.renter_owner_id) {
      ownerIds.push(reservation?.renter_owner_id);
    }
    let owners = await ownerCollection
      .aggregate([
        {
          $match: { _id: { $in: ownerIds } },
        },
        {
          $lookup: {
            from: "owners",
            let: { ownerId: "$owner" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$ownerId", "$_id"],
                  },
                },
              },
              {
                $project: OWNER_PROJECTION,
              },
            ],
            as: "owner",
          },
        },
        {
          $unwind: {
            path: "$owner",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: OWNER_PROJECTION,
        },
      ])
      .toArray();

    let ownerIndex = owners.findIndex(
      (x) => String(x._id) === String(reservation.owner_id)
    );

    if (ownerIndex !== -1) {
      reservation["owner"] = owners[ownerIndex];
    }

    let renterOwnerIndex = owners.findIndex(
      (x) => String(x._id) === String(reservation.renter_owner_id)
    );

    if (renterOwnerIndex !== -1) {
      reservation["renter_owner"] = owners[renterOwnerIndex];
    }

    if (reservation?.renter_id) {
      let renter = await userCollection.findOne(
        { _id: reservation?.renter_id },
        USER_PROJECTION
      );
      reservation["renter"] = renter;
    }
    reservation = addReservationType(reservation, RESERVATION_TYPES);
  }

  return reservations;
}

function addReservationType(reservation, RESERVATION_TYPES) {
  let renterOwner = reservation?.renter_owner_id;

  if (renterOwner && String(reservation?.owner_id) === String(renterOwner)) {
    reservation["type"] = RESERVATION_TYPES.INTERNAL;
  } else if (
    reservation?.renter_owner?.owner?._id &&
    String(reservation?.owner?.owner?._id) ===
      String(reservation?.renter_owner?.owner?._id)
  ) {
    reservation["type"] = RESERVATION_TYPES.FAMILY;
  } else {
    reservation["type"] = RESERVATION_TYPES.EXTERNAL;
  }
  return reservation;
}

function resolveQuery(query) {
  let resolvedQuery = {};

  if (query?.searchOwner && query?.orgId) {
    resolvedQuery["owner._id"] = new BSON.ObjectId(query?.orgId);
  }
  let orFirstQuery = {};
  let orSecondQuery = {};

  if (!query?.searchOwner && query?.orgId) {
    resolvedQuery["$or"] = [];
    orFirstQuery["renter_owner"] = new BSON.ObjectId(query?.orgId);
  }
  if (query?.userId) {
    resolvedQuery["$or"] = resolvedQuery?.$or ? [...resolvedQuery.$or] : [];
    orFirstQuery["renter"] = new BSON.ObjectId(query?.userId);
    orSecondQuery = {
      renter: new BSON.ObjectId(query?.userId),
      renter_owner: null,
    };
  }
  if (query?.shortId) {
    resolvedQuery["short_id"] = query?.shortId;
  }
  if (query?.searchText) {
    resolvedQuery["short_id"] = { $regex: query?.searchText, $options: "i" };
  }

  if (orFirstQuery?.renter_owner) {
    resolvedQuery["$or"].push(orFirstQuery);
  }
  if (orSecondQuery?.renter) {
    resolvedQuery["$or"].push(orSecondQuery);
    // using orFirst and orSecond to fetch reservations that was made by a user|renter personally (renter only) or renter + renter_owner
  }
  return resolvedQuery;
}

// Function exported to App Services
exports = Private_SearchReservation;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_SearchReservation };
}
