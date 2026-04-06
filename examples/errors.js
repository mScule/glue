// Intrinsics
const attempt = function(f) {let result = null;let err = null;try {result = f();} catch (e) {err = { msg: e + "" };}return [result, err];};const fail = function (msg) {throw msg};const print = function (v) {console.log(v);};

// Compiled code
let possibly_crashing = function(crashes){if ((crashes)){fail("Crash happened!!")};return {name:"Mike",age:50}};let [res1,err1] = attempt(function(){return possibly_crashing(true)});if (err1){print("First run failed with: " + err1.msg)};let [res2] = attempt(function(){return possibly_crashing(false)});print("Name " + res2.name + " Age " + res2.age)
