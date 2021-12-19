const util = require("util")
const { nanoid } = require("nanoid");

module.exports = function (db) {
    db.updateAsync = util.promisify(db.update.bind(db));
    db.findAsync = util.promisify(db.find.bind(db));
    db.findOneAsync = util.promisify(db.findOne.bind(db));
    db.ensureIndexAsync = util.promisify(db.ensureIndex.bind(db));

    db.queryOne = async function(schema, userId) {
        const _id = `${schema}-${userId}`;
        const doc = await db.findOneAsync({ _id });
        return { userId, [schema]: doc || {} };
    }

    db.queryItems = async function(schema, userId, filter = {}) {
        const docs = await db.findOneAsync({ schema, userId, [schema]: filter });
        return { userId, [schema + "List"]: docs, length: String(docs.length) };
    }

    db.queryItemsPagination = async function(schema, body, filter = {}) {
        const { userId, nextIndex, maxCount } = body;
        const [off, lim] = [parseInt(nextIndex), parseInt(maxCount)];
        const query = { schema, userId, [schema]: filter };
        const cursor = db.find(query).sort({ ts: -1 }).skip(off).limit(lim);
        const docs = await util.promisify(cursor.exec.bind(cursor))();
        return {
            userId,
            [schema + "List"]: docs,
            length: String(docs.length),
            nextIndex: (docs.length < lim) ? "-1" : String(off + lim),
        };
    }

    db.upsertOne = async function(schema, userId, payload) {
        for (let doc of payload[schema] || []) {
            const _id = `${schema}-${userId}`;
            await db.updateAsync(
                { _id },
                { _id, userId, schema, [schema]: doc },
                { upsert: true }
            );
        }
    }

    db.upsertItems = async function(schema, userId, payload, idField) {
        const ts = Date.now();
        for (let doc of payload[schema + "List"] || []) {
            const _id = `${schema}-${userId}-${doc[idField] || nanoid()}`;
            await db.updateAsync(
                { _id },
                { _id, ts, userId, schema, [schema]: doc },
                { upsert: true }
            );
        }
    }
}