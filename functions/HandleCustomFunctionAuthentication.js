/**
 *
 * Is registered user?
 * bcrypt 5.0.1 lib is used and compareSync to compare password.
 * @param { userEmail: string, password: string } payload
 * @returns userid - string
 */
async function HandleCustomFunctionAuthentication(payload) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }

  const { userEmail, password } = payload;

  if (!userEmail && !password) {
    throw new Error("Credential params are mandatory.");
  }
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;
  const { AWS_LAMBDA_URL, AWS_LAMBDA_AUTHORIZATION } =
    context.environment.values;

  // Get a handle for the app.users collection
  const users = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.USERS);

  var startTimeFind = Date.now();

  const user = await users.findOne({ "local.email": userEmail, status: 1 });

  console.log("find took::: ", (Date.now() - startTimeFind) / 1000);

  if (!user) {
    throw new Error("User not found.");
  }

  let isValidUser = await context.http.post({
    url: `${AWS_LAMBDA_URL}`,
    headers: {
      Authorization: [AWS_LAMBDA_AUTHORIZATION],
    },
    body: JSON.stringify({
      password: password,
      hash: user.local.password,
    }),
  });

  if (!isValidUser) {
    throw new Error("Invalid credentials");
  }

  return user._id.toString();
  // return "636bb8423df5fe9037ac8632";
}

// Function exported to App Services
exports = HandleCustomFunctionAuthentication;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { HandleCustomFunctionAuthentication };
}
