var path = require("path");
require(path.resolve(__dirname + "/../../../../engine/core"));
const utils = require(path.resolve(__dirname + "/../utils/utils"));
const fs = require("fs");
const crypto = $$.requireModule("pskcrypto");
$$.flow.describe("addChild", {
	start: function (parentUrl, childUrl) {
		var self = this;
		utils.requirePin(null, function (err, pin) {
			self.addArchive(pin, parentUrl, childUrl);
		});
	},
	addArchive: function (pin, parentUrl, childUrl) {
		childUrl = path.resolve(childUrl);
		if(!fs.existsSync(childUrl)){
			console.log(childUrl, "is invalid.");
			return;
		}
		var masterCsb = utils.readMasterCsb(pin);
		var parentChildCsbs = utils.traverseUrl(pin, masterCsb.Data, parentUrl);
		var parentCsbData = parentChildCsbs[0];
		console.log(parentChildCsbs[0]);
		var index = utils.indexOfRecord(parentCsbData, "Csb", parentChildCsbs[1]);
		if(index < 0){
			console.log("Csb", parentChildCsbs[1], "does not exist");
			return;
		}
		var csb = {
		};
		csb["Path"] = parentCsbData["records"]["Csb"][index].Path;
		csb["Dseed"] = Buffer.from(parentCsbData["records"]["Csb"][index].Dseed, "hex");
		csb["Data"] = utils.readCsb(csb.Path, csb.Dseed);

		if(!csb.Data["records"]){
			csb.Data["records"] = {};
		}
		if(!csb.Data["records"]["Adiacent"]){
			csb.Data["records"]["Adiacent"] = [];
			if(!fs.existsSync(utils.Paths.Adiacent)){
				fs.mkdirSync(utils.Paths.Adiacent);
			}
		}
		crypto.encryptStream(childUrl,path.join(utils.Paths.Adiacent, crypto.generateSafeUid(csb.Dseed, path.basename(childUrl))), csb.Dseed);
		csb.Data["records"]["Adiacent"].push(crypto.generateSafeUid(csb.Dseed, path.basename(childUrl)));
		utils.writeCsbToFile(csb.Path, csb.Data, csb.Dseed);

	}
});
