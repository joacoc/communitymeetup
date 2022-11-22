"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const events_1 = __importDefault(require("events"));
const app = (0, express_1.default)();
const port = 4000;
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "http://localhost:3000" },
});
app.use((0, cors_1.default)());
app.get("/", () => { });
const pg = new pg_1.Pool({
    host: process.env.MATERAILIZE_HOST || "localhost",
    port: 6875,
    user: "materialize",
    password: "materialize",
    database: "materialize",
    max: 100,
    min: 20,
});
pg.on("error", (err) => console.error(err));
/**
 * Enable the game
 */
app.post("enable", () => {
    pg.query(`INSERT INTO enable VALUES (now())`);
});
/**
 * Map to follow connections and queries
 */
const connectionEventEmitter = new events_1.default();
/**
 * Query Materialize using tails
 * @param {String} roomName
 * @param {String} query
 */
function tailQuery(query, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        let tailOpen = true;
        // Listen when to stop
        const closeListener = () => {
            tailOpen = false;
        };
        connectionEventEmitter.on(`close_${roomId}`, closeListener);
        try {
            const poolClient = yield pg.connect();
            try {
                /**
                 * Begin transaction
                 */
                const tailQuery = `
                BEGIN; DECLARE mz_cursor CURSOR FOR TAIL(
                ${query}
                );
            `;
                yield poolClient.query(tailQuery);
                while (tailOpen) {
                    try {
                        const { rows } = yield poolClient.query("FETCH ALL FROM mz_cursor WITH (TIMEOUT='1s');");
                        if (rows.length > 0) {
                            io.emit(roomId, rows);
                        }
                    }
                    catch (queryErr) {
                        console.error(queryErr);
                    }
                }
                /**
                 * Close transaction
                 */
                yield poolClient.query("COMMIT;");
            }
            catch (connectError) {
                console.error(connectError);
                io.emit(roomId, connectError.toString());
            }
            finally {
                console.log("Closing");
                connectionEventEmitter.off("close", closeListener);
                poolClient.release();
            }
        }
        catch (errConnectingPoolClient) {
            console.log("Error connecting pool client.");
            console.log(errConnectingPoolClient);
        }
    });
}
/**
 * Query Materialize using poll
 * @param {String} roomName
 * @param {String} query
 */
function pollQuery(query, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        let pollOpen = true;
        // Listen when to stop
        const closeListener = () => {
            pollOpen = false;
        };
        connectionEventEmitter.on(`close_${roomId}`, closeListener);
        try {
            while (pollOpen) {
                try {
                    const { rows } = yield pg.query(query);
                    if (rows.length > 0) {
                        io.emit(roomId, rows);
                    }
                }
                catch (queryErr) {
                    console.error(queryErr);
                }
                /**
                 * Sleep one second
                 */
                yield new Promise((res) => {
                    setTimeout(() => {
                        res("Finish timeout.");
                    }, 1000);
                });
            }
        }
        catch (connectError) {
            console.error(connectError);
            io.emit(roomId, connectError.toString());
        }
        finally {
            console.log("Closing");
            connectionEventEmitter.off("close", closeListener);
        }
    });
}
/**
 * Listen to rooms (Tails)
 */
io.of("/").adapter.on("create-room", (roomName) => {
    console.log(`Room (${roomName}) created`);
    let queryType;
    if (roomName.startsWith("users")) {
        queryType = "users";
    }
    else if (roomName.startsWith("leaderboard")) {
        queryType = "leaderboard";
    }
    switch (queryType) {
        case "leaderboard":
            pollQuery(`SELECT * FROM leaderboard ORDER BY max_avg_clicks DESC LIMIT 10;`, roomName);
            break;
        case "users":
            tailQuery("SELECT * FROM users", roomName);
            break;
        default:
            break;
    }
});
io.of("/").adapter.on("delete-room", (roomName) => {
    console.log(`Room (${roomName}) deleted`);
    connectionEventEmitter.emit(`close_${roomName}`, {});
});
/**
 * Listen to tails sockets
 */
io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);
    const { handshake } = socket;
    const { query } = handshake;
    const { id } = query;
    console.log("User id: ", id);
    /**
     * Add online user
     */
    pg.query(`INSERT INTO users VALUES ('${id}');`).catch((insertError) => {
        console.log("Error inserting new user.");
        console.log(insertError);
    });
    socket.on("click", (args) => {
        const [tryNumber] = args;
        pg.query(`INSERT INTO events VALUES ('${id}', '${tryNumber}', now())`);
    });
    /**
     * Subscription requests
     */
    socket.on("users", () => {
        socket.join("users" + "_" + id);
    });
    socket.on("leaderboard", () => {
        socket.join("leaderboard");
    });
    socket.on("disconnect", () => {
        console.log("Socket disconnected: ", id);
        socket.leave("users" + "_" + id);
        socket.leave("leaderboard");
        /**
         * Remove online user
         */
        pg.query(`DELETE FROM users WHERE user_id = '${id}';`).catch((error) => {
            console.log("Error removing old user.");
            console.log(error);
        });
    });
});
server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
//# sourceMappingURL=app.js.map