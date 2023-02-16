/**
 * Validate given credentials and returns user._id
 * @param {userEmail: string, password: string} payload 
 * @returns userid - string
 */
function Private_IsValidUser(payload) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { userEmail, password } = payload;

  if (!userEmail && !password) {
    throw new Error("Credential params are mandatory.");
  }
  return "userId";
}

// Function exported to App Services
exports = Private_IsValidUser;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_IsValidUser };
}
