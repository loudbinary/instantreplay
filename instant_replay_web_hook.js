var au = require('autoit');
var fs = require('fs');
const express = require('express')
const bodyParser = require('body-parser')
const chokidar = require('chokidar');
const app = express()
app.use(bodyParser.json());
const path = require('path')
const { spawn } = require('child_process');
const findProcess = require('find-process')
const { execSync } = require('child_process');
let videoDuration = require('get-video-duration').getVideoDurationInSeconds

let vlcExecutablePath = "c:\\Program Files\\VideoLAN\\VLC\\vlc.exe"

/**
 * Used to see if VLC is still running, user may have closed and attempting
 * to kill it agai will crash app.
 * @param {*} pid 
 */
let vlcHasBeenClosed = function(pid){
  let results = execSync(`tasklist /fi "pid eq ${pid}"`).toString()
  if (results.indexOf("No tasks") == 6){
    return false
  } 
  else {
    return true
  }
}

/**
 * Rather than statically setting, or managing timeout value for videos we reaad the file and get its duration
 * Then add 5 seconds.
 * @param {*} fullpath 
 */
function getVideoLength(fullpath) {
  return videoDuration(fullpath).then((duration) => {
    let videoLength = Math.ceil(duration) + 5
    console.log('Video length is:', videoLength, 'seconds, closing VLC then at that time.')
    return videoLength
  })
}


function launchVideo(videoPath) {
  const vlcProcess = spawn(vlcExecutablePath, [videoPath], {
    detached: true,
    stdio: 'ignore'
  });

  vlcProcess.unref();
  return vlcProcess.pid
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
    
    var wait = ms => new Promise((r, j)=>setTimeout(r, ms))
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
          let pid = launchVideo(fullVideoPath)
          getVideoLength(fullVideoPath)
            .then((runningVideoLength) =>{
              var waitTill = new Date(new Date().getTime() + runningVideoLength * 1000);
              console.log('Waiting', runningVideoLength,'seconds, VLC PID:', pid)
              while(waitTill > new Date()){}
              let results = vlcHasBeenClosed(pid)
              if(results == true) {
                console.log(runningVideoLength, 'seconds have passed, Killing vlc pid:', pid)
                process.kill(pid)
              } else {
                console.log('VLC was closed by user, continuing')
              }
              
            })
        })
      watcher
        .on('error', error => log(`Watcher error: ${error}`))
        .on('ready', () => log('Initial scan complete. Ready for changes'))

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
  
