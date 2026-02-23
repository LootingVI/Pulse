const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

function runCommand(command, errorMessage) {
    console.log(`\n> ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`\n❌ Error: ${errorMessage}`);
        console.error(error.message);
        process.exit(1);
    }
}

async function main() {
    console.log("\n=============================================");
    console.log("🚀 Welcome to the Pulse Installer");
    console.log("=============================================\n");

    const rootDir = process.cwd();
    const isInsideRepo = fs.existsSync(path.join(rootDir, 'package.json')) && fs.existsSync(path.join(rootDir, 'prisma'));
    let targetDir = rootDir;

    if (!isInsideRepo) {
        console.log("📦 Downloading Pulse from GitHub...");
        runCommand('git clone https://github.com/LootingVI/Pulse.git pulse-app', 'Failed to clone the repository.');
        targetDir = path.join(rootDir, 'pulse-app');
        process.chdir(targetDir);
    } else {
        console.log("✅ Running inside Pulse repository.");
    }

    // 1. Install dependencies
    console.log("\n📦 Installing npm dependencies (this might take a minute)...");
    runCommand('npm install', 'Failed to install npm dependencies.');

    // 2. Setup Environment Variables
    console.log("\n⚙️  Setting up environment variables...");
    const envPath = path.join(targetDir, '.env');
    const envExamplePath = path.join(targetDir, '.env.example');

    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log("✅ Created .env from .env.example");
        } else {
            console.log("⚠️ .env.example not found. Creating a blank .env file.");
            fs.writeFileSync(envPath, "");
        }

        // Generate a strong secret
        const secret = crypto.randomBytes(32).toString('base64');
        const defaultUrl = "http://localhost:3000";

        console.log(`\nWe generated a secure NextAuth Secret for you: ${secret}`);
        let configuredUrl = await question(`\nWhat is your public URL? (default: ${defaultUrl}): `);
        if (!configuredUrl.trim()) configuredUrl = defaultUrl;

        let envContent = fs.readFileSync(envPath, 'utf8');

        // Replace placeholders if they exist
        if (envContent.includes('NEXTAUTH_SECRET=')) {
            envContent = envContent.replace(/NEXTAUTH_SECRET=.*/, `NEXTAUTH_SECRET="${secret}"`);
        } else {
            envContent += `\nNEXTAUTH_SECRET="${secret}"\n`;
        }

        if (envContent.includes('NEXTAUTH_URL=')) {
            envContent = envContent.replace(/NEXTAUTH_URL=.*/, `NEXTAUTH_URL="${configuredUrl}"`);
        } else {
            envContent += `NEXTAUTH_URL="${configuredUrl}"\n`;
        }

        fs.writeFileSync(envPath, envContent);
        console.log("✅ Updated .env with your configuration.");
    } else {
        console.log("✅ .env file already exists. Skipping environment configuration.");
    }

    // 3. Database Setup
    console.log("\n🗄️  Setting up Database and Prisma Client...");
    runCommand('npx -y prisma generate', 'Failed to generate Prisma client.');
    runCommand('npx -y prisma db push --accept-data-loss', 'Failed to generate database tables.');

    // 4. Build Application
    console.log("\n🏗️  Building Next.js Application (this may take a few minutes)...");
    process.env.NEXT_TELEMETRY_DISABLED = "1";
    runCommand('npm run build', 'Failed to build Next.js application.');

    // 5. Success
    console.log("\n=============================================");
    console.log("🎉 Pulse has been successfully installed! 🎉");
    console.log("=============================================\n");
    console.log("To start the application, run:\n");

    if (!isInsideRepo) {
        console.log(`  cd pulse-app`);
    }

    console.log(`  npm run start\n`);
    console.log(`Your application will be available at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}`);
    console.log("Login with your new account to access the dashboard.");

    rl.close();
}

main().catch(console.error);
