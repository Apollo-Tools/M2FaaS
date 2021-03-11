function main(args) {
    // cfun require(./foo.js as foo)
    var foo = require('./foo')
    var value = 200
    console.log(foo.fun(22))
    // cfunend
    return value
}

console.log(main())
