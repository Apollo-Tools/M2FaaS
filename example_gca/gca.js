const AWS = require('aws-sdk');
const Cloudant = require('@cloudant/cloudant');
const Utils = require("./utils");
const Config = require("./config");

async function getPassengers(flightID){

    // Connect to Cloudant and select database
    const cloudant = new Cloudant(Config.ibm_config);
    const db = cloudant.db.use('passenger');

    // Get all documents from the DB
    let allDocs = null;
    await db.list({ include_docs: true }).then(function(data) { allDocs = data; });

    let passengerIDs = [];
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.atAirport && allDocs.rows[i].doc.flightId === flightID){
            passengerIDs.push(allDocs.rows[i].id);
        }
    }
    return { passengerIDs: passengerIDs, passengersAtAirport: passengerIDs.length };
}

async function secCheckTime(securityGPS){
    const start = Date.now()
    AWS.config = new AWS.Config(Config.aws_config);
    const client = new AWS.Rekognition();
    const params = { Image: { S3Object: { Bucket: 'gcacameraimages', Name: "security_"+securityGPS+".jpg" }, }, MaxLabels: 100 }
    const array = [];
    await client.detectLabels(params, function (err, response) {
        if (err) { console.log(err, err.stack);
        } else { response.Labels.forEach(label => {}) }
    }).promise().then(data => {
        array.push(data.Labels);
    }).catch(error => {
        return error;
    });
    let persons = 0, delay = 0;
    try {
        array[0].forEach(function (el){
            if (el.Name === "Person"){
                persons = el.Instances.length;
            }
        });

        // Three minutes per person
        delay = persons * 3;
    }catch (e) {}

    console.log(Date.now() - start)

    return delay;
}

async function getGateGPS(gate){

    // Connect to Cloudant and select database
    const cloudant = new Cloudant(Config.ibm_config);
    const db = cloudant.db.use('gate');

    // Get all documents from the DB
    let allDocs = null;
    await db.list({include_docs:true}).then(function(data) { allDocs = data; });

    // Prepare inputs
    let gateGPS = "", secGPS = "";

    // Iterate over the data
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.gateName === gate){
            gateGPS = allDocs.rows[i].doc.gateGPS;
            secGPS = allDocs.rows[i].doc.secGPS;
        }
    }

    return {
        gateGPS: gateGPS,
        securityGPS: secGPS
    };
}

async function distanceGPS(params){
    const gps1 = params.gps1;
    const gps2 = params.gps2;

    const distanceInM = Utils.distanceInMBetweenEarthCoordinates(
        Number(gps1.split(", ")[0]),
        Number(gps1.split(", ")[1]),
        Number(gps2.split(", ")[0]),
        Number(gps2.split(", ")[1]));

    const delayInSec = distanceInM / 1.38889;
    const delayInMin = delayInSec / 60;

    return {
        "area": params.area,
        "delay": delayInMin
    };
}

async function readGPS(passengerId){

    // Connect to Cloudant and select database
    const cloudant = new Cloudant(Config.ibm_config);
    const db = cloudant.db.use('passenger');

    // Get doc by id
    const passenger = await db.get(passengerId);
    const passengerGPS = [];
    passengerGPS.push(Number(passenger.gpsLocation.split(", ")[0]));
    passengerGPS.push(Number(passenger.gpsLocation.split(", ")[1]));

    // Check if passenger inside security check
    const afterSecCheck = Utils.inside(
        passengerGPS,
        [
                [47.25756215011163, 11.350859214052116],
                [47.25783976426809, 11.350793499933715],
                [47.25793624622426, 11.351679969979884],
                [47.25766682447269, 11.351745684098283]
            ]
    );

    let area = 1;
    if(afterSecCheck){ area = 0; }

    return {
        passengerGPS: passenger.gpsLocation,
        area: area
    };
}

async function averageTime(results){
    let avgTimePublic = 0, avgTimeRestricted = 0, totalPublic = 0, totalRestricted = 0;
    for (let i = 0; i < results.length; i++) {
        const area = Number(results[i].area);
        const delay = Number(results[i].delay);
        if(area === 0){
            avgTimeRestricted += delay;
            totalRestricted++;
        }else if (area === 1){
            avgTimePublic += delay;
            totalPublic++;
        }
    }

    return {
        avgTimePublic: avgTimePublic/totalPublic,
        avgTimeRestricted: avgTimeRestricted/totalRestricted
    };
}

async function main(input){

    /* Parallel */
    const promGetPassengers = getPassengers(input.flightID);
    const promSecCheckTime = secCheckTime(input.securityGPS); // TODO
    const promGetGateGPS = getGateGPS(input.gateID);
    const resGetGateGPS = await promGetGateGPS;
    const promDistanceGPS = distanceGPS({
        "gps1": resGetGateGPS.gateGPS,
        "gps2": resGetGateGPS.securityGPS,
    });
    const resGetPassengers = await promGetPassengers;
    const resSecCheckTime = await promSecCheckTime;
    const resDistanceGPS = await promDistanceGPS;

    console.log("resGetGate: " + JSON.stringify(resGetGateGPS))
    console.log("resGetPassengers: " + JSON.stringify(resGetPassengers))
    console.log("resSecCheck: " + JSON.stringify(resSecCheckTime))
    console.log("resDisGPS: " + JSON.stringify(resDistanceGPS))

    /* ParallelFor */
    let avg = await Promise.all(resGetPassengers.passengerIDs.map(function (node) {
        return new Promise(async function (resolve, reject) {
            const resReadGPS = await readGPS(node);
            console.log("resreadGPS: " + JSON.stringify(resReadGPS))
            if(resReadGPS.area === 1){
                const resPassSec = await distanceGPS({
                        "gps1": resGetGateGPS.securityGPS,
                        "gps2": resReadGPS.passengerGPS,
                        "area": resReadGPS.area
                    });
                resolve({ "area": resReadGPS.area, "delay": (Number(resPassSec.delay) + Number(resSecCheckTime) + Number(resDistanceGPS.delay)) })
                console.log("resPassSec: " + JSON.stringify(resPassSec))
                console.log("resSumUp: " + JSON.stringify(resSumUp))
            }else{
                const resDistanceGPS = await  distanceGPS({
                    "gps1": resGetGateGPS.securityGPS,
                    "gps2": resReadGPS.passengerGPS,
                    "area": resReadGPS.area
                })
                resolve(resDistanceGPS);
                console.log("resDistanceGPS: " + JSON.stringify(resDistanceGPS))
            }
        })
    })).then(function (results) {
        console.log("result: "  + JSON.stringify(results))
        return averageTime(results);
    }).catch(function (error) {
        // handle error
    })

    return avg;
}

main({
    "flightID": "F121",
    "gateID": "G1",
    "securityGPS": "47.25762807043091, 11.351422424940244"
}).then(r => console.log("Result: " + JSON.stringify(r)))