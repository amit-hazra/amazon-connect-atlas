async function SearchOrganization(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const ORG_TYPES = context.values.get("org_types");

  const { searchText, type = ORG_TYPES.RENTER } = payload; // status=0 || status=5 for owner or renter orgs. Default is renter org
  if (!searchText) {
    throw new Error("Params are mandatory.");
  }

  let organizations = [];
  if (type === ORG_TYPES.OWNER) {
    var startTimeFind = Date.now();
    organizations = await context.functions.execute(
      "Private_GetAdminOrgs",
      {
        searchText,
      },
      pagination
    );
    console.log(`Private_GetAdminOrgs took::: `, (Date.now() - startTimeFind) / 1000);
  }else {
    var startTimeFind = Date.now();
    organizations = await context.functions.execute(
      "Private_GetRenterOrgs",
      {
        searchText,
      },
      pagination
    );
    console.log(`Private_GetRenterOrgs took::: `, (Date.now() - startTimeFind) / 1000);
  }

  return organizations;
}

// Function exported to App Services
exports = SearchOrganization;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { SearchOrganization };
}
