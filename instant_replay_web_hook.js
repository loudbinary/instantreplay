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
const _ = require('lodash')
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
    let _userPath = params.userPath || "C:/Users/Loudbinary/Videos/user_replays"
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

    function getMostRecentFileName(dir) {
      var files = fs.readdirSync(dir);
    
      // use underscore for max()
      return _.max(files, function (f) {
          var fullpath = path.join(dir, f);
    
          // ctime = creation time is used
          // replace with mtime for modification time
          return fs.statSync(fullpath).name;
      });
    }
    
    this.videoPath = _videoPath
    this.userPath = _userPath
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

      // Return only base file name without dir


      let takeInstantReplayAndRename = (res,id) =>{
        takeInstantReplay(res)
        wait(1)
        let recent = getMostRecentFileName(videoPath)
        //let filename = path.basename(videoPath)
        let currentVideoPath = path.join(this.videoPath,recent)
        let userCopyPath = path.join(this.userPath,id + '.mp4')
        fs.copyFileSync(currentVideoPath,userCopyPath)
      }
      
      // Tell express to use the body-parser middleware and to not parse extended bodies
      app.use(bodyParser.urlencoded({ extended: false }))

      app.get('/download', function(req,res){
        let id = req.query.id
        let fullPath = path.join(_userPath,id +'.mp4')
        if (fs.existsSync(fullPath)){
          // 'Content-Description: File Transfer'
          // 'Content-Type: application/force-download'
          // 'Content-Disposition: attachment; filename="myfile.mp4"
          res.set('Content-Description', 'File Transfer')
          res.set('Content-Type', 'application/force-download')
          res.set('Content-Disposition', 'attachment; filename=\"'+ id + '.mp4' + '\"')
          res.sendFile(fullPath)
        } else {
          res.send('Missing file' + id)
        }
      })
      app.get('/instantreplay', function (req, res) {
        console.log('GET')
        const body = req.body.Body
        let start = req.query.start
        let id = req.query.id

        if (start==1 && typeof(id)=='undefined') {
          return takeInstantReplay(res)
        } else if (start==1 && typeof(id)!='undefined') {
          console.log('User requests their uniquely named replay, for pick up later.')
          return takeInstantReplayAndRename(res,id)
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
  
