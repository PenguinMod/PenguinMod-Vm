// Name: Steamworks
// ID: steamworks
// Description: Connect your project to Steamworks APIs
// License: MPL-2.0
// Context: Probably don't translate the word "Steamworks".
// note: will only work in the packager

(function (Scratch) {
  "use strict";

  /* globals Steamworks */

  const canUseSteamworks = typeof Steamworks !== "undefined" && Steamworks.ok();

  class SteamworksExtension {
    getInfo() {
      return {
        id: "steamworksextended",
        name: "Steamworks Extended",
        color1: "#136C9F",
        color2: "#105e8c",
        color3: "#0d486b",
        docsURI: "https://extensions.penguinmod.com/docs/Steamworks",
        blocks: [
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "hasSteamworks",
            text: Scratch.translate("has steamworks?"),
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getUserInfo",
            text: Scratch.translate({
              default: "get user [THING]",
              description:
                "[THING] is a dropdown with name, steam ID, account level, IP country, etc.",
            }),
            arguments: {
              THING: {
                type: Scratch.ArgumentType.STRING,
                menu: "userInfo",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "setAchievement",
            text: Scratch.translate({
              default: "set achievement [ACHIEVEMENT] unlocked to [STATUS]",
              description: "[STATUS] is true/false dropdown",
            }),
            arguments: {
              ACHIEVEMENT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              STATUS: {
                type: Scratch.ArgumentType.STRING,
                menu: "achievementUnlocked",
              },
            },
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "getAchievement",
            text: Scratch.translate("achievement [ACHIEVEMENT] unlocked?"),
            arguments: {
              ACHIEVEMENT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "getInstalled",
            text: Scratch.translate({
              default: "[TYPE] [ID] installed?",
              description: "eg. can be read as 'DLC 1234 installed?'",
            }),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "installType",
              },
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "openInOverlay",
            text: Scratch.translate({
              default: "open [TYPE] [DATA] in overlay",
              description: "eg. 'open URL example.com in overlay'",
            }),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "overlayType",
              },
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://example.com/",
              },
            },
          },
          {
            blockType: Scratch.BlockType.LABEL,
            text: 'Penguinmod only blocks',
          },
          {
            blockType: Scratch.BlockType.LABEL,
            text: 'These won\'t work in Turbowarp',
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getSessionTicketWithSteamId",
            text: "get session ticket with Steam ID [STEAMID] and timeout [TIMEOUT]",
            arguments: {
              STEAMID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              TIMEOUT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getSessionTicketWithIp",
            text: "get session ticket with IP [IP] and timeout [TIMEOUT]",
            arguments: {
              IP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              TIMEOUT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getAuthTicketForWebApi",
            text: "get auth ticket for web API with identity [IDENTITY] and timeout [TIMEOUT]",
            arguments: {
              IDENTITY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              TIMEOUT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isSubscribedApp",
            text: "is subscribed app [APPID]",
            arguments: {
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isAppInstalled",
            text: "is app [APPID] installed?",
            arguments: {
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isVacBanned",
            text: "is VAC banned?",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isCybercafe",
            text: "is cybercafe?",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isLowViolence",
            text: "is low violence?",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isSubscribed",
            text: "is subscribed?",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "appBuildId",
            text: "get app build ID",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "appInstallDir",
            text: "get app install directory for app [APPID]",
            arguments: {
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "appOwner",
            text: "get app owner",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "availableGameLanguages",
            text: "get available game languages",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "currentGameLanguage",
            text: "get current game language",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "currentBetaName",
            text: "get current beta name",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isEnabledForAccount",
            text: "is cloud enabled for account?",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isEnabledForApp",
            text: "is cloud enabled for app?",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "listFiles",
            text: "list cloud files",
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "inputInit",
            text: "initialize input",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getControllers",
            text: "get controllers",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getActionSet",
            text: "get action set [ACTIONSET]",
            arguments: {
              ACTIONSET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getDigitalAction",
            text: "get digital action [ACTION]",
            arguments: {
              ACTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getAnalogAction",
            text: "get analog action [ACTION]",
            arguments: {
              ACTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "inputShutdown",
            text: "shutdown input",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "createLobby",
            text: "create lobby of type [LOBBYTYPE] with max members [MAXMEMBERS]",
            arguments: {
              LOBBYTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              MAXMEMBERS: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "joinLobby",
            text: "join lobby [LOBBYID]",
            arguments: {
              LOBBYID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getLobbies",
            text: "get lobbies",
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "sendP2PPacket",
            text: "send P2P packet to [STEAMID] with type [SENDTYPE] and data [DATA]",
            arguments: {
              STEAMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              SENDTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "acceptP2PSession",
            text: "accept P2P session from [STEAMID]",
            arguments: {
              STEAMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "activateDialog",
            text: "activate dialog [DIALOG]",
            arguments: {
              DIALOG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "activateDialogToUser",
            text: "activate dialog [DIALOG] to user [STEAMID]",
            arguments: {
              DIALOG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              STEAMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "activateInviteDialog",
            text: "activate invite dialog for lobby [LOBBYID]",
            arguments: {
              LOBBYID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "activateToStore",
            text: "activate to store app [APPID] with flag [FLAG]",
            arguments: {
              APPID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              FLAG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getInt",
            text: "get stat [NAME]",
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "setInt",
            text: "set stat [NAME] to [VALUE]",
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "store",
            text: "store stats",
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: "resetAll",
            text: "reset all stats and achievements [ACHIEVEMENTSTOO]",
            arguments: {
              ACHIEVEMENTSTOO: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "false",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getAppId",
            text: "get app ID",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getServerRealTime",
            text: "get server real time",
          },
          {
            blockType: Scratch.BlockType.BOOLEAN,
            opcode: "isSteamRunningOnSteamDeck",
            text: "running on Steam Deck?",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "showGamepadTextInput",
            text: "show gamepad text input with mode [INPUTMODE], line mode [LINEMODE], description [DESCRIPTION], max characters [MAXCHARS], existing text [EXISTINGTEXT]",
            arguments: {
              INPUTMODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              LINEMODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              DESCRIPTION: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              MAXCHARS: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              EXISTINGTEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "showFloatingGamepadTextInput",
            text: "show floating gamepad text input with keyboard mode [KEYBOARDMODE], x [X], y [Y], width [WIDTH], height [HEIGHT]",
            arguments: {
              KEYBOARDMODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              WIDTH: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              HEIGHT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "createItem",
            text: "create workshop item for app [APPID]",
            arguments: {
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "updateItem",
            text: "update workshop item [ITEMID] with details [DETAILS] for app [APPID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              DETAILS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "updateItemWithCallback",
            text: "update workshop item [ITEMID] with details [DETAILS] for app [APPID], success [SUCCESS], error [ERROR], progress [PROGRESS], interval [INTERVAL]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              DETAILS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              APPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              SUCCESS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              ERROR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              PROGRESS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              INTERVAL: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "subscribe",
            text: "subscribe to workshop item [ITEMID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "unsubscribe",
            text: "unsubscribe from workshop item [ITEMID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "workshopState",
            text: "get workshop state for item [ITEMID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "installInfo",
            text: "get install info for workshop item [ITEMID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "downloadInfo",
            text: "get download info for workshop item [ITEMID]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "download",
            text: "download workshop item [ITEMID] with high priority [HIGHPRIORITY]",
            arguments: {
              ITEMID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              HIGHPRIORITY: {
                type: Scratch.ArgumentType.BOOLEAN,
                defaultValue: "false",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getSubscribedItems",
            text: "get subscribed workshop items",
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getItem",
            text: "get workshop item [ITEM] with query config [QUERYCONFIG]",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              QUERYCONFIG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getItems",
            text: "get workshop items [ITEMS] with query config [QUERYCONFIG]",
            arguments: {
              ITEMS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              QUERYCONFIG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getAllItems",
            text: "get all workshop items for page [PAGE], query type [QUERYTYPE], item type [ITEMTYPE], creator appId [CREATORAPPID], consumer appId [CONSUMERAPPID], query config [QUERYCONFIG]",
            arguments: {
              PAGE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              QUERYTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              ITEMTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              CREATORAPPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              CONSUMERAPPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              QUERYCONFIG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: "getUserItems",
            text: "get user workshop items for page [PAGE], account ID [ACCOUNTID], list type [LISTTYPE], item type [ITEMTYPE], sort order [SORTORDER], creator appId [CREATORAPPID], consumer appId [CONSUMERAPPID], query config [QUERYCONFIG]",
            arguments: {
              PAGE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              ACCOUNTID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              LISTTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              ITEMTYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              SORTORDER: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
              CREATORAPPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              CONSUMERAPPID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "",
              },
              QUERYCONFIG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
        ],
        menus: {
          userInfo: {
            acceptReporters: true,
            items: [
              {
                value: "name",
                text: Scratch.translate("name"),
              },
              {
                value: "level",
                text: Scratch.translate({
                  default: "level",
                  description: "Steam account level",
                }),
              },
              {
                value: "IP country",
                text: Scratch.translate("IP country"),
              },
              {
                value: "steam ID",
                text: Scratch.translate("steam ID"),
              },
            ],
          },
          achievementUnlocked: {
            acceptReporters: true,
            items: [
              {
                value: "true",
                text: Scratch.translate("true"),
              },
              {
                value: "false",
                text: Scratch.translate("false"),
              },
            ],
          },
          installType: {
            acceptReporters: true,
            items: [
              {
                value: "DLC",
                text: Scratch.translate({
                  default: "DLC",
                  description: "Downloadable content",
                }),
              },
            ],
          },
          overlayType: {
            acceptReporters: true,
            items: [
              {
                value: "URL",
                text: Scratch.translate("URL"),
              },
            ],
          },
        },
      };
    }

    hasSteamworks() {
      return canUseSteamworks;
    }

    getUserInfo({ THING }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      switch (THING) {
        case "name":
          return Steamworks.localplayer.getName();
        case "level":
          return Steamworks.localplayer.getLevel();
        case "IP country":
          return Steamworks.localplayer.getIpCountry();
        case "steam ID":
          return Steamworks.localplayer.getSteamId().steamId64;
      }
      return "???";
    }

    setAchievement({ ACHIEVEMENT, STATUS }) {
      if (!canUseSteamworks) return;
      if (Scratch.Cast.toBoolean(STATUS)) {
        Steamworks.achievement.activate(Scratch.Cast.toString(ACHIEVEMENT));
      } else {
        Steamworks.achievement.clear(Scratch.Cast.toString(ACHIEVEMENT));
      }
    }

    getAchievement({ ACHIEVEMENT }) {
      if (!canUseSteamworks) return false;
      return Steamworks.achievement.isActivated(
        Scratch.Cast.toString(ACHIEVEMENT)
      );
    }

    getInstalled({ TYPE, ID }) {
      if (!canUseSteamworks) return false;
      if (TYPE === "DLC") {
        return Steamworks.apps.isDlcInstalled(Scratch.Cast.toNumber(ID));
      }
      return false;
    }

    openInOverlay({ TYPE, DATA }) {
      if (TYPE === "URL") {
        const url = Scratch.Cast.toString(DATA);
        if (canUseSteamworks) {
          Steamworks.overlay.activateToWebPage(DATA);
        } else {
          Scratch.openWindow(url);
        }
      }
    }

    // new pm stuff

    async getSessionTicketWithSteamId({ STEAMID, TIMEOUT }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.auth.getSessionTicketWithSteamId(
        Scratch.Cast.toBigInt(STEAMID),
        Scratch.Cast.toNumber(TIMEOUT)
      );
    }

    async getSessionTicketWithIp({ IP, TIMEOUT }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.auth.getSessionTicketWithIp(
        Scratch.Cast.toString(IP),
        Scratch.Cast.toNumber(TIMEOUT)
      );
    }

    async getAuthTicketForWebApi({ IDENTITY, TIMEOUT }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.auth.getAuthTicketForWebApi(
        Scratch.Cast.toString(IDENTITY),
        Scratch.Cast.toNumber(TIMEOUT)
      );
    }

    isSubscribedApp({ APPID }) {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isSubscribedApp(Scratch.Cast.toNumber(APPID));
    }

    isAppInstalled({ APPID }) {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isAppInstalled(Scratch.Cast.toNumber(APPID));
    }

    isVacBanned() {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isVacBanned();
    }

    isCybercafe() {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isCybercafe();
    }

    isLowViolence() {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isLowViolence();
    }

    isSubscribed() {
      if (!canUseSteamworks) return false;
      return Steamworks.apps.isSubscribed();
    }

    appBuildId() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.appBuildId();
    }

    appInstallDir({ APPID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.appInstallDir(Scratch.Cast.toNumber(APPID));
    }

    appOwner() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.appOwner().steamId64;
    }

    availableGameLanguages() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.availableGameLanguages();
    }

    currentGameLanguage() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.currentGameLanguage();
    }

    currentBetaName() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.apps.currentBetaName();
    }

    isEnabledForAccount() {
      if (!canUseSteamworks) return false;
      return Steamworks.cloud.isEnabledForAccount();
    }

    isEnabledForApp() {
      if (!canUseSteamworks) return false;
      return Steamworks.cloud.isEnabledForApp();
    }

    listFiles() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.cloud.listFiles();
    }

    inputInit() {
      if (!canUseSteamworks) return;
      Steamworks.input.init();
    }

    getControllers() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.input.getControllers();
    }

    getActionSet({ ACTIONSET }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.input.getActionSet(Scratch.Cast.toString(ACTIONSET));
    }

    getDigitalAction({ ACTION }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.input.getDigitalAction(Scratch.Cast.toString(ACTION));
    }

    getAnalogAction({ ACTION }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.input.getAnalogAction(Scratch.Cast.toString(ACTION));
    }

    inputShutdown() {
      if (!canUseSteamworks) return;
      Steamworks.input.shutdown();
    }

    async createLobby({ LOBBYTYPE, MAXMEMBERS }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.matchmaking.createLobby(
        Scratch.Cast.toString(LOBBYTYPE),
        Scratch.Cast.toNumber(MAXMEMBERS)
      );
    }

    async joinLobby({ LOBBYID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.matchmaking.joinLobby(Scratch.Cast.toBigInt(LOBBYID));
    }

    async getLobbies() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.matchmaking.getLobbies();
    }

    async sendP2PPacket({ STEAMID, SENDTYPE, DATA }) {
      if (!canUseSteamworks) return;
      return await Steamworks.networking.sendP2PPacket(
        Scratch.Cast.toBigInt(STEAMID),
        Scratch.Cast.toString(SENDTYPE),
        Buffer.from(Scratch.Cast.toString(DATA))
      );
    }

    acceptP2PSession({ STEAMID }) {
      if (!canUseSteamworks) return;
      Steamworks.networking.acceptP2PSession(Scratch.Cast.toBigInt(STEAMID));
    }

    activateDialog({ DIALOG }) {
      if (!canUseSteamworks) return;
      Steamworks.overlay.activateDialog(Scratch.Cast.toString(DIALOG));
    }

    activateDialogToUser({ DIALOG, STEAMID }) {
      if (!canUseSteamworks) return;
      Steamworks.overlay.activateDialogToUser(
        Scratch.Cast.toString(DIALOG),
        Scratch.Cast.toBigInt(STEAMID)
      );
    }

    activateInviteDialog({ LOBBYID }) {
      if (!canUseSteamworks) return;
      Steamworks.overlay.activateInviteDialog(Scratch.Cast.toBigInt(LOBBYID));
    }

    activateToStore({ APPID, FLAG }) {
      if (!canUseSteamworks) return;
      Steamworks.overlay.activateToStore(
        Scratch.Cast.toNumber(APPID),
        Scratch.Cast.toString(FLAG)
      );
    }

    getInt({ NAME }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.stats.getInt(Scratch.Cast.toString(NAME));
    }

    setInt({ NAME, VALUE }) {
      if (!canUseSteamworks) return false;
      return Steamworks.stats.setInt(
        Scratch.Cast.toString(NAME),
        Scratch.Cast.toNumber(VALUE)
      );
    }

    store() {
      if (!canUseSteamworks) return false;
      return Steamworks.stats.store();
    }

    resetAll({ ACHIEVEMENTSTOO }) {
      if (!canUseSteamworks) return false;
      return Steamworks.stats.resetAll(Scratch.Cast.toBoolean(ACHIEVEMENTSTOO));
    }

    getAppId() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.utils.getAppId();
    }

    getServerRealTime() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.utils.getServerRealTime();
    }

    isSteamRunningOnSteamDeck() {
      if (!canUseSteamworks) return false;
      return Steamworks.utils.isSteamRunningOnSteamDeck();
    }

    async showGamepadTextInput({
      INPUTMODE,
      LINEMODE,
      DESCRIPTION,
      MAXCHARS,
      EXISTINGTEXT,
    }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.utils.showGamepadTextInput(
        Scratch.Cast.toString(INPUTMODE),
        Scratch.Cast.toString(LINEMODE),
        Scratch.Cast.toString(DESCRIPTION),
        Scratch.Cast.toNumber(MAXCHARS),
        Scratch.Cast.toString(EXISTINGTEXT)
      );
    }

    async showFloatingGamepadTextInput({ KEYBOARDMODE, X, Y, WIDTH, HEIGHT }) {
      if (!canUseSteamworks) return false;
      return await Steamworks.utils.showFloatingGamepadTextInput(
        Scratch.Cast.toString(KEYBOARDMODE),
        Scratch.Cast.toNumber(X),
        Scratch.Cast.toNumber(Y),
        Scratch.Cast.toNumber(WIDTH),
        Scratch.Cast.toNumber(HEIGHT)
      );
    }

    async createItem({ APPID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.createItem(Scratch.Cast.toNumber(APPID));
    }

    async updateItem({ ITEMID, DETAILS, APPID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.updateItem(
        Scratch.Cast.toBigInt(ITEMID),
        Scratch.Cast.toString(DETAILS),
        Scratch.Cast.toNumber(APPID)
      );
    }

    async updateItemWithCallback({
      ITEMID,
      DETAILS,
      APPID,
      SUCCESS,
      ERROR,
      PROGRESS,
      INTERVAL,
    }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      Steamworks.workshop.updateItemWithCallback(
        Scratch.Cast.toBigInt(ITEMID),
        Scratch.Cast.toString(DETAILS),
        Scratch.Cast.toNumber(APPID),
        (data) => {
          eval(Success);
        },
        (err) => {
          eval(ERROR);
        },
        (data) => {
          eval(PROGRESS);
        },
        Scratch.Cast.toNumber(INTERVAL)
      );
    }

    async subscribe({ ITEMID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.subscribe(Scratch.Cast.toBigInt(ITEMID));
    }

    async unsubscribe({ ITEMID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.unsubscribe(
        Scratch.Cast.toBigInt(ITEMID)
      );
    }

    workshopState({ ITEMID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.workshop.state(Scratch.Cast.toBigInt(ITEMID));
    }

    installInfo({ ITEMID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.workshop.installInfo(Scratch.Cast.toBigInt(ITEMID));
    }

    downloadInfo({ ITEMID }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.workshop.downloadInfo(Scratch.Cast.toBigInt(ITEMID));
    }

    download({ ITEMID, HIGHPRIORITY }) {
      if (!canUseSteamworks) return false;
      return Steamworks.workshop.download(
        Scratch.Cast.toBigInt(ITEMID),
        Scratch.Cast.toBoolean(HIGHPRIORITY)
      );
    }

    getSubscribedItems() {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return Steamworks.workshop.getSubscribedItems();
    }

    async getItem({ ITEM, QUERYCONFIG }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.getItem(
        Scratch.Cast.toBigInt(ITEM),
        Scratch.Cast.toString(QUERYCONFIG)
      );
    }

    async getItems({ ITEMS, QUERYCONFIG }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.getItems(
        Scratch.Cast.toArray(ITEMS),
        Scratch.Cast.toString(QUERYCONFIG)
      );
    }

    async getAllItems({
      PAGE,
      QUERYTYPE,
      ITEMTYPE,
      CREATORAPPID,
      CONSUMERAPPID,
      QUERYCONFIG,
    }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.getAllItems(
        Scratch.Cast.toNumber(PAGE),
        Scratch.Cast.toString(QUERYTYPE),
        Scratch.Cast.toString(ITEMTYPE),
        Scratch.Cast.toNumber(CREATORAPPID),
        Scratch.Cast.toNumber(CONSUMERAPPID),
        Scratch.Cast.toString(QUERYCONFIG)
      );
    }

    async getUserItems({
      PAGE,
      ACCOUNTID,
      LISTTYPE,
      ITEMTYPE,
      SORTORDER,
      CREATORAPPID,
      CONSUMERAPPID,
      QUERYCONFIG,
    }) {
      if (!canUseSteamworks) return "Steamworks unavailable";
      return await Steamworks.workshop.getUserItems(
        Scratch.Cast.toNumber(PAGE),
        Scratch.Cast.toNumber(ACCOUNTID),
        Scratch.Cast.toString(LISTTYPE),
        Scratch.Cast.toString(ITEMTYPE),
        Scratch.Cast.toString(SORTORDER),
        Scratch.Cast.toNumber(CREATORAPPID),
        Scratch.Cast.toNumber(CONSUMERAPPID),
        Scratch.Cast.toString(QUERYCONFIG)
      );
    }
  }

  Scratch.extensions.register(new SteamworksExtension());
})(Scratch);
