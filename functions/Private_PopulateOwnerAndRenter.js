//Since the data about users and owners is in a different database, we have to create another connection to the
//  COMMON database to get the name / u_id and parent information for the owner as well as the name and u_id
//  of the renter_owner from the owners collection and the first_name last_name of the renter from the users
//  collection.
//So we probably want to build a hash of all the owners and renter_owners and a hash of all the renters from
//  this set of reservations then get the information from the other DB
//We also need to pull information about the renter owners outgoing insurance as we will need that for the
//  insurance status

async function Private_PopulateOwnerAndRenter(
  reservations,
  query
) {
  // if (!reservations) {
  //   throw new Error("Please provide reservations.");
  // }
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { RESERVATION_TYPES } = context.values.get("reservation_constants");
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
    insurance_outgoing: 1,
  };

  const USER_PROJECTION = {
    _id: 1,
    first_name: 1,
    last_name: 1,
    phone: 1,
    local: {
      email: 1,
    },
    // insurance_outgoing: 1
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
      let renter = await userCollection.findOne(
        { _id: reservation?.renter_id },
        USER_PROJECTION
      );

      reservation["renter"] = renter;
    }

    if (!reservation?.type && query?.getType) {
      reservation = addReservationType(reservation, RESERVATION_TYPES);
    }
  }

  return reservations;
}

function addReservationType(reservation, RESERVATION_TYPES) {
  let renterOwner = reservation?.renter_owner_id;

  if (renterOwner && String(reservation?.owner_id) === String(renterOwner)) {
    reservation["type"] = RESERVATION_TYPES.INTERNAL;
  } else if (
    renterOwner &&
    String(reservation?.owner?.owner?._id) === String(renterOwner)
  ) {
    reservation["type"] = RESERVATION_TYPES.FAMILY;
  } else {
    reservation["type"] = RESERVATION_TYPES.EXTERNAL;
  }
  return reservation;
}

// Function exported to App Services
exports = Private_PopulateOwnerAndRenter;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_PopulateOwnerAndRenter };
}
