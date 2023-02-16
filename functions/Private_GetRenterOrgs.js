/**
 *
 * For the owner that is type 0, the reservation needs to be external, reservations.type='External',
 * unless the type is missing and in that case you need to know which district this owner is in and
 * then make sure the owner of the reservation is also not in that district. If it is not then it is considered external.
 *
 * */
async function Private_GetRenterOrgs(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { searchText, userEmail, parentOrgId, childOrgId } = payload;
  if (!searchText && !userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }

  const APP_CONSTANTS = context.values.get("app_constants");
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");

  let { page = 1, limit = 10, all = false } = pagination;

  const { DB_FACILITRON_COMMON } = context.environment.values;

  const PROJECTION = {
    _id: 1,
    name: 1,
    organization_type: 1,
    u_id: 1,
    country: 1,
    city: 1,
    state: 1,
    address: 1,
    zip: 1,
    owner: 1,
    created: 1,
  };

  let query = {};

  if (searchText) {
    query["name"] = { $regex : searchText, $options: 'i'};
  }

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.OWNERS);
    var startTimeFind = Date.now();
  let organizations = await collection
    .aggregate([
      {
        $match: {
          ...query,
          status: 5,
        },
      },
      {
        $lookup: {
          from: "organization_types",
          localField: "organization_type._id",
          foreignField: "_id",
          as: "organization_type._id",
        },
      },
      {
        $unwind: "$organization_type._id",
      },
      {
        $lookup: {
          from: COLLECTIONS.OWNERS,
          let: { ownerId: "$owner" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$_id", "$$ownerId"] } },
            },
            {
              $project: {
                name: 1,
                u_id: 1,
              },
            },
          ],
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { created: -1 } },
      {
        $project: PROJECTION,
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit,
      },
    ])
    .toArray();
    console.log(`Private_GetRenterOrgs aggregate took::: `, (Date.now() - startTimeFind) / 1000);
  organizations = addDuplicateFlag(organizations);

  /*  {
        $group: { // to get the duplicate flag
          _id: {
            name: "$name",
            address: "$address",
            email: "$email",
          },
          count: {
            $sum: 1,
          },
          owner_data: {
            $push: {
              name: "$name",
              owner: "$owner",
              u_id: "$u_id",
              country: "$country",
              city: "$city",
              state: "$state",
              address: "$address",
              zip: "$zip",
              status: "$status",
              organization_type: "$organization_type",
              created: "$created",
            },
          },
        },
      },
      {
        $unwind: {
          path: "$owner_data",
        },
      }, */

  // organizations = EJSON.parse(EJSON.stringify(organizations));
  return organizations;
}
// Function exported to App Services
exports = Private_GetRenterOrgs;

function addDuplicateFlag(organizations) {
  if (organizations.length > 0) {
    for (let organization of organizations) {
      let duplicates = organizations.findIndex((x) => {
        return (
          x.email === organization.email &&
          x.address === organization.address &&
          x.name === organization.name &&
          String(x._id) !== String(organization._id)
        );
      });
      organization["isDuplicates"] = duplicates >= 0;
    }
  }
  return organizations;
}

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetRenterOrgs };
}
