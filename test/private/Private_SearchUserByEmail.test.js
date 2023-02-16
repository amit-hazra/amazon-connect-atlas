const { Private_GetUserByEmailOrId } = require("../../functions/Private_GetUserByEmailOrId");
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

describe("Serverless-function Private_GetUserByEmailOrId suite", () => {
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
                    find: (payload) => {
                      return expectedData;
                    }
                  }
                },
              }
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
  test("Private_GetUserByEmailOrId should return sample response when valid emailId is passed", async () => {
    const users = await Private_GetUserByEmailOrId({userEmail: 'lisa@gmail.com'}, {});
    expect(users).toEqual(expectedData);
  });

  test("Private_GetUserByEmailOrId should throw error when null is passed", () => {
    expect(async () => await Private_GetUserByEmailOrId(null)).rejects.toThrow(Error);
    expect(async () => await Private_GetUserByEmailOrId(null)).rejects.toThrow("Invalid payload");
  });

  test("Private_GetUserByEmailOrId should throw error when undefined is passed", () => {
    expect(async () => await Private_GetUserByEmailOrId(undefined)).rejects.toThrow(Error);
    expect(async () => await Private_GetUserByEmailOrId(undefined)).rejects.toThrow("Invalid payload");
  });
});
