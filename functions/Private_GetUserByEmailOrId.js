/**
 * Search user by email from facilitron_common.users model returns either empty or 1 entry of user.
 * @param userEmail - string email
 * @returns [{user}]
 */
async function Private_GetUserByEmailOrId(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }

  const { userEmail, userId, callerType } = payload;

  if (!userEmail && !userId) {
    throw new Error("Please provide either email or userId.");
  }

  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  const CALLER_TYPES = context.values.get("caller_types");

  let collectionName = COLLECTIONS.USERS;

  let query = { "local.email": userEmail };

  if (callerType === CALLER_TYPES.ADMIN) {
    query = {
      email: userEmail,
    };
    collectionName = COLLECTIONS.OWNERS;
  }
  if (userId) {
    query = {
      _id: new BSON.ObjectId(userId),
    };
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(collectionName);

  const PROJECTION = {
    _id: 1,
    first_name: 1,
    last_name: 1,
    phone: 1,
    local: {
      email: 1,
    },
    country: 1,
    city: 1,
    state: 1,
    street: 1,
    zip: 1,
    email: 1,
    name: 1,
    u_id: 1,
    created: 1,
    status: 1,
    roles: 1,
  };
  var startTimeFind = Date.now();

  let user = await collection.findOne(query, PROJECTION);
  console.log(` ${callerType} ==> ${collectionName} Private_GetUserByEmailOrId findOne took::: `, (Date.now() - startTimeFind) / 1000);

  if (user && callerType === CALLER_TYPES.RENTER) {
    /* 
      Populate roles array with owner info
      @returns array
    */
      var startTimeFind = Date.now();
    let rolePopulatedUser = await context.functions.execute(
      "Private_PopulateRoles",
      [user]
    );
    user = rolePopulatedUser[0];
    console.log(` ${callerType} ==> Private_PopulateRoles  took::: `, (Date.now() - startTimeFind) / 1000);
  
  }

  return [user];
}

// Function exported to App Services
exports = Private_GetUserByEmailOrId;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetUserByEmailOrId };
}
