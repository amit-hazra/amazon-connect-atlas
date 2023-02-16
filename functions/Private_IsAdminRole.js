/**
 * Validate given role as admin or not.
 * Expected to support only admin or renter roles
 * @param role - string
 * @returns boolean
 */
function Private_IsAdminRole(role) {
    if(!role || role === null) {
        throw new Error('Role is required.');
    }

    // const supportedRoles = context.values.get("app_roles");
    const supportedRoles = ['admin', 'renter'];
    if(!supportedRoles.includes(role)) {
        throw new Error(`'${role}' is not supported`);
    }

    const isAdminUser = !!(supportedRoles[0] === role.toLowerCase()); // is role admin ?
    return isAdminUser;
}

// Function exported to App Services
exports = Private_IsAdminRole;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_IsAdminRole };
}
