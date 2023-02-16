async function GetReservationByID(payload) {
  const { shortId } = payload;
  if (!shortId || shortId === null) {
    throw new Error("Invalid shortId");
  }
  /*  const SAMPLE_DATA = {
        "id": "q2345q345q4eyw5y",
        "shortId": "QAWSEFTHCKHG",
        "refUrl": "http://something.com/",
        "createdAt": "2022-09-08T10:12:29.301+00:00",
        "eventDates": [
          "2022-09-08",
          "2022-09-09"
        ],
        "statusDate": "2022-09-10T10:12:29.301+00:00",
        "owner": "Child Org name",
        "parent": "Parent Org name",
        "status": "pending",
        "hasInsuranceIssues": "invalid",
        "total": 123,
        "due": 10,
        "currency": "USD",
        "user": "John Doe",
        "support": [
          {
            "type": "Chat",
            "comment": "Some note for a ticket",
            "commentedDate": "2022-09-10T10:12:29.301+00:00",
            "user": "Jone Doe"
          },
          {
            "type": "Phone",
            "note": "Some note for a ticket",
            "noteDate": "2022-09-10T10:12:29.301+00:00",
            "reason": "Renter reservation tickets"
          }
        ]
      };
    //let collection = context.services.get("mongodb-atlas").db("").collection(""); */

  const PARAMS = {
    queryPayload: payload,
    returnPayload: {
      getPayments: true, // to get the payment array
      internalPopulate: true,
      getEventDetails: true,
      getReservationLogs: true,
      getDueAmount: true,
      getSupportComments: true,
      getPhoneSupport: true
    },
  };
  let startTime = Date.now();
  let reservations = await context.functions.execute(
    "Private_SearchReservation",
    PARAMS,
    {}
  );

  let commission = await context.functions.execute(
    "Private_GetCommissionTerms",
    {
      default: true,
    }
  );

  reservations = await context.functions.execute(
    "Private_CalculateReservationAmountDueAndCOIStatus",
    reservations,
    null,
    commission[0],
    {
      getTrueCost: true,
    }
  );

  console.log(
    "End Reservation details:::",
    (Date.now() - startTime) / 1000,
    "seconds"
  );

  return JSON.parse(JSON.stringify(reservations));
}

// Function exported to App Services
exports = GetReservationByID;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetReservationByID };
}
/* 
async function Private_Reservations_Get(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { reservationId, ownerOrgId, renterOrgId, renterId } = payload;
  if (!reservationId && !ownerOrgId && !renterOrgId && !renterId) {
    throw new Error(
      "You must supply at least one of the following: Reservation Id, Owner Id, Renter Org Id, or Renter Id."
    );
  }

  const APP_CONSTANTS = context.values.get("app_constants");

  let { page = 1, limit = 10, all = false } = pagination;

  const { DATA_SOURCE, DB_FACILITRON_DEV, COLLECTIONS } =
    context.environment.values;

  let query = {};
  let bGetSupportComments = false; //Does the caller need us to return the support comments
  let bGetAmountDue = true; //Does the caller need us to return the amount due

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(COLLECTIONS.RESERVATIONS);

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
    {
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
    },
    {
      $lookup: {
        from: "reservation_logs",
        let: { reservation_id: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$reservation_id", "$reservation"] },
                  { $ea: ["$status_type", "approved"] },
                ],
              },
            },
          },
          { $project: { created: 1, status_type: 1 } },
          { $sort: { created: -1 } },
        ],
        as: "approved_logs",
      },
    },
    {
      $project: {
        short_id: 1,
        created: 1,
        status: 1,
        owner_id: 1,
        renter_id: 1,
        renter_owner_id: 1,
        approved_date: { $arrayElemAt: ["$approved_logs", 0] },
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
      },
    },
    {
      $project: {
        short_id: 1,
        created: 1,
        status: 1,
        owner_id: 1,
        renter_id: 1,
        renter_owner_id: 1,
        insurance_type: "$insurance_type.obj.insurance_type",
        attendance: {
          $sum: [
            "$attendance_info.obj.attendance_participants",
            "$attendance_info.obj.attendance_spectators",
          ],
        },
        event_name: "$event_name.obj.event_name",
        event_dates: "$event_dates.obj.localDate",
        approved_date: "$approved_date.created",
      },
    },
  ];

  if (bGetSupportComments) {
    aReservationsAggregate.push[
      {
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
      }
    ];
  }
  if (bGetAmountDue) {
    aReservationsAggregate.push[
      ({
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
      },
      {
        $lookup: {
          from: "reservation_payments",
          let: { reservation_id: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$$reservation_id", "$reservation"] } },
            },
            { $project: { description: 1, created: 1, amount: 1 } },
          ],
          as: "payments",
        },
      })
    ];
  }

  aReservationsAggregate.push({ $skip: (page - 1) * limit });
  aReservationsAggregate.push({
    $limit: all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit,
  });

  let reservations = await collection.aggregate(aReservationsAggregate);

  PopulateOwnerRenterOwnerAndRenter(reservations);

  GetInsuranceStatus(reservations);

  if (bGetAmountDue) {
    CalculateAmountDue(reservations);
  }

  return reservations;
}

function PopulateOwnerRenterOwnerAndRenter(reservations) {
  //Since the data about users and owners is in a different database, we have to create another connection to the
  //  COMMON database to get the name / u_id and parent information for the owner as well as the name and u_id
  //  of the renter_owner from the owners collection and the first_name last_name of the renter from the users
  //  collection.
  //So we probably want to build a hash of all the owners and renter_owners and a hash of all the renters from
  //  this set of reservations then get the information from the other DB
  //We also need to pull information about the renter owners outgoing insurance as we will need that for the
  //  insurance status
}

function CalculateAmountDue(reservations) {
  //The amount due on each reservation is dependent on the status of the reservation. So, for each reservation
  //  we have to go through the charges and based on the status determine if that charge is still valid, then
  //  once we have the "true" cost of the reservation we can subtract out the amount paid to see what is "due"
}

function GetInsuranceStatus(reservations) {
  //The insurance / COI status of a particular reservation is based on the certificates between the owner of the
  //  facilities and either the renter_owner or the renter. Then based on those cerficates and all the dates of
  //  a reservation and overall insurance status is determined.
}

// Function exported to App Services
exports = Private_Reservations_Get;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_Reservations_Get };
}
 */
