require("dotenv").config();
const express = require("express"),
  app = express();
const cors = require("cors");
const axios = require("axios");
const http = require("http").Server(app);
const bodyParser = require("body-parser");
const db = require("./db/database");
const { body, validationResult } = require("express-validator");
const net = require("net");
const ORANGEPI_SOCKET = "192.168.1.10";
app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // "*"
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
//var corsOptions = {
//    origin: '*'
//};
//app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies
app.options("*", cors()); // include before other routes

app.get("/", (req, res) => res.send("Welcome!"));

app.post(
  "/addmicrogreens",
  [
    body("nameEN")
      .isString()
      .withMessage("Not a string!")
      .isLength({ max: 60 })
      .withMessage("Too long value!"),
    body("namePL")
      .isString()
      .withMessage("Not a string!")
      .isLength({ max: 60 })
      .withMessage("Too long value!"),
    body("gramsTray").isInt().withMessage("Not integer!"),
    body("gramsHarvest").isInt().withMessage("Not integer!"),
    body("wateringLevel").isInt().withMessage("Not integer!"),
    body("weight")
      .isInt({ max: 15 })
      .withMessage("Not integer or too high value!"),
    body("blackout")
      .isInt({ max: 15 })
      .withMessage("Not integer or too high value!"),
    body("light")
      .isInt({ max: 15 })
      .withMessage("Not integer or too high value!"),
    body("color")
      .isString()
      .withMessage("Not a string!")
      .isLength({ max: 10 })
      .withMessage("Too long value!"),
  ],
  db.addMicrogreens
);

app.post("/editmicrogreens", db.editMicrogreens);
app.post("/editcustomer", db.editCustomer);
app.post("/editorder", db.editOrder);

app.post("/linkcrops", db.linkCrops)


app.post("/schedulewatering", db.scheduleWatering);
app.post("/completewatering", db.completeWatering);
app.post("/cleanschedule", db.cleanSchedule);


const resetorangepi = function (req, res) {
  axios
    .get(`http://${ORANGEPI_SOCKET}/cm?cmnd=Power%20off`)
    .then((response) => {
      if (response.data.POWER === "OFF") {
        console.log("ORANGEPI OFF");
        setTimeout(() => {
          axios
            .get(`http://${ORANGEPI_SOCKET}/cm?cmnd=Power%20on`)
            .then((response2) => {
              if (response2.data.POWER === "ON") {
                console.log("ORANGEPI ON");
                res.json({ success: true, msg: "RESET_COMPLETED" });
              } else {
                res.json({
                  success: false,
                  msg: "CANT POWER ON",
                });
              }
            })
            .catch((error) => {
              res.json({
                success: false,
                msg: "CANT POWER ON",
              });
            });
        }, 5000);
      } else {
        res.json({
          success: false,
          msg: "CANT POWER OFF",
        });
      }
    })
    .catch((error) => {
      res.json({
        success: false,
        msg: "CANT POWER OFF",
      });
    });
};

const turnSocketON=function(req,res){
  const ip = String(req.body.ip);
  const port = Number(req.body.port);
  axios.get(`http://${ip}/cm?cmnd=Power%20on`)
  .then((response) => {
    if (response.data.POWER === "ON") res.json({ success: true, msg: "POWER ON" });


  })
  .catch((error) => {
    console.log(error);
    res.json({ success: false, msg: "CANT POWER ON" });
  });
}

const turnSocketOFF=function(req,res){
  const ip = String(req.body.ip);
  const port = Number(req.body.port);
  axios.get(`http://${ip}/cm?cmnd=Power%20off`)
  .then((response) => {
    if (response.data.POWER === "OFF") res.json({ success: true, msg: "POWER OFF" });


  })
  .catch((error) => {
    console.log(error);
    res.json({ success: false, msg: "CANT POWER OFF" });
  });
}

const getSocketInfo=function(req,res){
  const ip = String(req.body.ip);
  axios.get(`http://${ip}/cm?cmnd=Status`)
  .then((response) => {
     res.json({ data:response.data });
     return;
  })
  .catch((error) => {
    console.log(error);
    res.json({ error: error });
    return;
  });
}

app.get("/resetorangepi", resetorangepi);
app.post("/turnon",turnSocketON);
app.post("/turnoff",turnSocketOFF);
app.post("/getsocketinfo",getSocketInfo);


//MQTT SERVICE
//====================================================================

const mqtt = require('mqtt')
const emqx_url = '192.168.1.3';  

const options = {  
    clean: true,  
    username: 'benake',  
    password: 'palkast1',  
}

const connectUrl = 'mqtt://' + emqx_url  
const client = mqtt.connect(connectUrl, options)

client.on('connect', () => {  
    console.log('Connected to the broker.')  
    client.subscribe('tele/tsm-watertemp/SENSOR', (err) => {  
        if (!err) {  
            console.log('Subscribed to topic')  
        }  
    })  
})

client.on('message', (topic, message) => {  
  const sensor=JSON.parse(message);
  const temperature=sensor.DS18B20.Temperature
  console.log(temperature);
  db.addAquaponicsTemperature(temperature); //temperature db save
});



//===========================================================================
//GOVEE TEMPERATURE/HUMIDITY TO DB SAVE EVERY 15 MINUTES
//===========================================================================
const GOVEE_API_URL='https://openapi.api.govee.com/router/api/v1/device/state';
const headers = new Headers({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Govee-API-Key': '46c95029-cff4-41ef-9692-f106c36cd178'
});


function request(url) {
    return new Request(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          "requestId": "uuid",
          "payload": {
                  "sku": "H5179",
                  "device": "EF:B4:17:29:DC:90:A0:ED"
          }
      })
    });
}


fetch(request(`${GOVEE_API_URL}`))
.then((res) => res.json())
.then((result) => {
const stateArray=result.payload.capabilities;
const temperature=stateArray.filter((x)=>x.instance==="sensorTemperature");
const humidity=stateArray.filter((x)=>x.instance==="sensorHumidity");
console.log("GOVEE: ",temperature,humidity);

})
.catch((error) => {alert("Problem z pobraniem danych z API GOVEE!"); return error});


/*

  setTimeout(() => {

  }, "500");

  */

//===========================================================================




const ping = function (req, res) {
  const ip = String(req.body.ip);
  const port = Number(req.body.port);
  console.log(ip, port);
  const sock = new net.Socket();
  sock.setTimeout(8000, () => {
    console.log("timeout");
    res.json({ msg: "timeout" });
    return;
  });
  sock
    .connect(port, ip, function () {
      console.log("Client: Connected to server");
      sock.destroy();
      res.json({ msg: "active" });
      return;
    })
    .on("error", (e) => {
    //  sock.destroy();
     // res.json({ msg: "fail" });
     // return;
    });
};
app.post("/pingcheck", ping);

/* [
    body('name_en').isString().withMessage("Not a string!").isLength({max:60}).withMessage("Too long value!"),
    body('name_pl,').isString().withMessage("Not a string!").isLength({max:60}).withMessage("Too long value!"),
    body('grams_tray').isInt().withMessage("Not integer!"),
    body('top_water').isInt({max:1000}).withMessage("Not integer or too high value!"),
    body('bottom_water').isInt({max:1000}).withMessage("Not integer or too high value!"),
    body('weight').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('blackout').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('light').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('color').isString().withMessage("Not a string!").isLength({max:10}).withMessage("Too long value!"),

]*/

app.post(
  "/addcrops",
  [
    body("microgreenID").isInt().withMessage("Not integer!"),
    body("notes").isString().withMessage("Not string!").isLength({ max: 500 }),
  ],
  db.addCrops
);

app.post(
  "/addorder",
  [
    body("customerID").isInt().withMessage("Not integer!"),
    body("notes").isString().withMessage("Not string!").isLength({ max: 200 }),
  ],
  db.addOrder
);


app.post(
  "/addcustomer",
  [
    body("companyName")
      .isString()
      .withMessage("Not a string!")
      .isLength({ max: 200 })
      .withMessage("Too long value!"),
    body("customerAddress")
      .isString()
      .withMessage("Not a string!")
      .isLength({ max: 200 })
      .withMessage("Too long value!"),
    body("customerPostcode").isString().withMessage("Not a string!")
    .isLength({ max: 6 })
    .withMessage("Too long value!"),
  ],
  db.addCustomer
);



app.post("/deletecrop", db.deleteCrop);
app.post("/deletemicrogreens", db.deleteMicrogreens);
app.post("/lockcustomer", db.lockCustomer);
app.post("/unlockcustomer", db.unlockCustomer);
app.post("/deletecustomerorder", db.deleteCustomerOrder);



app.post(
  "/savenotes",
  [
    body("crop_id").isInt().withMessage("Not integer!"),
    body("notes").isString().withMessage("Not string!").isLength({ max: 500 }),
  ],
  db.saveNotes
);

app.post(
  "/savescheduletdc",
  [
    body("crop_id").isInt().withMessage("Not integer!"),
  ],
  db.saveScheduleTDC
);


app.post(
  "/addracks",
  [
    body("name")
      .isLength({ max: 1 })
      .withMessage("Too long name")
      .matches(/^[A-Za-z\s]+$/)
      .withMessage("No digits allowed"),
    body("shelves")
      .isInt({ max: 10 })
      .withMessage("Not integer or too high value"),
  ],
  db.addRacks
);

app.get("/crops", db.getCrops);
app.get("/traydatecrops", db.getTrayDateCrops);

app.get("/microgreens", db.getMicrogreens);
app.get("/trays", db.getTrays);
app.get("/fndtrays", db.getFNDTrays);
app.get("/customers", db.getCustomers);
app.get("/orders", db.getOrders);

app.get("/getsensorreadstoday", db.getSensorReadsToday);


/*const port = process.env.PORT || 3001,
    ip = process.env.IP || '127.0.0.1';*/

app.listen("3001", () => {
  console.log("NODEJS RUNNING");
});
//http.listen(port);
module.exports = app;
