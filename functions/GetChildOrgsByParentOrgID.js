async function GetChildOrgsByParentOrgID(orgId) {
  if (orgId === undefined || orgId === null) {
    throw new Error("OrgId is required parameter");
  }
  const organizations = await context.functions.execute(
    "Private_GetChildOrgs",
    orgId
  );

  return JSON.parse(JSON.stringify(organizations));
}

// Function exported to App Services
exports = GetChildOrgsByParentOrgID;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetChildOrgsByParentOrgID };
}
