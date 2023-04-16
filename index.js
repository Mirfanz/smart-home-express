const express = require("express");
const util = require("util");
const path = require("path");
const {
  Headers,
  SmartHomeV1ExecuteResponseCommands,
  smarthome,
} = require("actions-on-google");
const bodyParser = require("body-parser");

const firestore = require("../firestore.js");

const app = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false });

/**
 * A function that gets the user id from an access token.
 * Replace this functionality with your own OAuth provider.
 *
 * @param headers HTTP request headers
 * @return The user id
 */
async function getUser(headers) {
  const authorization = headers.authorization;
  const accessToken = authorization.substr(7);
  return await firestore.getUserId(accessToken);
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

let jwt;
try {
  jwt = require("../smart-home-key.json");
} catch (e) {
  console.warn("error reading service account key:", e);
  console.warn("reportState and requestSync operation will fail");
}

const smartApp = smarthome({
  jwt: {
    type: "service_account",
    project_id: "smart-home-87411",
    private_key_id: "3eec5f2e1920271135c4fdfc7145f27a27d1a68f",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7IGIzpB6KCNye\nv/WHlJl+m/tDdQg03XNhbb6LLr/geGG5GkGgxHJ+J3yheWN0F0WitQ3sNNhbDhOg\nYmFGJCNZbO0DjbVrOW2m6BvdXyb62tdVF0nVWW2paACzA1m2uhi18Dws6bRNU+05\nF7Bg+4t4x60c60ANw+mjoAf3eJCNumqq6SC6zJn9nPhhwQoVceznrYUptnIhjo8e\np8J7Va50pHPbUX3vtGMYKHbpuueoscoQLets8Okv+47XbWiHX9vB2ThVnnUCYp8A\n97xnrE1M1SNmJyRHbdEBh++xep9zeQxPwH58sAwCAvN/gKpSpFW2su4inbrudAdJ\npnwL7wxRAgMBAAECggEAEnCrRLgCW2tqpEk53qG964xe+yOMCruc7Ge2bHxPo8Tx\nKl7EQ13Ag56MCVSPQKgvcEyDwfhmLrjpJbe0KseSZTRW+e/rxhR7cgRzBIJlMrjA\nmg3ItJnStOw/D2T/4QIfP8ScBXgFUM55tNPZCYGYWa9hp5UmM4UQH9P8HP64TgL6\naZQakundfbxOB4PQe4/xWEQqcFEy/K8N4F+/wfXKw1nneVeF6UVeO4aXT/j2yq9w\n4o44DQ929UcFp6UwFRMSrp6em3i9Dt06DPg1v/aLNrXROwTOP7g2J5OtpWWKHrP8\nPfuS2rarL121m4BG6C6tiz60LeTgd/FkNcvEWGA1XQKBgQD/sQ2KyuFU7n/tmOM9\nEGrLz+dLTUECBA4+3OcVgAb+xIV/a5LB57qLs9aTMiX0c8o7X4mt9ayI4hTNZUDt\nrgV5KyozmH1ykGS7nbJXGGRbeZ5N/Li50K3Mpvr/5eZukHzBi9DBhv6TVLE5on8+\ntSoKQ72iuoLbPycQ/sGaTYAEDQKBgQC7WikdLPS3s5q/Vql/O4jkVmTao3ZEqlZ2\nRhF+r0cB2rn4jyOyClLKqXezq/8Ir2kEK784ZBI40GT9S2mvCJjL+05Hp/UydtEC\nlgJEly9SWK2f9Hbl4SxL6TBhVDKwDzqHHgsx2rU7MfngbIYgT+kJqTHTn3qO8mK6\nVK+UzvOEVQKBgQClPFX0C4fyyu4BLXwsSh+59nESSKpqExThqv/q9QGQQo/C+FGu\n3YHAJkfUd+PvRaS7GdJviQQmsXOgCH8dGgiPdUWgcjsffhCa7h4CCtFQDBgxbdAy\nxJiMWJx8IqX3bYgxy5jsd8CslV6yUEDK1WiFmaFDOCS4audkJD4Y6VyBQQKBgCXX\nRxiafO8huq7M3T1SlAqynHpAq+GgmggXjO8OjgQE3q0ilC4gwaonYoMKyV9Ctq5d\n+6hzJe8NwGgctELjNKF2p8/3T6Iat4qTK/AYrTkvqhn1sZIq0dyfQ+NUs0w2NzcV\nTWOLbjF/nZ3Dra+XFFWcM/Evc/ytXl2OP0yKJEtlAoGAIV9bL2dZGDXdkS0DqoDE\nhUseQUpiLrt7dpfd8qw8dlAySWjXA1S15Oa6jcD3zg8Z9P5S2En0SOJibZFZYmXJ\ncxd772gfG5SBcrsh13jU8JVEOlaGhhlTqX8FnnwPThGHzVMiXuTIXxTolxuJDYIw\n1UI/wSvjIymUH2s87ULiff0=\n-----END PRIVATE KEY-----\n",
    client_email: "smart-jordi@smart-home-87411.iam.gserviceaccount.com",
    client_id: "109806577480623332910",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/smart-jordi%40smart-home-87411.iam.gserviceaccount.com",
  },
  project_id: "smart-home-87411",
  debug: true,
});

app.get("/login", (req, res) => {
  res.send(`
  <html>
    <body>
      <h1>Login Smart Jordi</h1>
      <form action="/login" method="post">
        <input type="hidden" name="response_url" value="${req.query.response_url}" />
        <button type="submit" style="font-size:14pt">Link this service to Google</button>
      </form>
    </body>
  </html>
  `);
});
app.get("/privacy", async (req, res) => {
  // console.log(await firestore.getUserId("1234access"));
  res.send(`<html>
  <body>
  <h1>Privacy Police</h1>
  <ul>
  <li>Hanya untuk percobaan</li>
  </ul>
  </body>
  </html>
  `);
});

app.post("/login", urlencodedParser, async (req, res) => {
  console.debug("/login", req.query, req.body);
  console.log(req);
  // Here, you should validate the user account.
  // In this sample, we do not do that.
  const responseUrl = decodeURIComponent(req.body?.response_url);
  console.debug("redirect:", responseUrl);
  return res.redirect(responseUrl);
});

app.get("/fakeauth", async (req, res) => {
  console.debug("/fakeauth", req.query);
  const responseUrl = `${req.query?.redirect_uri}?code=${"xxxxxx"}&state=${
    req.query?.state
  }`;
  const redirectUrl = `/login?response_url=${encodeURIComponent(responseUrl)}`;
  console.debug("redirect:", redirectUrl);
  return res.redirect(redirectUrl);
  // return res.redirect(responseUrl);
});

app.post("/faketoken", urlencodedParser, async (req, res) => {
  console.debug("/faketoken", req.body);
  const grantType = req.body.grant_type
    ? req.body.grant_type
    : req.body.grant_type;
  const secondsInDay = 86400; // 60 * 60 * 24
  const HTTP_STATUS_OK = 200;
  let token;
  if (grantType === "authorization_code") {
    token = {
      token_type: "bearer",
      access_token: "123access",
      refresh_token: "123refresh",
      expires_in: secondsInDay,
    };
  } else if (grantType === "refresh_token") {
    token = {
      token_type: "bearer",
      access_token: "123access",
      expires_in: secondsInDay,
    };
  }
  console.debug("token:", token);
  res.status(HTTP_STATUS_OK).json(token);
});

async function getUserIdOrThrow(headers) {
  console.log("AAAAAAAAAAAAAAA");
  const userId = await getUser(headers);
  console.log("BBBBBBBBBBBBBBB");
  const userExists = await firestore.userExists(userId);
  if (!userExists) {
    throw new Error(
      `User ${userId} has not created an account, so there are no devices`
    );
  }
  return userId;
}

smartApp.onSync(async (body, headers) => {
  console.debug("SyncRequest:", body);
  console.log("AAAAAAAAAAAAAAA");
  const userId = await getUserIdOrThrow(headers);
  console.log("BBBBBBBBBBBBBBB");
  await firestore.setHomegraphEnable(userId, true);
  console.log("CCCCCCCCCCCCCCC");
  const devices = await firestore.getDevices(userId);
  const syncResponse = {
    requestId: body.requestId,
    payload: {
      agentUserId: userId,
      devices,
    },
  };
  console.debug("SyncResponse:", syncResponse);
  return syncResponse;
});

smartApp.onQuery(async (body, headers) => {
  console.debug("QueryRequest:", body);
  const userId = await getUserIdOrThrow(headers);
  const deviceStates = {};
  const { devices } = body.inputs[0].payload;
  await asyncForEach(devices, async (device) => {
    try {
      const states = await firestore.getState(userId, device.id);
      deviceStates[device.id] = {
        ...states,
        status: "SUCCESS",
      };
    } catch (e) {
      console.error("error getting device state:", e);
      deviceStates[device.id] = {
        status: "ERROR",
        errorCode: "deviceOffline",
      };
    }
  });
  const queryResponse = {
    requestId: body.requestId,
    payload: {
      devices: deviceStates,
    },
  };
  console.debug("QueryResponse:", queryResponse);
  return queryResponse;
});

smartApp.onExecute(async (body, headers) => {
  console.debug("ExecuteRequest:", body);
  const userId = await getUserIdOrThrow(headers);
  const commands = [];

  const { devices, execution } = body.inputs[0].payload.commands[0];
  await asyncForEach(devices, async (device) => {
    try {
      const states = await firestore.execute(userId, device.id, execution[0]);
      commands.push({
        ids: [device.id],
        status: "SUCCESS",
        states,
      });
      try {
        const reportStateRequest = {
          agentUserId: userId,
          requestId: Math.random().toString(),
          payload: {
            devices: {
              states: {
                [device.id]: states,
              },
            },
          },
        };
        console.debug("RequestStateRequest:", reportStateRequest);
        const reportStateResponse = JSON.parse(
          await smartApp.reportState(reportStateRequest)
        );
        console.debug("ReportStateResponse:", reportStateResponse);
      } catch (e) {
        const errorResponse = JSON.parse(e);
        console.error(
          "error reporting device state to homegraph:",
          errorResponse
        );
      }
    } catch (e) {
      console.error(
        "error returned by execution on firestore device document",
        e
      );
      if (e.message === "pinNeeded") {
        commands.push({
          ids: [device.id],
          status: "ERROR",
          errorCode: "challengeNeeded",
          challengeNeeded: {
            type: "pinNeeded",
          },
        });
      } else if (e.message === "challengeFailedPinNeeded") {
        commands.push({
          ids: [device.id],
          status: "ERROR",
          errorCode: "challengeNeeded",
          challengeNeeded: {
            type: "challengeFailedPinNeeded",
          },
        });
      } else if (e.message === "ackNeeded") {
        commands.push({
          ids: [device.id],
          status: "ERROR",
          errorCode: "challengeNeeded",
          challengeNeeded: {
            type: "ackNeeded",
          },
        });
      } else if (e.message === "PENDING") {
        commands.push({
          ids: [device.id],
          status: "PENDING",
        });
      } else {
        commands.push({
          ids: [device.id],
          status: "ERROR",
          errorCode: e.message,
        });
      }
    }
  });
  const executeResponse = {
    requestId: body.requestId,
    payload: {
      commands,
    },
  };
  console.debug("ExecuteResponse:", executeResponse);
  return executeResponse;
});

smartApp.onDisconnect(async (body, headers) => {
  console.debug("DisconnectRequest:", body);
  const userId = await getUserIdOrThrow(headers);
  await firestore.disconnect(userId);
  const disconnectResponse = {};
  console.debug("DisconnectResponse:", disconnectResponse);
  return disconnectResponse;
});

// smartApp.onSync((body) => {
//   return {
//     requestId: body.requestId,
//     payload: {
//       agentUserId: "1234",
//       devices: [
//         {
//           id: "washer",
//           type: "action.devices.types.WASHER",
//           traits: [
//             "action.devices.traits.OnOff",
//             "action.devices.traits.StartStop",
//             "action.devices.traits.RunCycle",
//           ],
//           name: {
//             defaultNames: ["My Washer"],
//             name: "Washer",
//             nicknames: ["Washer"],
//           },
//           deviceInfo: {
//             manufacturer: "Acme Co",
//             model: "acme-washer",
//             hwVersion: "1.0",
//             swVersion: "1.0.1",
//           },
//           willReportState: true,
//           attributes: {
//             pausable: true,
//           },
//         },
//       ],
//     },
//   };
// });

app.post("/smarthome/update", bodyParser.json(), async (req, res) => {
  console.debug("/smarthome/update", req.body);
  const {
    userId,
    deviceId,
    name,
    nickname,
    states,
    localDeviceId,
    errorCode,
    tfa,
  } = req.body;
  try {
    await firestore.updateDevice(
      userId,
      deviceId,
      name,
      nickname,
      states,
      localDeviceId,
      errorCode,
      tfa
    );
  } catch (e) {
    console.error("error updating firestore device document:", e);
    return res.status(400).send({
      firestoreError: e.message,
    });
  }

  if (localDeviceId || localDeviceId === null) {
    try {
      console.debug("RequestSyncRequest:", userId);
      const requestSyncResponse = JSON.parse(
        await smartApp.requestSync(userId)
      );
      console.debug("RequestSyncResponse:", requestSyncResponse);
    } catch (e) {
      const errorResponse = JSON.parse(e);
      console.error("error requesting sync to homegraph:", errorResponse);
      return res.status(500).send({
        requestSyncError: errorResponse.error.message,
      });
    }
  }

  if (states !== undefined) {
    try {
      const reportStateRequest = {
        agentUserId: userId,
        requestId: Math.random().toString(),
        payload: {
          devices: {
            states: {
              [deviceId]: states,
            },
          },
        },
      };
      console.debug("RequestStateRequest:", reportStateRequest);
      const reportStateResponse = JSON.parse(
        await smartApp.reportState(reportStateRequest)
      );
      console.debug("ReportStateResponse:", reportStateResponse);
    } catch (e) {
      const errorResponse = JSON.parse(e);
      console.error(
        "error reporting device state to homegraph:",
        errorResponse
      );
      return res.status(500).send({
        reportStateError: errorResponse.error.message,
      });
    }
  }
  return res.status(200).end();
});

app.post("/smarthome/create", bodyParser.json(), async (req, res) => {
  console.debug("/smarthome/create", req.body);
  const { userId, data } = req.body;
  try {
    await firestore.addDevice(userId, data);
    console.log("success");
  } catch (e) {
    console.error("error adding firestore device document:", e);
    return res.status(400).send({
      firestoreError: e.message,
    });
  }
  try {
    console.debug("RequestSyncRequest:", userId);
    const requestSyncResponse = JSON.parse(await smartApp.requestSync(userId));
    console.debug("RequestSyncResponse:", requestSyncResponse);
  } catch (e) {
    const errorResponse = JSON.parse(e);
    console.error("error requesting sync to homegraph:", errorResponse);
    return res.status(500).send({
      requestSync: errorResponse.error.message,
    });
  }
  return res.status(201).end();
});

app.post("/smarthome/delete", bodyParser.json(), async (req, res) => {
  console.debug("/smarthome/delete", req.body);
  const { userId, deviceId } = req.body;
  try {
    await firestore.deleteDevice(userId, deviceId);
  } catch (e) {
    console.error("error adding firestore device document:", e);
    return res.status(400).send({
      firestoreError: e.message,
    });
  }
  try {
    console.debug("RequestSyncRequest:", userId);
    const requestSyncResponse = JSON.parse(await smartApp.requestSync(userId));
    console.debug("RequestSyncResponse:", requestSyncResponse);
  } catch (e) {
    const errorResponse = JSON.parse(e);
    console.error("error requesting sync to homegraph:", errorResponse);
    return res.status(500).send({
      requestSync: errorResponse.error.message,
    });
  }
  return res.status(204).end();
});
app.get("/", function (req, res) {
  res.sendfile(__dirname + "/front-end/index.html");
});

app.post("/fulfillment", bodyParser.json(), smartApp);
app.listen(3000);

module.exports = app;
