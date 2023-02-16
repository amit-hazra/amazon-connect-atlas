async function GetGuides() {
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  // Get a handle for the app.users collection
  const knowledgeSystemsColl = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.ARTICLES);

  let platforms = await knowledgeSystemsColl.find({}).toArray();

  return JSON.parse(JSON.stringify(platforms));
}

// Function exported to App Services
exports = GetGuides;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetGuides };
}
