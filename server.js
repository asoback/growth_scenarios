// TODO
var fs = require("fs");
var host = "127.0.0.1";
var port = 3000;
var express = require("express");

var app = express();
app.use(express.static(__dirname)); //use static files in ROOT/public folder

app.get("/", function(request, response){ //root dir
    response.sendFile(__dirname + '/index.html');
});

app.listen(port, host);