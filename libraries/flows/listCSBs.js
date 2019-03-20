const flowsUtils = require("./../../utils/flowsUtils");
const validator = require("../../utils/validator");
const fs = require("fs");

$$.swarm.describe("listCSBs", {
	start: function (CSBPath, localFolder = process.cwd()) {
		this.localFolder = localFolder;
		this.CSBPath = CSBPath || '';
		this.checkCSBExistence();
	},

    checkCSBExistence:function(){
        let dseedPath = ".privateSky/dseed";
		fs.access(dseedPath,(err)=>{
			if(err){
                this.swarm("interaction", "noMasterCSBExists");
			}
			else
			{
                this.swarm("interaction", "readPin", flowsUtils.noTries);
			}
		});
	},

	validatePin: function (pin, noTries) {
		validator.validatePin(this.localFolder, this, 'loadRawCSB', pin, noTries);
	},

	loadRawCSB: function () {
		this.rootCSB.loadRawCSB(this.CSBPath, validator.reportOrContinue(this, 'getCSBs', 'Failed to load rawCSB'));
	},

	getCSBs: function (rawCSB) {
		const csbReferences = rawCSB.getAllAssets('global.CSBReference');
		const csbsAliases = csbReferences.map(ref => ref.alias);

		const fileReferences = rawCSB.getAllAssets('global.FileReference');
		const filesAliases = fileReferences.map(ref => ref.alias);

		this.swarm("interaction", "__return__", {
			csbs: csbsAliases,
			files: filesAliases
		});
	}

});
