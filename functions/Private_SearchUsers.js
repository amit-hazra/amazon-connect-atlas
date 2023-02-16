/**
 * data: Facilitron_common.users
 * Roles are a combination of the user and the specific organization they represent.
 * It is very possible that a user has roles at different owners.
 * You will get the user from the facilitron_common.users collection and pull the roles array.
 * The _id is then used against the Facilitron_dev (Faciliton_prod).roles to get the owner / name of that role
 * then take the owner as the _id from the owners collection in facilitron_common.owners
 */
async function Private_SearchUsers(searchText, pagination) {
  if (!searchText || searchText === null) {
    throw new Error("Param is mandatory.");
  }

  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  let { page = 1, limit = 10, all = false } = pagination;

  const { DB_FACILITRON_COMMON } = context.environment.values;
  const APP_CONSTANTS = context.values.get("app_constants");

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.USERS);

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
    created: 1,
    status: 1,
    roles: 1,
  };
  var startTimeFind = Date.now();

  let users = await collection
    .find(
      {
        $or: [
          {
            first_name: { $regex: searchText, $options: "i" },
          },
          {
            last_name: { $regex: searchText, $options: "i" },
          },
          {
            phone: { $regex: searchText, $options: "i" },
          },
          {
            "local.email": { $regex: searchText, $options: "i" },
          },
        ],
        // isEmployee: { $ne: true }, // this is for testing purpose. will uncomment it when all testing is done.
      },
      PROJECTION,
      {
        collation: { locale: "en_US", strength: 2 },
      }
    )
    .sort({ first_name: 1 })
    .skip((page - 1) * limit)
    .limit(all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit)
    .toArray();

  //.collation({ locale: "en_US", strength: 2 })

  console.log(
    `Private_SearchUsers find took::: `,
    (Date.now() - startTimeFind) / 1000
  );

  users = await context.functions.execute("Private_PopulateRoles", users);

  return users;
}

// Function exported to App Services
exports = Private_SearchUsers;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_SearchUsers };
}
