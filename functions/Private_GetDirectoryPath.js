function Private_GetDirectoryPath() {
  // get all directories
  const SAMPLE_DATA = [
    {
      _id: 9,
      dir_path:
        "https://s3-us-west-1.amazonaws.com/facilitron-development/mot/requests/",
      dir_key: "mot/requests",
      dir_name: "request_dir",
      bucket: "facilitron-development",
    },
  ];
  //let collection = context.services.get("mongodb-atlas").db("").collection("");

  return SAMPLE_DATA;
}

// Function exported to App Services
exports = Private_GetDirectoryPath;

// export locally for use in unit test
if (typeof module !== "undefined") {
  module.exports = { Private_GetDirectoryPath };
}
