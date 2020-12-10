const dotenv = require("dotenv");
dotenv.config();
const { getSRPParams } = require("@mtproto/core");
const TelegramAPI = require("./telegram-api");

const api_id = process.env.api_id;
const api_hash = process.env.api_hash;
let inputInfo = {};
let outputInfo = {};
const {
  getPhone,
  getCode,
  getPassword,
  getNumberChoice,
} = require("./helper/input");
let telegramApi = new TelegramAPI({
  api_id: api_id,
  api_hash: api_hash,
});
const getInputOutputChannel = async () => {
  console.log("Your chat list");
  let chats = await telegramApi.getChats();
  for (let i = 0; i < chats.length; i++) {
    console.log(`${i} -- ${chats[i].id} -- ${chats[i].title} `);
  }
  console.log("Enter the number of Input Channel");
  let input = await getNumberChoice();

  inputInfo = {
    id: chats[input].id,
    title: chats[input].title,
    access_hash: chats[input].access_hash,
  };
  console.log("Enter the number of Output Channel");
  let output = await getNumberChoice();
  outputInfo = {
    id: chats[output].id,
    title: chats[output].title,
    access_hash: chats[output].access_hash,
  };
  return;
};
const startListen = async () => {
  telegramApi.mtproto.updates.on("updates", (data) => {
    let chats = data.chats;
    if (!!chats[0] && chats[0].id !== inputInfo.id) return;
    let updates = data.updates;
    const newChannelMessages = updates
      .filter((update) => update._ === "updateNewChannelMessage")
      .map(({ message }) => message); // filter `updateNewChannelMessage` types only and extract the 'message' object

    for (const message of newChannelMessages) {
      // printing new channel messages
      var today = new Date();
      console.log(today.toISOString());

      console.log(`[${message.to_id.channel_id}] ${message.message}`);
    }
  });
};

(async () => {
  const user = await telegramApi.getUser();
  if (!user) {
    // The user is not logged in
    console.log("[+] You must log in");
    const phone = await getPhone();
    const { phone_code_hash } = await telegramApi.sendCode(phone);
    const code = await getCode();
    try {
      const authResult = await telegramApi.signIn({
        code,
        phone,
        phone_code_hash,
      });
    } catch (error) {
      console.log(error.error_message);
      if (error.error_message === "SESSION_PASSWORD_NEEDED") {
        try {
          const {
            srp_id,
            current_algo,
            srp_B,
          } = await telegramApi.getPassword();
          const { salt1, salt2, g, p } = current_algo;
          let password = await getPassword();
          const { A, M1 } = await getSRPParams({
            g,
            p,
            salt1,
            salt2,
            gB: srp_B,
            password: password,
          });
          await telegramApi.checkPassword({ srp_id, A, M1 });
          return;
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
  await getInputOutputChannel();
  await startListen();
})();
