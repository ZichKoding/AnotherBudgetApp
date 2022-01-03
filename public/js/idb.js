// creating variable to hold db connection
let db;
// establish a connection to IndexedDB database called 'another_budget' and set it's version to 1
const request = indexedDB.open('another_budget', 1);

// error handling
request.onerror = function (event) {
    // log error
    console.log(event.target.errorCode);
}

// this event will emit if the database version changes
request.onupgradeneeded = function (event) {
    // save a ref to the db
    const db = event.target.result;
    // create an object to store 'new_transaction', set it to have an auto incrementing primary key of sorts
    db.createObjectStore('new_transaction', { autoIncrement: true });
};

// successful object store from `onupgraded`
request.onsuccess = function (event) {
    // save ref to db in global variable
    db = event.target.result;

    // check if app is online, if true run uploadTransactions() to send all local db data to api
    if (navigator.onLine) {
        uploadTransactions();
    }
};

// This function will be executed if there is no internet connection
function saveRecord(record) {
    // open a new transaction with the db with read and write permissions
    const trans = db.transaction(['new_transaction'], 'readwrite');

    // access the object store for 'new_transaction'
    const transObjectStore = trans.objectStore('new_transaction');

    // add record to your store with add method
    transObjectStore.add(record);
};

// this function will be executed when internet connection returns
function uploadTransactions() {
    // open a transaction on local db
    const trans = db.transaction(['new_transaction'], 'readwrite');

    // access local object store
    const transObjectStore = trans.objectStore('new_transaction');

    // get all records from stroe and set to variable
    const getAllTrans = transObjectStore.getAll();

    // upon a successful .getAll() execution run:
    getAllTrans.onsuccess = function() {
        // if there was data in indexedDB's store, send it to api server
        if (getAllTrans.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAllTrans.result),
                headers: {
                    Accept: 'application/json, text/plain, */*', 
                    'Content-Type': 'application/json'
                }
            })
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }

                    // open one or more trans
                    const trans = db.transaction(['new_transaction'], 'readwrite');
                    // access the new_transaction object store
                    const transObjectStore = trans.objectStore('new_transaction');
                    // clear all trans in store
                    transObjectStore.clear();

                    alert('All saved transactions has been submitted!');
                })
                .catch(err => {
                    console.log(err);
                });
        }
    };
};

// listen for app coming back online
window.addEventListener('online', uploadTransactions);