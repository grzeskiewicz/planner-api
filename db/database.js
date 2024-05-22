const mysql = require('mysql2');
const moment = require('moment');
const dbConfig = require('./dbConfig');
const { body, validationResult } = require('express-validator');
const util = require("util"); 
const { constant } = require('async');


let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
    // the old one cannot be reused.
    connection.query = util.promisify(connection.query).bind(connection);


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
            setTimeout(handleDisconnect, 5000);
        }
    });
}

handleDisconnect();





//TODO: get microgreens, get crops, get shelves - done
//TODO2: add microgreens, add racks!, add crops
//TODO3: edit microgreens, delete racks, delete shelves,edit crops

const getCrops = function (req, res) {
    connection.query(`SELECT * FROM crops`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

const getTrays = function (req, res) {
    connection.query(`SELECT * FROM trays`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

const getTrayDateCrops = function (req, res) { //~5 months of data instead of all
    const dateNow=moment()
    const dateFrom=moment(dateNow).subtract(2,"months").startOf("month").format('YYYY-MM-DD');;
    const dateTo=moment(dateNow).add(2,"months").endOf("month").format('YYYY-MM-DD');
    connection.query(`SELECT * FROM traydatecrop WHERE date between '${dateFrom}' and '${dateTo}'`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

const getMicrogreens = function (req, res) {
    connection.query(`SELECT * FROM microgreens`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

const getShelves = function (req, res) {
    connection.query(`SELECT * FROM shelves`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

const getFNDTrays= function (req, res) {
    connection.query(`SELECT * FROM fndtrays`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}


const addMicrogreens = function (req, res, next) { //TODO:walidacja pól
    const dataArr = [];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
    const [nameEN, namePL, gramsTray, topWater, bottomWater, weight, blackout, light, color] = dataArr;
    const vals = `(${nameEN},${namePL},${gramsTray},${topWater},${bottomWater},${weight},${blackout},${light},${color})`
    connection.query("INSERT INTO microgreens (name_en,name_pl,grams_tray,top_water,bottom_water,weight,blackout,light,color) VALUES" + vals, function (err, rows) {
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'MICROGREENS_ADDED' });
    });
}



const deleteCrop = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    connection.query(`DELETE FROM crops WHERE id='${req.body.crop_id}'`, function (err, rows) { //dodatkowo ustawia triggerem status=0 w tdc
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'CROP_DELETED' });
    });
}


const saveNotes = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    } connection.query(`UPDATE crops SET notes='${req.body.notes}' WHERE id='${req.body.crop_id}'`
        , function (err, rows) {
            if (err) { res.json({ success: false, err: err }); return; }
            res.json({ success: true, msg: 'NOTES_SAVED' });
        });
}



function resetTrays(resetTrays,cropID,harvest){
    const harvestM=harvest===null ? 'NULL' : `'${moment(harvest).format('YYYY-MM-DD')}'`;
    const resetTraysIDs = resetTrays.map((x) => x.id);
    if (resetTraysIDs.length===0) return new Promise(function(resolve, reject) {resolve({success: true});});

    return new Promise(function(resolve, reject) {

   connection.query(`UPDATE traydatecrop SET crop_id=NULL, status='0' WHERE id IN (${resetTraysIDs.join(",")})`, function (err, rows) {

    if (err) reject ({success: false, err:err});

       connection.query(`UPDATE crops SET harvest=${harvestM} WHERE id='${cropID}'`, function (err, rows) {
            if (err)  reject ({success: false, err:err});
            resolve({success: true});
        });
               });
            });

}

function fillTrays(fillTrays,cropID,harvest,light){
    const fillTraysIDs = fillTrays.map((x) => x.id);

    if (fillTraysIDs.length===0) return new Promise(function(resolve, reject) {
        connection.query(`UPDATE crops SET trays='0' WHERE id='${cropID}'`, function (err, rows) {
            if (err) reject (err);
                resolve({success: true});
            });

});
 
    return new Promise(function(resolve, reject) {

  connection.query(`UPDATE traydatecrop SET crop_id='${cropID}', status='1' WHERE id IN (${fillTraysIDs.join(",")})`, function (err, rows) {
        if (err) reject({ success: false, err: err })

       connection.query(`UPDATE crops SET harvest='${harvest}', trays= ${fillTraysIDs.length/light} WHERE id='${cropID}'`, function (err, rows) {
        if (err) reject (err);
            resolve({success: true});
        });
});
    });
}



function saveScheduleTDC (req, res, next) {
    const light=req.body.light;
    const reset = req.body.tdcs.filter((x) => x.status === "0");
    const fill = req.body.tdcs.filter((x) => x.status === "1" && x.crop_id===req.body.crop_id);
    const harvest=req.body.harvest;
    const cropID=req.body.crop_id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }

resetTrays(reset,cropID,harvest).then((reset)=>{
    if (reset.success) {
        fillTrays(fill,cropID,harvest,light).then((fill)=>{
    if (fill.success){
        res.json({ success: true, msg: "SAVE_SCHEDULED"}); 
}
    });
    }

});
}


const addCrops = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    vals = `('${req.body.microgreenID}','${req.body.notes}')`;
    //wrzucanie rekordu crop bez walidacji zajętości półki
    connection.query("INSERT INTO crops (microgreen_id,notes) VALUES" + vals, function (err, rows) {
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'CROP_ADDED' });
    });
}


const addRacks = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const name = req.body.name;
    const shelves = req.body.shelves;
    let vals = '';
    for (let i = 0; i < shelves; i++) {
        if (i == 0) { vals = `('${name}',${i})` } else { vals = vals.concat(',', `('${name}',${i})`); }
    }
    connection.query("INSERT INTO shelves (rack_name,level) VALUES " + vals, function (err, rows) {
        if (err) {
            res.json({ success: false, err: err });
        } else {
            res.json({ success: true, msg: 'RACK_ADDED' });
        }

    });
}


const editMicrogreens = function (req, res) {
    const microgreens = req.body;
    console.log("MICRO EDIT:")
    console.log(microgreens);
    connection.query(`UPDATE microgreens SET name_en='${microgreens.name_en}',name_pl='${microgreens.name_pl}',grams_tray='${microgreens.grams_tray}'
    , top_water='${microgreens.top_water}',bottom_water='${microgreens.bottom_water}',weight='${microgreens.weight}',blackout='${microgreens.blackout}',light='${microgreens.light}',color='${microgreens.color}' WHERE id='${microgreens.id}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "MICROGREENS_EDITED" });
    });
}

const editCrop = function (req, res) {
    const crop = req.body;
    connection.query(`UPDATE crops SET harvest='${crop.harvest}',microgreen_id='${crop.microgreenID}',shelf_id='${crop.shelfID}'
    , trays='${crop.tray}',notes='${crop.notes}' WHERE id='${crop.id}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ succes: true, msg: "CROP_EDITED" });
    });
}

const scheduleWatering = function (req, res) {
    const crop = req.body.crop;
  //  console.log(crop);
    connection.query(`UPDATE crops SET scheduled='1' WHERE id='${crop}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ succes: true, msg: "CROP_SCHEDULED" });
    });
}


const completeWatering = function (req, res) {
    const crop = req.body.crop;
    connection.query(`UPDATE crops SET completed='1' WHERE id='${crop}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ succes: true, msg: "CROP_COMPLETED" });
    });
}


module.exports = { getCrops, getTrayDateCrops,getFNDTrays, getTrays, getMicrogreens, getShelves, addMicrogreens, addRacks, addCrops, editCrop, deleteCrop, editMicrogreens, saveNotes, scheduleWatering, completeWatering, saveScheduleTDC };