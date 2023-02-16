function HasInsuranceIssues(payload){
    if(!payload || payload === null) {
        throw new Error("Invalid payload");
    }
    const {userEmail, parentOrgId, childOrgId} = payload;
    if(!userEmail && !parentOrgId && !childOrgId){
        throw new Error('Either of one argument is mandatory.');
    }
    //let collection = context.services.get("mongodb-atlas").db("").collection("");
    
    return true;
};
// Function exported to App Services
exports = HasInsuranceIssues;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { HasInsuranceIssues };
}