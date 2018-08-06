var path = require("path");
require(path.resolve(__dirname + "/../../../../engine/core"));
const utils = require(path.resolve(__dirname + "/../utils/utils"));

$$.flow.describe("deleteCsb", {
	start: function (aliasCsb) {
		utils.requirePin(aliasCsb, null, this.getCsb);
	},
	getCsb: function (pin, aliasCsb) {
		var csb,
			prompt;

		if(!aliasCsb){
			csb = utils.readMasterCsb(pin);
			prompt = "You are about to delete all csbs in the current directory. ";
		}else{
			csb = utils.getCsb(pin, aliasCsb);
			prompt = "You are about to delete " + aliasCsb + " and its children csbs.";

		}
		prompt +="Do you want to continue?";

		utils.confirmOperation([pin, csb, null], prompt, this.deleteCsb);
	},
	deleteCsb: function (pin, csb) {

		if(!csb.Data || !csb.Data["records"] || !csb.Data["records"]["Csb"] || csb.Data["records"]["Csb"].length === 0){
			utils.deleteCsb(csb);
			return;
		}
		console.log(csb.Data["records"]["Csb"]);
		while(csb.Data["records"]["Csb"].length > 0){
			var csbRecord = csb.Data["records"]["Csb"].shift();
			let childCsb = {
				"Data": utils.readCsb(csbRecord["Path"], Buffer.from(csbRecord["Dseed"], "hex")),
				"Path": csbRecord["Path"],
				"Dseed": Buffer.from(csbRecord["Dseed"], "hex")
			};
			if(csb.Data["records"]["Csb"].length === 0) {
				if (this.__isMaster(pin, csb)) {
					utils.deleteMasterCsb(csb);
				} else {
					console.log("Is not master");
					utils.deleteCsb(csb);
				}
			}
			this.deleteCsb(pin, childCsb);
		}
	},
	__isMaster: function (pin,csb) {
		var master = utils.readMasterCsb(pin);
		if(csb.Path === master.Path){
			return true;
		}
		return false;
	}
});