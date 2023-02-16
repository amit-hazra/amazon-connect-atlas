async function GetRecentComments(payload, pagination) {
  if (!payload) {
    throw new Error("Invalid payload");
  }
  const { orgId } = payload;

  if (!orgId) {
    throw new Error("Either of one argument is mandatory.");
  }

  const PARAMS = {
    queryPayload: payload,
    returnPayload: {
      getRecentComments: true,
      getEventDetails: true,
      getReservationLogs: true,
      internalPopulate: true,
    },
  };

  let reservations = await context.functions.execute(
    "Private_SearchReservation",
    PARAMS,
    pagination
  );

  return JSON.parse(JSON.stringify(reservations));
}

// Function exported to App Services
exports = GetRecentComments;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetRecentComments };
}
