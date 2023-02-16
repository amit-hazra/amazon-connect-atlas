/* 

* If the user is a renter org, then there will not be a parent / child relationship.  The only time a parent / child comes into play is for facility owners.  But it is possible a facility owner can also be a renter org.

* This is really driven by the user and if they are a personal user only or representing an organization. The payment function will need to know if it is an org or a person and then what id.

* The amounts will either be positive or negative, so you should just be able to add it all up.

Note: 
    DB and collection is not mentioned.
    
*/
async function Private_GetPaymentDues(payload, pagination) {
    if (!payload || payload === null) {
      throw new Error("Invalid payload");
    }
    const { parentOrgId, childOrgId } = payload;
  
    if (!parentOrgId && !childOrgId) {
      throw new Error("Either of one argument is mandatory.");
    }
  
    return [];
  }
  
  // Function exported to App Services
  exports = Private_GetPaymentDues;
  
  // export locally for use in unit test
  if (typeof module !== "undefined") {
    module.exports = { Private_GetPaymentDues };
  }
