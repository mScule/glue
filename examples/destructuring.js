// Intrinsics
const attempt = function(f) {let result = null;let err = null;try {result = f();} catch (e) {err = { msg: e + "" };}return [result, err];};const fail = function (msg) {throw msg};const print = function (v) {console.log(v);};

// Compiled code
let some_func = function(a,b,c){return [a + 10,b + 20,c + 30]};let [a,b,c] = some_func(10,20,30);console.log(a);console.log(b);console.log(c)
