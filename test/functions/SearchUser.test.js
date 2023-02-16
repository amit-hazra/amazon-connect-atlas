const { SearchUsers } = require("../../functions/SearchUsers");
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

describe("Serverless-function SearchUsers suite", () => {
  beforeEach(() => {
    // mock of context.values.get()
    global.context = {
      functions: {
        execute: (val) => {
          return expectedData;
        },
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
  test("SearchUsers should return sample response when valid emailID is passed", async () => {
    const childrenOrgs = await SearchUsers({ userEmail: "lisa@gmail.com" });
    expect(childrenOrgs).toEqual(expectedData);
  });

  test("SearchUsers should throw error when undefined is passed", () => {
    expect(async () => await SearchUsers(undefined)).rejects.toThrow(Error);
    expect(async () => await SearchUsers(undefined)).rejects.toThrow(
      "Invalid payload"
    );
  });

  test("SearchUsers should throw error when null is passed", () => {
    expect(async () => await SearchUsers(null)).rejects.toThrow(Error);
    expect(async () => await SearchUsers(null)).rejects.toThrow(
      "Invalid payload"
    );
  });
});
