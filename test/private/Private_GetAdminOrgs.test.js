const { Private_GetAdminOrgs } = require("../../functions/Private_GetAdminOrgs");
const expectedData = [
  {
    name: "child org name 1",
    id: "ORG123",
    shortId: "QEARTSEGYK",
    isWOS: true,
  },
  {
    name: "child org name 2",
    id: "ORG123",
    shortId: "QEARTSEGYK",
    isWOS: false,
  },
  {
    name: "child org name 3",
    id: "ORG123",
    shortId: "QEARTSEGYK",
    isWOS: true,
  },
];

describe("Serverless-function Private_GetAdminOrgs suite", () => {
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
  test("Private_GetAdminOrgs should return sample response when valid emailID is passed", async () => {
    const adminOrgs = await Private_GetAdminOrgs({
      userEmail: "user@somedomain.com"
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });

  test("Private_GetAdminOrgs should return sample response when user valid parentOrgId is passed", async () => {
    const adminOrgs = await Private_GetAdminOrgs({
        parentOrgId: "QASGDYIDUYI"
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });
  test("Private_GetAdminOrgs should return sample response when valid childOrgId is passed", async () => {
    const adminOrgs = await Private_GetAdminOrgs({
      childOrgId: "QASGDYIDUYI",
    }, {});
    expect(adminOrgs).toEqual(expectedData);
  });

  test("Private_GetAdminOrgs should throw error when undefined is passed", () => {
    expect(async () => await Private_GetAdminOrgs(undefined)).rejects.toThrow(Error);
    expect(async () => await Private_GetAdminOrgs(undefined)).rejects.toThrow("Invalid payload");
  });
});
