async function Private_PopulateDirectory(payload, returnPayload) {
  const { orgId, userId } = payload;
  const { getRenterInsurances, getHashes } = returnPayload;

  let renter_owner_insurances = [];
  let renter_insurances = [];
  let renterInsuranceHash = {};
  let renterOwnerInsuranceHash = {};

  if (!orgId && !userId) return [];

  const { DB_FACILITRON_COMMON, DB_FACILITRON_DEV } =
    context.environment.values;
  const { DATA_SOURCE, COLLECTIONS } = context.values.get("db_constants");
  if (orgId) {
    let collection = context.services
      .get(DATA_SOURCE)
      .db(DB_FACILITRON_COMMON)
      .collection(COLLECTIONS.OWNERS);

    let OWNER_PROJECTION = {
      _id: 1,
      name: 1,
      u_id: 1,
      status: 1,
      owner: 1,
      insurance_outgoing: 1,
    };

    let ownerAggregate = await collection
      .aggregate([
        {
          $match: {
            _id: new BSON.ObjectId(orgId),
          },
        },
        {
          $lookup: {
            from: "owners",
            let: { ownerId: "$owner" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$ownerId", "$_id"],
                  },
                },
              },
              {
                $project: OWNER_PROJECTION,
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
          $project: OWNER_PROJECTION,
        },
      ])
      .toArray();

    let owner = ownerAggregate ? ownerAggregate[0] : {};

    if (owner?.insurance_incoming?.use_parent) {
      // insurance_outgoing = owner?.owner?.insurance_outgoing || [];
      renter_owner_insurances = owner?.owner?.insurance_outgoing || [];
    } else {
      // insurance_outgoing = owner?.insurance_outgoing || [];
      renter_owner_insurances = owner?.insurance_outgoing || [];
    }
  }

  if (getRenterInsurances && userId) {
    let collection = context.services
      .get(DATA_SOURCE)
      .db(DB_FACILITRON_COMMON)
      .collection(COLLECTIONS.USERS);
    let user = await collection.findOne({
      _id: new BSON.ObjectId(userId),
    });
    // insurance_outgoing = user?.insurance_outgoing;
    renter_insurances = user?.insurance_outgoing;
  }

  if (!getHashes) {
    let directoryCollection = context.services
      .get(DATA_SOURCE)
      .db(DB_FACILITRON_COMMON)
      .collection(COLLECTIONS.DIRECTORIES);

    let directory = await directoryCollection.findOne({ _id: 5 });

    if (renter_owner_insurances && renter_owner_insurances.length > 0) {
      let insuranceStoragesCollection = context.services
        .get(DATA_SOURCE)
        .db(DB_FACILITRON_DEV)
        .collection(COLLECTIONS.INSURANCE_STORAGES);

      for (let insurance of renter_owner_insurances) {
        if (insurance && insurance?.insurance_id) {
          let storage = await insuranceStoragesCollection.findOne({
            _id: insurance?.insurance_id,
          });
          if (storage?.filename) {
            let url = directory?.dir_path + storage.filename;
            insurance["url"] = url;
          }
        }
      }
    }

    if (renter_insurances && renter_insurances.length > 0) {
      let insuranceStoragesCollection = context.services
        .get(DATA_SOURCE)
        .db(DB_FACILITRON_DEV)
        .collection(COLLECTIONS.INSURANCE_STORAGES);

      for (let insurance of renter_insurances) {
        if (insurance && insurance?.insurance_id) {
          let storage = await insuranceStoragesCollection.findOne({
            _id: insurance?.insurance_id,
          });
          if (storage?.filename) {
            let url = directory?.dir_path + storage.filename;
            insurance["url"] = url;
          }
        }
      }
    }
  }

  if (getHashes && userId) {
    renterInsuranceHash = await context.functions.execute(
      "Private_BuildInsuranceHash",
      renter_insurances
    );
  }

  if (getHashes && orgId) {
    renterOwnerInsuranceHash = await context.functions.execute(
      "Private_BuildInsuranceHash",
      renter_owner_insurances
    );
  }

  return {
    renter_insurances,
    renter_owner_insurances,
    renter_insurance_hash: renterInsuranceHash,
    renter_owner_insurance_hash: renterOwnerInsuranceHash,
  };
}

// Function exported to App Services
exports = Private_PopulateDirectory;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_PopulateDirectory };
}
