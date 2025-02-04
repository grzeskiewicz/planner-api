const mysql = require('mysql2');
const moment = require('moment');
const dbConfig = require('./dbConfig');
const { body, validationResult } = require('express-validator');
const util = require("util"); 
const { constant } = require('async');


let connectionAquaponics;

function handleAquaponicsDisconnect() {
    connectionAquaponics= mysql.createConnection(dbConfig.configTempDB);    // the old one cannot be reused.
    connectionAquaponics.query = util.promisify(connectionAquaponics.query).bind(connectionAquaponics);


    connectionAquaponics.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleAquaponicsDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connectionAquaponics.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleAquaponicsDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            // throw err;                                  // server variable configures this)
            //test
            setTimeout(handleAquaponicsDisconnect, 5000);
        }
    });
}

handleAquaponicsDisconnect();



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


//TODO: add Rack

const getCrops = function (req, res) {
    connection.query(`SELECT * FROM crops ORDER BY harvest`, function (err, rows) {
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

const getCustomers = function (req, res) {
    connection.query(`SELECT * FROM customers`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}



const getOrders = function (req, res) {
    connection.query(`SELECT orders.id AS id, orders.microgreen_id,orders.weight,orders.crop_id, order_id AS custuomerorder_id, customerorder.customer_id, customerorder.delivery_date,customerorder.notes
    FROM orders
    INNER JOIN customerorder ON orders.order_id = customerorder.id ORDER BY customerorder.delivery_date`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}

/*
const getOrders = function (req, res) {
    connection.query(`SELECT * FROM orders`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });
}*/

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
    const [nameEN, namePL, gramsTray, gramsHarvest,wateringLevel, weight, blackout, light, color] = dataArr;
    const vals = `(${nameEN.toUpperCase()},${namePL.toUpperCase()},${gramsTray},${gramsHarvest},${wateringLevel},${weight},${blackout},${light},${color})`;

    connection.query("INSERT INTO microgreens (name_en,name_pl,grams_tray,grams_harvest,watering_level,weight,blackout,light,color) VALUES" + vals, function (err, rows) {
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

const deleteMicrogreens = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    console.log("MICRO",req.body)
    connection.query(`DELETE FROM microgreens WHERE id='${req.body.id}'`, function (err, rows) { //dodatkowo ustawia triggerem status=0 w tdc
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'MICROGREENS_DELETED' });
    });
}

const lockCustomer = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    connection.query(`UPDATE customers SET is_active='0' WHERE id='${req.body.id}'`, function (err, rows) { //dodatkowo ustawia triggerem status=0 w tdc
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'CUSTOMER_LOCKED' });
    });
}

const unlockCustomer = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    connection.query(`UPDATE customers SET is_active='1' WHERE id='${req.body.id}'`, function (err, rows) { //dodatkowo ustawia triggerem status=0 w tdc
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'CUSTOMER_UNLOCKED' });
    });
}


const deleteCustomerOrder = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    console.log("DELETE CUSTOMER ORDER",req.body);

    connection.query(`DELETE FROM customerorder WHERE customer_id='${req.body.customer_id}' AND delivery_date='${moment(req.body.day).format('YYYY-MM-DD HH:mm')}'`, function (err, rows) { //dodatkowo ustawia triggerem status=0 w tdc
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'ORDER_DELETED' });
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
    const harvestM=harvest===null ? 'NULL' : `'${moment(harvest).format('YYYY-MM-DD HH:mm')}'`;
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

       connection.query(`UPDATE crops SET harvest='${moment(harvest).format('YYYY-MM-DD HH:mm')}', trays= ${fillTraysIDs.length/light} WHERE id='${cropID}'`, function (err, rows) {
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
        
        if (err) { res.json({ success: false, err: err });  return; }
    connection.query(`SELECT * FROM crops WHERE id='${rows.insertId}'`, function (err, cropData) {
        res.json({ success: true, msg: 'CROP_ADDED',crop:cropData[0] });
    });
});
    
}

const addOrder = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    valsOrder = `('${req.body.customerID}','${req.body.deliveryDate}','${req.body.notes}')`;
    const orders=req.body.orders;
    connection.query("INSERT INTO customerorder (customer_id,delivery_date,notes) VALUES" + valsOrder, function (err, rows) {
        if (err) { res.json({ success: false, err: err }); console.log(err);  return; }
        const orderID=rows.insertId;

const ordersMap=orders.map((x)=>`('${orderID}','${x.microgreensID}',${x.weight})`);
        connection.query("INSERT INTO orders (order_id,microgreen_id,weight) VALUES" + ordersMap, function (err, rows) {
            if (err) { res.json({ success: false, err: err }); console.log(err);  return; }
            res.json({ success: true, msg: 'ORDER_ADDED'});
        });
   
});
    
}

const addCustomer = function (req, res, next) {
    const dataArr = [];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        return;
    }
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
    const [companyName,NIP,REGON,customerAddress,customerPostcode,customerLocation,customerVoivodeship,customerFullname,PESEL,deliveryAddress,
        deliveryPostcode,deliveryLocation,deliveryVoivodeship,customerEmail,customerTelephone1,customerTelephone2] = dataArr;
    const vals = `(${companyName.toUpperCase()},${NIP},${REGON},${customerAddress.toUpperCase()},${customerPostcode.toUpperCase()},${customerLocation.toUpperCase()},${customerVoivodeship.toUpperCase()},${customerFullname.toUpperCase()},${PESEL},${deliveryAddress.toUpperCase()},
        ${deliveryPostcode},${deliveryLocation.toUpperCase()},${deliveryVoivodeship.toUpperCase()},${customerEmail.toUpperCase()},${customerTelephone1},${customerTelephone2})`;
    connection.query("INSERT INTO customers (company_name,company_nip,company_regon,customer_address,customer_postcode, customer_location,customer_voivodeship,customer_fullname,customer_pesel,delivery_address,delivery_postcode,delivery_location,delivery_voivodeship,customer_email,customer_telephone1,customer_telephone2) VALUES" + vals, function (err, rows) {
        if (err) { res.json({ success: false, err: err }); return; }
        res.json({ success: true, msg: 'CUSTOMER_ADDED' });
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
    connection.query(`UPDATE microgreens SET name_en='${(microgreens.name_en).toUpperCase()}',name_pl='${(microgreens.name_pl).toUpperCase()}',grams_tray='${microgreens.grams_tray}'
    , grams_harvest='${microgreens.grams_harvest}',watering_level='${microgreens.watering_level}',weight='${microgreens.weight}',blackout='${microgreens.blackout}',light='${microgreens.light}',color='${microgreens.color}' WHERE id='${microgreens.id}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "MICROGREENS_EDITED" });
    });
}


const editOrder = function (req, res) {
    const order = req.body;

    connection.query(`UPDATE customerorder SET delivery_date='${order.delivery_date}', notes='${order.notes} WHERE id=${order.id}`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }

        connection.query(`UPDATE orders SET  WHERE order_id=${order.id}`, function (err, result) {
            if (err) { res.json({ success: false, msg: err }); return; }
            res.json({ success: true, msg: "ORDER_EDITED" });
        });
    });
}

const editCrop = function (req, res) {
    const crop = req.body;
    connection.query(`UPDATE crops SET harvest='${crop.harvest}',microgreen_id='${crop.microgreenID}',shelf_id='${crop.shelfID}'
    , trays='${crop.tray}',notes='${crop.notes}' WHERE id='${crop.id}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "CROP_EDITED" });
    });
}


const linkCrops = function (req, res) {
    const cropsToLink = req.body.linkedOrderCrop;
    //console.log(cropsToLink);
    const test=cropsToLink.map((x)=> `when ${x.order} then ${x.crop===0? 'NULL':x.crop}`).join(" ");

const ids=cropsToLink.map((x)=>`${x.order}`).join(",");
//console.log(`(${ids})`);
//console.log(test);

connection.query(`UPDATE orders SET crop_id = CASE id ${test} end WHERE id IN (${ids})`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); console.log(err); return; }
        res.json({ success: true, msg: "CROPS_LINKED" });
    });


}

const editCustomer = function (req, res) {
    const customer = req.body;
    console.log("CUSTOMER EDIT:")
    console.log(customer);
    connection.query(`UPDATE customers SET company_name='${customer.company_name.toUpperCase()}',company_nip='${customer.company_nip}',company_regon='${customer.company_regon}',customer_address='${customer.customer_address.toUpperCase()}'
    ,customer_postcode='${customer.customer_postcode}', customer_location='${customer.customer_location.toUpperCase()}',customer_voivodeship='${customer.customer_voivodeship.toUpperCase()}'
    ,customer_fullname='${customer.customer_fullname.toUpperCase()}',customer_pesel='${customer.customer_pesel}'
    ,delivery_address='${customer.delivery_address.toUpperCase()}',delivery_postcode='${customer.delivery_postcode}',delivery_location='${customer.delivery_location.toUpperCase()}',delivery_voivodeship='${customer.delivery_voivodeship.toUpperCase()}'
    ,customer_email='${customer.customer_email.toUpperCase()}',customer_telephone1='${customer.customer_telephone1}',customer_telephone2='${customer.customer_telephone2}' WHERE id='${customer.id}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "CUSTOMER_EDITED" });
    });
}

const scheduleWatering = function (req, res) {
    const crops = req.body.crops;
    connection.query(`UPDATE crops SET scheduled='1' WHERE id IN (${crops.join(",")})`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "CROPS_SCHEDULED" });
    });
}


const cleanSchedule = function (req, res) {
    const crops = req.body.crops;
    connection.query(`UPDATE crops SET scheduled='0' WHERE id IN (${crops.join(",")})`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "SCHEDULE_CLEANED" });
    });
}

const completeWatering = function (req, res) {
    const crop = req.body.crop;
    connection.query(`UPDATE crops SET completed='1' WHERE id='${crop}'`, function (err, result) {
        if (err) { res.json({ success: false, msg: err }); return; }
        res.json({ success: true, msg: "CROP_COMPLETED" });
    });
}



const addAquaponicsTemperature = function (temperature) {
    connectionAquaponics.query("INSERT INTO temperaturesdwc (temperature) VALUES" + `(${temperature})` , function (err, rows) {
        if (err) {console.log(err); return; }
        console.log("Zapisano pomiar do bazy.");
    });
}


const addGoveeTempHumidity = function (temperature,humidity) {
    connectionAquaponics.query("INSERT INTO govee (temperature,humidity) VALUES" + `(${temperature},${humidity})` , function (err, rows) {
        if (err) {console.log(err); return; }
        console.log("Zapisano pomiar z Govee do bazy.");
    });
}


const getSensorReadsToday = function(req,res){
connectionAquaponics.query(`SELECT * FROM temperaturesdwc WHERE DATE(date) = CURDATE()`, function (err, rows) {
        if (err) { res.json(err); return; }
        res.json(rows);
    });    
}


module.exports = { getCrops, getTrayDateCrops,getFNDTrays, getTrays, getMicrogreens, getShelves,getCustomers,getOrders, addMicrogreens, addRacks, addCrops,addOrder,addCustomer, editCrop,editOrder,linkCrops, deleteCustomerOrder,deleteCrop, deleteMicrogreens,lockCustomer,unlockCustomer,editMicrogreens,editCustomer, saveNotes, scheduleWatering,cleanSchedule, completeWatering, saveScheduleTDC, addAquaponicsTemperature,getSensorReadsToday,addGoveeTempHumidity };