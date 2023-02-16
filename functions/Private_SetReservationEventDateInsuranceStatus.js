//The SetEventDateInsuranceStatus is used on a reservation by reservation basis.
/**
 * reservation : {
 * 	owner:{
 * 		_id:,
 * 		owner:{
 * 			_id:
 * 			timezone:
 * 		}
 * 		insurance_incoming:{
 * 			use_parent:
 * 		},
 *		timezone:
 * 	}
 * 	renter_owner:
 * 	renter:
 * 	insurance_type:
 * 	insurance_details:
 * }
 */
function Private_SetReservationEventDateInsuranceStatus(
  reservation,
  renterInsuranceOutgoingHash,
  eventDate
) {
  const moment = require("moment-timezone");

  const { INSURANCE_TYPE, INSURANCE_STATUS } =
    context.values.get("reservation_constants");
  //Variable to hold the final insurance status for this specific event date for the reservation passed in
  let specificEventDateInsurance = {
    eventDate: eventDate,
    type: "",
    status: "",
  };

  //Get the owner _id the insurance should cover. It is the reservation.owner._id, unless that owner
  //  has the insurance_incoming.use_parent set, and then the _id will be of that owners parent.
  let insured_owner = reservation.owner;
  if (
    insured_owner.insurance_incoming &&
    insured_owner.insurance_incoming.use_parent &&
    insured_owner.owner
  ) {
    insured_owner = reservation.owner.owner._id; //owner.insurance_incoming.use_parent;
  }

  let owners_timezone = insured_owner.timezone
    ? insured_owner.timezone
    : insured_owner.owner && insured_owner.owner.timezone
    ? insured_owner.owner.timezone
    : "America/Los_Angeles";

  console.log("came before todayInOwnerTimezone:::");
  let todayInOwnerTimezone = moment
    .tz(moment(), owners_timezone)
    .format("YYYY-MM-DD");
  todayInOwnerTimezone = moment.utc(todayInOwnerTimezone);

 

  //We do not consider today as the past, so next statement should include today as a future date.
  let bFutureDate = true;
  if (moment.utc(eventDate).isBefore(todayInOwnerTimezone)) {
    bFutureDate = false;
  }

 

  //This is a future date so it impacts the reservation COI status
  switch (reservation.insurance_type) {
    case -1: //a type of -1 means we do not need insurance, but we also check to see if the reservation is internal.
      if (
        reservation.renter_owner &&
        reservation.owner._id.equals(reservation.renter_owner._id)
      ) {
        specificEventDateInsurance.type = INSURANCE_TYPE.INTERNAL;
      } else {
        specificEventDateInsurance.type = INSURANCE_TYPE.NO_INSURANCE_NEEDED;
      }
      specificEventDateInsurance.status = INSURANCE_STATUS.COMPLETED;
      break;
    case 1: //a type of 1 means insurance is provided by Facilitron.
      specificEventDateInsurance.type = INSURANCE_TYPE.FACILITRON;
      specificEventDateInsurance.status = INSURANCE_STATUS.COMPLETED;
      break;
    case 0: //a type of 0 means client / renter provided insurance
    default: // unknown so assume client / renter provided
      specificEventDateInsurance.type = INSURANCE_TYPE.CLIENT;
      if (
        renterInsuranceOutgoingHash &&
        typeof renterInsuranceOutgoingHash[insured_owner._id] !== "undefined"
      ) {
        //  We have COIs for the renter to owner combo, so check the overall COI upload status for all COI, not just ones that
        //  cover this reservations future days.
        reservation.insurance_details.atLeastOneCOINotVerifiedForThisOwnerRenter =
          renterInsuranceOutgoingHash[
            insured_owner._id
          ].at_least_one_coi_not_verified;
        reservation.insurance_details.atLeastOneCOIVerifiedForThisOwnerRenter =
          renterInsuranceOutgoingHash[
            insured_owner._id
          ].at_least_one_coi_verified;
        reservation.insurance_details.atLeastOneCOIInvalidForThisOwnerRenter =
          renterInsuranceOutgoingHash[
            insured_owner._id
          ].at_least_one_coi_invalid;

        if (
          !renterInsuranceOutgoingHash[insured_owner._id]
            .at_least_one_coi_not_verified &&
          !renterInsuranceOutgoingHash[insured_owner._id]
            .at_least_one_coi_verified &&
          !renterInsuranceOutgoingHash[insured_owner._id]
            .at_least_one_coi_invalid
        ) {
          //We dont have any verified, pending, or invalid insurances, so it is missing.
          if (bFutureDate) {
            specificEventDateInsurance.status = INSURANCE_STATUS.MISSING;
            reservation.insurance_details.aFutureDateHasStatusMissing = true;
          } else {
            reservation.insurance_details.aHistoricDateHasStatusMissing = true;
          }
        } else {
          //We have not verified insurance only
          if (
            !renterInsuranceOutgoingHash[insured_owner._id]
              .at_least_one_coi_verified &&
            !renterInsuranceOutgoingHash[insured_owner._id]
              .at_least_one_coi_invalid
          ) {
            if (bFutureDate) {
              specificEventDateInsurance.status = INSURANCE_STATUS.PENDING;
              reservation.insurance_details.aFutureDateHasStatusPending = true;
              //Now we want to see if the most recently added COI has the manual verifiation request set to true
              const latestNotVerifiedCOI = renterInsuranceOutgoingHash[
                insured_owner._id
              ].coi_details.not_verified_COIs.sort(
                (a, b) => b.created - a.created
              )[0];
              reservation.insurance_details.overallInsuranceStatus.user_requested_manual_verification =
                latestNotVerifiedCOI.user_requested_manual_verification;
            } else {
              reservation.insurance_details.aHistoricDateHasStatusPending = true;
            }
          } else {
            //So we have either a verified or an invalid COI, so we need to see if one of them covers this event date
            //Check Verified first
            let aVerifiedCOIs =
              renterInsuranceOutgoingHash[insured_owner._id].coi_details
                .verified_COIs;
            let bDateCoveredByVerifiedCOI = false;
            let bDateCoveredByInvalidCOI = false;
            for (
              let iVerifiedCOI = 0;
              iVerifiedCOI < aVerifiedCOIs.length;
              iVerifiedCOI++
            ) {
              let oneIns = aVerifiedCOIs[iVerifiedCOI];
              if (
                eventDate - oneIns.start_date >= 0 &&
                eventDate - oneIns.end_date <= 0
              ) {
                bDateCoveredByVerifiedCOI = true;
                specificEventDateInsurance.status = INSURANCE_STATUS.COMPLETED;
                specificEventDateInsurance.certificate = {
                  _id: oneIns._id,
                  status: 1,
                  start: oneIns.start_date,
                  end: oneIns.end_date,
                  machine_verified: oneIns.machine_verified,
                };
                if (bFutureDate) {
                  reservation.insurance_details.aFutureDateHasStatusCompleted = true;
                  reservation.insurance_details.overallInsuranceStatus.certificate =
                    specificEventDateInsurance.certificate;
                  reservation.insurance_details.aFutureDateHasStatusAutoCompleted =
                    oneIns.machine_verified ? oneIns.machine_verified : false;
                } else {
                  reservation.insurance_details.aHistoricDateHasStatusCompleted = true;
                  reservation.insurance_details.aHistoricDateHasStatusAutoCompleted =
                    oneIns.machine_verified ? oneIns.machine_verified : false;
                }
                break; //We found a verified insurance that covers this date, so stop looking for more.
              }
            }
            if (!bDateCoveredByVerifiedCOI) {
              //Check Invalid COI
              let aInvalidCOIs =
                renterInsuranceOutgoingHash[insured_owner._id].coi_details
                  .invalid_COIs;
              for (
                let iInvalidCOI = 0;
                iInvalidCOI < aInvalidCOIs.length;
                iInvalidCOI++
              ) {
                let oneIns = aInvalidCOIs[iInvalidCOI];
                if (
                  eventDate - oneIns.start_date >= 0 &&
                  eventDate - oneIns.end_date <= 0
                ) {
                  bDateCoveredByInvalidCOI = true;
                  specificEventDateInsurance.status = INSURANCE_STATUS.INVALID;
                  specificEventDateInsurance.certificate = {
                    _id: oneIns._id,
                    status: 4,
                    start: oneIns.start_date,
                    end: oneIns.end_date,
                    machine_verified: oneIns.machine_verified,
                  };
                  if (bFutureDate) {
                    reservation.insurance_details.aFutureDateHasStatusInvalid = true;
                    reservation.insurance_details.overallInsuranceStatus.certificate =
                      specificEventDateInsurance.certificate;
                    reservation.insurance_details.aFutureDateHasStatusAutoCompleted =
                      oneIns.machine_verified ? oneIns.machine_verified : false;
                  } else {
                    reservation.insurance_details.aHistoricDateHasStatusInvalid = true;
                  }
                  break; //We found a verified insurance that covers this date, so stop looking for more.
                }
              }
            }
            if (!bDateCoveredByVerifiedCOI && !bDateCoveredByInvalidCOI) {
              //We did not find a verified insurance or an invalid insurance, so see if we have any pending and set
              //  status to pending if we do or missing if we do not.
              if (
                renterInsuranceOutgoingHash[insured_owner._id]
                  .at_least_one_coi_not_verified
              ) {
                specificEventDateInsurance.status = INSURANCE_STATUS.PENDING;
                if (bFutureDate) {
                  reservation.insurance_details.aFutureDateHasStatusPending = true;
                  const latestNotVerifiedCOI = renterInsuranceOutgoingHash[
                    insured_owner._id
                  ].coi_details.not_verified_COIs.sort(
                    (a, b) => b.created - a.created
                  )[0];
                  reservation.insurance_details.overallInsuranceStatus.user_requested_manual_verification =
                    latestNotVerifiedCOI.user_requested_manual_verification;
                } else {
                  reservation.insurance_details.aHistoricDateHasStatusPending = true;
                }
              } else {
                if (bFutureDate) {
                  specificEventDateInsurance.status = INSURANCE_STATUS.MISSING;
                  reservation.insurance_details.aFutureDateHasStatusMissing = true;
                } else {
                  reservation.insurance_details.aHistoricDateHasStatusMissing = true;
                }
              }
            }
          }
        }
      } else {
        //We do not have any 'insurance_outgoing' so it is missing.
        specificEventDateInsurance.status = INSURANCE_STATUS.MISSING;
        reservation.insurance_details.aFutureDateHasStatusMissing = true;
      }
  } //end of switch (insurance_type)
  if (bFutureDate) {
    reservation.insurance_details.futureDates.push(specificEventDateInsurance);
  }
  return reservation;
}
// Function exported to App Services
exports = Private_SetReservationEventDateInsuranceStatus;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_SetReservationEventDateInsuranceStatus };
}
