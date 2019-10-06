const { spawn } = require('child_process');
let vlcExecutablePath = "c:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
let killVideoPlayerAfterXSeconds = 60
const EventEmitter = require('events')



function launchVideo(videoFilename) {
  let fullVideoPath = path.join(this.videoPath,videoFilename)
  log('Playing instant replay')
  const vlcProcess = spawn(vlcExecutablePath, [videoPath], {
    detached: true,
    stdio: 'ignore'
  });

  vlcProcess.unref();

  let killVideoPlayAfterPause = function() {
    setTimeout(() => {
      try{
        console.log('Killing vlc pid:', vlcProcess.pid)
        process.kill(vlcProcess.pid)
      }
      catch(e) {
        console.log('The error was:', e)
      }
      finally{
        killVideoPlayAfterPause()
      }
      
    }, killVideoPlayerAfterXSeconds * 1000);
  }
  console.log('Waiting', killVideoPlayerAfterXSeconds,'seconds, VLC PID:', vlcProcess.pid)
  killVideoPlayAfterPause();
}

class VideoLauncherEventEmitter extends EventEmitter() {}
  
class VideoLauncher extends VideoLauncherEventEmitter() {
  constructor(params) {
    const emitter = new VideoLauncherEventEmitter()
    this.videoPath = params.videoPath
    this.launchVideo = launchVideo
  }
}

module.exports = VideoLauncher