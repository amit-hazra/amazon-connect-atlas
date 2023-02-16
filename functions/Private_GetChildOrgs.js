// Private_GetChildOrgs
/**
 * User Facilitron_common.owners collection to fetch the list of children orgs for a given org.
 * @param {string} parentOrgId
 * @return [{
          "name": string,
          "id": string,
          "shortId": string,
          "isWOS": boolean
        }]
 */
async function Private_GetChildOrgs(parentOrgId) {
  if (!parentOrgId) {
    throw new Error("Invalid payload");
  }

  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.OWNERS);

  let childOrgs = await collection
    .find(
      { owner: new BSON.ObjectId(parentOrgId) },
      {
        name: 1,
        u_id: 1,
        status: 1,
      }
    )
    .toArray();

  return childOrgs;
}
// Function exported to App Services
exports = Private_GetChildOrgs;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetChildOrgs };
}
