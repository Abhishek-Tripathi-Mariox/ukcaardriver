const { spawnSync } = require('node:child_process');

const packageName = 'com.ukcaardriver';
const activityName = `${packageName}/.MainActivity`;
const mode = process.argv[2] || 'dev';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
}

function runInherited(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function runCaptured(command, args) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function exitWith(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function getConnectedDevices() {
  const result = run('adb', ['devices']);
  if (result.error) {
    exitWith('adb is not available in PATH.');
  }

  const devices = result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice'));

  return devices;
}

function isInstalled() {
  const result = run('adb', ['shell', 'pm', 'list', 'packages', packageName]);
  if (result.error) {
    exitWith('Failed to query installed packages from adb.');
  }

  return result.stdout.includes(`package:${packageName}`);
}

function reverseMetroPort() {
  const result = run('adb', ['reverse', 'tcp:8081', 'tcp:8081']);
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    console.warn(details || 'Could not run adb reverse tcp:8081 tcp:8081.');
  }
}

function tryLaunchInstalledApp() {
  reverseMetroPort();

  const result = runCaptured('adb', ['shell', 'am', 'start', '-n', activityName]);
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();

  if (result.status !== 0 || output.includes('Error type 3') || output.includes('does not exist')) {
    return false;
  }

  if (output.includes('top-most instance')) {
    console.log('Driver app is already open on the device. Metro remains connected and no rebuild was needed.');
    process.exit(0);
  }

  if (output) {
    console.log(output);
  }

  process.exit(0);
}

function installAndRun() {
  console.log('Driver app is not installed on the connected device. Running a full Android install.');
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = runInherited(command, ['react-native', 'run-android', '--no-packager']);
  process.exit(result.status || 0);
}

const devices = getConnectedDevices();
if (devices.length === 0) {
  exitWith('No Android device is connected. Start an emulator or connect a device first.');
}

if (tryLaunchInstalledApp()) {
  process.exit(0);
}

if (mode === 'launch') {
  exitWith('The driver app is not installed on this device. Run npm run android:install once, then use npm run android or npm run android:launch.');
}

installAndRun();