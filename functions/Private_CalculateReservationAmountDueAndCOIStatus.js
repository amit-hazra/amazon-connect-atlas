/**
 *
 * @param reservations : Array of reservations. Each reservation in the array must have the _id, commission_terms,
 *   charges, payments elements.
 * @param renterInsuranceOutgoing : insurance_outgoing array from the renter or renter org we are getting
 *   reservations for. If this is null then we will not prepare COI status on the reservations.
 * @param defaultCommissionTerms : This should be the default commission terms from the DB.  To get this issue a
 *   query on the Facilitron_Dev or Facilitron_Prod commission_terms collection where {"default" : true}
 * @returns
 *
 * Give the below a read and see if my comments make sense. We can add more comments below or here to help
 *   document the functionality.
 *
 * Also, for the COI, for the reservation.owner we need the insurance_incoming.use_parent element.  This is used to determine if the insured_owner of a COI is the child or the parent.  In the S&R system it is possible to have insurance requirements on the children, or they can be driven from the parent.
 *
 *
 */
function Private_CalculateReservationAmountDueAndCOIStatus(
  reservations,
  renterInsuranceOutgoingHash,
  defaultCommissionTerms,
  returnQuery = {}
) {
  const moment = require("moment-timezone");

  const { RESERVATION_STATUSES } = context.values.get("enums");
  const { CHARGE_DESCRIPTIONS, CHARGE_CATEGORIES } = context.values.get(
    "reservation_constants"
  );

  const { getTrueCost } = returnQuery;

  let responseReservations = [];

  // Reservations loop start
  for (let reservation of reservations) {
    let paymentsTotal = 0;
    //The true cost of an approved or pending reservation, should just be a total of all the charges.
    //The true cost for cancelled or declined depends on the charge types, so we need to build those amounts.
    let curReservationChargeTypes = {
      totalChargesAmount: 0,
      category2Amount: 0,
      category3Amount: 0,
      processingFeeAmount: 0,
      bouncePaymentFeeAmount: 0,
      salesTaxAmount: 0,
    };

    let minDueReservationCharges = 0;

    let pastDueReservationCharges = 0;
    let fltReservationTrueCost = 0;

    // Getting the last date of next month
    let endOfNextMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 2,
      0
    );

    for (let oneCharge of reservation.charges) {
      if (!isNaN(parseFloat(oneCharge.amount))) {
        // Past Due - Reservation charges
        // adding all charges from start of reservation to today
        if (
          moment(oneCharge.localDate, "YYYY-MM-DD").diff(
            moment().format("YYYY-MM-DD"),
            "days"
          ) <= 0
        ) {
          pastDueReservationCharges += oneCharge.amount;
        }

        // Min Due - Reservation charges
        // adding all charges from start of reservation to end of next month
        if (
          moment(oneCharge.localDate, "YYYY-MM-DD").diff(
            moment(endOfNextMonth).format("YYYY-MM-DD"),
            "days"
          ) <= 0
        ) {
          minDueReservationCharges += oneCharge.amount;
        }

        //Add to running total
        curReservationChargeTypes.totalChargesAmount += oneCharge.amount;
        //Non-refundable fees
        if (
          oneCharge.category == CHARGE_CATEGORIES.NON_REFUNDABLE &&
          oneCharge.description != CHARGE_DESCRIPTIONS.BOUNCED_CHECKED_FEE &&
          oneCharge.description != CHARGE_DESCRIPTIONS.REFUND_BOUNCED_CHECK_FEE
        ) {
          curReservationChargeTypes.category2Amount += oneCharge.amount;
        }
        //Non-refundable for decline
        if (oneCharge.category == CHARGE_CATEGORIES.NON_REFUNDABLE_DECLINE) {
          curReservationChargeTypes.category3Amount += oneCharge.amount;
        }
        //Total Sales Tax
        if (oneCharge.description == CHARGE_DESCRIPTIONS.SALES_TAX) {
          curReservationChargeTypes.salesTaxAmount += oneCharge.amount;
        }
        //Bounced Check Fees
        if (
          oneCharge.description == CHARGE_DESCRIPTIONS.BOUNCED_CHECKED_FEE ||
          oneCharge.description == CHARGE_DESCRIPTIONS.REFUND_BOUNCED_CHECK_FEE
        ) {
          curReservationChargeTypes.bouncePaymentFeeAmount += oneCharge.amount;
        }
        //Payment Processing Fee
        if (
          oneCharge.description == CHARGE_DESCRIPTIONS.PAYMENT_PROCESSING_FEE
        ) {
          curReservationChargeTypes.processingFeeAmount += oneCharge.amount;
        }
      } //End of if check of !isNaN on charge amount
      //The COI Status of a reservation is based on the specific insurance state on each event date. We "tag" all charges to
      //  event dates, so as we loop through all the charges, each unique localDate from the charge should be a unique event
      //  date.  Instead of looping through the charges again, we will build each event and the overall insurance status in
      //  the same loop.
      if (renterInsuranceOutgoingHash) {
        //We will do the insurance status work here.
        // reservation = context.functions.execute(
        //   "Private_SetReservationEventDateInsuranceStatus",
        //   reservation,
        //   renterInsuranceOutgoingHash,
        //   new Date(oneCharge.localDate)
        // );
        // context.functions.execute(
        //   "Private_SetReservationEventDateInsuranceStatus",
        //   reservation,
        //   renterInsuranceOutgoingHash,
        //   new Date(oneCharge.localDate)
        // );
        // context.functions.execute(
        //   "Private_SetOverallReservationInsuranceStatus",
        //   reservation,
        //   renterInsuranceOutgoingHash
        // );
      }
    } //End of charges for loop

    if (RESERVATION_STATUSES.CANCELLED === reservation.status) {
      //We then need to calculate the renters Facilitron Fee based on the true cost
      let fltRenterFees = CalculateRenterFeeForResTrueCost(
        reservation._id,
        curReservationChargeTypes.category2Amount +
          curReservationChargeTypes.category3Amount,
        reservation.commission_terms,
        defaultCommissionTerms
      );

      //The reservation is status 2 which is cancelled
      fltReservationTrueCost =
        curReservationChargeTypes.processingFeeAmount +
        fltRenterFees +
        curReservationChargeTypes.bouncePaymentFeeAmount;

      if (
        curReservationChargeTypes.category3Amount > 0 ||
        curReservationChargeTypes.category2Amount > 0
      ) {
        fltReservationTrueCost +=
          curReservationChargeTypes.category2Amount +
          curReservationChargeTypes.category3Amount +
          curReservationChargeTypes.salesTaxAmount;
      }
    } else if (RESERVATION_STATUSES.DECLINED === reservation.status) {
      //The reservation is status 4 which is declined
      let fltRenterFeesForDeclined = CalculateRenterFeeForResTrueCost(
        reservation._id,
        curReservationChargeTypes.category3Amount,
        reservation.commission_terms,
        defaultCommissionTerms
      );

      fltReservationTrueCost =
        curReservationChargeTypes.processingFeeAmount +
        fltRenterFeesForDeclined +
        curReservationChargeTypes.bouncePaymentFeeAmount;

      if (curReservationChargeTypes.category3Amount > 0) {
        fltReservationTrueCost +=
          curReservationChargeTypes.category3Amount +
          curReservationChargeTypes.salesTaxAmount;
      }
    } else {
      //Pending or Approved
      fltReservationTrueCost = curReservationChargeTypes.totalChargesAmount;
    }
    for (let payment of reservation.payments) {
      // Amount paid by the renter or renter org
      if (!isNaN(parseFloat(payment.amount))) {
        paymentsTotal += payment.amount;
      }
    }
    // reservation["cost_type_amounts"] = curReservationChargeTypes; //For debugging.  Can remove once testing is confirmed
    // if (getTrueCost)
    reservation["true_cost"] = fltReservationTrueCost.toFixed(2); //For debugging.  Can remove once testing is confirmed
    // reservation["total_payment"] = paymentsTotal.toFixed(2); //For debugging.  Can remove once testing is confirmed

    /*
      Min due and Past due 

      Our calculation for: 
      
      Min Due: (number)
      (Sum of charges till the end of next month) - (Total amount paid till today)
      if less than 0 then no min dues

      Past Due: (boolean)
      (Sum of charges till today) - (Total amount paid till today)
    */

    let minDue = minDueReservationCharges - paymentsTotal;

    reservation["is_past_due"] = pastDueReservationCharges - paymentsTotal > 0;
    reservation["min_due"] = (minDue > 0 ? minDue : 0).toFixed(2);

    reservation["total_due"] = (fltReservationTrueCost - paymentsTotal).toFixed(
      2
    );

    let responseObj = {
      _id: reservation._id,
      short_id: reservation.short_id,
      owner: reservation.owner,
      event_name: reservation.event_name,
      event_dates: reservation.event_dates,
      status: reservation.status,
      created: reservation.created,
      is_past_due: reservation.is_past_due,
      min_due: reservation.min_due,
      total_due: reservation.total_due,
      type: reservation.type,
      renter: reservation.renter,
      renter_owner: reservation.renter_owner,
      support_ticket: reservation.support_ticket,
      support_comments: reservation.support_comments,
      coi_status: "pending",
      insurance_details: reservation.insurance_details,
    };
    // if (getTrueCost) {
    responseObj["true_cost"] = reservation.true_cost;
    // }
    responseReservations.push(responseObj);
  }

  return responseReservations;
}
function CalculateRenterFeeForResTrueCost(
  reservationId,
  reservationTrueCost,
  commissionTerms,
  defaultCommissionTerms
) {
  //Calculate and return the fees the renter will owe based on the true cost of the
  //  reservation and the commission terms.
  //The passed in commission_terms may be an array, but it should have only one value
  let curResCommissionTerms = commissionTerms || [];
  if (Array.isArray(curResCommissionTerms)) {
    if (curResCommissionTerms.length != 1) {
      //If we have more than one or if we did not have one then we have an issue with
      //  the commission terms so use the default.
      curResCommissionTerms = defaultCommissionTerms;
    } else {
      curResCommissionTerms = curResCommissionTerms[0];
    }
  }
  //Now we have the true cost of the reservation and the commission_terms, so we need to see how much
  //  the renter owes us, so send the "renter" portion from the commission terms.
  return CalculateCommission(reservationTrueCost, curResCommissionTerms.renter);
}

function CalculateCommission(total, terms) {
  let fees = 0;
  let commission = terms.commission;
  if (!commission) return 0;

  let percents = commission.percents;

  if (percents.length == 1) {
    fees = Math.round(total * percents[0]) / 100;
  } else {
    let remainder = total % commission.scale_size;
    let factor = (total - remainder) / commission.scale_size;

    for (let i = 0; i < factor; i++) {
      let rate = percents[percents.length - 1];

      if (i < percents.length) {
        rate = percents[i];
      }

      fees += Math.round(commission.scale_size * rate) / 100;
    }

    if (remainder > 0) {
      let rate = percents[percents.length - 1];

      if (factor < percents.length) {
        rate = percents[factor];
      }

      fees += Math.round(remainder * rate) / 100;
    }
  }

  if (commission.min_charge && fees < commission.min_charge) {
    fees = commission.min_charge;
  }
  if (commission.max_charge && fees > commission.max_charge) {
    fees = commission.max_charge;
  }

  fees = Math.round(fees * 100) / 100;

  return fees;
}

exports = Private_CalculateReservationAmountDueAndCOIStatus;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_CalculateReservationAmountDueAndCOIStatus };
}
