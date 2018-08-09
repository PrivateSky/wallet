var path = require("path");
require(path.resolve(__dirname + "/../../../../engine/core"));
const utils = require(path.resolve(__dirname + "/../utils/utils"));
$$.flow.describe("addChild", {
	start: function (aliasParentCsb, aliasChildCsb) {
		var self = this;
		utils.requirePin(null, function (err, pin) {
			self.absorbCsb(pin, aliasParentCsb, aliasChildCsb);
		});
	},
	absorbCsb: function (pin, aliasParentCsb, aliasChildCsb) {
		var masterCsb = utils.readMasterCsb(pin);
		if(!masterCsb.Data["records"]) {
			console.log("There aren't any csbs in the current folder");
		}

		if(!masterCsb.Data["records"]["Csb"]){
			console.log("There aren't any csbs in the current folder");
		}
		var indexParentCsb = utils.indexOfRecord(masterCsb.Data, "Csb", aliasParentCsb);
		if( indexParentCsb < 0){
			console.log(aliasParentCsb, "does not exist");
			return;
		}
		var indexChildCsb = utils.indexOfRecord(masterCsb.Data, "Csb", aliasChildCsb);
		if(indexChildCsb < 0){
			console.log(aliasChildCsb, "does not exist");
			return;
		}
		var csbsInMaster = masterCsb.Data["records"]["Csb"];

		var parentCsb = utils.readCsb(csbsInMaster[indexParentCsb]["Path"], Buffer.from(csbsInMaster[indexParentCsb]["Dseed"], "hex"));

		if(!parentCsb["records"]){
			parentCsb["records"] = {};
		}
		if(!parentCsb["records"]["Csb"]){
			parentCsb["records"]["Csb"] = [];
		}
		parentCsb["records"]["Csb"].push(csbsInMaster[indexChildCsb]);
		utils.writeCsbToFile(csbsInMaster[indexParentCsb]["Path"], parentCsb,  Buffer.from(csbsInMaster[indexParentCsb]["Dseed"], "hex"));
		masterCsb.Data["records"]["Csb"].splice(indexChildCsb, 1);
		utils.writeCsbToFile(utils.getMasterPath(masterCsb.Dseed), masterCsb.Data, masterCsb.Dseed);
		console.log(aliasChildCsb, "has been added as child in", aliasParentCsb);
	}
});