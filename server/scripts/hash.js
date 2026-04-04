import bcrypt from "bcrypt";

const saltRounds = 12;

function getHiddenInput(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";

    const onData = (char) => {
      if (char === "\r" || char === "\n") {
        process.stdout.write("\n");
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        resolve(input);
      } else if (char === "\u0003") {
        process.exit();
      } else if (char === "\u007F") {
        input = input.slice(0, -1);
        process.stdout.write("\b \b");
      } else {
        input += char;
      }
    };

    stdin.on("data", onData);
  });
}

(async () => {
  const pass1 = await getHiddenInput("Enter password: ");
  const pass2 = await getHiddenInput("Confirm password: ");

  if (pass1 !== pass2) {
    console.log("Passwords do not match");
    process.exit(1);
  }

  if (!pass1) {
    console.log("Password cannot be empty");
    process.exit(1);
  }

  const hash = await bcrypt.hash(pass1, saltRounds);
  console.log("Hash:", hash);
})();
