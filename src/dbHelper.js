const util = require("util");
const crypto = require("crypto");
const Datastore = require("nestdb");

function randomId(n) {
    return crypto.randomBytes(n).toString("base64");
}

/**
 * @param {Datastore} db
 * @returns {{
 *  loadAsync(): Promise<void>,
 *  ensureIndexAsync(opt: Datastore.EnsureIndexOptions): Promise<void>
 *  insertAsync<T>(doc: T): Promise<T>,
 *  updateAsync<T>(q: any, u: any, opt: Datastore.UpdateOptions): Promise<number>,
 *  findAsync(q: any): Promise<any[]>,
 *  findOneAsync(q: any): Promise<any>,
 *  queryOne(schema: string, userId: string, opts?: { default?: any }): Promise<{
 *      userId: string, [schema: string]: any
 *  }>,
 *  queryItems(schema: string, userId: string, opts?: { filter?: any, limit?: number }): Promise<{
 *      userId: string, length: number, [schemaList: string]: any
 *  }>,
 *  queryItemsPagination(schema: string, body: {
 *      userId: string, nextIndex: string, maxCount: string
 * }, opts?: { filter?: any }): Promise<{
 *      userId: string, length: number, nextIndex: number, [schemaList: string]: any
 *  }>,
 *  upsertOne(schema: string, userId: string, payload: { [schema: string]: any[] }): Promise<void>,
 *  upsertItems(schema: string, userId: string, payload: { [schemaList: string]: any[] }, isField: string): Promise<void>,
 * }}
 */
module.exports = function (db, { stringMode = false } = {}) {
    db.loadAsync = util.promisify(db.load.bind(db));
    db.ensureIndexAsync = util.promisify(db.ensureIndex.bind(db));
    db.insertAsync = util.promisify(db.insert.bind(db));
    db.updateAsync = util.promisify(db.update.bind(db));
    db.findAsync = util.promisify(db.find.bind(db));
    db.findOneAsync = util.promisify(db.findOne.bind(db));

    db.queryOne = async function(schema, userId, opts = {}) {
        const _id = `${schema}-${userId}`;
        const doc = await db.findOneAsync({ _id });
        return { userId, [schema]: doc?.[schema] || opts["default"] || {} };
    }

    db.queryItems = async function(schema, userId, opts = {}) {
        const filter = {};
        Object.entries(opts.filter || {}).forEach(([k, v]) => {
            filter[`${schema}.${k}`] = v;
        });
        const query = { schema, userId, ...filter };
        const cursor = db.find(query).sort(opts.sort || { ts: -1 }).limit(opts.limit || Infinity);
        const docs = await util.promisify(cursor.exec.bind(cursor))();
        return {
            userId,
            [schema + "List"]: docs.map(d => d[schema]),
            length: stringMode ? String(docs.length) : docs.length,
        };
    }

    db.queryItemsPagination = async function(schema, body, opts = {}) {
        const { userId, nextIndex, maxCount } = body;
        const [off, lim] = stringMode ? [parseInt(nextIndex), parseInt(maxCount)] : [nextIndex, maxCount];
        const filter = {};
        Object.entries(opts.filter || {}).forEach(([k, v]) => {
            filter[`${schema}.${k}`] = v;
        });
        const query = { schema, userId, ...filter };
        const cursor = db.find(query).sort({ ts: -1 }).skip(off).limit(lim);
        const docs = await util.promisify(cursor.exec.bind(cursor))();
        const newNextIndex = (docs.length < lim) ? -1 : (off + lim);
        return {
            userId,
            [schema + "List"]: docs.map(d => d[schema]),
            length: stringMode ? String(docs.length) : docs.length,
            nextIndex: stringMode ? String(newNextIndex) : newNextIndex,
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
        for (let doc of payload[schema + "List"] || []) {
            const ts = Date.now();
            let id = (idField instanceof Function)? idField(doc) : (doc[idField] || randomId(12));
            const _id = `${schema}-${userId}-${id}`;
            await db.updateAsync(
                { _id },
                { _id, ts, userId, schema, [schema]: doc },
                { upsert: true }
            );
        }
    }

    return db;
}