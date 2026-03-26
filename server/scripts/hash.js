import bcrypt from "bcrypt";

const password = "root1234";
const saltRounds = 12;

bcrypt
  .hash(password, saltRounds)
  .then((hash) => {
    console.log("Hash:", hash);
  })
  .catch((err) => {
    console.error(err);
  });
