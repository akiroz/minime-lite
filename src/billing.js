const https = require("https");
const crypto = require("crypto");
const zlib = require("zlib");
const util = require("util");
const path = require("path");
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

async function init() {
    
    const billingKey = await fs.readFile(path.join(__dirname, '../pki/billing.key'));
    const srv = https.createServer({
        cert: await fs.readFile(path.join(__dirname, '../pki/server.pem')),
        key: await fs.readFile(path.join(__dirname, '../pki/server.key')),
    }, async (req, res) => {
        console.log("[billing]", req.method, req.url);
        if(req.method !== "POST" || req.url !== "/request/") {
            return res.writeHead(404).end();
        }
        const rawBody = await collect(req.pipe(zlib.createInflateRaw()), "ascii");
        const body = new URLSearchParams(rawBody.split("\r\n")[0].trim())
        const keychipid = body.get("keychipid");
        const resp = {
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
        };
        const payload = Object.entries(resp).map(([k,v]) => `${k}=${v}`).join("&") + "\r\n";
        res.writeHead(200, { "Content-Length": payload.length }).end(payload);
    });
    await util.promisify(srv.listen.bind(srv))(8443);
    console.log("[billing] listening on 8443");
}

module.exports = { init };