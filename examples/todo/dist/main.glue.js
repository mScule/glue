"use-strict";

// Intrinsics
const attempt = function(f) {let result = null;let err = null;try {result = f();} catch (e) {err = { msg: e + "" };}return [result, err];};const fail = function (msg) {throw msg};const print = function (v) {console.log(v);};

// Compilation
const express = require("express");const config = require(process.cwd() + "/" + "config");let app = express();app.get("/",function(req,res){res.send("Hello world!")});app.listen(config.port,function(){print("Example app listening on port" + config.port)})

// Exports
module.exports = {}