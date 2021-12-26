const http = require("http");
const path = require("path");
const util = require("util");
const zlib = require("zlib");
const { promises: fs } = require("fs");
const collect = require('stream-collect');
const Datastore = require('nestdb');

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
        return {
            gameSetting: {
                dataVersion: "1.05.00",
                isMaintenance: false,
                requestInterval: 10,
                rebootStartTime: "2099-01-01 23:59:00.0",
                rebootEndTime: "2099-01-01 23:59:00.0",
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
        return await db.queryItemsPagination("userCard", body);
    }
    else if (req.url.includes("GetUserChapterApi")) {
        return await db.queryItems("userChapter", body.userId);
    }
    else if (req.url.includes("GetUserCharacterApi")) {
        return await db.queryItemsPagination("userCharacter", body);
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
        const { userId, maxCount, nextIndex: currIndex } = body;
        const itemKind = parseInt(String(currIndex).slice(0, -10));
        const { userItemList, length, nextIndex } = await db.queryItemsPagination(
            "userItem",
            { userId, maxCount, nextIndex: parseInt(String(currIndex).slice(-10)) },
            { filter: { itemKind } }
        );
        return {
            userId, itemKind, userItemList, length,
            nextIndex: (nextIndex === -1) ? -1 : parseInt(String(itemKind) + String(nextIndex).padStart(10, "0")),
        };
    }
    else if (req.url.includes("GetUserKopApi")) {
        return await db.queryItems("userKop", body.userId);
    }
    else if (req.url.includes("GetUserLoginBonusApi")) {
        return await db.queryItems("userLoginBonus", body.userId);
    }
    else if (req.url.includes("GetUserMissionPointApi")) {
        return await db.queryItems("userMissionPoint", body.userId);
    }
    else if (req.url.includes("GetUserMusicApi")) {
        const { userMusicDetailList: flat, nextIndex } = await db.queryItemsPagination("userMusicDetail", body);
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
                return { userMusicDetailList: group, length: group.length }
            }),
            length: userMusicList.length,
        };
    }
    else if (req.url.includes("GetUserMusicItemApi")) {
        return await db.queryItemsPagination("userMusicItem", body);
    }
    else if (req.url.includes("GetUserOptionApi")) {
        return await db.queryOne("userOption", body.userId);
    }
    else if (req.url.includes("GetUserPreviewApi")) {
        const { userData } = await db.queryOne("userData", body.userId);
        const { userOption } = await db.queryOne("userOption", body.userId);
        return {
            userId: 0,
            isLogin: false,
            lastLoginDate: userData.lastPlayDate || null,
            userName: userData.userName || "",
            reincarnationNum: userData.reincarnationNum || 0,
            level: userData.level || 0,
            exp: userData.exp || 0,
            playerRating: userData.playerRating || 0,
            lastGameId: userData.lastGameId || "",
            lastRomVersion: userData.lastRomVersion || "",
            lastDataVersion: userData.lastDataVersion || "",
            lastPlayDate: userData.lastPlayDate || null,
            nameplateId: userData.nameplateId || 0,
            trophyId: userData.trophyId || 0,
            cardId: userData.cardId || 0,
            dispPlayerLv: userOption.dispPlayerLv || 1,
            dispRating: userOption.dispRating || 1,
            dispBP: userOption.dispBP || 1,
            headphone: userOption.headphone || 0,
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
        const { userId } = body;
        const { userRecentRating: l } = await db.queryOne("userRecentRating", userId, { default: [] });
        return { userId, userRecentRatingList: l, length: l.length };
    }
    else if (req.url.includes("GetUserRegionApi")) {
        return { userId: body.userId, length: 0, userRegionList: [] };
    }
    else if (req.url.includes("GetUserRivalApi") || req.url.includes("GetUserRivalDataApi")) {
        return { userId: body.userId, length: 0, userRivalList: [] };
    }
    else if (req.url.includes("GetUserRivalMusicApi")) {
        return {
            userId: body.userId,
            rivalUserId: body.rivalUserId,
            length: 0, nextIndex: 0, userRivalMusicList: [],
        };
    }
    else if (req.url.includes("GetUserScenarioApi")) {
        return await db.queryItems("userScenario", body.userId);
    }
    else if (req.url.includes("GetUserStoryApi")) {
        return await db.queryItems("userStory", body.userId);
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
        const { userId, startChapterId, endChapterId } = body;
        return await db.queryItems("userTradeItem", userId, {
            filter: { chapterId: { $gte: startChapterId, $lte: endChapterId } }
        });
    }
    else if (req.url.includes("GetUserTrainingRoomByKeyApi")) {
        return await db.queryItems("userTrainingRoom", body.userId);
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
        await db.upsertItems("userItem", userId, payload, (i) => `${i.itemKind}-${i.itemId}`);
        await db.upsertItems("userKop", userId, payload, "kopId");
        await db.upsertItems("userLoginBonus", userId, payload, "bonusId");
        await db.upsertItems("userMissionPoint", userId, payload, "eventId");
        await db.upsertItems("userMusicDetail", userId, payload, "musicId");
        await db.upsertItems("userMusicItem", userId, payload, "musicId");
        await db.upsertOne("userOption", userId, payload);
        await db.upsertOne("userRecentRating", userId, {
            userRecentRating: [payload?.userRecentRatingList || []]
        });
        await db.upsertItems("userScenario", userId, payload, "scenarioId");
        await db.upsertItems("userStory", userId, payload, "storyId");
        await db.upsertItems("userTradeItem", userId, payload, "tradeItemId");
        await db.upsertItems("userTrainingRoom", userId, payload, "roomId");
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
                console.log("[ongeki] req", util.inspect(body, false, null, true));
                console.log("[ongeki] resp", util.inspect(resp, false, null, true));
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