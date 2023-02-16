//The Private_SetOverallReservationInsuranceStatus uses the insurance_details from the reservation passed in
//  to build the insurance_details.overallInsuranceStatus for the reservation.
//
function Private_SetOverallReservationInsuranceStatus(
  reservation,
  renterInsuranceOutgoingHash
) {
  const moment = require("moment-timezone");
  const { INSURANCE_TYPE, INSURANCE_STATUS, INSURANCE_DISPLAY_TEXT } =
    context.values.get("reservation_constants");
  let jsFutureDayInsuranceStatus = {};
  if (reservation.insurance_details.futureDates.length > 0) {
    //Sort the future dates
    const aOrderedEventDates = reservation.insurance_details.futureDates.sort(
      (a, b) => b.eventDate - b.eventDate
    );
    reservation.insurance_details.futureDates = aOrderedEventDates;
    //We now want to build an array of the insurance states for all future events. We want to store the last futrue event date
    //  for that specific insurance status, then when the insurance status changes we will add that event date of when the
    //  status changed.  So an array of insurance status changes for future event dates.
    let intInsuranceTypeOnDays = 0;
    let jsFutureDatesCOICoverageInfo = {};
    aOrderedEventDates.forEach((aDay) => {
      if (
        jsFutureDayInsuranceStatus.hasOwnProperty(intInsuranceTypeOnDays) &&
        jsFutureDayInsuranceStatus[intInsuranceTypeOnDays].status != aDay.status
      ) {
        //This index, intInsuranceTypeOnDays, does not exist so create it. Can be the first one or a date where the status of
        //  COI changes.
        intInsuranceTypeOnDays++;
      }
      jsFutureDayInsuranceStatus[intInsuranceTypeOnDays] = aDay;
    });
  }

  //Set overall type
  switch (reservation.insurance_type) {
    case -1:
      if (
        reservation.renter_owner &&
        reservation.renter_owner === reservation.owner._id
      ) {
        reservation.insurance_details.overallInsuranceStatus.type =
          INSURANCE_TYPE.INTERNAL;
        reservation.insurance_details.overallInsuranceStatus.status =
          INSURANCE_STATUS.NA;
        reservation.insurance_details.overallInsuranceStatus.display_text =
          INSURANCE_DISPLAY_TEXT.NA;
      } else {
        reservation.insurance_details.overallInsuranceStatus.type =
          INSURANCE_TYPE.NO_INSURANCE_NEEDED;
        reservation.insurance_details.overallInsuranceStatus.status =
          INSURANCE_STATUS.NA;
        reservation.insurance_details.overallInsuranceStatus.display_text =
          INSURANCE_DISPLAY_TEXT.NA;
      }
      break;
    case 1:
      reservation.insurance_details.overallInsuranceStatus.type =
        INSURANCE_TYPE.FACILITRON;
      reservation.insurance_details.overallInsuranceStatus.status =
        INSURANCE_STATUS.COMPLETED;
      reservation.insurance_details.overallInsuranceStatus.display_text =
        INSURANCE_DISPLAY_TEXT.FACILITRON;
      break;
    case 0:
    default:
      reservation.insurance_details.overallInsuranceStatus.type =
        INSURANCE_TYPE.CLIENT;
      //If there is no insurance then status is missing
      if (Object.keys(renterInsuranceOutgoingHash).length === 0) {
        reservation.insurance_details.overallInsuranceStatus.status =
          INSURANCE_STATUS.MISSING;
        reservation.insurance_details.overallInsuranceStatus.display_text =
          INSURANCE_DISPLAY_TEXT.MISSING;
      } else {
        //If there are no future dates it is N/A
        if (reservation.insurance_details.futureDates.length === 0) {
          reservation.insurance_details.overallInsuranceStatus.status =
            INSURANCE_STATUS.NA;
          reservation.insurance_details.overallInsuranceStatus.display_text =
            INSURANCE_DISPLAY_TEXT.NA;
        } else {
          let strExpiresInDaysText = null;
          let currentInsuranceState = jsFutureDayInsuranceStatus[0];
          //See if we have any other future status for this reservation status that is not completed, if we have any
          //  we display the Will Expire message.  If all future dates are one status then they would have been grouped
          //  into one status and thus it would be only one key in the jsFutureDayInsuranceStatus object.
          if (Object.keys(jsFutureDayInsuranceStatus).length > 1) {
            if (currentInsuranceState.certificate) {
              let intDaysToExpire = Math.ceil(
                moment
                  .duration(
                    moment
                      .utc(currentInsuranceState.certificate.end)
                      .diff(moment.utc().startOf("day"))
                  )
                  .asDays()
              );
              if (intDaysToExpire == 1) {
                strExpiresInDaysText = INSURANCE_DISPLAY_TEXT.EXPIRE_TODAY;
              } else {
                strExpiresInDaysText =
                  "Expires: " +
                  moment
                    .utc(currentInsuranceState.certificate.end)
                    .format("MM/DD/YYYY");
                strExpiresInDaysText += " (" + intDaysToExpire + " days)";
              }
            }
          }
          if (reservation.insurance_details.aFutureDateHasStatusPending) {
            if (reservation.insurance_details.aFutureDateHasStatusCompleted) {
              reservation.insurance_details.overallInsuranceStatus.status =
                INSURANCE_STATUS.PENDING;
              reservation.insurance_details.overallInsuranceStatus.display_text =
                strExpiresInDaysText;
              //Add auto:
              if (
                reservation.insurance_details.aFutureDateHasStatusAutoCompleted
              ) {
                reservation.insurance_details.overallInsuranceStatus.display_text +=
                  INSURANCE_DISPLAY_TEXT.ADD_AUTO;
              }
            } else {
              reservation.insurance_details.overallInsuranceStatus.status =
                INSURANCE_STATUS.PENDING;
              reservation.insurance_details.overallInsuranceStatus.display_text =
                INSURANCE_DISPLAY_TEXT.PENDING;
              //Add Manual:
              if (
                reservation.insurance_details.overallInsuranceStatus
                  .user_requested_manual_verification
              ) {
                reservation.insurance_details.overallInsuranceStatus.display_text =
                  INSURANCE_DISPLAY_TEXT.PENDING_MANUAL;
              }
            }
          } else if (
            reservation.insurance_details.aFutureDateHasStatusCompleted
          ) {
            //We have at least one future date that is covered so get the status of the first group of
            //  future dates, as that will be the current status of the overall reservation.
            switch (currentInsuranceState.status) {
              case INSURANCE_STATUS.MISSING:
                if (
                  reservation.insurance_details
                    .atLeastOneCOINotVerifiedForThisOwnerRenter
                ) {
                  //There is a pending COI
                  reservation.insurance_details.overallInsuranceStatus.status =
                    INSURANCE_STATUS.PENDING;
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    INSURANCE_DISPLAY_TEXT.PENDING;
                  //Add Manual:
                  if (
                    reservation.insurance_details.overallInsuranceStatus
                      .user_requested_manual_verification
                  ) {
                    reservation.insurance_details.overallInsuranceStatus.display_text =
                      INSURANCE_DISPLAY_TEXT.PENDING_MANUAL;
                  }
                } else if (
                  reservation.insurance_details
                    .atLeastOneCOIVerifiedForThisOwnerRenter
                ) {
                  //There is a verified COI
                  reservation.insurance_details.overallInsuranceStatus.status =
                    INSURANCE_STATUS.EXPIRED;
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    INSURANCE_DISPLAY_TEXT.EXPIRED;
                } else {
                  reservation.insurance_details.overallInsuranceStatus.status =
                    INSURANCE_STATUS.MISSING;
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    INSURANCE_DISPLAY_TEXT.MISSING;
                }
                break;
              case INSURANCE_STATUS.PENDING:
                reservation.insurance_details.overallInsuranceStatus.status =
                  INSURANCE_STATUS.PENDING;
                reservation.insurance_details.overallInsuranceStatus.display_text =
                  INSURANCE_DISPLAY_TEXT.PENDING;
                //Add Manual:
                if (
                  reservation.insurance_details.overallInsuranceStatus
                    .user_requested_manual_verification
                ) {
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    INSURANCE_DISPLAY_TEXT.PENDING_MANUAL;
                }
                break;
              case INSURANCE_STATUS.COMPLETED:
                reservation.insurance_details.overallInsuranceStatus.status =
                  INSURANCE_STATUS.COMPLETED;
                reservation.insurance_details.overallInsuranceStatus.display_text =
                  INSURANCE_DISPLAY_TEXT.COMPLETED;
                if (strExpiresInDaysText) {
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    strExpiresInDaysText;
                }
                //Add auto:
                if (
                  reservation.insurance_details
                    .aFutureDateHasStatusAutoCompleted
                ) {
                  reservation.insurance_details.overallInsuranceStatus.display_text +=
                    INSURANCE_DISPLAY_TEXT.ADD_AUTO;
                }
                break;
              case INSURANCE_STATUS.INVALID:
                reservation.insurance_details.overallInsuranceStatus.status =
                  INSURANCE_STATUS.INVALID;
                reservation.insurance_details.overallInsuranceStatus.display_text =
                  INSURANCE_DISPLAY_TEXT.INVALID;
                if (
                  reservation.insurance_details
                    .atLeastOneCOINotVerifiedForThisOwnerRenter
                ) {
                  //There is a pending COI
                  reservation.insurance_details.overallInsuranceStatus.status =
                    INSURANCE_STATUS.PENDING;
                  reservation.insurance_details.overallInsuranceStatus.display_text =
                    INSURANCE_DISPLAY_TEXT.PENDING;
                  //Add Manual:
                  if (
                    reservation.insurance_details.overallInsuranceStatus
                      .user_requested_manual_verification
                  ) {
                    reservation.insurance_details.overallInsuranceStatus.display_text =
                      INSURANCE_DISPLAY_TEXT.PENDING_MANUAL;
                  }
                }
                break;
            }
          } else if (
            reservation.insurance_details.aFutureDateHasStatusInvalid
          ) {
            reservation.insurance_details.overallInsuranceStatus.status =
              INSURANCE_STATUS.INVALID;
            reservation.insurance_details.overallInsuranceStatus.display_text =
              INSURANCE_DISPLAY_TEXT.INVALID;
            //Add auto:
            if (
              reservation.insurance_details.aFutureDateHasStatusAutoCompleted
            ) {
              reservation.insurance_details.overallInsuranceStatus.display_text +=
                INSURANCE_DISPLAY_TEXT.ADD_AUTO;
            }
          } else if (
            reservation.insurance_details.aFutureDateHasStatusMissing
          ) {
            reservation.insurance_details.overallInsuranceStatus.status =
              INSURANCE_STATUS.MISSING;
            reservation.insurance_details.overallInsuranceStatus.display_text =
              INSURANCE_DISPLAY_TEXT.MISSING;
            if (
              reservation.insurance_details
                .atLeastOneCOIVerifiedForThisOwnerRenter
            ) {
              reservation.insurance_details.overallInsuranceStatus.status =
                INSURANCE_STATUS.EXPIRED;
              reservation.insurance_details.overallInsuranceStatus.display_text =
                INSURANCE_DISPLAY_TEXT.EXPIRED;
              if (
                reservation.insurance_details
                  .aHistoricDateHasStatusAutoCompleted
              ) {
                reservation.insurance_details.overallInsuranceStatus.display_text +=
                  INSURANCE_DISPLAY_TEXT.ADD_AUTO;
              }
            }
          } else if (
            reservation.insurance_details
              .atLeastOneCOINotVerifiedForThisOwnerRenter
          ) {
            reservation.insurance_details.overallInsuranceStatus.status =
              INSURANCE_STATUS.INVALID;
            reservation.insurance_details.overallInsuranceStatus.display_text =
              INSURANCE_DISPLAY_TEXT.INVALID;
          } else if (
            reservation.insurance_details.aHistoricDateHasStatusCompleted ||
            reservation.insurance_details.aHistoricDateHasStatusAutoCompleted
          ) {
            //We do not have any future dates with status pending and we do not have any future dates with status
            //  completed and we do not have any non-verified COIs, but we have a historical date with a status of
            //  completed so we will mark this as expired.
            reservation.insurance_details.overallInsuranceStatus.status =
              INSURANCE_STATUS.EXPIRED;
            reservation.insurance_details.overallInsuranceStatus.display_text =
              INSURANCE_DISPLAY_TEXT.EXPIRED;
            if (
              reservation.insurance_details.aHistoricDateHasStatusAutoCompleted
            ) {
              reservation.insurance_details.overallInsuranceStatus.display_text +=
                INSURANCE_DISPLAY_TEXT.ADD_AUTO;
            }
          } else if (
            reservation.insurance_details
              .atLeastOneCOIVerifiedForThisOwnerRenter
          ) {
            reservation.insurance_details.overallInsuranceStatus.status =
              INSURANCE_STATUS.EXPIRED;
            reservation.insurance_details.overallInsuranceStatus.display_text =
              INSURANCE_DISPLAY_TEXT.EXPIRED;
          }
        }
      }
  } //End of switch for reservation.insurance_type (Set overall type)
}

//Private_SetOverallReservationInsuranceStatus
// Function exported to App Services
exports = Private_SetOverallReservationInsuranceStatus;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_SetOverallReservationInsuranceStatus };
}
