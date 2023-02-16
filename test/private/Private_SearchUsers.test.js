const {
  Private_SearchUsers,
} = require("../../functions/Private_SearchUsers");
const expectedData = [
  {
    id: "userid123",
    firstName: "Lisa",
    lastName: "Moore",
    email: "lisa@gmail.com",
    phone: "9876543210",
  },
  {
    id: "userid456",
    firstName: "John",
    lastName: "Doe",
    email: "john@gmail.com",
    phone: "9876543210",
  },
];

describe("Serverless-function Private_SearchUsers suite", () => {
  beforeEach(() => {
    global.BSON = {
      // mock methods
      BSONRegExp: (val) => {
        return ''
      }
    },
    global.context = {
      // your mocking services
      services: {
        get: (val) => {
          return {
            db: (val) => {
              return {
                collection: (val) => {
                  return {
                    find: (payload) => {
                      return expectedData;
                    },
                  };
                },
              };
            },
          };
        },
      },
      environment: {
        values: {
          DATA_SOURCE: '',
          DB_FACILITRON_COMMON: '',
          COLLECTIONS: ''
        }
      },
      values: {
        get: (val) => {
          return {
            ADMIN: "admin",
            RENTER: "renter",
            COLLECTIONS: {}
          };
        },
      },
    };
  });
  test("Private_SearchUsers should return sample response when valid searchText is passed", async () => {
    const users = await Private_SearchUsers({searchText: "lisa"}, {});
    expect(users).toEqual(expectedData);
  });

  test("Private_SearchUsers should throw error when null is passed", () => {
    expect(async () => await Private_SearchUsers(null)).rejects.toThrow(Error);
    expect(async () => await Private_SearchUsers(null)).rejects.toThrow("Param is mandatory.");
  });

  test("Private_SearchUsers should throw error when undefined is passed", () => {
    expect(async () => await Private_SearchUsers(undefined)).rejects.toThrow(Error);
    expect(async () => await Private_SearchUsers(undefined)).rejects.toThrow("Param is mandatory.");
  });
});
