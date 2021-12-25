const net = require("net");
const util = require("util");
const { promises: stream, Transform } = require("stream");
const crypto = require("crypto");
const Datastore = require('nestdb');

const db = require('./dbHelper')(
    Datastore({ filename: "minime_data_aime.db" })
);

class Deframe extends Transform {
    buf = Buffer.alloc(0);
    _transform(chunk, _enc, cb) {
        this.buf = Buffer.concat([this.buf, chunk]);
        while (1) {
            const magic = this.buf.indexOf("3ea1", 0, "hex");
            if (magic === -1) return;
            if (this.buf.length < magic + 8) return;
            const len = this.buf.readUInt16LE(magic + 6);
            if (this.buf.length < magic + len) return;
            const frame = this.buf.slice(magic, magic + len)
            this.buf = this.buf.slice(magic + len);
            cb(null, frame);
        }
    }
}

/**
 * @param {number} len 
 * @param {number} cmd 
 * @param {(b: Buffer) => void} doto 
 * @returns {Buffer}
 */
function resp(len, cmd, doto = (b) => {}) {
    if(len < 10) throw Error("aime response len < 10");
    const buf = Buffer.alloc(len);
    buf.writeUInt16LE(0xa13e, 0); // Magic: aime
    buf.writeUInt16LE(0x3087, 2); // ???
    buf.writeUInt16LE(cmd, 4);
    buf.writeUInt16LE(len, 6);
    buf.writeUInt16LE(1, 8); // Status
    doto(buf);
    return buf;
}

/**
 * @param {Buffer} msg 
 */
async function handler(msg) {
    const cmd = msg.readUInt16LE(4);
    if (cmd === 0x01) { // FeliCa Lookup
        const idm = msg.readBigInt64BE(0x0020);
        console.log("[aime] FeliCaLookup", { idm });
        return resp(0x30, 0x03, (buf) => {
            // Return a decimal representation for now.
            const accessCode = idm.toString().padStart(20, "0");
            buf.write(accessCode, 0x24, "hex");
        });
    }
    else if (cmd === 0x11) { // FeliCa Lookup 2
        const idm = msg.readBigInt64BE(0x0020);
        console.log("[aime] FeliCaLookup2", { idm });
        // Return a decimal representation for now.
        const accessCode = idm.toString().padStart(20, "0");
        const result = await db.findOneAsync({ _id: accessCode });
        return resp(0x140, 0x12, (buf) => {
            buf.writeInt32LE(result?.aimeId || -1, 0x20);
            buf.writeUInt32LE(0xffffffff, 0x24); // FF
            buf.writeUInt32LE(0xffffffff, 0x28); // FF
            buf.write(accessCode, 0x2c, "hex");
            buf.writeUInt16LE(0x0001, 0x37); // 0001
        });
    }
    else if (cmd === 0x04) { // Lookup
        const luid = msg.slice(0x0020, 0x002a).toString("hex");
        console.log("[aime] Lookup", { luid });
        const result = await db.findOneAsync({ _id: luid });
        return resp(0x130, 0x06, (buf) => {
            buf.writeInt32LE(result?.aimeId || -1, 0x20);
            buf.writeUInt8(0, 0x24); // registerLevel = none
        });
    }
    else if (cmd === 0x0f) { // Lookup 2
        const luid = msg.slice(0x0020, 0x002a).toString("hex");
        console.log("[aime] Lookup2", { luid });
        const result = await db.findOneAsync({ _id: luid });
        return resp(0x130, 0x10, (buf) => {
            buf.writeInt32LE(result?.aimeId || -1, 0x20);
            buf.writeUInt8(0, 0x24); // registerLevel = none
        });
    }
    else if (cmd === 0x05 || cmd === 0x0d) { // Register
        const luid = msg.slice(0x0020, 0x002a).toString("hex");
        console.log("[aime] Register", { luid });
        const existing = await db.findOneAsync({ _id: luid });
        if(existing) {
            return resp(0x30, 0x06, (buf) => {
                buf.writeInt32LE(existing.aimeId, 0x20);
            });
        } else {
            const aimeId = crypto.randomBytes(4).readInt32LE();
            await db.insertAsync({ _id: luid, aimeId });
            return resp(0x30, 0x06, (buf) => {
                buf.writeInt32LE(aimeId, 0x20);
            });
        }
    }
    else if (cmd === 0x09) { // Log
        console.log("[aime] Log");
        return resp(0x20, 0x0a);
    }
    else if (cmd === 0x0b) { // Campaign
        console.log("[aime] Campaign");
        return resp(0x200, 0x0c);
    }
    else if (cmd === 0x64) { // Hello
        console.log("[aime] Hello");
        return resp(0x20, 0x65);
    }
    else if (cmd === 0x66) { // Goodbye
        // No response
    }
    else {
        console.warn(`[aime] Unknown command ${cmd.toString(16)}`);
    }
}

async function init() {
    await db.loadAsync();
    await db.ensureIndexAsync({ fieldName: "aimeId", unique: true });
    db.persistence.setAutocompactionInterval(10 * 60000);
    
    const aesKey = Buffer.from("436f7079726967687428432953454741", "hex");
    const srv = net.createServer((socket) => {
        stream.pipeline(
            socket,
            crypto.createDecipheriv("aes-128-ecb", aesKey, null).setAutoPadding(false),
            new Deframe(),
            new Transform({
                transform(frame, _enc, cb) { // custom callbackify
                    handler(frame).then(resp => {
                        if(Buffer.isBuffer(resp)) cb(null, resp);
                    }).catch(err => {
                        console.warn(`[aime] handler error`, err);
                    });
                }
            }),
            crypto.createCipheriv("aes-128-ecb", aesKey, null).setAutoPadding(false),
            socket,
        ).catch(err => {
            console.warn(`[aime] pipeline error`, err);
        });
    });
    await util.promisify(srv.listen.bind(srv))(22345);
    console.log("[aime] listening on 22345");
}

module.exports = { init };