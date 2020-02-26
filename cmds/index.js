const utils = require("../utils/consoleUtils");
const aliasesPath = "aliases";

function getEndpoint() {
    let endpoint = process.env.EDFS_ENDPOINT;
    if (typeof endpoint === "undefined") {
        console.log("Using default endpoint. To configure set ENV['EDFS_ENDPOINT']");
        endpoint = "http://localhost:8080";
    }
    return endpoint;
}

function getInitializedEDFS() {
    const EDFS = require("edfs");
    const endpoint = getEndpoint();
    const transportAlias = "pskwallet";
    $$.brickTransportStrategiesRegistry.add(transportAlias, new EDFS.HTTPBrickTransportStrategy(endpoint));
    return EDFS.attach(transportAlias);
}

function createCSB(domainName, constitutionPath) {
    const pth = "path";
    const path = require(pth);
    const EDFS = require("edfs");
    const edfs = getInitializedEDFS();

    edfs.createBarWithConstitution(path.resolve(constitutionPath), (err, archive) => {
        if (err) {
            throw err;
        }
        archive.writeFile(EDFS.constants.CSB.DOMAIN_IDENTITY_FILE, domainName, () => {
            if (err) {
                throw err;
            }
            console.log("SEED", archive.getSeed().toString());
        });
    });
}

function setApp(archiveSeed, appPath) {
    if (!archiveSeed) {
        throw new Error('Missing first argument, the archive seed');
    }

    if (!appPath) {
        throw new Error('Missing the second argument, the app path');
    }

    const EDFS = require("edfs");
    const edfs = getInitializedEDFS();

    const bar = edfs.loadBar(archiveSeed);
    bar.addFolder(appPath, EDFS.constants.CSB.APP_FOLDER, (err) => {
        if (err) {
            throw err;
        }

        console.log('All done');
    })
}

function createArchive(alias, folderPath) {
    const pth = "path";
    const path = require(pth);
    const edfs = getInitializedEDFS();
    const bar = edfs.createBar();
    bar.addFolder(path.resolve(folderPath), folderPath, (err) => {
        if (err) {
            throw err;
        }

        console.log("SEED:", bar.getSeed().toString());
    });

}

function validatePin(pin) {
    return !(typeof pin === "undefined" || pin.length < 4);
}

function createWallet(templateSeed) {
    const Seed = require("bar").Seed;
    try {
        new Seed(templateSeed);
    } catch (e) {
        throw Error("Invalid template seed");
    }

    const EDFS = require("edfs");
    EDFS.checkForSeedCage(err => {
        if (!err) {
            utils.getFeedback("A wallet already exists. Do you want to create a new one?(y/n)", (err, ans) => {
                if (err) {
                    throw err;
                }

                if (ans[0] === "y") {
                    __createWallet(true);
                }
            });
        } else {
            __createWallet(false);
        }
    });

    function __createWallet(overwrite) {
        const edfs = getInitializedEDFS();
        utils.insertPassword({validationFunction: validatePin}, (err, pin) => {
            if (err) {
                console.log(`Caught error: ${err.message}`);
                process.exit(1);
            }

            edfs.createWallet(templateSeed, pin, overwrite, (err, seed) => {
                if (err) {
                    throw err;
                }

                console.log("Wallet with SEED was created. Please save the SEED:", seed);
            });
        });
    }
}

function listFiles(alias, folderPath) {
    const EDFS = require("edfs");
    utils.insertPassword("Insert pin:", (err, pin) => {
        if (err) {
            throw err;
        }

        EDFS.attachWithPin(pin, (err, edfs) => {
            const bar = edfs.loadBar();
            bar.listFiles(folderPath, (err, fileList) => {
                if (err) {
                    throw err;
                }

                console.log("Files:", fileList);
            });
        });
    });
}

function extractFolder(seed, barPath, fsFolderPath) {
    const edfs = getInitializedEDFS();
    const bar = edfs.loadBar(seed);
    bar.extractFolder(fsFolderPath, barPath, (err) => {
        if (err) {
            throw err;
        }

        console.log("Extracted folder.");
    });
}

function extractFile(seed, barPath, fsFilePath) {
    const edfs = getInitializedEDFS();
    const bar = edfs.loadBar(seed);
    bar.extractFile(fsFilePath, barPath, (err) => {
        if (err) {
            throw err;
        }

        console.log("Extracted file.");
    });
}

function setAlias(archiveSeed, alias) {
    utils.insertPassword("Insert pin:", 3, (err, pin) => {
        if (err) {
            throw err;
        }

        const EDFS = require("edfs");
        EDFS.attachWithPin(pin, (err, edfs) => {
            if (err) {
                throw err;
            }

            const bar = edfs.loadBar();
            bar.writeFile(aliasesPath + "/" + alias, archiveSeed.toString(), (err) => {
                if (err) {
                    throw err;
                }

                console.log("Added alias");
            });
        });
    });
}

// addCommand("set", "alias", setAlias, "<archiveSeed> <alias> \t\t\t\t |creates an archive containing constitutions folder <constitutionPath> for Domain <domainName>");
addCommand("create", "csb", createCSB, "<domainName> <constitutionPath> \t\t\t\t |creates an archive containing constitutions folder <constitutionPath> for Domain <domainName>");
addCommand("create", "archive", createArchive, "<archiveSeed> <folderPath> \t\t\t\t\t |creates an archive containing constitutions folder <constitutionPath> for Domain <domainName>");
addCommand("create", "wallet", createWallet, "<templateSeed> \t\t\t\t\t\t |creates a clone of the CSB whose SEED is <templateSeed>");
addCommand("set", "app", setApp, " <archiveSeed> <folderPath> \t\t\t\t\t |add an app to an existing archive");
addCommand("list", "files", listFiles, " <archiveSeed> <folderPath> \t\t\t\t |prints the list of all files stored at path <folderPath> inside the archive whose SEED is <archiveSeed>");
addCommand("extract", "folder", extractFolder, " <archiveSeed> <archivePath> <fsFolderPath> \t\t |extracts the folder stored at <archivePath> inside the archive whose SEED is <archiveSeed> and writes all the extracted file on disk at path <fsFolderPath>");
addCommand("extract", "file", extractFile, " <archiveSeed> <archivePath> <fsFilePath> \t\t |extracts the folder stored at <archivePath> inside the archive whose SEED is <archiveSeed> and writes all the extracted file on disk at path <fsFilePath>");

