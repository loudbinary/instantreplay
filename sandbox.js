const { exec } = require('child_process');
exec('tasklist /fi "pid eq 829"', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  (console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

//stdout.indexOf('No tasks') = 6 if not fonud