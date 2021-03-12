
const foo = require('./foo')

function main(args) {
    var a = 2
    // cfun name(myfun) require(./foo.js as foo,opencv2 as opencv2) assign(value,a) vars(a) install(opencv2)
    a = 10
    var value = 200
    foo.fun(22)
    // cfunend
    return foo.fun(22)
}

console.log(main())
