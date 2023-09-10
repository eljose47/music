import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { crawlDirectory } from "./crawler";
// import { GoogleAuth } from "./services/youtube";
import { google } from "googleapis";
import { Spotify } from "./services/spotify";
import { AppDataSource } from "./typeorm";
import { Track } from "./typeorm/music";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), ".env.local") });

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = async (): Promise<void> => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  await AppDataSource.initialize();

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// ipcMain.on("authenticateSpotify", async (event, ...args) => {});

ipcMain.on("doStuff", async (event, ...args) => {
  // console.log("on doStuff");
  // await doStuff();
  const dir = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  await crawlDirectory(dir.filePaths[0]);
});

ipcMain.handle("getAllTracks", async (event, ...args) => {
  const trackRepository = AppDataSource.getRepository(Track);

  const tracks = await trackRepository.find({
    relations: { fileReference: true, album: true, artists: true },
  });

  return tracks;
  // const values = tracks.map((t) => t.toJSON());
  // return values;
});

// ipcMain.handle("getGoogleSession", async (event, ...args) => {
//   const googleAuth = new GoogleAuth();
//   await googleAuth.startFlow();
//   return { data: "yetToBeImplemented" };
// });

// ipcMain.handle("getGoogleStuff", async () => {
//   const youtube = google.youtube({ version: "v3" });
//   const googleAuth = new GoogleAuth();
//   const client = await googleAuth.getSession();

//   const playlists = await youtube.playlists.list({
//     auth: client,
//     part: ["contentDetails", "id", "player", "snippet", "status"],
//     mine: true,
//     key: "AIzaSyAZBwRQw2TBMVcnshjERsi_ARLmw7fs8eU",
//   });
//   return playlists.data;
// });

ipcMain.handle("getSpotifyStuff", async () => {
  const spotify = new Spotify();
  await spotify.authorize();
  const { body: playlists } = await spotify.getUserPlaylists();
  const tracks = await spotify.getAllSavedTracks();

  return { playlists, tracks };
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
