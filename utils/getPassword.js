exports.readPassword = function (prompt, callback) {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (prompt) {
        stdout.write(prompt);
    }

    stdin.resume();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = "";

    function escaping(...args) {
        stdin.removeListener("data", readingInput);
        stdin.pause();
        callback(...args);
    }

    function readingInput(data) {
        switch (data) {
            case "\x03":
                stdin.removeListener("data", readingInput);
                stdin.setRawMode(false);
                stdin.pause();
                break;
            case "\x0A":
            case "\x0D":
            case "\x04":
                stdout.write('\n');
                stdin.setRawMode(false);
                stdin.pause();
                escaping(false, password);
                break;
            case "\x08":
            case "\x7f":
                password = password.slice(0, password.length - 1);
                stdout.clearLine();
                stdout.cursorTo(0);
                stdout.write(prompt);
                for (let i = 0; i < password.length; i++) {
                    stdout.write("*");
                }
                break;
            default:
                let str = "";
                for (let i = 0; i < data.length; i++) {
                    str += "*";
                }
                stdout.write(str);
                password += data;
        }
    }

    stdin.on('data', readingInput);
};