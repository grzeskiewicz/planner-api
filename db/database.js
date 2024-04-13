const mysql = require('mysql2');
const moment=require('moment');
const dbConfig = require('./dbConfig');
const { body, validationResult } = require('express-validator');

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
           // throw err;                                  // server variable configures this)
    //test
           setTimeout(handleDisconnect, 5000); }
    });
}

handleDisconnect();





//TODO: get microgreens, get crops, get shelves - done
//TODO2: add microgreens, add racks!, add crops
//TODO3: edit microgreens, delete racks, delete shelves,edit crops

const getCrops = function (req, res) {
    connection.query(`SELECT * FROM crops`, function (err, rows) {
        if (err) { res.json(err); return;}
        res.json(rows);
    });
}

const getTrays = function (req, res) {
    connection.query(`SELECT * FROM trays`, function (err, rows) {
        if (err) { res.json(err); return;}
        res.json(rows);
    });
}

const getTrayDateCrops = function (req, res) {
    connection.query(`SELECT * FROM traydatecrop`, function (err, rows) {
            if (err) { res.json(err); return;}
        res.json(rows);
    });
}

const getMicrogreens = function (req, res) {
    connection.query(`SELECT * FROM microgreens`, function (err, rows) {
        if (err) { res.json(err); return;}
        res.json(rows);
    });
}

const getShelves = function (req, res) {
    connection.query(`SELECT * FROM shelves`, function (err, rows) {
        if (err) { res.json(err); return;}
        res.json(rows);
    });
}


const addMicrogreens = function (req, res, next) { //TODO:walidacja pól
    const dataArr=[];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
      return;
    }
    console.log(req.body)
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
   const [nameEN,namePL,gramsTray,topWater,bottomWater,weight,blackout,light,color] = dataArr;
    const vals=`(${nameEN},${namePL},${gramsTray},${topWater},${bottomWater},${weight},${blackout},${light},${color})`
        connection.query("INSERT INTO microgreens (name_en,name_pl,grams_tray,top_water,bottom_water,weight,blackout,light,color) VALUES" + vals, function (err, rows) {
            if (err) {res.json({success:false,err:err}); return;}
            res.json({ success: true, msg: 'MICROGREENS_ADDED' });
        });   
}



const deleteCrop = function (req, res, next) { 
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
      return;
    }
        connection.query(`DELETE FROM crops WHERE id='${req.body.crop_id}'`, function (err, rows) {
            if (err) {res.json({success:false,err:err}); return;}
            res.json({ success: true, msg: 'CROP_DELETED' });
        });   
}


const saveNotes = function (req, res, next) { 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
      return;
    }    connection.query(`UPDATE crops SET notes='${req.body.notes}' WHERE id='${req.body.crop_id}'`
    , function (err, rows) {
            if (err) {res.json({success:false,err:err}); return;}
            res.json({ success: true, msg: 'NOTES_SAVED' });
        });   
}


const addCrops = function (req, res, next) {
   const errors = validationResult(req);
   let lightStartDate;
   const dataArr=[];
   let microgreensData;

   if (!errors.isEmpty()) {res.status(400).json({ errors: errors.array()}); return;}
   
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
    const [start,harvest,microgreenID,trays,notes]=dataArr;
    let vals;
 
    connection.query(`SELECT * FROM microgreens`, function (err, rows) {
        if (err) { res.json(err); return;}
        microgreensData=rows;
        microgreen=microgreensData.find(x=> x.id==req.body.microgreenID);


        let harvestDate
        if (req.body.harvest!=='') {
            harvestDate=moment(req.body.harvest);
        } else {
            const blackoutStart=moment(start).add(microgreen.weight, "days");
            const lightExposureStart=moment(blackoutStart).add(microgreen.blackout, "days");
            harvestDate=moment(lightExposureStart).add(microgreen.light, "days");
        }
        vals=`('${moment(harvestDate).format('YYYY-MM-DD')}',${microgreenID},${trays},${notes})`;
console.log('HARVEST DATE');
console.log(harvestDate);
console.log('light',microgreen.light);
console.log("microgreenid", req.body.microgreenID);

//wrzucanie rekordu crop bez walidacji zajętości półki
connection.query("INSERT INTO crops (harvest,microgreen_id,trays,notes) VALUES" + vals, function (err, rows) {
    if (err) {
        res.json(err);
    return;
    }
    res.json({ success: true, msg: 'CROP_ADDED' });
});   

        //SPRAWDZANIE CROPÓW CZY NIE NAKŁADAJĄ SIĘ NA 1 PÓŁCE, STARY REGAŁ

     //   lightStartDate=moment(harvestDate).subtract(microgreen.light, "days");
       // console.log(lightStartDate);

     /*   connection.query(`SELECT * FROM crops WHERE shelf_id=${shelfID}`, function (err, rowsx) { 
    const sameShelfCrops=rowsx;
    let isTaken=false;

console.log(sameShelfCrops);
    for (const crop of sameShelfCrops){
       //crop.harvest and cropLightStart vs lightStartDate and req.body.harvest
       const cropMicrogreen=microgreensData.find(x=> x.id==crop.microgreen_id);
       const cropHarvest=moment(crop.harvest);
       const cropLightStart=moment(crop.harvest).subtract(cropMicrogreen.light, "days");
console.log("lighStartDate,cropHarvest,harvestDate,cropLightStart");
      console.log(lightStartDate,cropHarvest,harvestDate,cropLightStart)
if((lightStartDate.isSameOrAfter(cropHarvest) || harvestDate.isSameOrBefore(cropLightStart))===false) {
    res.json({ success: false, msg: 'CROP_DATE_TAKEN' });
    isTaken=true;
    break; 
       }
    }
    if (!isTaken) {
        connection.query("INSERT INTO crops (harvest,microgreen_id,shelf_id,trays,notes) VALUES" + vals, function (err, rows) {
        if (err) {
            res.json(err);
        return;
        }
        res.json({ success: true, msg: 'CROP_ADDED', shelfcrops:sameShelfCrops });
    });    
}

       });*/


       

    });
}


const addRacks = function (req, res, next) {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
              return res.status(400).json({ errors: errors.array() });
            }
    const name=req.body.name;
    const shelves=req.body.shelves;
    let vals='';
    for (let i=0;i<shelves;i++){
if (i==0 ) {vals=`('${name}',${i})`} else {vals=vals.concat(',',`('${name}',${i})`);}
    }
    connection.query("INSERT INTO shelves (rack_name,level) VALUES "+vals , function (err, rows) {
        if (err) {
            res.json({success:false, err:err});
        } else {
            res.json({ success: true, msg: 'RACK_ADDED' });
        }
    
    });  
}


const editMicrogreens= function (req, res) {
    const microgreens = req.body;
    console.log("MICRO EDIT:")
    console.log(microgreens);
    connection.query(`UPDATE microgreens SET name_en='${microgreens.name_en}',name_pl='${microgreens.name_pl}',grams_tray='${microgreens.grams_tray}'
    , top_water='${microgreens.top_water}',bottom_water='${microgreens.bottom_water}',weight='${microgreens.weight}',blackout='${microgreens.blackout}',light='${microgreens.light}',color='${microgreens.color}' WHERE id='${microgreens.id}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ success: true, msg: "MICROGREENS_EDITED" });
    });
}

const editCrop= function (req, res) {
    const crop = req.body;
    connection.query(`UPDATE crops SET harvest='${crop.harvest}',microgreen_id='${crop.microgreenID}',shelf_id='${crop.shelfID}'
    , trays='${crop.tray}',notes='${crop.notes}' WHERE id='${crop.id}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ succes: true, msg: "CROP_EDITED" });
    });
}

const scheduleWatering= function (req, res) {
    const crop = req.body.crop;
    console.log(crop);
    connection.query(`UPDATE crops SET scheduled='1' WHERE id='${crop}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ succes: true, msg: "CROP_SCHEDULED" });
    });
}


const completeWatering= function (req, res) {
    const crop = req.body.crop;
    connection.query(`UPDATE crops SET completed='1' WHERE id='${crop}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ succes: true, msg: "CROP_COMPLETED" });
    });
}


module.exports = {getCrops,getTrayDateCrops ,getTrays,getMicrogreens,getShelves, addMicrogreens, addRacks, addCrops,editCrop,deleteCrop,editMicrogreens,saveNotes,scheduleWatering,completeWatering };