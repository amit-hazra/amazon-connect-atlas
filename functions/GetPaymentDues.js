/*
 * @params orgId (renter org)
 */

async function GetPaymentDues(payload, pagination) {
  if (!payload) {
    throw new Error("Invalid payload");
  }

  const { orgId, userId } = payload;

  if (!orgId && !userId) {
    throw new Error("Either of one argument is mandatory.");
  }

  const PARAMS = {
    queryPayload: payload,
    returnPayload: {
      getDueAmount: true,
      getPayments: true,
      internalPopulate: true,
      getEventDetails: true,
    },
  };

  let reservations = await context.functions.execute(
    "Private_SearchReservation",
    PARAMS,
    pagination
  );

  let commission = await context.functions.execute(
    "Private_GetCommissionTerms",
    {
      default: true,
    }
  );

  reservations = await context.functions.execute(
    "Private_CalculateReservationAmountDueAndCOIStatus",
    reservations,
    null,
    commission[0]
  );

  return JSON.parse(JSON.stringify(reservations));
}

// Function exported to App Services
exports = GetPaymentDues;

// export locally for use in unit GetPaymentDues
if (typeof module !== "undefined") {
  module.exports = { GetPaymentDues };
}
