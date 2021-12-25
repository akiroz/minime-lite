const http = require("http");
const path = require("path");
const util = require("util");
const zlib = require("zlib");
const { promises: fs } = require("fs");
const collect = require('stream-collect');
const Datastore = require('nestdb');
const { DateTime } = require("luxon");

const db = require('./dbHelper')(
    Datastore({ filename: "minime_data_chunithm.db" })
);

/**
 * @param {http.IncomingMessage} req 
 */
async function handler(ctx, req, body) {
    if (req.url.includes("GameLoginApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("GameLogoutApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("GetGameChargeApi")) {
        return {
            length: String(ctx.gameCharge.length),
            gameChargeList: ctx.gameCharge.map(({ chargeId, orderId }) => ({
                chargeId,
                orderId,
                price: "1",
                salePrice: "1",
                startDate: "2017-12-05 07:00:00.0",
                endDate: "2029-12-31 23:59:59.0",
                saleStartDate: "2017-12-05 07:00:00.0",
                saleEndDate: "2030-12-31 23:59:59.0"
            })),
        };
    }
    else if (req.url.includes("GetGameEventApi")) {
        const { type } = body;
        return {
            type,
            length: String(ctx.gameEvent.length),
            gameEventList: ctx.gameEvent.map(({ id }) => ({
                id,
                type,
                startDate: "2017-12-05 07:00:00.0",
                endDate: "2099-12-31 00:00:00.0",
            })),
        };
    }
    else if (req.url.includes("GetGameIdlistApi")) {
        return { type: body.type, length: "0", gameIdlistList: [] };
    }
    else if (req.url.includes("GetGameMessageApi")) {
        return { type: body.type, length: "0", gameMessageList: [] };
    }
    else if (req.url.includes("GetGameRankingApi")) {
        return { type: body.type, gameRankingList: [] };
    }
    else if (req.url.includes("GetGameSaleApi")) {
        return { type: body.type, length: "0", gameSaleList: [] };
    }
    else if (req.url.includes("GetGameSettingApi")) {
        const rebootStartTime = DateTime.now().minus({ hours: 3 });
        const rebootEndTime = DateTime.now().minus({ hours: 2 });
        return {
            gameSetting: {
                dataVersion: "1",
                isMaintenance: "false",
                requestInterval: "10",
                rebootStartTime: rebootStartTime.toFormat("yyyy-LL-dd HH:mm:ss"),
                rebootEndTime: rebootEndTime.toFormat("yyyy-LL-dd HH:mm:ss"),
                isBackgroundDistribute: "false",
                maxCountCharacter: "300",
                maxCountItem: "300",
                maxCountMusic: "300",
            },
            isDumpUpload: "false",
            isAou: "true",
        };
    }
    else if (req.url.includes("GetUserActivityApi")) {
        const { userId, kind } = body;
        return {
            kind,
            ...( await db.queryItems("userActivity", userId, { filter: { kind } }) )
        };
    }
    else if (req.url.includes("GetUserCharacterApi")) {
        return await db.queryItemsPagination("userCharacter", body);
    }
    else if (req.url.includes("GetUserChargeApi")) {
        return await db.queryItems("userCharge", body.userId);
    }
    else if (req.url.includes("GetUserCourseAPi")) {
        return await db.queryItemsPagination("userCourse", body.userId);
    }
    else if (req.url.includes("GetUserDataApi")) {
        return await db.queryOne("userData", body.userId);
    }
    else if (req.url.includes("GetUserDataExApi")) {
        return await db.queryOne("userDataEx", body.userId);
    }
    else if (req.url.includes("GetUserDuelApi")) {
        const { userId, isAllDuel, duelId } = body;
        return await db.queryItems("userDuel", userId, {
            filter: isAllDuel ? {} : { duelId }
        });
    }
    else if (req.url.includes("GetUserFavoriteMusicApi")) {
        return { userId: body.userId, length: "0", userFavoriteMusicList: [] };
    }
    else if (req.url.includes("GetUserItemApi")) {
        const { userId } = body;
        const limit = parseInt(body.maxCount);
        const offset = parseInt(body.nextIndex.slice(-10));
        const itemKind = parseInt(body.nextIndex.slice(0, -10)).toString();
        const query = { schema: "userItem", userId, "userItem.itemKind": itemKind };
        const cursor = db.find(query).sort({ ts: -1 }).skip(offset).limit(limit);
        const docs = await util.promisify(cursor.exec.bind(cursor))();
        const packedIndex = itemKind + String(offset + limit).padStart(10, "0");
        const nextIndex = (docs.length < limit) ? "-1" : packedIndex;
        return {
            userId, nextIndex, itemKind,
            userItemList: docs.map(d => d.userItem),
            length: String(docs.length)
        };
    }
    else if (req.url.includes("GetUserLoginBonusApi")) {
        return { userId: body.userId, length: "0", userLoginBonus: [] };
    }
    else if (req.url.includes("GetUserMapApi")) {
        return await db.queryItems("userMap", body.userId);
    }
    else if (req.url.includes("GetUserMusicApi")) {
        const {
            userMusicDetailList: flat,
            nextIndex,
        } = await db.queryItemsPagination("userMusicDetail", body);
        const group = {};
        let userMusicList = [];
        for (const m of flat) {
            if(group[m.musicId]) {
                group[m.musicId].push(m);
            } else {
                group[m.musicId] = [m];
                userMusicList.push(group[m.musicId]);
            }
        }
        return {
            userId: body.userId,
            nextIndex,
            userMusicList: userMusicList.map((group) => {
                return { userMusicDetailList: group, length: String(group.length) }
            }),
            length: String(userMusicList.length),
        };
    }
    else if (req.url.includes("GetUserOptionApi")) {
        return await db.queryOne("userGameOption", body.userId);
    }
    else if (req.url.includes("GetUserOptionExApi")) {
        return await db.queryOne("userGameOptionEx", body.userId);
    }
    else if (req.url.includes("GetUserPreviewApi")) {
        const { userId } = body;
        const { userData } = await db.queryOne("userData", userId);
        if(!userData.userName) return {};
        const { userGameOption } = await db.queryOne("userGameOption", userId);
        const characterDoc = await db.findOneAsync({
            userId,
            schema: "userCharacter",
            "userCharacter.characterId": userData.characterId
        });
        return {
            userId: "1",
            isLogin: "false",
            lastLoginDate: "1970-01-01 09:00:00",
            userName: userData.userName,
            reincarnationNum: userData.reincarnationNum,
            level: userData.level,
            exp: userData.exp,
            playerRating: userData.playerRating,
            lastGameId: userData.lastGameId,
            lastRomVersion: userData.lastRomVersion,
            lastDataVersion: userData.lastDataVersion,
            lastPlayDate: userData.lastPlayDate,
            trophyId: userData.trophyId,
            userCharacter: characterDoc?.userCharacter || {},
            playerLevel: userGameOption.playerLevel,
            rating: userGameOption.rating,
            headphone: userGameOption.headphone,
        };
    }
    else if (req.url.includes("GetUserRecentPlayerApi") || req.url.includes("GetUserRecentRatingApi")) {
        const { userId } = body;
        const { userRecentRating: l } = await db.queryOne("userRecentRating", userId, { default: [] });
        return { userId, userRecentRatingList: l, length: String(l.length) };
    }
    else if (req.url.includes("GetUserRegionApi")) {
        return { userId: body.userId, length: "0", userRegionList: [] };
    }
    else if (req.url.includes("UpsertClientBookkeepingApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertClientDevelopApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertClientErrorApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertClientSettingApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertClientTestmodeApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertUserAllApi")) {
        const { userId, upsertUserAll: payload } = body;
        payload.userData = payload.userData.map(({ userName, ...data }) => {
            // Fix double-UTF8 encoded username
            return { ...data, userName: Buffer.from(userName, "latin1").toString("utf8") };
        });
        await db.upsertItems("userActivity", userId, payload, "id");
        await db.upsertItems("userCharacter", userId, payload, "characterId");
        await db.upsertItems("userCharge", userId, payload, "chargeId");
        await db.upsertItems("userCourse", userId, payload, "courseId");
        await db.upsertOne("userData", userId, payload);
        await db.upsertOne("userDataEx", userId, payload);
        await db.upsertItems("userDuel", userId, payload, "duelId");
        await db.upsertOne("userGameOption", userId, payload);
        await db.upsertOne("userGameOptionEx", userId, payload);
        await db.upsertItems("userItem", userId, payload, "itemId");
        await db.upsertItems("userMap", userId, payload, "mapId");
        await db.upsertItems("userMusicDetail", userId, payload, "musicId");
        await db.upsertItems("userPlaylog", userId, payload);
        await db.upsertOne("userRecentRating", userId, {
            userRecentRating: [payload?.userRecentRatingList || []]
        });
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertUserChargelogApi")) {
        const { userId, userCharge } = body;
        await db.upsertItems("userCharge", userId, { userChargeList: [userCharge] }, "chargeId");
        return { returnCode: "1" };
    }
    else {
        console.warn(`[chunithm] Unknown API ${req.url}`);
    }
}

async function init() {
    await db.loadAsync();
    await db.ensureIndexAsync({ fieldName: "userId" });
    await db.ensureIndexAsync({ fieldName: "schema" });
    db.persistence.setAutocompactionInterval(10 * 60000);

    const debug = ["*", "chunithm"].includes(process.env.DEBUG);
    if(debug) console.log("[chunithm] DEBUG");

    const ctx = JSON.parse(await fs.readFile(path.join(__dirname, '../asset/chunithmData.json')));
    
    const srv = http.createServer(async (req, res) => {
        console.log("[chunithm]", req.method, req.url);
        try {
            const body = JSON.parse(await collect(req.pipe(zlib.createInflate()), "utf8"));
            const resp = await handler(ctx, req, body);
            if(debug && (req.url.includes("GetUser") || req.url.includes("UpsertUser"))) {
                console.log("[chunithm] req", body);
                console.log("[chunithm] resp", resp);
            }
            const payload = zlib.deflateSync(JSON.stringify(resp || {}));
            res.writeHead(200, { "Content-Length": payload.length }).end(payload);
        } catch (err) {
            console.warn("[chunithm] request error", err);
            res.writeHead(500).end();
        }
    });
    await util.promisify(srv.listen.bind(srv))(9001);
    console.log("[chunithm] listening on 9001");
}

module.exports = { init };