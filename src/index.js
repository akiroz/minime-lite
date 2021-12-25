if(process.platform === "win32" && !process.stdout.isTTY) {
    require('child_process').spawn("cmd.exe", ["/c", process.argv[0]]);
    process.exit(0);
} else {
    Promise.all([
        require("./billing").init(),
        require("./allnet").init(),
        require("./aime").init(),
        require("./chunithm").init(),
        require("./ongeki").init(),
    ]).then(() => {
        console.log("Startup OK");
    });
}