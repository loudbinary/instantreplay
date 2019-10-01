let Replay = require('./instant_replay_web_hook')
let replay = new Replay()
let watcher = replay.watcher
let videoPath = replay.videoPath




replay.start(videoPath)
