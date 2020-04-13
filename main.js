const fs = require('fs');
const chalk = require('chalk');
const regedit = require('regedit');
const randomToken = require('rand-token');
const path = require('path');
const { exec, execSync } = require('child_process');

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
    console.log(chalk.cyanBright(`Looking for 'gta_sa.exe' in '${__dirname.replace('sampFixer\\', '')}' \r\n`));

    const fileExists = fs.existsSync(`../gta_sa.exe`);
    if (!fileExists) {
        errorStatement = `Failed to find 'gta_sa.exe' in the path directory below this file.`;
        console.log(chalk.redBright(errorStatement));
        process.exit(1);
    }

    console.log(chalk.cyanBright(`Found EXE file. \r\n`));
    console.log(chalk.cyanBright(`'gta_sa.exe' is now being backed up into '${__dirname}' \r\n`));

    fs.copyFileSync(`../gta_sa.exe`, './gta_sa.exe');

    const trackerFile = fs.existsSync('./version_history.json');
    const newFileEntry = {
        fileName: `${randomToken.generate(8)}_gta_sa.exe`,
    };

    console.log(chalk.cyanBright(`Linking New EXE to SAMP... using: ${newFileEntry.fileName} \r\n`));

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

    console.log(chalk.cyanBright(`Beginning Registry Updates. Please respond to prompt. (Yes to Patch)\r\n`));
    const gtaSAPath = __dirname.replace('sampFixer', newFileEntry.fileName);

    execSync(`REG add "HKEY_CURRENT_USER\\Software\\SAMP" /v gta_sa_exe /d "${gtaSAPath}"`, { stdio: 'inherit' });

    console.log(chalk.cyanBright(`Updating registry entries for ENB issues.\r\n`));

    console.log(chalk.yellowBright(`You will be prompted below.`));
    console.log(chalk.yellowBright(`We will need to delete a few registry entries.`));
    console.log(chalk.yellowBright(`Please type YES below to confirm the deletion of specific registry entries.`));

    for (let i = 0; i < registryPathsToRemove.length; i++) {
        const regPath = registryPathsToRemove[i].replace('__SID__', sid);
        try {
            execSync(`REG Query "${regPath}" > null`, { stdio: 'inherit' });
            console.log(chalk.cyanBright(`Asking permission to delete:\r\n`));
            execSync(`REG Delete "${regPath}"`, { stdio: 'inherit' });
            console.log(chalk.cyanBright(`Entry was removed.\r\n`));
        } catch (err) {
            console.log(chalk.cyanBright(`Entry not found. Skipping. \r\n`));
        }
    }

    console.log(chalk.cyanBright(`Setup complete. Install any ENB or ReShade from here.`));
    process.exit(1);
}

function startProcess() {
    console.log(chalk.cyanBright(`-------------------------------------------`));
    console.log(chalk.cyanBright(`GTA:SA SAMP Enb Patcher`));
    console.log(chalk.cyanBright(`-------------------------------------------`));
    console.log(chalk.cyanBright(`Created by Stuyk @ https://github.com/stuyk`));
    console.log(chalk.cyanBright(`-------------------------------------------\r\n`));

    exec(`wmic useraccount where name='${username}' get sid`, (error, stdout, stderr) => {
        sid = stdout
            .replace('SID', '')
            .replace(/\r?\n|\r/g, '')
            .replace(/ /g, '');

        runProcess();
    });
}

startProcess();
