const http = require("http");
const zlib = require("zlib");
const util = require("util");
const collect = require('stream-collect');
const { URLSearchParams } = require("url");

async function init(handlerList = []) {
    const srv = http.createServer(async (req, res) => {
        let handled = false;
        for(let h of handlerList) {
            if(handled = await h(req, res)) break;
        }
        if(!handled) {
            console.log("[allnet]", req.method, req.url);
            if(req.url !== "/sys/servlet/PowerOn") {
                return res.writeHead(404).end();
            }
            const rawBody = Buffer.from(await collect(req, "ascii"), "base64");
            const body = new URLSearchParams(zlib.unzipSync(rawBody).toString("ascii").trim());
            const serverAddr = req.socket.localAddress.replace("::ffff:", "");
            const resp = {
                stat: 1,
                uri: `http://${serverAddr}:${req.socket.localPort}/`,
                host: serverAddr,
                place_id: "123",
                name: "",
                nickname: "",
                region0: "1",
                region_name0: "W",
                region_name1: "X",
                region_name2: "Y",
                region_name3: "Z",
                country: "JPN",
                allnet_id: "456",
                client_timezone: "+0900",
                utc_time: new Date().toISOString().substring(0, 19) + "Z", // Chop-off milliseconds
                setting: "",
                res_ver: "3",
                token: body.get("token"),
            };
            const payload = Object.entries(resp).map(([k,v]) => `${k}=${v}`).join("&") + "\n";
            res.writeHead(200, { "Content-Length": payload.length }).end(payload);
        }
    });
    
    await util.promisify(srv.listen.bind(srv))(80);
    console.log("[allnet] listening on 80");
}

module.exports = { init };