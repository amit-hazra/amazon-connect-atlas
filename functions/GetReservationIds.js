function GetReservationIds(payload) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { userEmail, parentOrgId, childOrgId } = payload;
  if (!userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }

  // Goal is to fetch reservation Ids by user or org selected
  // 1. Based on inbound email and role get the orgs, Private_GetOwners()
  // 2. Based on th
  const SAMPLE_DATA = [
    {
      orgId: "ORG123",
      orgShortId: "QAZVDHKPYRD",
      reservationId: "dryusdr57sr58et7idt",
      reservationShortId: "QGSKUIVCEGTUJ",
    },
    {
      orgId: "ORG123",
      orgShortId: "QAZVDHKPYRD",
      reservationId: "dryusdr57sr58et7idt",
      reservationShortId: "QGSKUIVCEGTUJ",
    },
  ];
  //let collection = context.services.get("mongodb-atlas").db("").collection("");

  return SAMPLE_DATA;
};

// Function exported to App Services
exports = GetReservationIds;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetReservationIds };
}