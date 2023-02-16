async function Test(payload) {
  if (!payload) {
    throw new Error("Invalid payload");
  }
  const { orgId, getParentAndChildren = false, getUsers = false } = payload;

  if (!orgId) {
    throw new Error("Organization Id is mandatory.");
  }

  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  const { DB_FACILITRON_COMMON } = context.environment.values;

  let collection = context.services
    .get(DATA_SOURCE)
    .db(DB_FACILITRON_COMMON)
    .collection(COLLECTIONS.OWNERS);

  // Private_GetOrgUsers function

  console.log(orgId);

  let aggregatePipeline = [];

  aggregatePipeline.push(
    {
      $match: {
        _id: new BSON.ObjectId(orgId),
      },
    },
    {
      $project: {
        name: 1,
        u_id: 1,
        owner: 1,
      },
    }
  );

  if (getUsers) {
    aggregatePipeline.push({
      $lookup: {
        from: COLLECTIONS.OWNER_ENTITY,
        let: { ownerId: "$_id" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$owner", "$$ownerId"] } },
          },
          {
            $project: {
              users_count: { $size: "$users" },
            },
          },
        ],
        as: "owner_entity",
      },
    });
  }

  if (getParentAndChildren) {
    aggregatePipeline.push(
      {
        $lookup: {
          from: COLLECTIONS.OWNERS,
          let: { parentId: "$owner" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$owner", null] },
                    { $eq: ["$owner", "$$parentId"] },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                u_id: 1,
                owner: 1,
              },
            },
          ],
          as: "children",
        },
      },
      {
        $lookup: {
          from: COLLECTIONS.OWNERS,
          let: { ownerId: "$owner" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$ownerId"] }],
                },
              },
            },
            {
              $project: {
                name: 1,
                u_id: 1,
                owner: 1,
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
      }
    );
  }

  let organization = await collection.aggregate(aggregatePipeline);
  return organization;
}

// Function exported to App Services
exports = Test;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Test };
}
