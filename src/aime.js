const net = require("net");
const crypto = require("crypto");
const Datastore = require('nestdb');

export async function init() {
    const db = Datastore({ filename: "data_aime.db", autoload: true });
    db.persistence.setAutocompactionInterval(60000);
    net.createServer((socket) => {
        // TODO
    }).listen(22345, () => {
        console.log("[aime] listening on 22345");
    });

}