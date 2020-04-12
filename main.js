const fs = require('fs');
const chalk = require('chalk');
const regedit = require('regedit');
const randomToken = require('rand-token');
const path = require('path');
const { exec } = require('child_process');

const username = process.env['USERPROFILE'].split(path.sep)[2];
const registryPathsToRemove = [
    `HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers`,
    `HKEY_USERS\\__SID__\\Software\\Microsoft\\Internet Explorer\\LowRegistry\\Audio\\PolicyConfig\\PropertyStore`,
    `HKEY_USERS\\__SID__\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers`,
    `HKEY_USERS\\__SID___Classes\\VirtualStore\\MACHINE\\SOFTWARE\\Wow6432Node\\Microsoft\\Direct3D\\MostRecentApplication`,
    `HKEY_USERS\\__SID___Classes\\VirtualStore\\MACHINE\\SOFTWARE\\Wow6432Node\\Microsoft\\DirectDraw\\MostRecentApplication`,
];

let sid;
async function runProcess() {
    let statusMessage;
    let errorStatement;
    statusMessage = `Looking for 'gta_sa.exe' in the folder below this one.`;
    console.log(chalk.greenBright(statusMessage));

    const fileExists = fs.existsSync(`../gta_sa.exe`);

    if (!fileExists) {
        errorStatement = `Failed to find 'gta_sa.exe' in the path directory below this file.`;
        console.log(chalk.redBright(errorStatement));
        process.exit(1);
    }

    statusMessage = `'gta_sa.exe' is being backed up into '${__dirname}'`;
    console.log(chalk.greenBright(statusMessage));

    fs.copyFileSync(`../gta_sa.exe`, './gta_sa.exe');

    const trackerFile = fs.existsSync('./version_history.json');
    const newFileEntry = {
        fileName: `${randomToken.generate(8)}_gta_sa.exe`,
    };

    statusMessage = `Linking new new .exe to GTA:SA & SAMP. Using: ${newFileEntry.fileName}`;
    console.log(chalk.magentaBright(statusMessage));

    if (trackerFile) {
        const oldFileData = JSON.parse(fs.readFileSync('./version_history.json'));
        if (fs.existsSync(`../${oldFileData.fileName}`)) {
            fs.unlinkSync(`../${oldFileData.fileName}`);
        }

        if (fs.existsSync('./version_history.json')) {
            fs.unlinkSync('./version_history.json');
        }
    }

    fs.copyFileSync(`./gta_sa.exe`, `../${newFileEntry.fileName}`);
    fs.writeFileSync('./version_history.json', JSON.stringify(newFileEntry, null, '\t'));

    statusMessage = `Updating registry entries...`;
    console.log(chalk.magentaBright(statusMessage));

    await new Promise((resolve) => {
        regedit.list('HKCU\\Software\\SAMP', (err, res) => {
            if (err) {
                errorStatement = `Failed to find registry entry for SAMP under Computer\\HKEY_CURRENT_USER\\SOFTWARE\\SAMP`;
                console.log(chalk.redBright(errorStatement));
                process.exit(1);
            }

            const gtaSAPath = __dirname.replace('sampFixer', newFileEntry.fileName);
            statusMessage = `Found registry entry for SAMP. Beginning update...`;
            regedit.putValue(
                {
                    'HKCU\\Software\\SAMP': {
                        gta_sa_exe: {
                            value: gtaSAPath,
                            type: 'REG_SZ',
                        },
                    },
                },
                (err) => {
                    if (err) {
                        console.log(err);
                        process.exit(1);
                    }
                }
            );

            console.log('updated local path');
            resolve();
        });
    });

    statusMessage = `New GTA_SA was linked. Updating registry entires to fix ENB versioning.`;
    console.log(chalk.greenBright(statusMessage));

    for (let i = 0; i < registryPathsToRemove.length; i++) {
        const regPath = registryPathsToRemove[i].replace('__SID__', sid);
        exec(`REG Delete "${regPath}"`, (error, stdout, stderr) => {
            console.log(stderr);
        });
    }

    statusMessage = `Finished. Exiting. Please run SAMP.`;
    console.log(chalk.greenBright(statusMessage));
    process.exit(1);
}

function startProcess() {
    exec(`wmic useraccount where name='${username}' get sid`, (error, stdout, stderr) => {
        sid = stdout
            .replace('SID', '')
            .replace(/\r?\n|\r/g, '')
            .replace(/ /g, '');

        runProcess();
    });
}

startProcess();
