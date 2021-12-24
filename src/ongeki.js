const http = require("http");
const util = require("util");
const zlib = require("zlib");
const collect = require('stream-collect');
const Datastore = require('nestdb');
const { DateTime } = require("luxon");

const db = require('./dbHelper')(
    Datastore({ filename: "minime_data_ongeki.db" })
);

/**
 * @param {http.IncomingMessage} req 
 */
 async function handler(ctx, req, body) {
     
 }

async function init() {
    await db.loadAsync();
    await db.ensureIndexAsync({ fieldName: "userId" });
    await db.ensureIndexAsync({ fieldName: "schema" });
    db.persistence.setAutocompactionInterval(10 * 60000);

    const debug = process.env.DEBUG;
    if(debug) console.log("[ongeki] DEBUG", debug);

    const ctx = {
        gameCharge: await fs.readFile(path.join(__dirname, '../asset/ongekiGameCharge.json')),
        gameEvent: await fs.readFile(path.join(__dirname, '../asset/ongekiGameEvent.json')),
    };
    
    const srv = http.createServer(async (req, res) => {
        console.log("[ongeki]", req.method, req.url);
        try {
            const body = JSON.parse(await collect(req.pipe(zlib.createInflate()), "utf8"));
            const resp = await handler(ctx, req, body);
            if(debug && (req.url.includes("GetUser") || req.url.includes("UpsertUser"))) {
                console.log("[ongeki] req", body);
                console.log("[ongeki] resp", resp);
            }
            const payload = zlib.deflateSync(JSON.stringify(resp || {}));
            res.writeHead(200, { "Content-Length": payload.length }).end(payload);
        } catch (err) {
            console.warn("[ongeki] request error", err);
            res.writeHead(500).end();
        }
    });
    await util.promisify(srv.listen.bind(srv))(9002);
    console.log("[ongeki] listening on 9002");
}

module.exports = { init };