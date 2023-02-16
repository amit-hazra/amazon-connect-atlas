//GetOrganizationDetails
async function GetOrganizationDetails(payload) {
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
  var startTimeFind = Date.now();

  let aggregatePipeline = [
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
    },
  ];

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
          let: { ownerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$status", 0] },
                    { $eq: ["$$ownerId", "$owner"] },
                  ],
                },
              },
            },
            {
              $project: {
                name: 1,
                u_id: 1,
                status: 1,
                phone: 1,
                country: 1,
                city: 1,
                state: 1,
                address: 1,
                zip: 1,
              },
            },
          ],
          as: "children",
        },
      }
      // {
      //   $lookup: {
      //     from: COLLECTIONS.OWNERS,
      //     let: { ownerId: "$owner" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [{ $eq: ["$_id", "$$ownerId"] }],
      //           },
      //         },
      //       },
      //       {
      //         $project: {
      //           name: 1,
      //           u_id: 1,
      //           owner: 1,
      //         },
      //       },
      //     ],
      //     as: "owner",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$owner",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // }
    );
  }

  let organization = await collection.aggregate(aggregatePipeline).toArray();

  console.log(
    `GetOrganizationDetails aggregate took::: `,
    (Date.now() - startTimeFind) / 1000
  );
  return JSON.parse(JSON.stringify(organization));
}

// Function exported to App Services
exports = GetOrganizationDetails;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { GetOrganizationDetails };
}
