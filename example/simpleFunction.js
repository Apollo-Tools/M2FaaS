
const foo = require('./foo')

async function main(args) {
    var a = 2
    // cfun name(m2faasTest2) require(./foo.js as foo,opencv2 as opencv2) assign(value,a) vars(a) install(opencv2)
    a = 10
    var value = 200
    foo.fun(22)
    // cfunend
    console.log(a)
    console.log(value)
    return foo.fun(22)
}

console.log(main())
