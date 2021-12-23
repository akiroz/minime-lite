const Datastore = require('nestdb');
const registerDbHelpers = require("../src/dbHelper");
const db = Datastore({ filename: "data_chunithm.db" });
registerDbHelpers(db);
db.load();

module.exports = db;