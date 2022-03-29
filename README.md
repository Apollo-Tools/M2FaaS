<h1 align="center">M2FaaS (Monolith-to-FaaS)</h1>

## Prerequisite

- Installed and configured ``AWS CLI`` and ``ÌBM CLI``.
- Node.js version >= 10.2.0

## Install



````js
npm i m2faas -g
````
      
## Usage

#### 1. Add annotations to the monolith

Enclose your code block with annotations:

````js
//cfun ...
    <code_block>
//cfunend
````

#### 2. Run M2FaaS


````
m2faas example/
````

#### 3. Run the generated monolith

````
cd out && npm install
node your_code.js
````

------------------

### Annotations

#### Include external package(s): `require`

````js
//cfun require(./foo.js as foo,lodash as _)
const fooBefore = foo.fun(12);
const value = _.chunk(['a', 'b', 'c', 'd'], 2);
// cfunend
````

#### Install external NPM package(s): `install`

````js
//cfun install(lodash)
const value = _.chunk(['a', 'b', 'c', 'd'], 2);
// cfunend
````

#### Make variable(s) accessible after function call: `assign`

````js
let value1 = 5;
//cfun assign(value1,value2)
value1 = 12;
const value2 = 34;
// cfunend
const sum = value1 + value2;
````

#### Value declared outside of the function scope: `vars`

````js
let value1 = 2;
//cfun vars(value1)
value1 = 12;
// cfunend
````

#### Deployment details of the cloud function(s): `deploy`

`deploy` allows to specify an ordered list of deployments. All of the specified configurations will be deployed. 

This annotation also specifies the fault tolerance of the execution. If the cloud function call to the first function fails, the next cloud function in the list will be invoked.

The deployment configuration is represented as a json-array:

````json
[
  {
    "name": "m2FaaSExampleAWS",                       
    "provider": "aws",                                
    "region": "us-east-1",                           
    "memorySize": 128,                           
    "runtime": "nodejs14.x",                        
    "timeout": 3,                                   
    "role": "arn:aws:iam::xxxxxxxxxxx:role/service-role/xxxxxxx"
  },
  {
    "name": "m2FaaSExampleIBM",                       
    "provider": "ibm",                                
    "region": "eu-gb",
    "memorySize": 128,
    "runtime": "nodejs:12", 
    "timeout": 60
  }
]
````

``region``, ``memorySize``, ``runtime``, ``timeout`` represents optional values. If no specified, default values will be used.

````js
//cfun deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
...
// cfunend
````

## Example

The [example](example) monolithic project consists of three files:

- [package.json](example/package.json) contains the dependencies of the monolithic application.
- [foo.js](example/foo.js) contains a a simple nodeJs function.
- [example.js](example/example.js) is the starting point of the application:


[example.js](example/example.js):
````js
const foo = require('./foo')
const _ = require('lodash')

async function main(args) {
   let a = 2;

    // cfun require(./foo.js as foo,lodash as _) assign(value,a,foo1) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
    await new Promise(resolve => setTimeout(resolve, 5000));
    const foo1 = foo.fun(a);
    a = 43;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2);
    // cfunend

    return { a: a, value: value, foo1: foo1, foo2: foo.fun(a) }
}

main().then(response => { console.log(response) });
````

The annotated code has the following specialities:

- The code block, which should be FaaSified, has two external dependencies: **./foo.js** represents a local code dependency, while **lodash** represents an external package dependency. 
- After the FaaSification the variables **value**, **a** and **foo1** need to be available.
- The variable **a** is not declared in the code block and therefore an input to the cloud function.

----------

The tool generates a **foo.js** file to solve the local dependency and a **package.json** for the external dependency. 

##### AWS Lambda Function

The generated lambda function:

```js
const foo = require("./foo.js")
const _ = require("lodash")

exports.handler = async (event) => {
  let a = event.a

  // cfun require(./foo.js as foo,lodash as _) assign(value,a,foo1) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const foo1 = foo.fun(a)
  a = 43
  const value = _.chunk(["a", "b", "c", "d"], 2)

  return (response = {
    statusCode: 200,
    body: { value: value, a: a, foo1: foo1 },
  })
}

```

##### IBM Cloud Function

Starting point of the IBM function:

```js
const foo = require("./foo.js")
const _ = require("lodash")

async function main(event) {
  let a = event.a

  // cfun require(./foo.js as foo,lodash as _) assign(value,a,foo1) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
  await new Promise((resolve) => setTimeout(resolve, 5000))
  const foo1 = foo.fun(a)
  a = 43
  const value = _.chunk(["a", "b", "c", "d"], 2)

  return { value: value, a: a, foo1: foo1 }
}
exports.main = main
```

##### Adapted Monolith

The code block is replaced by a cloud function call:

```js
const foo = require('./foo')
const _ = require('lodash')

async function main(args) {
   let a = 2;

    // cfun require(./foo.js as foo,lodash as _) assign(value,a,foo1) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
    /* await new Promise(resolve => setTimeout(resolve, 5000));
    const foo1 = foo.fun(a);
    a = 43;
    const value = _.chunk(['a', 'b', 'c', 'd'], 2); */
    // cfunend
    
    try {
        m2FaaSExampleIBMResult = await require('./m2faaSInvoker').invoke({ a: a,  }, [{"name":"m2FaaSExampleAWS","provider":"aws","region":"us-east-1"},{"name":"m2FaaSExampleIBM","provider":"ibm","region":"eu-gb"}]);
    } catch (e) {
        m2FaaSExampleIBMResult = await async function() {     // cfun require(./foo.js as foo,lodash as _) assign(value,a,foo1) vars(a) install(lodash) deploy([{"name": "m2FaaSExampleAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 3, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "m2FaaSExampleIBM", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            const foo1 = foo.fun(a);
            a = 43;
            const value = _.chunk(['a', 'b', 'c', 'd'], 2);
            
            return { value: value, a: a, foo1: foo1,  } 
         }(); 
    } 
    value = m2FaaSExampleIBMResult.value
    a = m2FaaSExampleIBMResult.a
    foo1 = m2FaaSExampleIBMResult.foo1

    return { a: a, value: value, foo1: foo1, foo2: foo.fun(a) }
}

main().then(response => { console.log(response) });

```
