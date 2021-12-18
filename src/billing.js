const https = require("https");
const crypto = require("crypto");
const zlib = require("zlib");
const collect = require('stream-collect');
const { promises: fs } = require("fs");
const { URLSearchParams } = require("url");

// nearfull: high 16 bits is billing mode, low 16 bits is actual nearfull val.
const playlimit = 1024;
const nearfull = 0x00010200;

function signVal(val, id, key) {
    const buf = Buffer.alloc(15);
    buf.writeInt32LE(val, 0);
    buf.write(id, 4);
    return crypto.sign("RSA-SHA1", buf, key).toString("hex");
}

export async function init() {
    const billingKey = await fs.readFile("pki/billing.key");
    https.createServer({
        cert: await fs.readFile("pki/server.pem"),
        key: await fs.readFile("pki/server.key"),
    }, async (req, res) => {
        if(req.method !== "POST" || req.url !== "/request/") {
            return res.writeHead(404).end();
        }
        const body = await collect(req.pipe(zlib.createInflate()), "ascii");
        const keychipid = new URLSearchParams(body).get("keychipid");
        const resp = new URLSearchParams({
            result: "0",
            waittime: "100",
            linelimit: "1",
            message: "",
            playlimit: playlimit.toString(),
            playlimitsig: signVal(playlimit, keychipid, billingKey),
            protocolver: "1.000",
            nearfull: nearfull.toString(),
            nearfullsig: signVal(nearfull, keychipid, billingKey),
            fixlogcnt: "0",
            fixinterval: "5",
            playhistory: "000000/0:000000/0:000000/0",
        });
        res.writeHead(200, { "content-type": "text/plain" }).end(resp.toString());
    }).listen(8443, () => {
        console.log("[billing] listening on 8443");
    });
}