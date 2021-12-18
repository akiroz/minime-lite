const http = require("http");
const zlib = require("zlib");
const iconv = require("iconv-lite");
const collect = require('stream-collect');
const { URLSearchParams } = require("url");

export async function init() {
    http.createServer(async (req, res) => {
        if(req.url !== "/sys/servlet/PowerOn" || req.method !== "POST") {
            return res.writeHead(404).end();
        }
        const rawBody = Buffer.from(await collect(req, "ascii"), "base64");
        const body = new URLSearchParams(zlib.unzipSync(rawBody));
        const gameId = body.get("game_id");
        const resp = new URLSearchParams({
            stat: 1,
            uri: ({
                SBZV: "http://127.0.0.1:9000/",
                SDBT: "http://127.0.0.1:9001/",
            }[gameId] || ""),
            host: "",
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
            utc_time: new Date().toISOString().substr(0, 19) + "Z",
            setting: "",
            res_ver: "3",
            token: body.get("token"),
        });
        const jisResp = iconv.encode(resp.toString(), "shift_jis");
        res.writeHead(200, { "content-type": "text/plain" }).end(jisResp);
    }).listen(80, () => {
        console.log("[allnet] listening on 80");
    });
}