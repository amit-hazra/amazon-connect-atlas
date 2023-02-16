async function SearchReservation(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { searchText, orgId, userId } = payload;

  if (!searchText && !orgId && !userId) {
    throw new Error("Params are mandatory.");
  }

  const PARAMS = {
    queryPayload: payload,
    returnPayload: {
      getEventDetails: true,
      getSupportComments: true,
      getReservationLogs: true,
      internalPopulate: true,
      isSearchList: true,
    },
  };

  let reservations = await context.functions.execute(
    "Private_SearchReservation",
    PARAMS,
    pagination
  );

  let isPersonalReservationsIncluded = reservations.findIndex(
    (x) => x?.renter_owner_id === null || x?.renter_owner_id === undefined
  );

  let insuranceObj = await context.functions.execute(
    "Private_PopulateDirectory",
    payload,
    {
      getRenterInsurances: isPersonalReservationsIncluded !== -1,
    }
  );

  return JSON.parse(JSON.stringify(reservations));
}

// Function exported to App Services
exports = SearchReservation;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { SearchReservation };
}
