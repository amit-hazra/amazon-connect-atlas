const { SearchOrganization } = require("../../functions/SearchOrganization");
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

describe("Serverless-function SearchOrganization suite", () => {
  beforeEach(() => {
    // mock of context.values.get()
    global.context = {
      functions: {
        execute: (val) => {
          return expectedData;
        }
        // Private_GetRenterOrgs: (val) => {
        //   return expectedData;
        // },
        // Private_GetAdminOrgs: (val) => {
        //   return expectedData;
        // },
      },
      values: {
        get: (val) => {
          return {
            OWNER: "owner",
            RENTER: "renter",
            COLLECTIONS: {}
          };
        },
      },
    };
  });
  test("SearchOrganization should return sample response when valid emailID is passed", async () => {
    const childrenOrgs = await SearchOrganization({
      searchText: "org name",
      type: "renter",
    });
    expect(childrenOrgs).toEqual(expectedData);
  });

  // test("SearchOrganization should throw error when invalid role is passed", () => {
  //   expect(() => SearchOrganization({
  //     searchText: "org name",
  //     type: 'renter'
  //   })).toThrow(Error);
  //   expect(() => SearchOrganization({
  //     searchText: "org name",
  //     role: 6
  //   })).toThrow("No such role exists");
  // });

  test("SearchOrganization should throw error when invalid search text is passed", async () => {
    expect(async () =>
    await SearchOrganization({
        searchText: undefined,
        type: "renter",
      })
    ).rejects.toThrow(Error);
    expect(async () =>
    await SearchOrganization({
        searchText: null,
        type: "renter",
      })
    ).rejects.toThrow("Params are mandatory.");
  });

  test("SearchOrganization should throw error when undefined is passed", () => {
    expect(async () => await SearchOrganization(undefined)).rejects.toThrow(Error);
    expect(async () => await SearchOrganization(undefined)).rejects.toThrow("Invalid payload");
  });

  test("SearchOrganization should throw error when empty object is passed", () => {
    expect(async () => await SearchOrganization({})).rejects.toThrow(Error);
    expect(async () => await SearchOrganization({})).rejects.toThrow("Params are mandatory.");
  });
});
