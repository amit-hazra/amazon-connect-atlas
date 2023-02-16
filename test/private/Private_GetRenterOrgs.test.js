const {
  Private_GetRenterOrgs,
} = require("../../functions/Private_GetRenterOrgs");
const expectedData = [
  {
    name: "Parent company name",
    id: "ORG12345",
    shortId: "QSXCARGSERH",
    type: "Business",
    isDuplicate: true,
    address: {
      locationName: "Oxnard, CA",
      zipcode: "DT12345",
      Location: {
        latitude: 71.123456,
        Longitude: 25.234567,
      },
    },
    createdAt: "2022-09-08T10:12:29.301+00:00",
  },
];

describe("Serverless-function Private_GetRenterOrgs suite", () => {
  beforeEach(() => {
    global.context = {
      // your mocking services
      services: {
        get: (val) => {
          return {
            db: (val) => {
              return {
                collection: (val) => {
                  return {
                    aggregate: (payload) => {
                      return expectedData;
                    }
                  }
                },
              }
            },
          };
        },
      },
      values: {
        get: (val) => {
          return {
            MAX_RETRIEVAL_LIMIT: 100000,
            COLLECTIONS: {}
          }
        }
      },
      environment: {
        values: {
          DATA_SOURCE: '',
          DB_FACILITRON_COMMON: '',
          COLLECTIONS: ''
        }
      }
    };
  });
  test("Private_GetRenterOrgs should return sample response when valid emailID is passed", async () => {
    const adminOrgs = await Private_GetRenterOrgs({
      userEmail: "user@somedomain.com"
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });

  test("Private_GetRenterOrgs should return sample response when user valid parentOrgId is passed", async () => {
    const adminOrgs = await Private_GetRenterOrgs({
        parentOrgId: "QASGDYIDUYI"
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });
  test("Private_GetRenterOrgs should return sample response when valid childOrgId is passed", async () => {
    const adminOrgs = await Private_GetRenterOrgs({
      childOrgId: "QASGDYIDUYI",
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });

  test("Private_GetRenterOrgs should throw error when undefined is passed", () => {
    expect(async () => await Private_GetRenterOrgs(undefined)).rejects.toThrow(Error);
    expect(async () => await Private_GetRenterOrgs(undefined)).rejects.toThrow("Invalid payload");
  });
});