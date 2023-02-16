/**
 * Get the list of users either by user email or search text(email, phone, last name).
 * Use Facilitron_common.user collection to fetch user related information
 * @param {userEmail?: string, searchText?: string} payload
 * @returns [users]
 */

function SearchUsers(payload, pagination) {
  let users = [];

  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const CALLER_TYPES = context.values.get("caller_types");

  const {
    userEmail,
    userId,
    searchText,
    callerType = CALLER_TYPES.RENTER,
  } = payload;
  if (!userEmail && !userId && !searchText) {
    throw new Error("Either of one argument is mandatory.");
  }

  if (searchText) {
    var startTimeFind = Date.now();
    users = context.functions.execute(
      "Private_SearchUsers",
      searchText,
      pagination
    );
    console.log(`Total time Private_SearchUsers took::: `, (Date.now() - startTimeFind) / 1000);
  } else {
    var startTimeFind = Date.now();
    users = context.functions.execute(
      "Private_GetUserByEmailOrId",
      {
        userId,
        userEmail,
        callerType,
      },
      pagination
    );
    console.log(`Private_GetUserByEmailOrId  took::: `, (Date.now() - startTimeFind) / 1000);
  }
  return users;
}

// Function exported to App Services
exports = SearchUsers;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { SearchUsers };
}
