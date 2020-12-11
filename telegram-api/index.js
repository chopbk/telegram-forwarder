const { MTProto } = require("@mtproto/core");
const fs = require("fs");

const myStorage = (file_path) => {
  let storage = {};
  try {
    const file_raw = fs.readFileSync(file_path);
    storage = JSON.parse(file_raw);
  } catch (e) {}

  const setItem = (key, value) => {
    //   console.log("storage:set::", key);
    storage[key] = value;
    fs.writeFileSync(file_path, JSON.stringify(storage));
  };

  const getItem = (key) => {
    return storage[key] || null;
  };

  return {
    setItem,
    getItem,
  };
};
const my_storage = myStorage("./data/account.json");
function TelegramApi(options = {}) {
  const mtproto = new MTProto({
    api_id: options.api_id,
    api_hash: options.api_hash,
    customLocalStorage: my_storage,
  });

  const api = {
    call(method, params, options = {}) {
      return mtproto.call(method, params, options).catch(async (error) => {
        console.log(`${method} error:`, error);

        const { error_code, error_message } = error;

        if (error_code === 303) {
          const [type, dcId] = error_message.split("_MIGRATE_");

          // If auth.sendCode call on incorrect DC need change default DC, because call auth.signIn on incorrect DC return PHONE_CODE_EXPIRED error
          if (type === "PHONE") {
            await mtproto.setDefaultDc(+dcId);
          } else {
            options = {
              ...options,
              dcId: +dcId,
            };
          }

          return this.call(method, params, options);
        }
        return Promise.reject(error);
      });
    },
    mtproto: mtproto,
  };

  return {
    checkPassword: ({ srp_id, A, M1 }) => {
      return api.call("auth.checkPassword", {
        password: {
          _: "inputCheckPasswordSRP",
          srp_id,
          A,
          M1,
        },
      });
    },
    getUser: async () => {
      try {
        const user = await api.call("users.getFullUser", {
          id: {
            _: "inputUserSelf",
          },
        });
        return user;
      } catch (error) {
        console.log("getUser Error" + JSON.stringify(error));
        return null;
      }
    },
    getPassword: () => {
      return api.call("account.getPassword");
    },
    sendCode: (phone) => {
      return api.call("auth.sendCode", {
        phone_number: phone,
        settings: {
          _: "codeSettings",
        },
      });
    },
    signIn: ({ code, phone, phone_code_hash }) => {
      return api.call("auth.signIn", {
        phone_code: code,
        phone_number: phone,
        phone_code_hash: phone_code_hash,
      });
    },
    getChats: async () => {
      const dialogs = await api.call("messages.getAllChats", {
        except_ids: [],
        offset_peer: {
          _: "inputPeerEmpty",
        },
      });
      return dialogs.chats;
    },
    forwardMessage: async (message, outputChannel) => {
      const forward = await api.call("messages.forwardMessages", {
        silent: false,
        background: false,
        from_peer: {
          _: "inputPeerChannelFromMessage",
          peer: {
            _: "inputPeerEmpty",
          },
          msg_id: message.id,
          channel_id: message.chatId,
        },
        id: message,
        to_peer: {
          _: "inputPeerChannel",
          peer: {
            _: "inputPeerEmpty",
          },
          msg_id: message.id,
          channel_id: message.chatId,
        },
      });
      console.log(forward);
      return forward;
    },
    mtproto,
    api,
  };
}
module.exports = TelegramApi;
