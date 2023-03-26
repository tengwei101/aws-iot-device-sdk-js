var awsIoT = require("aws-iot-device-sdk");
var AWS = require("aws-sdk");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

AWS.config.update({
  region: "ap-southeast-1",
  endpoint: "http://localhost:8000",
});

//--------------------------------User Sign Up-----------------------------------------
// After user sign up a new account
// Cognito should automatically assigned a new uid for each user
var uid = "6f889cfa-040b-4561-99c4-40dd08ea8242"; //patientID
//-------------------------------------------------------------------------------------
// In real world situation, it is not encouraged multiple devices connect to the same certificate due to security issues
// Each new user account, the system should automate the process of creating and assigning new certificate for each new user
var device = awsIoT.device({
  keyPath:
    "./cert/mobile/bc2a98628094ae20c9adfff0fa2bf774dd720bd446e4461d1bda32883ed3af9a-private.pem.key",
  certPath:
    "./cert/mobile/bc2a98628094ae20c9adfff0fa2bf774dd720bd446e4461d1bda32883ed3af9a-certificate.pem.crt",
  caPath: "./cert/mobile/AmazonRootCA1.pem",
  clientId: `${uid}`,
  host: "a1kk0r0reeh5ui-ats.iot.ap-southeast-1.amazonaws.com",
  port: 8883,
});

//---------------------------------Login-------------------------------------
// require id_token in postman
const accessToken =
"eyJraWQiOiJleDV1UEs0cnpVWHlsdXBadmNmWWFsYVwvWG05ak43RWFGV1JneitCZEsxST0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoicDRZdXNTSEdJWXVydG1LVWo0VjZBZyIsInN1YiI6ImI2NGQ1YTRjLTg3ZWEtNDliNy05YzU5LTRjYWRiODFlNDUzZSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbVwvYXAtc291dGhlYXN0LTFfR2NUQ1c4RUY4IiwiY29nbml0bzp1c2VybmFtZSI6ImI2NGQ1YTRjLTg3ZWEtNDliNy05YzU5LTRjYWRiODFlNDUzZSIsImF1ZCI6InE4NTY1YTdqamMybzIzY2o4ZHAzZzNvOXUiLCJldmVudF9pZCI6ImRlYWE4MmE0LTQ1NWQtNDE4NS1hZTRjLWUxZjA2Y2UxOTVmOSIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjc5NzI3NTAyLCJleHAiOjE2Nzk3MzExMDIsImlhdCI6MTY3OTcyNzUwMiwianRpIjoiNTgxOWIxMTItYTQ4Zi00OTAyLTg5NDQtNmQ5NjI2OWM2OTU5IiwiZW1haWwiOiJ0ZW5nd2VpMTAxQGdtYWlsLmNvbSJ9.ndQ9-3QcwnYtZeyBd8NHD35EfACVderhyPILIceM7Mc5q5rYvXZNBizfXr6jhOz-KHJ0Mga5twCx1S3BwL6pnm7Ukg59xgj2q7Gdy1w97BqhMuAMbLhNXTTuxIX-80sUsxojL_4Y3EgJ5AImRPFPbFBuHFeuoy_yyhO6TvQ8OHeYDbROiIYjePxHcEbxhX0WsNQGhsUPmnukcctCwmP423unnWYhJ0v3OEHcFAlgq9PRSFZ0iYqwq-fyIGEi1OJF_fpjHSDYwFYTkZx6b97O0y_YUMURToDIJcWQN7jGyHsGoJ00Z8LKzM6AXWuWT2U9ZtJ_pfElb5mf4seb_bzJcA"
// uid = "622af3b7-43b0-438a-95d6-b3240f6ead48"
//---------------------------------------------------------------------------

//---------------------------------User Interface-------------------------------------
var input = "5540a8ae-64ef-404b-aaa1-da010de7a638"; // sensor uid
var consecutiveHighBPM = 0;
var userEmail = "tengwei101@1utar.my";

//------------------------------------------------------------------------------------

//--------------------------------Backend process-------------------------------------
// subscription to a topic
device.on("connect", async function () {
  console.log("connect");
  device.subscribe(`DCS/pulseSensor/${input}`);
  console.log("subscribe");
});

device.on("message", async function (topic, payload) {
  console.log("message", topic, payload.toString());
  const message = JSON.parse(payload);
  console.log(message.timeStamp, message.bpm);

  // compare bpm
  if (message.bpm < 60 || message.bpm > 100) {
    consecutiveHighBPM++;
    console.log("Dangerous BPM:", consecutiveHighBPM);
  } else {
    consecutiveHighBPM = 0;
  }

  // Store into dynamodb through API Gateway
  var xhttp = new XMLHttpRequest();
  xhttp.open(
    "PUT",
    "https://8tm1jwrb5a.execute-api.ap-southeast-1.amazonaws.com/AI-Healthcare/demo-dynamodb",
    true
  );
  xhttp.setRequestHeader("Authorization", "Bearer " + accessToken);
  xhttp.setRequestHeader("Content-type", "application/json");
  xhttp.onload = () => {
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      console.log("Done");
    }
  };

  var iotData = {
    operation: "update",
    tableName: "patient",
    payload: {
      Key: {
        patientID: `${uid}`,
      },
      UpdateExpression: "SET pulse = list_append(pulse, :p)",
      ExpressionAttributeValues: {
        ":p": [
          {
            timeStamp: message.timeStamp,
            bpm: message.bpm,
          },
        ],
      },
      ReturnValues: "UPDATED_NEW",
    },
  };

  xhttp.send(JSON.stringify(iotData));

  if (consecutiveHighBPM >= 1) {  //the consecitiveHighBPM will increase once the dangerous BPM continously happen
    var xhr = new XMLHttpRequest();


    var notification_message = 'Urgent Message! A patient has sustained high BPM. Patient Email: ' + userEmail + '. Patient ID: ' + uid + '.';

    xhr.open("POST", "https://8tm1jwrb5a.execute-api.ap-southeast-1.amazonaws.com/AI-Healthcare/demo-sns?message=" + encodeURIComponent(notification_message),
    true
  );
    xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onload = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        console.log("Done");
      }
    };

    xhr.onerror = function() {
      console.log("Error: failed to send notification");
    };


    xhr.send();
    
    // try this application/json
    // {
    //   "message": {}
    // }
  }
});

device.on("error", function (topic, payload) {
  console.log("Error:", topic, payload.toString());
});

//------------------------------------------------------------------------------------
