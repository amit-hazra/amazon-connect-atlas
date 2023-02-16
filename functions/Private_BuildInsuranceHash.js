/**
 *
 * @param renterInsuranceOutgoing
 *    This should be the renter or renter organizations insurance_outgoing element from the
 *    database, which is an array.
 * @returns : Hash of outgoing COIs
 *
 * You need to build this hash and then pass it to the Private_CalculateReservationAmountDueAndCOIStatus
 *   function as the third parameter.  We only need to build this hash once for a renter / renter
 *   org and then we will use it on every reservation we are returning.
 *
 */

function Private_BuildInsuranceHash(renterInsuranceOutgoing) {
  /*
        We want to build a hash of the renter or renter orgs insurance outgoing object as each
          reservation for this renter / renter org may be for a different owner, which would mean
          a seperate COI document. The hash will be the following:
            <insured_owner_id>:{
              at_least_one_coi_not_verified: true / false,
              at_least_one_coi_verified: true / false,
              at_least_one_coi_invalid: true / false,
              coi_details:{
                <specific COI _id>:{
                  "status" : ,
                  "start_date" : ,
                  "end_date" : ,
                  "machine_verified" : true / false
                }
              }
            }
        */
  let renterInsuranceOutgoingHash = {};
  if (Array.isArray(renterInsuranceOutgoing)) {
    for (let oneCOI of renterInsuranceOutgoing) {
      //Each COI is for an insured owner, so loop through that array
      for (let oneInsuredOwner of oneCOI.insured_owners) {
        //See if the hash key already exists
        if (
          typeof renterInsuranceOutgoingHash[oneInsuredOwner] === "undefined"
        ) {
          //The key does not exist so create it
          renterInsuranceOutgoingHash[oneInsuredOwner] = {
            at_least_one_coi_not_verified: false,
            at_least_one_coi_verified: false,
            at_least_one_coi_invalid: false,
            coi_details: {
              verified_COIs: [],
              invalid_COIs: [],
              not_verified_COIs: [],
            },
          };
        }
        //Add this COI
        renterInsuranceOutgoingHash[oneInsuredOwner].coi_details[oneCOI._id] = {
          status: oneCOI.status,
          start_date: oneCOI.start_date,
          end_date: oneCOI.end_date,
          machine_verified: oneCOI.machine_verified
            ? oneCOI.machine_verified
            : false,
        };
        //Save current COI to save to the type
        let curCOIDataToSave = {
          _id: oneCOI._id,
          created: oneCOI.created,
          start_date: oneCOI.start_date,
          end_date: oneCOI.end_date,
          machine_verified: oneCOI.machine_verified
            ? oneCOI.machine_verified
            : false,
          user_requested_manual_verification:
            oneCOI.user_requested_manual_verification
              ? oneCOI.user_requested_manual_verification
              : false,
        };
        //Set the flag for this COI status
        switch (oneCOI.status) {
          case 0: //Not verified  Pull this out to constants
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].at_least_one_coi_not_verified = true;
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].coi_details.not_verified_COIs.push(curCOIDataToSave);
            break;
          case 1: //Verified      Pull this out to constants
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].at_least_one_coi_verified = true;
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].coi_details.verified_COIs.push(curCOIDataToSave);
            break;
          case 4: //Invalid       Pull this out to constants
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].at_least_one_coi_invalid = true;
            renterInsuranceOutgoingHash[
              oneInsuredOwner
            ].coi_details.invalid_COIs.push(curCOIDataToSave);
            break;
        }
      }
    }
  }
  return renterInsuranceOutgoingHash;
}

// Function exported to App Services
exports = Private_BuildInsuranceHash;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_BuildInsuranceHash };
}
