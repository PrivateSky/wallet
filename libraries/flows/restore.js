var path = require("path");
require(path.resolve(__dirname + "/../../../../engine/core"));
const utils = require(path.resolve(__dirname + "/../utils/utils"));
const crypto = $$.requireModule("pskcrypto");
var fs = require("fs");
$$.requireModule('psk-http-client');

$$.flow.describe("restore", {
	public: {
		url: "string"
	},
	start: function () {
		if(utils.masterCsbExists()) {
			utils.enterSeed(this.readMasterCsb);
		}else{
			utils.enterSeed(this.restoreMaster);
		}
	},
	readMasterCsb: function (seed) {
		console.log("Aici sunt");
		var masterCsb = utils.readMasterCsb(null, seed);
		var csbs = masterCsb.csbData["records"]["Csb"];
		console.log(masterCsb.csbData["backups"]);
		this.restoreCsbs(masterCsb.csbData["backups"][0], csbs, 0);
	},
	restoreMaster: function (seed) {
		var obj = JSON.parse(seed.toString());
		var url = obj.backup;
		console.log(this.url);
		var self = this;
		$$.remote.doHttpGet(this.url + "/CSB/master", function (err, res) {
			if(err){
				throw err;
			}else{
				var dseed = crypto.deriveSeed(seed);
				var encryptedMaster = Buffer.from(res, 'hex');
				fs.writeFileSync(utils.paths.masterCsb, encryptedMaster);
				crypto.saveDSeed(dseed, utils.defaultPin, utils.paths.dseed);
				var masterCsb = crypto.decryptJson(encryptedMaster, dseed);
				// fs.writeFileSync(utils.paths.recordStructures + "/test_csb_master.json", JSON.stringify(masterCsb,null, "\t"));
				var csbs = masterCsb["records"]["Csb"];
				self.restoreCsbs(url, csbs, 0);
			}
		});
	},
	restoreCsbs: function(url, csbs, currentCsb){
		var self = this;
		if(currentCsb == csbs.length){
			console.log("All csbs have been restored");
		}else{
			$$.remote.doHttpGet(url + "/CSB/" + csbs[currentCsb]["Path"], function(err, res){
				if(err){
					throw err;
				}else{
					var encryptedCsb = Buffer.from(res, "hex");
					fs.writeFileSync(csbs[currentCsb]["Path"], encryptedCsb);
					self.restoreCsbs(url, csbs, currentCsb + 1);
				}
			})
		}
	}

});
