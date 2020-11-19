// TODO

const api_id = "1519384";
const api_hash = "c311ca044eac056e5b57e0cd4f94dbfc";
// 1. Create an instance

const { getSRPParams } = require("@mtproto/core");
const readline = require("readline");
const TelegramAPI = require("./telegram-api");
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
  let telegramApi = new TelegramAPI({
    api_id: api_id,
    api_hash: api_hash,
  });
  const user = await telegramApi.getUser();
  if (!user) {
    const { phone_code_hash } = await telegramApi.sendCode(phone);
    console.log(phone_code_hash);
    let code = await askForCode();
    try {
      const authResult = await telegramApi.signIn({
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

      const { srp_id, current_algo, srp_B } = await telegramApi.getPassword();
      const { g, p, salt1, salt2 } = current_algo;

      const { A, M1 } = await getSRPParams({
        g,
        p,
        salt1,
        salt2,
        gB: srp_B,
        password,
      });

      const authResult = await telegramApi.checkPassword({ srp_id, A, M1 });

      console.log(`authResult:`, authResult);
    }
  }
})();
