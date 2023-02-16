const {
  HandleCustomFunctionAuthentication,
} = require("../../functions/HandleCustomFunctionAuthentication");

const expectedData = {
  _id: 1,
  local: {
    userEmail: 'somename@domain.com',
    password: '$2b$08$84QPwNFhLEG8V9g0bKpnlO5L7UFU1JqAoUyLZ.qM5zrMy8j/nDmR.'
  }
};

jest.mock('bcryptjs', () => ({
  __esModule: true,
  compareSync: (p1, p2)=> jest.fn()
}), {virtual: true});

describe("Serverless-function HandleCustomFunctionAuthentication suite", () => {
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
                    findOne: (payload) => {
                      return expectedData;
                    }
                  }
                },
              }
            },
          };
        },
      }
    };
  });
  test("HandleCustomFunctionAuthentication should return sample response when valid credentials is shared", async () => {
   
    const childrenOrgs = await HandleCustomFunctionAuthentication({
      userEmail: "somename@domain.com",
      password: "WeKan12E!",
    });
    expect(childrenOrgs).toEqual(expectedData)
  });

  test("HandleCustomFunctionAuthentication should throw error when password is missing", async () => {
    const childrenOrgs = await HandleCustomFunctionAuthentication({
      userEmail: "somename@domain.com",
    });
    expect(childrenOrgs).toEqual(expectedData);
  });

  test("HandleCustomFunctionAuthentication should throw error when userEmail is missing", async () => {
    const childrenOrgs = await HandleCustomFunctionAuthentication({
      password: "password",
    });
    expect(childrenOrgs).toEqual(expectedData);
  });

  test("HandleCustomFunctionAuthentication should throw error when undefined is passed", async () => {
    expect((async () => await HandleCustomFunctionAuthentication(undefined))).rejects.toThrow(Error);
    expect((async () => await HandleCustomFunctionAuthentication(undefined))).rejects.toThrow("Invalid payload");
  });

  test("HandleCustomFunctionAuthentication should throw error when null is passed", async () => {
    expect((async () => await HandleCustomFunctionAuthentication(null))).rejects.toThrow(
      Error
    );
    expect((async () => await HandleCustomFunctionAuthentication(null))).rejects.toThrow(
      "Invalid payload"
    );
  });
});
