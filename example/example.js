/* code dependencies */
const foo = require('./foo')

/* package dependencies */
const _ = require('lodash')

async function main(args) {
   let a = 2;

    // cfun require(./foo.js as foo,lodash as _) assign(value,a,fooBefore) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
    await new Promise(resolve => setTimeout(resolve, 5000));
    const foo1 = foo.fun(a);
    a = 43;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2);
    // cfunend

    return { a: a, value: value, foo1: foo1, foo2: foo.fun(a) }
}

main().then(response => { console.log(response) });
