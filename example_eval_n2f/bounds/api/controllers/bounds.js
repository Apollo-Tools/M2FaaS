'use strict';

exports.cpu = async function(req, res) {
  var result = 0;
  // cfun assign(result) vars(req,result) deploy([{"name": "M2FaaS_CPU_US_EAST", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_CPU_EU_CENTRAL", "provider": "aws", "region": "eu-central-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_CPU_EU_GB", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
  for (var x in req.params){
    for (var i = 0; i < parseInt(req.params[x]); i++) {
      result = parseInt(result)*1 + parseInt(req.params[x])*1;
    }
  }
  // cfunend
  res.json(result);
} ;

exports.memory = function(req, res) {
  var result = new Array();
  // cfun assign(result) vars(req,result) deploy([{"name": "M2FaaS_MEMORY_US_EAST", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_MEMORY_EU_CENTRAL", "provider": "aws", "region": "eu-central-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_MEMORY_EU_GB", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
  for (var x = 0; x < parseInt(req.params["a"]); x++) {
    result[x] = new Array();
    for (var i = 0; i < parseInt(req.params["b"]); i++) {
      result[x][i] = x+i;
    }
  }
  result = eval(result.join("+"));
  // cfunend
  res.json(result);
};

exports.io = function(req, res) {
  var prefix = Math.floor(Math.random()*1000);
  var result = 0;
  // cfun assign(result) vars(req,result,prefix) deploy([{"name": "M2FaaS_IO_US_EAST", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_IO_EU_CENTRAL", "provider": "aws", "region": "eu-central-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"},{"name": "M2FaaS_IO_EU_GB", "provider": "ibm", "region": "eu-gb", "memorySize": 128, "runtime": "nodejs:12", "timeout": 60 }])
  const fs = require("fs");
  for (var x = 0; x < parseInt(req.params["a"]); x++) {
    for (var i = 0; i < parseInt(req.params["b"]); i++) {
      fs.writeFileSync("/tmp/"+prefix+x+i, "Node2FaaSTest", function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("The file was saved!");
      });
      fs.unlinkSync("/tmp/"+prefix+x+i);
      result++;
    }
  }
  // cfunend
  res.json(result);
};
