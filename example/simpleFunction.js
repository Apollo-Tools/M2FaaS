

function main(args) {
    // cfun require(./foo.js as foo)
    var foo = require('./foo')
    var value = 200
    // cfunend
    return foo.fun(22)
}

console.log(main())
