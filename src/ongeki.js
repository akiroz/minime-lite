const http = require("http");
const path = require("path");
const util = require("util");
const zlib = require("zlib");
const { promises: fs } = require("fs");
const collect = require('stream-collect');
const Datastore = require('nestdb');
const { DateTime } = require("luxon");

const db = require('./dbHelper')(
    Datastore({ filename: "minime_data_ongeki.db" })
);

/**
 * @param {http.IncomingMessage} req 
 */
 async function apiHandler(ctx, req, body) {
    if (req.url.includes("ExtendLockTimeApi")) {
        return { returnCode: 1, apiName: "extendLockTime" };
    }
    else if (req.url.includes("GameLoginApi")) {
        return { returnCode: 1, apiName: "gameLogin" };
    }
    else if (req.url.includes("GameLogoutApi")) {
        return { returnCode: 1, apiName: "gameLogout" };
    }
    else if (req.url.includes("GetGameEventApi")) {
        const { type } = body;
        return {
            type,
            length: ctx.gameEvent.length,
            gameEventList: ctx.gameEvent.map(({ id }) => ({
                id,
                type,
                startDate: "2005-01-01 00:00:00.0",
                endDate: "2099-01-01 05:00:00.0",
            })),
        };
    }
    else if (req.url.includes("GetGameIdlistApi")) {
        return { type: body.type, length: 0, gameIdlistList: [] };
    }
    else if (req.url.includes("GetGameMessageApi")) {
        return { type: body.type, length: 0, gameMessageList: [] };
    }
    else if (req.url.includes("GetGamePointApi")) {
        return {
            length: String(ctx.gamePoint.length),
            gamePointList: ctx.gamePoint.map(({ type, cost }) => ({
                type,
                cost,
                startDate: "2000-01-01 05:00:00.0",
                endDate: "2099-01-01 05:00:00.0",
            })),
        };
    }
    else if (req.url.includes("GetGamePresentApi")) {
        return { length: 0, gamePresentList: [] };
    }
    else if (req.url.includes("GetGameRankingApi")) {
        return { type: body.type, gameRankingList: [] };
    }
    else if (req.url.includes("GetGameRewardApi")) {
        return { length: 0, gameRewardList: [] };
    }
    else if (req.url.includes("GetGameSettingApi")) {
        const rebootStartTime = DateTime.now().minus({ hours: 3 });
        const rebootEndTime = DateTime.now().minus({ hours: 2 });
        return {
            gameSetting: {
                dataVersion: "1.05.00",
                isMaintenance: false,
                requestInterval: 10,
                rebootStartTime: rebootStartTime.toFormat("yyyy-LL-dd HH:mm:ss"),
                rebootEndTime: rebootEndTime.toFormat("yyyy-LL-dd HH:mm:ss"),
                isBackgroundDistribute: false,
                maxCountCharacter: 50,
                maxCountCard: 300,
                maxCountItem: 300,
                maxCountMusic: 50,
                maxCountMusicItem: 300,
                macCountRivalMusic: 300,
            },
            isDumpUpload: false,
            isAou: true,
        };
    }
    else if (req.url.includes("GetGameTechMusicApi")) {
        return { length: 0, gameTechMusicList: [] };
    }
    else if (req.url.includes("GetUserActivityApi")) {
        const { userId, kind } = body;
        return {
            kind,
            ...( await db.queryItems("userActivity", userId, {
                filter: { kind },
                limit: { 1: 15, 2: 10 }[kind],
            })),
        };
    }
    else if (req.url.includes("GetUserBossApi")) {
        return await db.queryItems("userBoss", body.userId);
    }
    else if (req.url.includes("GetUserBpBaseApi")) {
        return await db.queryItems("userBpBase", body.userId);
    }
    else if (req.url.includes("GetUserCardApi")) {
        return await db.queryItemsPagination("userCard", body.userId);
    }
    else if (req.url.includes("GetUserChapterApi")) {
        return await db.queryItems("userChapter", body.userId);
    }
    else if (req.url.includes("GetUserCharacterApi")) {
        return await db.queryItemsPagination("userCharacter", body.userId);
    }
    else if (req.url.includes("GetUserDataApi")) {
        return await db.queryOne("userData", body.userId);
    }
    else if (req.url.includes("GetUserDeckByKeyApi")) {
        return await db.queryItems("userDeck", body.userId);
    }
    else if (req.url.includes("GetUserEventMusicApi")) {
        return { userId: body.userId, length: 0, userEventMusicList: [] };
    }
    else if (req.url.includes("GetUserEventPointApi")) {
        return { userId: body.userId, length: 0, userEventPointList: [] };
    }
    else if (req.url.includes("GetUserEventRankingApi")) {
        return { userId: body.userId, length: 0, userEventRankingList: [] };
    }
    else if (req.url.includes("GetUserItemApi")) {
        // TODO
    }
    else if (req.url.includes("GetUserKopApi")) {
    }
    else if (req.url.includes("GetUserLoginBonusApi")) {
    }
    else if (req.url.includes("GetUserMissionPointApi")) {
    }
    else if (req.url.includes("GetUserMusicApi")) {
    }
    else if (req.url.includes("GetUserMusicItemApi")) {
    }
    else if (req.url.includes("GetUserOptionApi")) {
    }
    else if (req.url.includes("GetUserPreviewApi")) {
        return {
            userId: 0,
            isLogin: false,
            lastLoginDate: null,
            userName: "",
            reincarnationNum: 0,
            level: 0,
            exp: 0,
            playerRating: 0,
            lastGameId: "",
            lastRomVersion: "",
            lastDataVersion: "",
            lastPlayDate: null,
            nameplateId: 0,
            trophyId: 0,
            cardId: 0,
            dispPlayerLv: 0,
            dispRating: 0,
            dispBP: 0,
            headphone: 0,
            banStatus: 0,
            isWarningConfirmed: true,
            lastEmoneyBrand: 0,
            lastEmoneyCredit: 0,
        };
    }
    else if (req.url.includes("GetUserRatinglogApi")) {
        return { userId: body.userId, length: "0", userRatinglogList: [] };
    }
    else if (req.url.includes("GetUserRecentRatingApi")) {
    }
    else if (req.url.includes("GetUserRegionApi")) {
    }
    else if (req.url.includes("GetUserRivalApi") || req.url.includes("GetUserRivalDataApi")) {
    }
    else if (req.url.includes("GetUserRivalMusicApi")) {
    }
    else if (req.url.includes("GetUserScenarioApi")) {
    }
    else if (req.url.includes("GetUserStoryApi")) {
    }
    else if (req.url.includes("GetUserTechCountApi")) {
        return { userId: body.userId, length: 0, userTechCountList: [] };
    }
    else if (req.url.includes("GetUserTechEventApi")) {
        return { userId: body.userId, length: 0, userTechEventList: [] };
    }
    else if (req.url.includes("GetUserTechEventRankingApi")) {
        return { userId: body.userId, length: 0, userTechEventRankingList: [] };
    }
    else if (req.url.includes("GetUserTradeItemApi")) {
    }
    else if (req.url.includes("GetUserTrainingRoomByKeyApi")) {
    }
    else if (req.url.includes("UpsertClientBookkeepingApi")) {
        return { returnCode: 1, apiName: "upsertClientBookkeeping" };
    }
    else if (req.url.includes("UpsertClientDevelopApi")) {
        return { returnCode: 1, apiName: "upsertClientDevelop" };
    }
    else if (req.url.includes("UpsertClientErrorApi")) {
        return { returnCode: 1, apiName: "upsertClientError" };
    }
    else if (req.url.includes("UpsertClientSettingApi")) {
        return { returnCode: 1, apiName: "upsertClientSetting" };
    }
    else if (req.url.includes("UpsertClientTestmodeApi")) {
        return { returnCode: 1, apiName: "upsertClientTestmode" };
    }
    else if (req.url.includes("UpsertUserGplogApi")) {
        return { returnCode: 1, apiName: "upsertUserGplog" };
    }
    else if (req.url.includes("UpsertUserAllApi")) {
        const { userId, upsertUserAll: payload } = body;
        console.log("[ongeki] upsertUserAll", payload);
        await db.upsertItems("userActivity", userId, {
            userActivityList: (payload.userActivityList || []).filter(a => a.id !== 0 && a.kind !== 0)
        }, "id");
        await db.upsertItems("userBoss", userId, payload, "musicId");
        await db.upsertItems("userBpBase", userId, payload, "musicId");
        await db.upsertItems("userCard", userId, payload, "cardId");
        await db.upsertItems("userChapter", userId, payload, "chapterId");
        await db.upsertItems("userCharacter", userId, payload, "characterId");
        await db.upsertOne("userData", userId, payload);
        await db.upsertItems("userDeck", userId, payload, "deckId");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        await db.upsertItems("", userId, payload, "");
        return { returnCode: 1, apiName: "upsertUserAll" };
    }
    else {
        console.warn(`[ongeki] Unknown API ${req.url}`);
    }
 }

async function init() {
    await db.loadAsync();
    await db.ensureIndexAsync({ fieldName: "userId" });
    await db.ensureIndexAsync({ fieldName: "schema" });
    db.persistence.setAutocompactionInterval(10 * 60000);

    const debug = ["*", "ongeki"].includes(process.env.DEBUG);
    if(debug) console.log("[ongeki] DEBUG");

    const ctx = JSON.parse(await fs.readFile(path.join(__dirname, '../asset/ongekiData.json')));

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
     async function httpHandler(req, res) {
        if(!req.url.startsWith("/OngekiServlet")) return false;
        console.log("[ongeki]", req.method, req.url);
        try {
            const body = JSON.parse(await collect(req.pipe(zlib.createInflate()), "utf8"));
            const resp = await apiHandler(ctx, req, body);
            if(debug) {
                console.log("[ongeki] req", body);
                console.log("[ongeki] resp", resp);
            }
            const payload = zlib.deflateSync(JSON.stringify(resp || {}));
            res.writeHead(200, { "Content-Length": payload.length }).end(payload);
        } catch (err) {
            console.warn("[ongeki] request error", err);
            res.writeHead(500).end();
        }
        return true;
    }

    return httpHandler;
}

module.exports = { init };