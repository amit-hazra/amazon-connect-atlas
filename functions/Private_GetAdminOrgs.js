/**
 *
 * For the owner that is type 0, the reservation needs to be external, reservations.type='External',
 * unless the type is missing and in that case you need to know which district this owner is in and
 * then make sure the owner of the reservation is also not in that district. If it is not then it is considered external.
 *
 * */
async function Private_GetAdminOrgs(payload, pagination) {
  if (!payload || payload === null) {
    throw new Error("Invalid payload");
  }
  const { searchText, userEmail, parentOrgId, childOrgId } = payload;
  if (!searchText && !userEmail && !parentOrgId && !childOrgId) {
    throw new Error("Either of one argument is mandatory.");
  }
  // Using facilitron_common.owner and facilitron_common.users collections we should find admin orgs by user email
  // 1. fetch list of all org Ids
  // 2. Now pass all the collected orgids to reservation collection to fetch orgId and reservationIds. {orgIds, [reservationIds]}

  const APP_CONSTANTS = context.values.get("app_constants");
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  let { page = 1, limit = 10, all = false } = pagination;

  const PROJECTION = {
    _id: 1,
    name: 1,
    organization_type: 1,
    u_id: 1,
    phone: 1,
    country: 1,
    city: 1,
    email: 1,
    state: 1,
    address: 1,
    loc: 1,
    zip: 1,
    status: 1,
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
  let organizations = await collection.aggregate([
    {
      $match: {
        ...query,
        status: 0,
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
      $unwind: {
        path: "$organization_type._id",
        preserveNullAndEmptyArrays: true,
      },
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
    {
      $project: PROJECTION,
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: all ? APP_CONSTANTS.MAX_RETRIEVAL_LIMIT : limit,
    },
  ]);
  console.log(
    `Private_GetAdminOrgs aggregate took::: `,
    (Date.now() - startTimeFind) / 1000
  );
  return organizations;
}
// Function exported to App Services
exports = Private_GetAdminOrgs;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetAdminOrgs };
}
