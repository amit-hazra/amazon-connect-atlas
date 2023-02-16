/**
 * Get Role
 * @param role - string
 * @returns boolean
 */
async function Private_PopulateRoles(users) {
  if (users?.length > 0) {
    const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
    const { DB_FACILITRON_DEV, DB_FACILITRON_COMMON } =
      context.environment.values;

    let rolesCollection = context.services
      .get(DATA_SOURCE)
      .db(DB_FACILITRON_DEV)
      .collection(COLLECTIONS.ROLES);

    let ownersCollection = context.services
      .get(DATA_SOURCE)
      .db(DB_FACILITRON_COMMON)
      .collection(COLLECTIONS.OWNERS);

    for (let user of users) {
      let roles = user?.roles || [];
      for (let role of roles) {
        let role_obj = await rolesCollection.findOne(
          { _id: role?._id },
          {
            owner: 1,
            name: 1,
          }
        );
        let owner_obj = await ownersCollection.findOne(
          { _id: role_obj.owner },
          {
            u_id: 1,
            name: 1,
            email: 1,
            status: 1,
          }
        );
        role_obj.owner = owner_obj;
        role._id = role_obj;
      }
      user.roles = roles;
    }
    return users;
  }

  return users;
}

// Function exported to App Services
exports = Private_PopulateRoles;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_PopulateRoles };
}
