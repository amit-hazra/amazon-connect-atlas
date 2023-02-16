async function GetInsurances(payload, pagination) {
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
      getInsuranceDetails: true,
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

  let renterInsurances = insuranceObj.renter_insurances || [];
  let renterOwnerInsurances = insuranceObj.renter_owner_insurances || [];

  let response = [];

  for (let res of reservations) {
    let sameOwnerIndex = response.findIndex(
      (x) => String(x.owner_id) === String(res.owner_id)
    );

    let insurances = renterOwnerInsurances || [];
    let insuranceOutgoing = [];

    if (!res.renter_owner && renterInsurances) {
      insuranceOutgoing = renterInsurances;
    }

    // loop through the insurances to filter
    for (let insuranceElement of insurances) {
      if (
        insuranceElement.insured_owners &&
        insuranceElement.insured_owners.length > 0
      ) {
        let insurancedOwnersInsurances =
          insuranceElement.insured_owners.findIndex(
            (x) =>
              String(x) === String(res.owner_id) ||
              (res.owner.owner && String(x) === String(res.owner.owner._id))
          );

        if (insurancedOwnersInsurances !== -1) {
          insuranceOutgoing.push(insuranceElement);
        }
      }
    }

    if (sameOwnerIndex !== -1 && response.length > 0) {
      response[sameOwnerIndex]["reservations_ids"].push({
        short_id: res.short_id,
        _id: res._id,
        type: res.type,
        created: res.created,
        insurance_type: res.insurance_type,
      });
    } else {
      let obj = {
        owner_id: res.owner_id,
        owner: res.owner,
        insurance_outgoing: insuranceOutgoing,
        renter_id: res.renter_id,
        renter_owner_id: res.renter_owner_id,
        renter: res.renter,
        renter_owner: res.renter_owner,
        event_name: res.event_name,
        event_dates: res.event_dates,
        overall_insurance_status: insurances.length > 0 ? "expired" : "missing",
        reservations_ids: [
          {
            short_id: res.short_id,
            _id: res._id,
            type: res.type,
            created: res.created,
            insurance_type: res.insurance_type,
          },
        ],
      };
      response.push(obj);
    }
  }

  let finalResponse = [];

  for (let reservation of response) {
    if (
      reservation.insurance_outgoing &&
      reservation.insurance_outgoing.length > 0
    ) {
      let newInsurance = new Array(...reservation.insurance_outgoing);
      for (let insuranceEl of newInsurance) {
        let newReservation = { ...reservation };
        newReservation["insurance_outgoing"] = [{ ...insuranceEl }];
        finalResponse.push(newReservation);
      }
    } else {
      finalResponse.push(reservation);
    }
  }

  // reservations = await context.functions.execute(
  //   "Private_CalculateReservationAmountDueAndCOIStatus",
  //   reservations,
  //   insuranceHash,
  //   commission[0]
  // );

  // const SAMPLE_DATA = [
  //   {
  //     reservations: ["BZ3CWGR982D7", "HEJ4223BJ524", "8GS3B76Z9QJ2"],
  //     owner: {
  //       _id: "5812784fe6a3fc3b3c3ef6d4",
  //       name: "zz-3",
  //       u_id: "ef9c87b18e57c3df3743",
  //       owner: {
  //         _id: "5849adfd2427ff2f98aae7f9",
  //         name: "zz-9 child",
  //         u_id: "6b89cdc88d9397724936",
  //       },
  //     },
  //     event_dates: [
  //       "2015-07-24T00:00:00.000Z",
  //       "2015-07-23T00:00:00.000Z",
  //       "2015-07-22T00:00:00.000Z",
  //       "2015-07-21T00:00:00.000Z",
  //     ],
  //     coi_status: "pending",
  //     coi_date_range: {
  //       start_date: "2018-06-08T07:00:00.000+00:00",
  //       end_date: "2018-07-31T07:00:00.000+00:00",
  //     },
  //     attachment_url:
  //       "https://s3-us-west-1.amazonaws.com/facilitron-development/insurance/test3/1436158358921-194-5976.jpg",
  //   },
  //   {
  //     reservations: ["7WBYU4AFZ4AX", "ETETQQ42PM3K", "GTXAMF3S3WR3"],
  //     owner: {
  //       _id: "5812784fe6a3fc3b3c3ef6d4",
  //       name: "zz-3",
  //       u_id: "ef9c87b18e57c3df3743",
  //       owner: {
  //         _id: "5849adfd2427ff2f98aae7f9",
  //         name: "zz-9 child",
  //         u_id: "6b89cdc88d9397724936",
  //       },
  //     },
  //     event_dates: [
  //       "2015-01-12T00:00:00.000Z",
  //       "2015-01-13T00:00:00.000Z",
  //       "2015-01-14T00:00:00.000Z",
  //     ],
  //     coi_status: "expired",
  //     coi_date_range: {
  //       start_date: "2018-06-08T07:00:00.000+00:00",
  //       end_date: "2018-07-31T07:00:00.000+00:00",
  //     },
  //     attachment_url:
  //       "https://s3-us-west-1.amazonaws.com/facilitron-development/insurance/test3/1436158358921-194-5976.jpg",
  //   },
  //   {
  //     reservations: ["7WBYU4AFZ4AX", "ETETQQ42PM3K"],
  //     owner: {
  //       _id: "5812784fe6a3fc3b3c3ef6d4",
  //       name: "zz-3",
  //       u_id: "ef9c87b18e57c3df3743",
  //       owner: {
  //         _id: "5849adfd2427ff2f98aae7f9",
  //         name: "zz-9 child",
  //         u_id: "6b89cdc88d9397724936",
  //       },
  //     },
  //     event_dates: ["2015-05-01T00:00:00.000Z", "2015-05-15T00:00:00.000Z"],
  //     coi_status: "active",
  //     coi_date_range: {
  //       start_date: "2018-06-08T07:00:00.000+00:00",
  //       end_date: "2018-07-31T07:00:00.000+00:00",
  //     },
  //     attachment_url:
  //       "https://s3-us-west-1.amazonaws.com/facilitron-development/insurance/test3/1436158358921-194-5976.jpg",
  //   },
  // ];

  return JSON.parse(JSON.stringify(finalResponse));
}

// Function exported to App Services
exports = GetInsurances;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetInsurances };
}
