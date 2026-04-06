// Intrinsics
const attempt = function(f) {let result = null;let err = null;try {result = f();} catch (e) {err = { msg: e + "" };}return [result, err];};const fail = function (msg) {throw msg};const print = function (v) {console.log(v);};

// Compiled code
let AGE_LIMIT = 18;let user = function(name,age){return {name:name || "",age:age || 0}};let is_old_enough = function(user){return user.age >= AGE_LIMIT};let bounce = function(user){if (!is_old_enough(user)){return user.name + " has to wait for " + (AGE_LIMIT - user.age)};return user.name + " is old enough. Welcome!"};let users = [user("Baby"),user("Mike",15),user("Jack",20),user("Bill",30),user("Granpa",100)];for (let user of users){console.log(bounce(user))}
