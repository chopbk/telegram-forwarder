// TODO

const api_id = "1519384";
const api_hash = "c311ca044eac056e5b57e0cd4f94dbfc";
// 1. Create an instance
const { MTProto } = require("@mtproto/core");
const { getSRPParams } = require("@mtproto/core");
const readline = require("readline");
const { pluck } = require("ramda");
const mtproto = new MTProto({
  api_id: api_id,
  api_hash: api_hash,
});
const prompt = require("prompt");
const input = (cfg) =>
  new Promise((rs, rj) =>
    prompt.get(cfg, (err, res) => (err ? rj(err) : rs(res)))
  );
const inputField = (field) =>
  input([{ name: field, required: true }]).then((res) => res[field]);
prompt.start();
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
};
function sendCode(phone) {
  return api.call("auth.sendCode", {
    phone_number: phone,
    settings: {
      _: "codeSettings",
    },
  });
}
function signIn({ code, phone, phone_code_hash }) {
  return api.call("auth.signIn", {
    phone_code: code,
    phone_number: phone,
    phone_code_hash: phone_code_hash,
  });
}
function getPassword() {
  return api.call("account.getPassword");
}
async function getUser() {
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
}
function checkPassword({ srp_id, A, M1 }) {
  return api.call("auth.checkPassword", {
    password: {
      _: "inputCheckPasswordSRP",
      srp_id,
      A,
      M1,
    },
  });
}
const selectChat = async (chats) => {
  const chatNames = pluck("title", chats);
  console.log("Your chat list");
  chatNames.map((name, id) => console.log(`${id}  ${name}`));
  console.log("Select chat by index");
  const chatIndex = await inputField("index");
  return chats[+chatIndex];
};
const getChat = async () => {
  const dialogs = await api.call("messages.getAllChats", {
    except_ids: [],
    // offset_peer: {
    //   _: "inputPeerEmpty",
    // },
  });
  const { chats } = dialogs;
  const selectedChat = await selectChat(chats);
  console.log(selectedChat);
  return selectedChat;
};
const askForCode = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Please enter passcode for " + phone.num + ":\n", (num) => {
      rl.close();
      resolve(num);
    });
  });
};
const phone = "+84359637220";
const password = "87654321";
(async () => {
  const user = await getUser();

  if (!user) {
    const { phone_code_hash } = await sendCode(phone);
    console.log(phone_code_hash);
    let code = await askForCode();
    try {
      const authResult = await signIn({
        code,
        phone,
        phone_code_hash,
      });

      console.log(`authResult:`, authResult);
    } catch (error) {
      if (error.error_message !== "SESSION_PASSWORD_NEEDED") {
        return;
      }

      // 2FA

      const { srp_id, current_algo, srp_B } = await getPassword();
      const { g, p, salt1, salt2 } = current_algo;

      const { A, M1 } = await getSRPParams({
        g,
        p,
        salt1,
        salt2,
        gB: srp_B,
        password,
      });

      const authResult = await checkPassword({ srp_id, A, M1 });

      console.log(`authResult:`, authResult);
    }
  }
  await getChat();
})();
