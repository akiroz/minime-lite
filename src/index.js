Promise.all([
    require("./billing").init(),
    require("./allnet").init(),
    require("./aime").init(),
    require("./chunithm").init(),
]).then(() => {
    console.log("Startup OK");
});