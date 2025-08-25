// @ts-check

const electron = require("electron/main");
const http = require("http");
const path = require("path");
const { Mime } = require("mime/lite");
const { default: standardMimeTypes } = require("mime/types/standard.js");
const fs = { ...require("fs"), ...require("fs/promises") };

const createWindow = () => {
    const win = new electron.BrowserWindow({
        width: 800,
        height: 1000,
    });

    win.loadURL(`http://127.0.0.1:${serverPort}`);
};

electron.app.commandLine.appendSwitch("no-proxy-server");
electron.app.commandLine.appendSwitch("host-resolver-rules", "MAP * 127.0.0.1");

const specialMimesFile = path.join(__dirname, "third_party", "special_mimes.json");
/** @type {{ [path in string]?: string }} */
const specialMimes = fs.existsSync(specialMimesFile)
    ? JSON.parse(fs.readFileSync(specialMimesFile, { encoding: "utf-8" }))
    : {};

// /** @type {{[header: string]: Set<string>}} */
// const headers = {};

electron.app.whenReady().then(async () => {
    while (!serverReady) {
        await new Promise((r) => setTimeout(r, 100));
    }

    createWindow();

    electron.app.on("activate", () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    /** @type {Parameters<typeof electron.protocol.handle>[1]} */
    const interceptor = async (req) => {
        // const resO = await fetch(req);
        // const res = new Response(await resO.arrayBuffer(), {
        //     headers: new Headers(resO.headers),
        //     status: resO.status,
        // });

        // [
        //     "accept-ranges",
        //     "access-control-allow-headers",
        //     "access-control-allow-methods",
        //     "access-control-allow-origin",
        //     "access-control-expose-headers",
        //     "access-control-max-age",
        //     "age",
        //     "alt-svc",
        //     "cache-control",
        //     "cdn-cache",
        //     "cdn-cachedat",
        //     "cdn-edgestorageid",
        //     "cdn-proxyver",
        //     "cdn-pullzone",
        //     "cdn-requestcountrycode",
        //     "cdn-requestid",
        //     "cdn-requestpullcode",
        //     "cdn-requestpullsuccess",
        //     "cdn-requesttime",
        //     "cdn-status",
        //     "cdn-uid",
        //     "cf-cache-status",
        //     "cf-ray",
        //     "connection",
        //     "content-security-policy",
        //     "content-security-policy-report-only",
        //     "cross-origin-opener-policy",
        //     "cross-origin-resource-policy",
        //     "date",
        //     "etag",
        //     "expires",
        //     "fastly-restarts",
        //     "keep-alive",
        //     "last-modified",
        //     "link",
        //     "permissions-policy",
        //     "referrer-policy",
        //     "report-to",
        //     "server",
        //     "strict-transport-security",
        //     "timing-allow-origin",
        //     "transfer-encoding",
        //     "vary",
        //     "x-amz-id-2",
        //     "x-amz-request-id",
        //     "x-amz-server-side-encryption",
        //     "x-amz-version-id",
        //     "x-cache",
        //     "x-cache-hits",
        //     "x-content-type-options",
        //     "x-frame-options",
        //     "x-jsd-version",
        //     "x-jsd-version-type",
        //     "x-permitted-cross-domain-policies",
        //     "x-robots-header",
        //     "x-served-by",
        //     "x-timer",
        //     "x-xss-protection",

        //     "x-pypi-file-package-type",
        //     "x-pypi-file-project",
        //     "x-pypi-file-python-version",
        //     "x-pypi-file-version",
        //     "x-pypi-last-serial",
        // ].forEach((h) => res.headers.delete(h));

        // res.headers.forEach((v, k) => {
        //     headers[k] ??= new Set();
        //     headers[k].add(v);
        // });

        // fs.writeFile(
        //     "./headers.json",
        //     JSON.stringify(
        //         Object.fromEntries(
        //             Object.keys(headers)
        //                 .sort()
        //                 .map((k) => [k, [...headers[k]]])
        //         ),
        //         undefined,
        //         "    "
        //     )
        // );

        // fs.appendFile("./content-type.txt", `${req.url.replace(/.*\//, '')}  ${res.headers.get('content-type')}\n`);

        // return res;

        const u = new URL(req.url);
        if (u.protocol === "http:" && u.host === `127.0.0.1:${serverPort}`) {
            return fetch(req);
        }
        console.log("INTERCEPTION:: ", req.url);
        const filePath = `third_party/${u.href
            .replace(/^https?:\/\/|^\/\//, "")
            .replace(/\/$/, "")
            .split("/")
            .map((p) => p.replace(/["<>\|:\*\?\\\/ \x00-\x1f]/g, "_"))
            .join("/")}`;
        const filePathAbs = path.join(__dirname, filePath);
        if (!fs.existsSync(filePathAbs)) {
            console.log("               ", "Downloading...");
            fs.mkdir(path.dirname(filePathAbs), { recursive: true });
            const resp = await fetch(req);

            {
                const contentType = resp.headers.get("content-type") ?? "";
                const pathFileType = mime.getType(filePathAbs) ?? "application/octet-stream";
                if (contentType.replace(/; charset=utf-8$/i, "") !== pathFileType) {
                    specialMimes[filePath] = contentType;
                    fs.writeFile(specialMimesFile, JSON.stringify(specialMimes, undefined, "    "));
                }
            }

            if (resp.body) {
                /** @type {import("fs").WriteStream | undefined} */
                const fileStream = fs.createWriteStream(filePathAbs);
                const readStream = fs.ReadStream.fromWeb(
                    /** @type {import('stream/web').ReadableStream<Uint8Array>} */ (resp.body)
                );
                readStream.pipe(fileStream);
                try {
                    await new Promise((res, rej) => {
                        readStream.on("end", res);
                        readStream.on("error", rej);
                    });
                    fileStream.close();
                    console.log("               ", "Success.");
                } catch {
                    console.log("               ", "Error. Deleting file...");
                    fileStream.close();
                    fs.rm(filePathAbs);
                } finally {
                    fileStream.close();
                }
            }
        }
        return fetch(`http://127.0.0.1:${serverPort}/${filePath}`);
    };

    electron.protocol.handle("https", interceptor);
    electron.protocol.handle("http", interceptor);
});

electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron.app.quit();
    }
});

const mime = new Mime(standardMimeTypes);
mime.define({ "application/wasm": ["whl"] });

const server = http.createServer(async (req, res) => {
    let filePath = (req.url ?? "").replace(/\?.*$/, "").replace(/\/$/, "");
    let filePathAbs = path.join(__dirname, filePath);

    /** @type {import("fs/promises").FileHandle | undefined} */
    let f = undefined;
    try {
        f = await fs.open(filePathAbs, "r");
        await f.read(Buffer.alloc(1));
        await f.close();
    } catch {
        if (f) {
            f.close();
            filePath += "/index.html";
            filePathAbs = path.join(filePathAbs, "index.html");
        }
    }

    try {
        const content = await fs.readFile(filePathAbs);
        res.writeHead(200, {
            "content-type":
                specialMimes[filePath.replace(/^\//, "")] ??
                mime.getType(filePathAbs) ??
                "application/octet-stream",
        });
        res.end(content);
    } catch (err) {
        if (err.code === "ENOENT") {
            res.writeHead(404);
            res.end();
        } else {
            console.log("unexpected error", err.constructor, err);
            res.writeHead(500);
            res.end(`error reading file ${filePathAbs}`);
        }
    }
});

let serverPort = Math.floor(Math.random() * 2000 + 1000);
let serverReady = false;

server
    .listen(serverPort, "127.0.0.1")
    .on("error", (e) => {
        if ("code" in e && e.code === "EADDRINUSE") {
            console.error("Address in use, retrying...");
            server.close();
            serverPort = Math.floor(Math.random() * 2000 + 1000);
            server.listen(serverPort, "127.0.0.1");
        }
    })
    .on("listening", () => {
        serverReady = true;
        console.log(`local server running: http://127.0.0.1:${serverPort}`);
    })
    .on("request", (e) => console.log(e.url));
