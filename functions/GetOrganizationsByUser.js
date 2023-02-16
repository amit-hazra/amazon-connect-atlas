// const { Private_GetAdminOrgs } = require("./Private_GetAdminOrgs");
// const { Private_GetRenterOrgs } = require("./Private_GetRenterOrgs");
// const { Private_IsAdminRole } = require("./Private_IsAdminRole");

function GetOrganizationsByUser(payload) {
  // Since i will get CallerType as admin/renter/maintenance

  let adminOrgs = [];
  let renterOrgs = [];
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { userEmail, parentOrgId, childOrgId, role } = payload;
  if (!userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }

  if (!Private_IsAdminRole(role)) {
    adminOrgs = context.functions.execute("Private_GetAdminOrgs", payload);
  } else {
    renterOrgs = context.functions.execute("Private_GetRenterOrgs", payload);
  }

  const SAMPLE_DATA = [
    {
      name: "Test3",
      orgId: "kjgiueknkuukm",
      isParent: true,
      childrenCnt: 10,
      isWOS: true,
      roles: [],
    },
    {
      name: "Wekan",
      orgId: "kjhdskiufmnfj",
      isParent: false,
      isWOS: true,
      childrenCnt: 0,
      roles: [],
    },
    {
      name: "Org three",
      orgId: "ORG125",
      isParent: true,
      isWOS: true,
      childrenCnt: 0,
      roles: [],
    },
  ];
  //let collection = context.services.get("mongodb-atlas").db("").collection("");
  return SAMPLE_DATA;
}
// Function exported to App Services
exports = GetOrganizationsByUser;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetOrganizationsByUser };
}
