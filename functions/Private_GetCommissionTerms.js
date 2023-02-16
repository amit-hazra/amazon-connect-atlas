async function Private_GetCommissionTerms(query) {
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_DEV } = context.environment.values;
  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_DEV)
    .collection(COLLECTIONS.COMMISSION_TERMS);
  let commissions = await collection.find({ ...query }).toArray();
  return commissions;
}

// Function exported to App Services
exports = Private_GetCommissionTerms;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetCommissionTerms };
}
