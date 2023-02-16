/* 

Also, I am not sure if I am looking at the correct payment history function for review.  I am looking at GetPaymentHistory and I see some checks for parent org it and child org id and then a call to Private_SearchReservation.  The payment history is actually a combination of the information from the wallet_users and wallet_owners, depending on if we are looking for a renter org or a personal renter.  Then to that data we add the information from the reservation payments.
The concern with the parent child is the change from the owner.id vs. renter_owner.  I assume you are referring to the elements in the reservation collection.
The owner information is for the facility owner / landlord of the spaces being rented, so, would not be used here.  For the payment history we are looking for the renter (reservations.renter) or renter org (reservations.renter_owner) and getting all the payments on all their reservations.  So, the reservations.owner._id does not come into play here.
So, if you are looking for payment history for a renter org you would look for documents in wallet_owners where wallet_owners.owner is that renter orgs id and then all reservations where reservations.renter_owner is that renter orgs id and then get the payments from reservation_payments.

*/

async function GetPaymentHistory(payload, pagination) {
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
      getPaymentHistory: true, // unwind stage
      getPayments: true, // to get the payment array
      internalPopulate: true,
      getEventDetails: true,
    },
  };
  let startTime = Date.now();
  let reservations = await context.functions.execute(
    "Private_SearchReservation",
    PARAMS,
    pagination
  );

  console.log(
    "reservation payment end:::",
    (Date.now() - startTime) / 1000,
    "s"
  );

  let startTimeWallet = Date.now();

  let walletPayments = await context.functions.execute(
    "Private_GetWalletPayments",
    payload,
    pagination
  );

  console.log(
    "Wallet payment end:::",
    (Date.now() - startTimeWallet) / 1000,
    "s"
  );

  let startingAmount = await context.functions.execute(
    "Private_GetAccountBalance",
    payload
  );

  reservations = (reservations || []).concat(walletPayments);
  let sortedReservations = reservations.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(a.created) - new Date(b.created);
  });

  let response = { reservations: sortedReservations };

  response["starting_amount"] = startingAmount[0]?.balance || 0;

  return JSON.parse(JSON.stringify(response));
}

// Function exported to App Services
exports = GetPaymentHistory;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetPaymentHistory };
}
