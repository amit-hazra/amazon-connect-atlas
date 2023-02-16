/**
 * For the owner that is type 0, the reservation needs to be external, reservations.type='External', 
 * unless the type is missing and in that case you need to know which district this owner is in and then 
 * make sure the owner of the reservation is also not in that district. If it is not then it is considered external.
 * 
 * data: Facilitron_common.owners
 * status: 5 means renter org only
 * status: 0 owner but can be renter org (to determine this, look at renter_owner to match the org _id in Facilitron_Dev (or _Prod).reservations. 
 * when owner: null or missing => parent
 * @param {*} payload 
 */

function Private_GetOwnerReservations(payload) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { userEmail, parentOrgId, childOrgId } = payload;
  if (!userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }

  const SAMPLE_RESULT = [
    {
      parent: "Test3",
      owner: "Another child",
      reservationId: "RMKWMNNUZJ7Y",
      eventDates: [
        "2022-09-09T10:12:29.301+00:00",
        "2022-11-30T10:12:29.301+00:00",
      ],
      hasInsuranceIssues: "Valid",
      insuranceDates: [
        "2022-06-16T10:12:29.301+00:00",
        "2023-06-16T10:12:29.301+00:00",
      ],
      status: "Valid",
    },
    {
      parent: "Test3",
      owner: "Another child",
      reservationId: "RMKWMNNUZJ7Y",
      eventDates: [
        "2022-09-09T10:12:29.301+00:00",
        "2022-11-30T10:12:29.301+00:00",
      ],
      hasInsuranceIssues: "Expried",
      insuranceDates: [
        "2021-06-16T10:12:29.301+00:00",
        "2022-06-16T10:12:29.301+00:00",
      ],
      status: "Expired",
    },
    {
      parent: "Test3",
      owner: "Another child",
      reservationId: "RMKWMNNUZJ7Y",
      eventDates: [
        "2022-09-09T10:12:29.301+00:00",
        "2022-11-30T10:12:29.301+00:00",
      ],
      hasInsuranceIssues: "Pending Verification",
      insuranceDates: [
        "2022-06-16T10:12:29.301+00:00",
        "2023-06-16T10:12:29.301+00:00",
      ],
      status: "Pending Verification",
    },
    {
      parent: "Test3",
      owner: "Another child",
      reservationId: "RMKWMNNUZJ7Y",
      eventDates: [
        "2022-09-09T10:12:29.301+00:00",
        "2022-11-30T10:12:29.301+00:00",
      ],
      hasInsuranceIssues: "Missing",
      insuranceDates: [],
      status: "Missing",
    },
  ];

  const SAMPLE_SITE_MANAGER_RESULT = [
    {
      _id: "630403e6587524002f0f7ed0",
      insurance_type: 0,
      event_name: "LR Null Services Reservation 8-15-1",
      status: 1,
      created: "2022-08-15T22:14:40.746Z",
      short_id: "QDT456BWF74B",
      owner: {
        owner: null,
        name: "Campbells Union High School District",
        _id: "58b610d4ddd9c14534ca9e10",
        u_id: "cuhsd95124",
      },
      renter: {
        local: {
          email: "irina+56@facilitron.com",
        },
        _id: "56ec44998950b71100d11a4e",
        first_name: "Vera",
        insurance_outgoing: [],
        last_name: "Wang",
      },
      renter_owner: {
        name: "Something outside type 5 fhfhfhfhfh",
        _id: "567ade53dab3bb1100c21478",
        state: "CA",
        u_id: "a568dc05698bede3dc84",
        zip: "95131",
        city: "San Jose",
        address: "584 Columbia Way",
        insurance_outgoing: [
          {
            insured_owners: ["5522c4f55587d211005daece"],
            status: 1,
            start_date: "2016-01-01T00:00:00.000Z",
            end_date: "2017-01-01T00:00:00.000Z",
            created: "2016-03-04T19:10:24.417Z",
          },
          {
            insured_owners: ["546e7b08ad8dbb0b001e405b"],
            status: 1,
            end_date: "2016-10-28T00:00:00.000Z",
            start_date: "2016-04-01T00:00:00.000Z",
            created: "2016-08-24T18:28:30.361Z",
          },
          {
            insured_owners: ["5522c4f55587d211005daece"],
            status: 1,
            start_date: "2017-09-01T00:00:00.000Z",
            end_date: "2017-12-31T00:00:00.000Z",
            created: "2018-06-01T23:15:07.309Z",
          },
          {
            insured_owners: ["5522c4f55587d211005daece"],
            status: 4,
            created: "2022-06-16T01:06:32.523Z",
            start_date: "2022-06-16T00:00:00.000Z",
            end_date: "2023-06-16T00:00:00.000Z",
            machine_verified: false,
          },
        ],
      },
      event_dates: {
        first_date: "2022-08-22T00:00:00.000Z",
        last_date: "2022-12-05T00:00:00.000Z",
      },
      insurance_status: "Not Uploaded",
      approved_date: "2022-08-22T22:13:33.595Z",
    },
  ];

  return SAMPLE_RESULT;
}
// Function exported to App Services
exports = Private_GetOwnerReservations;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetOwnerReservations };
}
