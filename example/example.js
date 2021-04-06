const foo = require('./foo')
const _ = require('lodash')

async function main(args) {
    let a = 2;

    // cfun name(m2faasExample) require(./foo.js as foo,lodash as _) assign(value,a,fooBefore) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
    var fooBefore = foo.fun(a);
    a = 122;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2);
    // cfunend

    return { a: a, value: value, foo_before: fooBefore, foo_after: foo.fun(a) }
}

main().then(response => {
    console.log(response)
});
