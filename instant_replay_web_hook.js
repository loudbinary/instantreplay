var au = require('autoit');
var fs = require('fs');
const express = require('express')
const bodyParser = require('body-parser')
const chokidar = require('chokidar');
const app = express()
app.use(bodyParser.json());
const path = require('path')
const { spawn } = require('child_process');

let vlcExecutablePath = "c:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
let killVideoPlayerAfterXSeconds = 75
function launchVideo(videoPath) {

  const vlcProcess = spawn(vlcExecutablePath, [videoPath], {
    detached: true,
    stdio: 'ignore'
  });

  vlcProcess.unref();

  let killVideoPlayAfterPause = function() {
    setTimeout(() => {
      console.log('Killing vlc pid:', vlcProcess.pid)
      process.kill(vlcProcess.pid)
    }, killVideoPlayerAfterXSeconds * 1000);
  }
  console.log('Waiting', killVideoPlayerAfterXSeconds,'seconds, VLC PID:', vlcProcess.pid)
  killVideoPlayAfterPause();
}



class InstantReplay {
  constructor(params) {
    params = params | {}
    let _videoPath = params.videoPath || "C:/Users/Loudbinary/Videos/replays" 
    let watcher = chokidar.watch("Replay*",{
      cwd: _videoPath,
      alwaysStat: true,
      usePolling: true,
      depth: 0,
      ignorePermissionErrors: true,
      awaitWriteFinish: true,
      ignoreInitial: true,
      ignored: '*.txt',
      followSymlinks: true,
      //disableGlobbing: false,
      usePolling: true,
      interval: 100,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
    });

    
    this.videoPath = _videoPath
    
    let start = function (videoPath) {
      let savedVideosPath = this.videoPath
      // Something to use when events are received.
      const log = console.log.bind(console);
      // Add event listeners.
      watcher
        .on('add', newVideoPath => {
          let fullVideoPath = path.join(savedVideosPath,newVideoPath)
          log(`File ${fullVideoPath} has been added`)
          log('Launching vlc to view video')
          launchVideo(fullVideoPath)
        })
        //.on('change', path => log(`File ${path} has been changed`))
        //.on('unlink', path => log(`File ${path} has been removed`));
      
      // More possible events.
      watcher
        //.on('addDir', path => log(`Directory ${path} has been added`))
        //.on('unlinkDir', path => log(`Directory ${path} has been removed`))
        .on('error', error => log(`Watcher error: ${error}`))
        .on('ready', () => log('Initial scan complete. Ready for changes'))
        //.on('raw', (event, path, details) => { // internal
        //  log('Raw event info:', event, path, details);
        //});
      
      
       // So we listen on ip other than home.
      app.listen(3000, '0.0.0.0', function (err) {
        let port = process.env.PORT || 3000
        if (err) {
          throw err
        }
        console.log('Server starting on port',port)
      })

      let takeInstantReplay = (res) =>{
        console.log('Received replay request, initializing AutoIt')
        au.Init();
        au.WinActivate ( "OBS" )
        au.Send("^2");
        console.log('Took snap shot')
        res.send("OK")
      }
      
      // Tell express to use the body-parser middleware and to not parse extended bodies
      app.use(bodyParser.urlencoded({ extended: false }))


      app.get('/instantreplay', function (req, res) {
        console.log('GET')
        const body = req.body.Body
        let start = req.query.start

        if (start==1) {
          return takeInstantReplay(res)
        } else {
          res.send("Missing query string '?start=1'")
        }
      })
    }

    this.start = start
    this.watcher = watcher    
  }
}

module.exports = InstantReplay
  
