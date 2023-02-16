/**
 * Get Owners bu user email and role.
 * Fetch the list of owners by user
 * @param {*} payload 
 */
function Private_GetOwners(payload) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { userEmail, parentOrgId, childOrgId, role } = payload;
  if (!userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }
  const isAdmin = Private_IsAdminRole(role);
  if(userEmail) {
    // Admin logic to fetch the Owner orgs.
    GetOwnersByUser(userEmail, isAdmin);
  }else {
    // Renter logic to fetch the renter orgs.
    GetOwnersByOrgIds(parentOrgId, childOrgId);
  }
}

function GetOwnersByUser(userEmail, role) {

}

// Function exported to App Services
exports = Private_GetOwners;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetOwners };
}
