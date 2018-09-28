
const crypto = require("pskcrypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
require("interact").initConsoleMode();


exports.defaultBackup = "http://localhost:8080";

exports.defaultPin = "12345678";

exports.Paths = {
	"auxFolder"          : path.join(process.cwd(), ".privateSky"),
	"Dseed"             : path.join(process.cwd(), ".privateSky", "Dseed"),
	"Adiacent"          : path.join(process.cwd(), "Adiacent"),
	"recordStructures"  : path.join(__dirname, path.normalize("../utils/recordStructures"))
};

function checkPinIsValid(pin, callback) {

	exports.loadMasterCsb(pin, null, function (err, csb) {
		if(err){
			callback(err, false);
		}else{
			callback(null, true);
		}
	});

}

function checkSeedIsValid(seed, callback) {
	var dseed = crypto.deriveSeed(seed);
	fs.readFile(exports.getMasterPath(dseed), function (err, encryptedMaster) {
		try{
			crypto.decryptJson(encryptedMaster, dseed);
		}catch(err){
			callback(err, false);
		}
		callback(null, true);
	});

}

 function enterPin(prompt, noTries, callback){
	prompt = prompt || "Insert pin:";
	if(noTries == 0){
		console.log("You have inserted an invalid pin 3 times");
		console.log("Preparing to exit");
		// $$.interact.say("You have inserted an invalid pin 3 times");
		// $$.interact.say("Preparing to exit");

	}else {
		$$.interact.readPin(prompt, function (err, pin) {
			if(err) {
				console.log("Pin is invalid");
				console.log("Try again");
				// $$.interact.say("Pin is invalid");
				// $$.interact.say("Try again");
				enterPin(prompt, noTries-1, callback);
			}else{
				checkPinIsValid(pin, function (err, status) {
					if(err){
						console.log("Pin is invalid");
						console.log("Try again");
						// $$.interact.say("Pin is invalid");
						// $$.interact.say("Try again");
						enterPin(prompt, noTries-1, callback);
					}else{
						callback(null, pin);
					}
				});
			}
		});
	}
}

exports.requirePin = function (prompt, callback) {
	exports.masterCsbExists(function (err, status) {
		if(err){
			console.log("Error");
			exports.createMasterCsb(null, null, function (err) {
				callback()
			});

		}else{
			console.log("No error");
			enterPin(prompt, 3, callback);
		}
	});
};
exports.enterSeed = function (callback) {
	$$.interact.readPassword("Enter seed:", function (err, answer) {
		if(!err) {
			var seed = Buffer.from(answer, "base64");
			$$.ensureFolderExists(exports.Paths.auxFolder, function (err) {
				if(err){
					callback(err, null);
				}else{
					
				}
			});
			
			fs.access(exports.Paths.auxFolder, function (err) {
				if(err){
					fs.mkdir(exports.Paths.auxFolder, function (err) {
						if(err){
							callback(err, null);
						}else{
							callback(null, seed);
						}
					})
				}else{
					checkSeedIsValid(seed, function (err, status) {
						if(err){
							callback(err, null);
						}else{
							callback(null, seed);
						}
					})
				}
			});
		}else{
			throw err;
		}
	});
};

exports.defaultCSB = function() {
	return {
		"version": 1,
		"protocolVersion": 1,
		"backups": [],
		"records": {}
	};
};

exports.masterCsbExists = function (callback) {
	fs.access(exports.Paths.Dseed, function (err) {
		if(err){
			callback(err, false);
		}else{
			callback(null, true);
		}
	});
};

exports.createMasterCsb = function(pin, pathMaster, callback) {
	$$.interact.say("Creating master csb");
	pin = pin || exports.defaultPin;
	fs.mkdir(exports.Paths.auxFolder, function (err) {
		if(err){
			callback(err);
		}else {
			var seed = crypto.generateSeed(exports.defaultBackup);
			$$.interact.say("The following string represents the seed.Please save it.");
			$$.interact.say();
			$$.interact.say(seed.toString("base64"));
			$$.interact.say();
			$$.interact.say("The default pin is:", exports.defaultPin);
			$$.interact.say();
			var dseed = crypto.deriveSeed(seed);
			pathMaster = pathMaster || exports.getMasterPath(dseed);
			crypto.saveDSeed(dseed, pin, exports.Paths.Dseed, function (err) {
				if (!err) {
					var masterCsb = exports.defaultCSB();
					fs.writeFile(pathMaster, crypto.encryptJson(masterCsb, dseed), function (err) {
						if (err) {
							callback(err);
						} else {
							$$.interact.say("Master csb has been created");
							callback();
						}
					});
				}
			});
		}
	});
};

exports.loadMasterCsb = function(pin, seed, callback){
	pin = pin || exports.defaultPin;
	var readMaster = function (dseed, callback) {
		var masterPath = exports.getMasterPath(dseed);
		fs.readFile(masterPath, function (err, encryptedCsb) {
			if(err){
				callback(err);
			}else{
				var csbData = crypto.decryptJson(encryptedCsb, dseed);
				var csb = {
					"Dseed"  : dseed,
					"Data": csbData,
					"Path"  : exports.getMasterPath(dseed),
					"Uid"   : exports.getMasterUid(dseed)
				};
				callback(null, csb);
			}
		})
	};
	if(seed){
		var dseed = crypto.deriveSeed(seed);
		readMaster(dseed, callback);
	}else {
		crypto.loadDseed(pin, exports.Paths.Dseed, function (err, dseed) {
			readMaster(dseed, callback);
		});
	}

};

exports.writeCsbToFile = function (csbPath, csbData, dseed, callback) {
	if(typeof dseed === "string"){
		dseed = Buffer.from(dseed, "hex");
	}
	fs.writeFile(csbPath, crypto.encryptJson(csbData, dseed), function (err) {
		callback(err);
	})
};

exports.enterRecord = function(fields, currentField, record, rl, callback){
	record = record || {};
	rl = rl || readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	if(currentField == fields.length){
		rl.close();
		callback(null, record);
	}else {
		var field = fields[currentField];
		rl.question("Insert " + field["fieldName"] + ":", (answer) => {
			record[field["fieldName"]] = answer;
			exports.enterRecord(fields, currentField + 1, record, rl, callback);
		});
	}
};

exports.enterField = function(field, rl, callback){
	rl = rl || readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.question("Insert " + field + ":", (answer) => {
		rl.close();
		callback(null, answer);
	});
};


exports.confirmOperation = function (prompt, rl, callback) {
	rl = rl || readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	prompt = prompt || "Do you want to continue?";
	rl.question(prompt + "[y/n]", (answer) => {
		if (answer === "y") {
			callback(null, rl);
		} else if (answer !== "n") {
			$$.interact.say("Invalid option");
			exports.confirmOperation(prompt, rl, callback);
		}else{
			rl.close();
		}
	});

};


exports.getRecordStructure = function (recordType, callback) {
	fs.readFile(path.join(exports.Paths.recordStructures,"csb_record_structure_" + recordType +".json"), null, function (err, data) {
		if(err){
			callback(err);
		}else{
			callback(null, JSON.parse(data));
		}
	});
};

exports.readEncryptedCsb = function (pathCsb, callback) {
	fs.readFile(pathCsb, null, function (err, data) {
		callback(err, data);
	});
};

exports.readCsb = function (pathCsb, dseed, callback) {
	if(typeof dseed === "string"){
		dseed = Buffer.from(dseed, "hex");
	}
	exports.readEncryptedCsb(pathCsb, function (err, encryptedCsb) {
		if(err){
			callback(err);
		}else{
			callback(null, crypto.decryptJson(encryptedCsb, dseed));
		}
	});
};

exports.getMasterPath = function(dseed){
	if(typeof dseed === "string"){
		dseed = Buffer.from(dseed, "hex");
	}
	return path.join(exports.Paths.auxFolder, crypto.generateSafeUid(dseed, exports.Paths.auxFolder));
};

exports.getMasterUid = function (dseed){
	return crypto.generateSafeUid(dseed, exports.Paths.auxFolder)
};

exports.findCsb = function (csbData, aliasCsb, callback) {
	if(!csbData || !csbData["records"] || !csbData["records"]["Csb"] || csbData["records"]["Csb"].length === 0){
		callback();
		return;
	}
	let csbs = csbData["records"]["Csb"];
	while(csbs.length > 0){
		var csb = csbs.shift();
		if(csb["Title"] === aliasCsb){
			callback(null, csb);
			return;
		}else{
			exports.readCsb(csb["Path"], Buffer.from(csb["Dseed"], "hex"), function (err, childCsb) {
				if(!err){
					if(childCsb && childCsb["records"] && childCsb["records"]["Csb"]){
						csbs = csbs.concat(childCsb["records"]["Csb"]);
					}
				}
			});

		}
	}

};

exports.getCsb = function (pin, aliasCsb) {
	var masterCsb = exports.readMasterCsb(pin);
	if(!masterCsb.Data || !masterCsb.Data["records"]){
		return undefined;
	}
	var csbInMaster = exports.findCsb(masterCsb.Data, aliasCsb);
	if(csbInMaster){
		var encryptedCsb = exports.readEncryptedCsb(csbInMaster["Path"]);
		var dseed = crypto.deriveSeed(Buffer.from(csbInMaster["Seed"], 'hex'));
		var csbData = crypto.decryptJson(encryptedCsb, dseed);
		return {
			"Data": csbData,
			"Dseed": dseed,
			"Path": csbInMaster["Path"]
		};
	}
	return undefined;
};

exports.indexOfRecord = function(csbData, recordType, recordKey) {
	if(csbData && csbData["records"] && csbData["records"][recordType]){
		var recordsArray = csbData["records"][recordType];
		for(var c in recordsArray){
			if(recordsArray[c]["Title"] === recordKey){
				return c;
			}
		}
	}
	return -1;
};
exports.indexOfKey = function(arr, property, key){
	for(var i in arr){
		if(arr[i][property] === key){
			return i;
		}
	}
	return -1;
};

exports.getChildCsb = function (parentCsb, aliasChildCsb, callback) {
	var indexChild = exports.indexOfRecord(parentCsb.Data, "Csb", aliasChildCsb);
	if(indexChild >= 0){
		let childCsbPath = parentCsb.Data["records"]["Csb"][indexChild]["Path"];
		let childCsbDseed = Buffer.from(parentCsb.Data["records"]["Csb"][indexChild]["Dseed"], "hex");
		exports.readCsb(childCsbPath, childCsbDseed, function (err, csbData) {
			if(err){
				callback(err);
			}else{
				let childCsb = {
					"Title": aliasChildCsb,
					"Dseed": childCsbDseed,
					"Path" : childCsbPath,
					"Data" : csbData
				};
				callback(null, childCsb);
			}
		});
	}
};

function traverseUrlRecursively(pin, csb, splitUrl, lastAlias, parentCsb, callback) {
	var record = splitUrl[0];
	var index = exports.indexOfRecord(csb.Data, "Csb", record);
	if(index < 0){
		splitUrl.unshift(lastAlias);
		splitUrl.unshift(parentCsb);
		callback(null, splitUrl);
	}else {
		if (csb.Data["records"]) {
			let childCsbDseed = Buffer.from(csb.Data["records"]["Csb"][index]["Dseed"], "hex");
			let childCsbPath  = csb.Data["records"]["Csb"][index]["Path"];
			exports.readCsb(childCsbPath, childCsbDseed, function (err, childCsbData) {
				if(err){
					callback(err);
				}else{
					var childCsb = {
						"Dseed": childCsbDseed,
						"Path" : childCsbPath,
						"Data" : childCsbData
					};
					lastAlias = splitUrl.shift();
					parentCsb = csb;
					traverseUrlRecursively(pin, childCsb, splitUrl, lastAlias, parentCsb, callback);
				}
			});
		}
	}
}

exports.traverseUrl = function (pin, url, callback) {
	exports.loadMasterCsb(pin, null, function (err, masterCsb) {
		if(err){
			callback(err);
		}else{
			var splitUrl = url.split("/");
			traverseUrlRecursively(pin, masterCsb, splitUrl, null, null, function (err, args) {
				callback(err, args);
			});
		}
	});
};

