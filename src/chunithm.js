const http = require("http");
const util = require("util");
const zlib = require("zlib");
const collect = require('stream-collect');
const Datastore = require('nestdb');
const { DateTime } = require("luxon");
const { CHARGE_IDS, EVENT_IDS } = require("./chunithmData");
const registerDbHelpers = require("./dbHelper");

const db = Datastore({ filename: "data_chunithm.db" });
registerDbHelpers(db);

/**
 * @param {http.IncomingMessage} req 
 */
async function handler(req, body) {
    if (req.url.includes("GameLoginApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("GameLogoutApi")) {
        return { returnCode: "1" };
    }
    else if (req.url.includes("GetGameChargeApi")) {
        return {
            length: CHARGE_IDS.length.toString(),
            gameChargeList: CHARGE_IDS.map(({ id, price, salePrice }, i) => ({
                chargeId: id.toString(),
                orderId: (i + 1).toString(),
                price: price.toString(),
                salePrice: salePrice.toString(),
                startDate: "2017-12-05 07:00:00.0",
                endDate: "2029-12-31 23:59:59.0",
                saleStartDate: "2017-12-05 07:00:00.0",
                saleEndDate: "2030-12-31 23:59:59.0"
            })),
        };
    }
    else if (req.url.includes("GetGameEventApi")) {
        return {
            type: body.type,
            length: EVENT_IDS.length.toString(),
            gameEventList: EVENT_IDS.map(id => ({
                type: body.type,
                id: id.toString(),
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
                maxCountMusic: "100",
            },
            isDumpUpload: "false",
            isAou: "true",
        };
    }
    else if (req.url.includes("GetUserActivityApi")) {
        const { userId, kind } = body;
        return { kind, ...(await db.queryItems("userActivity", userId, { kind })) };
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
        return await db.queryItems("userDuel", userId, isAllDuel ? {} : { duelId });
    }
    else if (req.url.includes("GetUserFavoriteMusicApi")) {
        return { userId: body.userId, length: "0", userFavoriteMusicList: [] };
    }
    else if (req.url.includes("GetUserItemApi")) {
        const { userId } = body;
        const limit = parseInt(body.maxCount);
        const offset = parseInt(body.nextIndex.slice(-10));
        const itemKind = parseInt(body.nextIndex.slice(0, -10)).toString();
        const query = { schema: "userItem", userId, userItem: { itemKind } };
        const cursor = db.find(query).sort({ ts: -1 }).skip(offset).limit(limit);
        const docs = await util.promisify(cursor.exec.bind(cursor))();
        const packedIndex = itemKind + String(offset + limit).padStart(10, "0");
        const nextIndex = (docs.length < limit) ? "-1" : packedIndex;
        return { userId, nextIndex, itemKind, userItemList: docs, length: String(docs.length) };
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
        for (const m of flat) {
            if(group[m.musicId]) group[m.musicId].push(m);
            else group[m.musicId] = [m];
        }
        const userMusicList = Object.values(group).map(g => ({
            userMusicDetailList: g,
            length: String(g.length),
        }));
        return {
            userId: body.userId,
            nextIndex,
            userMusicList,
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
        const userCharacter = await db.findOneAsync({
            userId, schema: "userCharacter",
            userCharacter: { characterId: userData.characterId }
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
            userCharacter,
            playerLevel: userGameOption.playerLevel,
            rating: userGameOption.rating,
            headphone: userGameOption.headphone,
        };
    }
    else if (req.url.includes("GetUserRecentPlayerApi")) {
        return await db.queryItems("userRecentRating", body.userId);
    }
    else if (req.url.includes("GetUserRecentRatingApi")) {
        return await db.queryItems("userRecentRating", body.userId);
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
        await db.upsertItems("userRecentRating", userId, payload);        
        return { returnCode: "1" };
    }
    else if (req.url.includes("UpsertUserChargelogApi")) {
        return { returnCode: "1" };
    }
    else {
        console.warn(`[chunithm] Unknown API ${req.url}`);
    }
}

async function init() {
    await util.promisify(db.load.bind(db))();
    await db.ensureIndexAsync({ fieldName: "userId" });
    await db.ensureIndexAsync({ fieldName: "schema" });
    db.persistence.setAutocompactionInterval(60000);

    const srv = http.createServer(async (req, res) => {
        console.log("[chunithm]", req.method, req.url);
        try {
            const body = JSON.parse(await collect(req.pipe(zlib.createInflate()), "utf8"));
            //console.log("[chunithm] req", body);
            const resp = await handler(req, body);
            // if(!req.url.includes("GameEvent")) {
            //     console.log("[chunithm] resp", resp);
            // }
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