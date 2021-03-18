<h1 align="center">M2FaaS (Monolith-to-FaaS)</h1>

## Install

TBA

## Usage

TBA

## Example

The [example](example) monolithic project consists of three files:

- [package.json](example/package.json) contains the dependencies of the monolithic application.
- [foo.js](example/foo.js) contains a a simple nodeJs function.
- [example.js](example/example.js) is the starting point of the application:

````js
const foo = require('./foo')
const _ = require('lodash')

function main(args) {
    let a = 2;

    // cfun name(m2faasExample) require(./foo.js as foo,_ as lodash) assign(value,a,fooBefore) vars(a) install(lodash)
    var fooBefore = foo.fun(a);
    a = 10;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2);
    // cfunend

    return { a: a, value: value, foo_before: fooBefore, foo_after: foo.fun(a) }
}

console.log(main())
````

The annotated code has the following specialities:

- The cloud function will be named **m2faasExample**.
- The code block, which should be FaaSified, has two external dependencies: **./foo.js** represents a local dependency, while **lodash** represents an external dependency. 
- After the FaaSification the variables **value**, **a** and **fooBefore** need to be available.
- The variable **a** is not declared in the code block and therefore an input to the cloud function.
- The **lodash** package is used in the code block.

##### AWS Lambda Function

The tool generates a **foo.js** file for the local dependencies and a **package.json** for external dependencies. 

Starting point of the lambda function:
```js
const foo = require("./foo.js")                             // due to require('./foo')
const lodash = require("_")                                 // due to require('lodash')

exports.handler = async (event) => {
  let a = event.a                                           // due to vars(a)

  var fooBefore = foo.fun(a)
  a = 10
  const value = _.chunk(["a", "b", "c", "d"], 2)

  return (response = {
    statusCode: 200,
    body: { value: value, a: a, fooBefore: fooBefore },     // due to assign(value,a,fooBefore)
  })
}
```

##### Adapted Monolith

The code block is replaced by a cloud function call:

```js
const foo = require('./foo')
const _ = require('lodash')

function main(args) {
    let a = 2;

    // cfun name(m2faasExample) require(./foo.js as foo,_ as lodash) assign(value,a,fooBefore) vars(a) install(lodash)
/*
    var fooBefore = foo.fun(a);
    a = 10;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2); 
*/ 
    // cfunend
var awsSDK = require('aws-sdk');
var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});
let m2faasExampleSolution = JSON.parse(await (new (require('aws-sdk'))
    .Lambda({ accessKeyId: credentialsAmazon.accessKeyId, secretAccessKey: credentialsAmazon.secretAccessKey, region: 'us-east-1' }))
    .invoke({
        FunctionName: "m2faasExample",
        Payload: JSON.stringify({ a: a })                                           // due to vars(a)
    })
    .promise().then(p => p.Payload));
value = m2faasExampleSolution.body.value;                                           // due to assign(value)
a = m2faasExampleSolution.body.a;                                                   // due to assign(a)
fooBefore = m2faasExampleSolution.body.fooBefore;                                   // due to assign(fooBefore)

    return { a: a, value: value, foo_before: fooBefore, foo_after: foo.fun(a) }
}

console.log(main())
```
