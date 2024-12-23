import helmet from "helmet";
import { configDotenv } from "dotenv";
configDotenv();
import express from "express";
const app = express();

app.use(helmet());

import morgan from "morgan";
import mongoose from "mongoose";

import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import fetch from "node-fetch";

import path from "url";
import { dirname } from "path";
const __filename = path.fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// fs.statSync(process.env.SONG_DOWNLOAD_LINK);

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "./music-player/index.html"));
});

app.get("/song", async (req, res) => {
    const streamPipeline = promisify(pipeline);

    try {
        const response = await fetch(process.env.SONG_DOWNLOAD_LINK);

        if (!response.ok) {
            throw new Error(`unexpected response ${response.statusText}`);
        }

        console.log("Content-length", response.headers.get("content-length"));

        res.setHeader("Content-Type", "audio/mpeg");
        // res.setHeader(
        //     "Content-Disposition",
        //     'attachment; filename="audio.mp4"'
        // );
        res.setHeader("Content-Disposition", 'inline; filename="audio.mp4"');

        response.body.on("close", () => {
            console.warn("Stream closed prematurely");
        });

        console.log("Writable highwatermark", res.writableHighWaterMark);

        await streamPipeline(response.body, res);
        // console.log(response.body);
        // return res.status(200).json({ message: "success" });
    } catch (error) {
        console.error("Fetch error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
});

const port = process.env.PORT || 3000;
const mongoConnectionString =
    process.env.MONGODB_CONNECTION_STRING || "mongodb://localhost:27017/myapp";

mongoose
    .connect(mongoConnectionString)
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(port, () => {
            console.log(`The server is listening on http://localhost:${port}`);
        });
    })
    .catch(() => {
        console.log("Failed to connect to database");
    });
