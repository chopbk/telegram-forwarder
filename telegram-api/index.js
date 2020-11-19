const { MTProto } = require("@mtproto/core");
function TelegramApi(options = {}) {
  const mtproto = new MTProto(options);
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
  };
}
module.exports = TelegramApi;
