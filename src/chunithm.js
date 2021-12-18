const http = require("http");

export async function init() {
    const db = Datastore({ filename: "data_chunithm.db", autoload: true });
    db.persistence.setAutocompactionInterval(60000);
    http.createServer(async (req, res) => {
        // TODO
    }).listen(9001, () => {
        console.log("[chunithm] listening on 9001");
    });
}