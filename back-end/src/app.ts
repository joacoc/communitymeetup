import express from "express";
import { Pool } from "pg";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import EventEmitter from "events";
import fs from "fs";

const app = express();
const port = 4000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.use(cors());
app.get("/", () => { });

const prod = process.env.prod;
const host = prod ? "c2pis2y79gj.materialize.cloud" : "localhost";

const pg = new Pool({
    host,
    port: 6875,
    user: "materialize",
    password: "materialize",
    database: "materialize",
    ssl: prod ? {
        ca: fs.readFileSync("ca.crt").toString(),
        key: fs.readFileSync("materialize.key").toString(),
        cert: fs.readFileSync("materialize.crt").toString(),
    } : undefined,
    max: 100,
    min: 20,
});

pg.on("error", (err) => console.error(err));

/**
 * Map to follow connections and queries
 */
const connectionEventEmitter = new EventEmitter();

app.get("/health", (req, res, next) => { res.send({ listenerCount: connectionEventEmitter.listenerCount }); next(); });

/**
 * Query Materialize using tails
 * @param {String} roomName
 * @param {String} query
 */
async function tailQuery(query, roomId) {
    let tailOpen = true;

    // Listen when to stop
    const closeListener = () => {
        tailOpen = false;
    };
    connectionEventEmitter.on(`close_${roomId}`, closeListener);

    try {
        const poolClient = await pg.connect();

        try {
            /**
             * Begin transaction
             */
            const tailQuery = `
                BEGIN; DECLARE mz_cursor CURSOR FOR TAIL(
                ${query}
                );
            `;

            await poolClient.query(tailQuery);

            while (tailOpen) {
                try {
                    const { rows } = await poolClient.query(
                        "FETCH ALL FROM mz_cursor WITH (TIMEOUT='1s');"
                    );

                    if (rows.length > 0) {
                        io.emit(roomId, rows);
                    }
                } catch (queryErr) {
                    console.error(queryErr);
                }
            }

            /**
             * Close transaction
             */
            await poolClient.query("COMMIT;");
        } catch (connectError) {
            console.error(connectError);
            io.emit(roomId, connectError.toString());
        } finally {
            console.log("Closing");
            connectionEventEmitter.off("close", closeListener);
            poolClient.release()
        }
    } catch (errConnectingPoolClient) {
        console.log("Error connecting pool client.");
        console.log(errConnectingPoolClient);
    }
}


/**
 * Query Materialize using poll
 * @param {String} roomName
 * @param {String} query
 */
async function pollQuery(query, roomId) {
    let pollOpen = true;

    // Listen when to stop
    const closeListener = () => {
        pollOpen = false;
    };
    connectionEventEmitter.on(`close_${roomId}`, closeListener);

    try {
        while (pollOpen) {
            try {
                const { rows } = await pg.query(query);

                if (rows.length > 0) {
                    io.emit(roomId, rows);
                }
            } catch (queryErr) {
                console.error(queryErr);
            }

            /**
             * Sleep one second
             */
            await new Promise((res) => {
                setTimeout(() => {
                    res("Finish timeout.");
                }, 1000);
            });
        }
    } catch (connectError) {
        console.error(connectError);
        io.emit(roomId, connectError.toString());
    } finally {
        console.log("Closing");
        connectionEventEmitter.off("close", closeListener);
    }
}


/**
 * Listen to rooms (Tails)
 */
io.of("/").adapter.on("create-room", (roomName) => {
    console.log(`Room (${roomName}) created`);
    let queryType;

    if (roomName.startsWith("users")) {
        queryType = "users";
    } else if (roomName.startsWith("leaderboard")) {
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
