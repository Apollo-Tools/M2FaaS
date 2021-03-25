const foo = require('./foo')
const _ = require('lodash')

async function main(args) {
    let a = 2;

    // cfun name(m2faasExample) require(./foo.js as foo,lodash as _) assign(value,a,fooBefore) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws" },{"name": "m2FaaSExampleIBM", "provider": "ibm" }])
    var fooBefore = foo.fun(a);
    a = 12;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2);
    // cfunend

    return { a: a, value: value, foo_before: fooBefore, foo_after: foo.fun(a) }
}

main().then(response => {
    console.log(response)
});
