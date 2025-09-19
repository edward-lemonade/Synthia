const fs = require('fs');
const path = require('path');
const successColor = '\x1b[32m%s\x1b[0m';
const checkSign = '\u{2705}';
const dotenv = require('dotenv').config({path: 'src/.env'}); ;

const envFile = `export const environment = {
    PRODUCTION: ${process.env.PRODUCTION},
    API_URL: '${process.env.API_URL}',
	AUTH0_DOMAIN: '${process.env.AUTH0_DOMAIN}',
	AUTH0_CLIENT: '${process.env.AUTH0_CLIENT}',
	AUTH0_SECRET: '${process.env.AUTH0_SECRET}',
	AUTH0_API_AUD: '${process.env.AUTH0_API_AUD}',
};
`;
const targetPath = path.join(__dirname, './src/environments/environment.development.ts');
fs.writeFile(targetPath, envFile, (err) => {
    if (err) {
        console.error(err);
        throw err;
    } else {
        console.log(successColor, `${checkSign} Successfully generated environment.development.ts`);
    }
});