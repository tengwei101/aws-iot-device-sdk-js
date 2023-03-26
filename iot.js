// Every IoTs have their own unique id
// Once the patients buy the sensor, they should get the uid
// This uid will decide the path to publish a mqtt topic

var awsIoT = require("aws-iot-device-sdk");
var moment = require("moment");
var lodash = require("lodash");

var uid = "5540a8ae-64ef-404b-aaa1-da010de7a638"; // IoT sensor uid

var sensor = awsIoT.device({
  keyPath:
    "./cert/sensor/859d7ecb84994c93b3ce1ae54e08c1c4d5c63f42d3691509297ce15b69ee7547-private.pem.key",
  certPath:
    "./cert/sensor/859d7ecb84994c93b3ce1ae54e08c1c4d5c63f42d3691509297ce15b69ee7547-certificate.pem.crt",
  caPath: "./cert/sensor/AmazonRootCA1.pem",
  clientId: `${uid}`,
  host: "a1kk0r0reeh5ui-ats.iot.ap-southeast-1.amazonaws.com", //device endpoint
  port: 8883,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



sensor.on("connect", async function () {
  console.log("connect");
  while (true) {
    timeStamp = moment().local().format();

    var formatTimeStamp = timeStamp.slice(0, -6); // returns "2023-03-09T01:30:00"
    sensor.publish(
      `DCS/pulseSensor/${uid}`,
      JSON.stringify({
        timeStamp: formatTimeStamp,
        

        //Use to test normal heart pulse rate
        bpm: lodash.random(60, 130),

        //Use to test high heart pulse rate (For Notification Testing)
        // bpm: lodash.random(101, 150),
      })
    );

    console.log("Message sent...");
    await sleep(5000);
  }
});
