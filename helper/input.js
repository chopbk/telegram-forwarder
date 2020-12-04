const prompts = require("prompts");
async function getPhone() {
  return (
    await prompts({
      type: "text",
      name: "phone",
      message: "Enter your phone number:",
    })
  ).phone;
}

async function getCode() {
  // you can implement your code fetching strategy here
  return (
    await prompts({
      type: "text",
      name: "code",
      message: "Enter the code sent:",
    })
  ).code;
}

async function getPassword() {
  return (
    await prompts({
      type: "text",
      name: "password",
      message: "Enter Password:",
    })
  ).password;
}
async function getNumberChoice() {
  return (
    await prompts({
      type: "text",
      name: "number",
      message: "Enter Number Choice:",
    })
  ).number;
}

module.exports = {
  getPhone,
  getCode,
  getPassword,
  getNumberChoice,
};
